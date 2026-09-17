/**
 * SECURITY TOOLS (6 tools)
 * crypto_hash, crypto_encrypt, crypto_sign, scan_secrets, scan_malware, auth_generate
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// ── crypto_hash ─────────────────────────────────────────────────
async function cryptoHash(params) {
    const { action = 'hash', content, data, algorithm = 'sha256', ...opts } = params;
    const input_content = content || data;
    if (!input_content && action !== 'verify') return { success: false, error: 'content or data is required' };

    try {
        switch (action) {
            case 'hash': {
                const input = typeof input_content === 'string' ? input_content : JSON.stringify(input_content);
                if (algorithm === 'bcrypt') {
                    const bcrypt = await import('bcryptjs');
                    const rounds = opts.rounds || 10;
                    const hash = await bcrypt.default.hash(input, rounds);
                    return { success: true, hash, algorithm: 'bcrypt', rounds };
                }
                const hash = crypto.createHash(algorithm).update(input).digest(opts.encoding || 'hex');
                return { success: true, hash, algorithm, encoding: opts.encoding || 'hex' };
            }

            case 'verify': {
                if (!opts.hash) return { success: false, error: 'hash is required for verify' };
                const input = typeof input_content === 'string' ? input_content : JSON.stringify(input_content);
                if (algorithm === 'bcrypt') {
                    const bcrypt = await import('bcryptjs');
                    const match = await bcrypt.default.compare(input, opts.hash);
                    return { success: true, match, algorithm: 'bcrypt' };
                }
                const computed = crypto.createHash(algorithm).update(input).digest(opts.encoding || 'hex');
                return { success: true, match: computed === opts.hash, algorithm };
            }

            case 'hmac': {
                if (!opts.key) return { success: false, error: 'key is required for HMAC' };
                const hmac = crypto.createHmac(algorithm, opts.key).update(input_content).digest(opts.encoding || 'hex');
                return { success: true, hmac, algorithm };
            }

            case 'file': {
                if (!opts.file) return { success: false, error: 'file path is required' };
                const buffer = fs.readFileSync(opts.file);
                const hash = crypto.createHash(algorithm).update(buffer).digest('hex');
                return { success: true, hash, algorithm, file: opts.file, sizeBytes: buffer.length };
            }

            case 'checksum': {
                // MD5 + SHA256 combo for file integrity
                const input = typeof input_content === 'string' ? Buffer.from(input_content) : input_content;
                return {
                    success: true,
                    md5: crypto.createHash('md5').update(input).digest('hex'),
                    sha256: crypto.createHash('sha256').update(input).digest('hex'),
                    sha512: crypto.createHash('sha512').update(input).digest('hex'),
                };
            }

            default:
                return { success: false, error: `Unknown crypto_hash action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── crypto_encrypt ──────────────────────────────────────────────
async function cryptoEncrypt(params) {
    const { action = 'encrypt', content, data, key, password, encrypted, ...opts } = params;
    const input_content = content || data || encrypted;
    const input_key = key || password;

    try {
        switch (action) {
            case 'encrypt': {
                if (!input_content) return { success: false, error: 'content/data is required' };
                if (!input_key) return { success: false, error: 'key/password is required' };
                const derivedKey = crypto.scryptSync(input_key, 'salt', 32);
                const iv = crypto.randomBytes(IV_LENGTH);
                const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
                const input = typeof input_content === 'string' ? input_content : JSON.stringify(input_content);
                let enc = cipher.update(input, 'utf8', 'hex');
                enc += cipher.final('hex');
                const tag = cipher.getAuthTag();
                return {
                    success: true,
                    encrypted: `${iv.toString('hex')}:${tag.toString('hex')}:${enc}`,
                    algorithm: ALGORITHM,
                };
            }

            case 'decrypt': {
                if (!input_content) return { success: false, error: 'encrypted content is required' };
                if (!input_key) return { success: false, error: 'key/password is required' };
                const parts = input_content.split(':');
                if (parts.length !== 3) return { success: false, error: 'Invalid encrypted format' };
                const [ivHex, tagHex, encHex] = parts;
                const derivedKey = crypto.scryptSync(input_key, 'salt', 32);
                const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, Buffer.from(ivHex, 'hex'));
                decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
                let decrypted = decipher.update(encHex, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return { success: true, decrypted };
            }

            case 'generate_key': {
                const length = opts.length || 32;
                const keyBuf = crypto.randomBytes(length);
                return {
                    success: true,
                    key: keyBuf.toString('hex'),
                    base64: keyBuf.toString('base64'),
                    length,
                };
            }

            case 'rsa_generate': {
                const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                    modulusLength: opts.bits || opts.keySize || 2048,
                    publicKeyEncoding: { type: 'spki', format: 'pem' },
                    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
                });
                return { success: true, publicKey, privateKey, bits: opts.bits || 2048 };
            }

            case 'rsa_encrypt': {
                if ((!input_content && !content) || !opts.publicKey) return { success: false, error: 'content and publicKey required' };
                const encResult = crypto.publicEncrypt(opts.publicKey, Buffer.from(input_content || content));
                return { success: true, encrypted: encResult.toString('base64') };
            }

            case 'rsa_decrypt': {
                if ((!input_content && !content) || !opts.privateKey) return { success: false, error: 'content and privateKey required' };
                const decResult = crypto.privateDecrypt(opts.privateKey, Buffer.from(input_content || content, 'base64'));
                return { success: true, decrypted: decResult.toString('utf8') };
            }

            default:
                return { success: false, error: `Unknown crypto_encrypt action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── crypto_sign ─────────────────────────────────────────────────
async function cryptoSign(params) {
    const { action = 'sign', content, data, ...opts } = params;
    const input_content = content || data;

    try {
        switch (action) {
            case 'sign': {
                if (!input_content || !opts.privateKey) return { success: false, error: 'content/data and privateKey required' };
                const sign = crypto.createSign(opts.algorithm || 'SHA256');
                sign.update(typeof input_content === 'string' ? input_content : JSON.stringify(input_content));
                const signature = sign.sign(opts.privateKey, 'hex');
                return { success: true, signature };
            }

            case 'verify': {
                if (!input_content || !opts.publicKey || !opts.signature) return { success: false, error: 'content/data, publicKey, and signature required' };
                const verify = crypto.createVerify(opts.algorithm || 'SHA256');
                verify.update(typeof input_content === 'string' ? input_content : JSON.stringify(input_content));
                const valid = verify.verify(opts.publicKey, opts.signature, 'hex');
                return { success: true, valid };
            }

            default:
                return { success: false, error: `Unknown crypto_sign action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── scan_secrets ────────────────────────────────────────────────
async function scanSecrets(params) {
    const { dir, filePath, content, scanType, extensions, maxFiles = 500 } = params;

    try {
        const patterns = [
            { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
            { name: 'AWS Secret Key', regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/g },
            { name: 'GitHub Token', regex: /gh[ps]_[A-Za-z0-9_]{36,}/g },
            { name: 'Generic API Key', regex: /(?:api[_-]?key|apikey|api_secret)\s*[=:]\s*['"]([A-Za-z0-9_\-]{20,})['"]?/gi },
            { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
            { name: 'JWT', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
            { name: 'Database URL', regex: /(?:postgres|mysql|mongodb)(?:ql)?:\/\/[^\s'"]+/gi },
            { name: 'Slack Token', regex: /xox[bporas]-[0-9]{10,}-[A-Za-z0-9-]+/g },
            { name: 'Stripe Key', regex: /(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,}/g },
            { name: 'Google API Key', regex: /AIza[0-9A-Za-z_-]{35}/g },
            { name: 'SendGrid Key', regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g },
            { name: 'Twilio Key', regex: /SK[0-9a-fA-F]{32}/g },
            { name: 'Hardcoded Password', regex: /(?:password|passwd|pwd)\s*[=:]\s*['"][^'"]{6,}['"]/gi },
        ];

        // If content is provided directly, scan it
        if (content || scanType === 'content') {
            const findings = [];
            const text = typeof content === 'string' ? content : JSON.stringify(content || '');
            for (const { name, regex } of patterns) {
                regex.lastIndex = 0;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    findings.push({
                        type: name,
                        file: 'inline-content',
                        line: text.slice(0, match.index).split('\n').length,
                        preview: match[0].slice(0, 20) + '***REDACTED***',
                    });
                }
            }
            return {
                success: true,
                findings,
                totalFindings: findings.length,
                filesScanned: 0,
                severity: findings.length > 0 ? 'HIGH' : 'CLEAN',
            };
        }

        // If filePath provided, scan single file
        if (filePath) {
            const findings = [];
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                for (const { name, regex } of patterns) {
                    regex.lastIndex = 0;
                    let match;
                    while ((match = regex.exec(fileContent)) !== null) {
                        findings.push({
                            type: name,
                            file: filePath,
                            line: fileContent.slice(0, match.index).split('\n').length,
                            preview: match[0].slice(0, 20) + '***REDACTED***',
                        });
                    }
                }
            } catch (e) { /* binary or unreadable */ }
            return {
                success: true,
                findings,
                totalFindings: findings.length,
                filesScanned: 1,
                severity: findings.length > 0 ? 'HIGH' : 'CLEAN',
            };
        }

        // Default: scan directory
        const scanDir = dir || '.';
        const files = collectFiles(scanDir, extensions || ['.js', '.ts', '.jsx', '.tsx', '.env', '.json', '.yaml', '.yml', '.py', '.rb', '.go'], maxFiles);
        const findings = [];
        for (const f of files) {
            try {
                const content = fs.readFileSync(f, 'utf-8');
                for (const { name, regex } of patterns) {
                    regex.lastIndex = 0;
                    let match;
                    while ((match = regex.exec(content)) !== null) {
                        const lineNum = content.slice(0, match.index).split('\n').length;
                        findings.push({
                            type: name,
                            file: f,
                            line: lineNum,
                            preview: match[0].slice(0, 20) + '***REDACTED***',
                        });
                    }
                }
            } catch { /* binary */ }
        }
        return {
            success: true,
            findings,
            totalFindings: findings.length,
            filesScanned: files.length,
            severity: findings.length > 0 ? 'HIGH' : 'CLEAN',
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── scan_malware ────────────────────────────────────────────────
async function scanMalware(params) {
    const { file, filePath, content, action, scanType } = params;
    const targetFile = file || filePath;
    const targetAction = action || scanType || 'scan';

    try {
        // Pattern-based scanning (no external API needed for basic scan)
        const suspiciousPatterns = [
            { name: 'eval injection', regex: /eval\s*\(\s*(?:atob|unescape|decodeURIComponent)/gi },
            { name: 'shell execution', regex: /(?:child_process|exec|spawn|execSync)\s*\(\s*(?:req\.|params\.|body\.)/gi },
            { name: 'base64 payload', regex: /(?:atob|Buffer\.from)\s*\(\s*['"][A-Za-z0-9+/=]{100,}['"]\s*\)/g },
            { name: 'obfuscated code', regex: /\\\x[0-9a-f]{2}(?:\\\x[0-9a-f]{2}){20,}/gi },
            { name: 'dynamic require', regex: /require\s*\(\s*(?:req\.|params\.|body\.|query\.)/g },
            { name: 'prototype pollution', regex: /__proto__|constructor\[/g },
            { name: 'path traversal', regex: /\.\.\//g },
            { name: 'SQL injection pattern', regex: /(?:DROP|DELETE|UPDATE|INSERT)\s+(?:TABLE|FROM|INTO)\s+.*(?:\$\{|' \+|" \+)/gi },
        ];

        let targetContent;
        if (targetFile) {
            targetContent = fs.readFileSync(targetFile, 'utf-8');
        } else if (content) {
            targetContent = typeof content === 'string' ? content : JSON.stringify(content);
        } else {
            return { success: false, error: 'file or content required' };
        }

        const threats = [];
        for (const { name, regex } of suspiciousPatterns) {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(targetContent)) !== null) {
                threats.push({
                    type: name,
                    position: match.index,
                    snippet: match[0].slice(0, 50),
                });
            }
        }

        return {
            success: true,
            clean: threats.length === 0,
            threats,
            threatCount: threats.length,
            severity: threats.length > 5 ? 'HIGH' : threats.length > 0 ? 'MEDIUM' : 'CLEAN',
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── auth_generate ───────────────────────────────────────────────
async function authGenerate(params) {
    const { action = 'jwt', ...opts } = params;

    try {
        switch (action) {
            case 'jwt': {
                const jwt = await import('jsonwebtoken');
                const payload = opts.payload || { sub: opts.userId || 'user', iat: Math.floor(Date.now() / 1000) };
                const secret = opts.secret || crypto.randomBytes(32).toString('hex');
                const options = { expiresIn: opts.expiresIn || '1h', algorithm: opts.algorithm || 'HS256' };
                const token = jwt.default.sign(payload, secret, options);
                return { success: true, token, secret: opts.secret ? '(provided)' : secret, expiresIn: options.expiresIn };
            }

            case 'jwt_verify': {
                if (!opts.token || !opts.secret) return { success: false, error: 'token and secret required' };
                const jwt = await import('jsonwebtoken');
                try {
                    const decoded = jwt.default.verify(opts.token, opts.secret);
                    return { success: true, valid: true, decoded };
                } catch (e) {
                    return { success: true, valid: false, error: e.message };
                }
            }

            case 'jwt_decode': {
                if (!opts.token) return { success: false, error: 'token required' };
                const jwt = await import('jsonwebtoken');
                const decoded = jwt.default.decode(opts.token, { complete: true });
                return { success: true, decoded };
            }

            case 'api_key': {
                const prefix = opts.prefix || 'mk';
                const length = opts.length || 32;
                const key = `${prefix}_${crypto.randomBytes(length).toString('hex')}`;
                return { success: true, apiKey: key, prefix, length: key.length };
            }

            case 'uuid': {
                const { v4 } = await import('uuid');
                return { success: true, uuid: v4() };
            }

            case 'password': {
                const length = opts.length || 16;
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                let password = '';
                for (let i = 0; i < length; i++) {
                    password += chars[crypto.randomInt(chars.length)];
                }
                return { success: true, password, length };
            }

            case 'oauth_token': {
                const token = crypto.randomBytes(opts.length || 32).toString('base64url');
                return { success: true, token, length: token.length };
            }

            default:
                return { success: false, error: `Unknown auth_generate action: ${action}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Helper
function collectFiles(dir, extensions, maxFiles = 500, result = []) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (result.length >= maxFiles) break;
            if (['node_modules', '.git', 'dist', '.next', '__pycache__', 'coverage'].includes(e.name)) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) collectFiles(full, extensions, maxFiles, result);
            else if (!extensions || extensions.some(ext => e.name.endsWith(ext))) result.push(full);
        }
    } catch { /* */ }
    return result;
}

export default {
    cryptoHash,
    cryptoEncrypt,
    cryptoSign,
    scanSecrets,
    scanMalware,
    authGenerate,
};
