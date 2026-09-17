/**
 * ============================================================================
 * SECURITY TOOLS V2
 * ============================================================================
 * crypto_hash, crypto_encrypt, crypto_sign, scan_secrets,
 * scan_malware, auth_generate, crypto_random, security_headers, cert_tools
 * ============================================================================
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const SECURITY_TOOL_DEFINITIONS = [
  {
    name: 'crypto_hash',
    description: 'Hash data: MD5, SHA-1, SHA-256, SHA-512, bcrypt-style. Hash strings, files, or verify hashes.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['hash', 'hash_file', 'verify', 'hmac', 'checksum'],
          description: 'Hash action',
        },
        data: { type: 'string', description: 'Data to hash' },
        filePath: { type: 'string', description: '[hash_file/checksum] File path' },
        algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512', 'sha3-256'], description: 'Hash algorithm. Default: sha256' },
        expected: { type: 'string', description: '[verify] Expected hash to compare against' },
        secret: { type: 'string', description: '[hmac] HMAC secret key' },
        encoding: { type: 'string', enum: ['hex', 'base64', 'base64url'], description: 'Output encoding. Default: hex' },
      },
      required: ['action'],
    },
  },
  {
    name: 'crypto_encrypt',
    description: 'Encrypt/decrypt data: AES-256-GCM, AES-256-CBC. Generate encryption keys. Encrypt files or strings.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['encrypt', 'decrypt', 'generate_key', 'encrypt_file', 'decrypt_file'],
          description: 'Encryption action',
        },
        data: { type: 'string', description: 'Data to encrypt/decrypt' },
        key: { type: 'string', description: 'Encryption key (hex encoded)' },
        iv: { type: 'string', description: '[decrypt] Initialization vector (hex)' },
        authTag: { type: 'string', description: '[decrypt GCM] Authentication tag (hex)' },
        algorithm: { type: 'string', enum: ['aes-256-gcm', 'aes-256-cbc'], description: 'Algorithm. Default: aes-256-gcm' },
        filePath: { type: 'string', description: '[encrypt_file/decrypt_file] File path' },
        outputPath: { type: 'string', description: 'Output file path' },
        keyLength: { type: 'number', description: '[generate_key] Key length in bytes. Default: 32' },
      },
      required: ['action'],
    },
  },
  {
    name: 'crypto_sign',
    description: 'Digital signatures: generate key pairs, sign data, verify signatures. RSA and Ed25519.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['generate_keypair', 'sign', 'verify', 'jwt_sign', 'jwt_verify', 'jwt_decode'],
          description: 'Signing action',
        },
        data: { type: 'string', description: 'Data to sign/verify' },
        privateKey: { type: 'string', description: '[sign] Private key PEM' },
        publicKey: { type: 'string', description: '[verify] Public key PEM' },
        signature: { type: 'string', description: '[verify] Signature to verify (hex)' },
        algorithm: { type: 'string', enum: ['rsa', 'ed25519'], description: '[generate_keypair] Algorithm. Default: rsa' },
        token: { type: 'string', description: '[jwt_verify/jwt_decode] JWT token' },
        payload: { type: 'object', description: '[jwt_sign] JWT payload' },
        secret: { type: 'string', description: '[jwt_sign/jwt_verify] JWT secret' },
        expiresIn: { type: 'string', description: '[jwt_sign] Expiry. E.g. "1h", "7d"' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scan_secrets',
    description: 'Scan code for leaked secrets: API keys, passwords, tokens, private keys, connection strings.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File or directory to scan' },
        patterns: { type: 'array', items: { type: 'string' }, description: 'Additional regex patterns to check' },
        ignoreFiles: { type: 'array', items: { type: 'string' }, description: 'Files/patterns to ignore. Default: [".env.example", "*.test.*"]' },
        severity: { type: 'string', enum: ['all', 'high', 'critical'], description: 'Minimum severity. Default: all' },
      },
      required: ['path'],
    },
  },
  {
    name: 'scan_malware',
    description: 'Scan files for suspicious patterns: eval injection, shell commands, obfuscated code, backdoors, suspicious URLs.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File or directory to scan' },
        depth: { type: 'number', description: 'Max directory depth. Default: 5' },
        fileTypes: { type: 'array', items: { type: 'string' }, description: 'File extensions to scan. Default: [".js", ".ts", ".py", ".sh", ".php"]' },
      },
      required: ['path'],
    },
  },
  {
    name: 'auth_generate',
    description: 'Generate auth artifacts: passwords, API keys, tokens, UUIDs, OTP secrets, TOTP codes, password strength check.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['password', 'api_key', 'uuid', 'token', 'otp_secret', 'totp_code', 'password_strength', 'random_bytes'],
          description: 'Generation action',
        },
        length: { type: 'number', description: 'Length for password/api_key/token. Default: 32' },
        charset: { type: 'string', description: '[password] Character set: "alphanumeric", "all", "hex", "base64". Default: all' },
        password: { type: 'string', description: '[password_strength] Password to check' },
        count: { type: 'number', description: 'Generate multiple. Default: 1' },
        prefix: { type: 'string', description: '[api_key] Key prefix. E.g. "sk_", "pk_"' },
      },
      required: ['action'],
    },
  },
  {
    name: 'crypto_random',
    description: `Cryptographically secure random data generation. Generate secure passwords, tokens, IDs, secrets, and measure entropy.

Actions:
- password: Generate strong passwords with configurable complexity (uppercase, lowercase, digits, symbols)
- secret: Generate base64/hex secrets for signing, encryption, HMAC
- nanoid: Generate URL-safe compact random IDs (like nanoid)
- uuid_v4: Generate UUIDv4 identifiers
- dice: Diceware passphrase generation (word-based passwords)
- entropy: Estimate entropy bits of a given string
- bytes: Generate N random bytes in hex/base64

USE THIS WHEN the user says: "generate password", "random secret", "UUID", "nanoid", "entropy of password", "diceware", "random bytes", "secure token"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['password', 'secret', 'nanoid', 'uuid_v4', 'dice', 'entropy', 'bytes'],
          description: 'Random generation action',
        },
        length: { type: 'number', description: 'Length. Default varies by action' },
        count: { type: 'number', description: 'Number to generate. Default: 1' },
        charset: { type: 'string', description: '[password] "all"|"alphanumeric"|"alpha"|"digits"|"hex". Default: all' },
        uppercase: { type: 'boolean', description: '[password] Include uppercase. Default: true' },
        symbols: { type: 'boolean', description: '[password] Include symbols. Default: true' },
        encoding: { type: 'string', enum: ['hex', 'base64', 'base64url'], description: '[secret/bytes] Encoding. Default: hex' },
        wordCount: { type: 'number', description: '[dice] Number of words. Default: 6' },
        separator: { type: 'string', description: '[dice] Word separator. Default: "-"' },
        data: { type: 'string', description: '[entropy] String to analyze' },
      },
      required: ['action'],
    },
  },
  {
    name: 'security_headers',
    description: `HTTP security header analysis and generation. Check a URL for missing security headers, generate CSP/HSTS/CORS/X-Frame-Options configs.

Actions:
- analyze: Scan a URL and grade its security headers (A-F rating)
- generate_csp: Generate Content-Security-Policy header from config
- generate_cors: Generate CORS middleware/headers config
- generate_all: Generate a complete set of recommended security headers
- check_csp: Parse and validate an existing CSP string

USE THIS WHEN the user says: "check security headers", "generate CSP", "CORS config", "HSTS", "X-Frame-Options", "security header audit", "grade security headers"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'generate_csp', 'generate_cors', 'generate_all', 'check_csp'],
          description: 'Header action',
        },
        url: { type: 'string', description: '[analyze] URL to check' },
        allowedOrigins: { type: 'array', items: { type: 'string' }, description: '[generate_cors] Allowed origins' },
        scriptSrc: { type: 'array', items: { type: 'string' }, description: '[generate_csp] script-src values' },
        styleSrc: { type: 'array', items: { type: 'string' }, description: '[generate_csp] style-src values' },
        imgSrc: { type: 'array', items: { type: 'string' }, description: '[generate_csp] img-src values' },
        connectSrc: { type: 'array', items: { type: 'string' }, description: '[generate_csp] connect-src values' },
        frameAncestors: { type: 'array', items: { type: 'string' }, description: '[generate_csp] frame-ancestors values' },
        csp: { type: 'string', description: '[check_csp] CSP string to validate' },
        framework: { type: 'string', enum: ['express', 'nginx', 'apache', 'nextjs'], description: '[generate_all] Target framework. Default: express' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cert_tools',
    description: `SSL/TLS certificate tools. Check certificate expiry, inspect cert details, generate self-signed certs, verify cert chains.

Actions:
- check_expiry: Check SSL certificate expiry for a hostname (days remaining, issuer, subject)
- inspect: Inspect full certificate details (subject, issuer, SAN, key info, serial)
- generate_self_signed: Generate a self-signed certificate + private key (for dev/testing)
- generate_csr: Generate a Certificate Signing Request
- verify_chain: Check if a certificate chain is valid
- decode_pem: Decode and display PEM certificate contents

USE THIS WHEN the user says: "check SSL", "certificate expiry", "generate self-signed cert", "inspect certificate", "CSR", "TLS check", "is the cert valid"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['check_expiry', 'inspect', 'generate_self_signed', 'generate_csr', 'verify_chain', 'decode_pem'],
          description: 'Certificate action',
        },
        hostname: { type: 'string', description: '[check_expiry/inspect] Domain to check. E.g. "example.com"' },
        port: { type: 'number', description: '[check_expiry/inspect] Port. Default: 443' },
        commonName: { type: 'string', description: '[generate_self_signed/generate_csr] Common Name (CN). E.g. "localhost"' },
        organization: { type: 'string', description: '[generate_self_signed/generate_csr] Organization name' },
        altNames: { type: 'array', items: { type: 'string' }, description: '[generate_self_signed/generate_csr] Subject Alt Names' },
        days: { type: 'number', description: '[generate_self_signed] Validity days. Default: 365' },
        keySize: { type: 'number', description: '[generate_self_signed/generate_csr] RSA key size. Default: 2048' },
        pem: { type: 'string', description: '[decode_pem/verify_chain] PEM-encoded certificate' },
        outputPath: { type: 'string', description: 'Output directory for generated files' },
      },
      required: ['action'],
    },
  },
];

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeCryptoHash(input) {
  const { action, data, filePath, algorithm = 'sha256', expected, secret, encoding = 'hex' } = input;

  switch (action) {
    case 'hash': {
      if (!data) return JSON.stringify({ status: 'error', error: 'data required' });
      const hash = crypto.createHash(algorithm).update(data).digest(encoding);
      return JSON.stringify({ status: 'success', algorithm, encoding, hash, inputLength: data.length });
    }
    case 'hash_file': {
      if (!filePath) return JSON.stringify({ status: 'error', error: 'filePath required' });
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash(algorithm).update(content).digest(encoding);
      return JSON.stringify({ status: 'success', algorithm, encoding, hash, file: filePath, fileSize: content.length });
    }
    case 'verify': {
      if (!data || !expected) return JSON.stringify({ status: 'error', error: 'data and expected required' });
      const hash = crypto.createHash(algorithm).update(data).digest(encoding);
      return JSON.stringify({ status: 'success', match: hash === expected, computed: hash, expected });
    }
    case 'hmac': {
      if (!data || !secret) return JSON.stringify({ status: 'error', error: 'data and secret required' });
      const hmac = crypto.createHmac(algorithm, secret).update(data).digest(encoding);
      return JSON.stringify({ status: 'success', algorithm, encoding, hmac });
    }
    case 'checksum': {
      if (!filePath) return JSON.stringify({ status: 'error', error: 'filePath required' });
      const content = fs.readFileSync(filePath);
      const checksums = {
        md5: crypto.createHash('md5').update(content).digest('hex'),
        sha1: crypto.createHash('sha1').update(content).digest('hex'),
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
      };
      return JSON.stringify({ status: 'success', file: filePath, fileSize: content.length, checksums });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown hash action: ${action}` });
  }
}

async function executeCryptoEncrypt(input) {
  const { action, data, key, iv, authTag, algorithm = 'aes-256-gcm', filePath, outputPath, keyLength = 32 } = input;

  switch (action) {
    case 'generate_key': {
      const newKey = crypto.randomBytes(keyLength).toString('hex');
      const newIv = crypto.randomBytes(16).toString('hex');
      return JSON.stringify({ status: 'success', key: newKey, iv: newIv, keyLength, algorithm });
    }
    case 'encrypt': {
      if (!data || !key) return JSON.stringify({ status: 'error', error: 'data and key required' });
      const keyBuf = Buffer.from(key, 'hex');
      const ivBuf = crypto.randomBytes(16);
      if (algorithm === 'aes-256-gcm') {
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, ivBuf);
        let encrypted = cipher.update(data, 'utf-8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');
        return JSON.stringify({ status: 'success', encrypted, iv: ivBuf.toString('hex'), authTag: tag, algorithm });
      } else {
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, ivBuf);
        let encrypted = cipher.update(data, 'utf-8', 'hex');
        encrypted += cipher.final('hex');
        return JSON.stringify({ status: 'success', encrypted, iv: ivBuf.toString('hex'), algorithm });
      }
    }
    case 'decrypt': {
      if (!data || !key || !iv) return JSON.stringify({ status: 'error', error: 'data, key, and iv required' });
      try {
        const keyBuf = Buffer.from(key, 'hex');
        const ivBuf = Buffer.from(iv, 'hex');
        if (algorithm === 'aes-256-gcm') {
          if (!authTag) return JSON.stringify({ status: 'error', error: 'authTag required for GCM' });
          const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
          decipher.setAuthTag(Buffer.from(authTag, 'hex'));
          let decrypted = decipher.update(data, 'hex', 'utf-8');
          decrypted += decipher.final('utf-8');
          return JSON.stringify({ status: 'success', decrypted });
        } else {
          const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
          let decrypted = decipher.update(data, 'hex', 'utf-8');
          decrypted += decipher.final('utf-8');
          return JSON.stringify({ status: 'success', decrypted });
        }
      } catch (e) {
        return JSON.stringify({ status: 'error', error: `Decryption failed: ${e.message}` });
      }
    }
    case 'encrypt_file': {
      if (!filePath || !key) return JSON.stringify({ status: 'error', error: 'filePath and key required' });
      const content = fs.readFileSync(filePath);
      const keyBuf = Buffer.from(key, 'hex');
      const ivBuf = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, ivBuf);
      const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
      const tag = cipher.getAuthTag();
      const out = outputPath || filePath + '.enc';
      const output = Buffer.concat([ivBuf, tag, encrypted]);
      fs.writeFileSync(out, output);
      return JSON.stringify({ status: 'success', file: out, originalSize: content.length, encryptedSize: output.length });
    }
    case 'decrypt_file': {
      if (!filePath || !key) return JSON.stringify({ status: 'error', error: 'filePath and key required' });
      try {
        const content = fs.readFileSync(filePath);
        const ivBuf = content.subarray(0, 16);
        const tag = content.subarray(16, 32);
        const encrypted = content.subarray(32);
        const keyBuf = Buffer.from(key, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const out = outputPath || filePath.replace('.enc', '');
        fs.writeFileSync(out, decrypted);
        return JSON.stringify({ status: 'success', file: out, size: decrypted.length });
      } catch (e) {
        return JSON.stringify({ status: 'error', error: `Decryption failed: ${e.message}` });
      }
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown encrypt action: ${action}` });
  }
}

async function executeCryptoSign(input) {
  const { action, data, privateKey, publicKey, signature, algorithm = 'rsa', token, payload, secret, expiresIn = '1h' } = input;

  switch (action) {
    case 'generate_keypair': {
      if (algorithm === 'ed25519') {
        const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('ed25519', {
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return JSON.stringify({ status: 'success', algorithm: 'ed25519', publicKey: pub, privateKey: priv });
      }
      const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return JSON.stringify({ status: 'success', algorithm: 'rsa', bits: 2048, publicKey: pub, privateKey: priv });
    }
    case 'sign': {
      if (!data || !privateKey) return JSON.stringify({ status: 'error', error: 'data and privateKey required' });
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      const sig = sign.sign(privateKey, 'hex');
      return JSON.stringify({ status: 'success', signature: sig });
    }
    case 'verify': {
      if (!data || !publicKey || !signature) return JSON.stringify({ status: 'error', error: 'data, publicKey, and signature required' });
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      const valid = verify.verify(publicKey, signature, 'hex');
      return JSON.stringify({ status: 'success', valid });
    }
    case 'jwt_sign': {
      if (!payload || !secret) return JSON.stringify({ status: 'error', error: 'payload and secret required' });
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const exp = Math.floor(Date.now() / 1000) + parseExpiry(expiresIn);
      const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp })).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
      return JSON.stringify({ status: 'success', token: `${header}.${body}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() });
    }
    case 'jwt_verify': {
      if (!token || !secret) return JSON.stringify({ status: 'error', error: 'token and secret required' });
      const parts = token.split('.');
      if (parts.length !== 3) return JSON.stringify({ status: 'error', error: 'Invalid JWT format' });
      const sig = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
      const valid = sig === parts[2];
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const expired = payload.exp && payload.exp < Math.floor(Date.now() / 1000);
      return JSON.stringify({ status: 'success', valid, expired, payload });
    }
    case 'jwt_decode': {
      if (!token) return JSON.stringify({ status: 'error', error: 'token required' });
      const parts = token.split('.');
      if (parts.length !== 3) return JSON.stringify({ status: 'error', error: 'Invalid JWT format' });
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return JSON.stringify({ status: 'success', header, payload, note: 'Signature not verified (use jwt_verify)' });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown sign action: ${action}` });
  }
}

async function executeScanSecrets(input) {
  const { path: targetPath, patterns: extraPatterns = [], ignoreFiles = ['.env.example', '*.test.*', '*.spec.*'], severity = 'all' } = input;

  const SECRET_PATTERNS = [
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
    { name: 'AWS Secret Key', pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi, severity: 'critical' },
    { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
    { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]([A-Za-z0-9\-_]{20,})['"]?/gi, severity: 'high' },
    { name: 'Generic Secret', pattern: /(?:secret|password|passwd|token)\s*[=:]\s*['"]([^'"]{8,})['"]?/gi, severity: 'high' },
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical' },
    { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g, severity: 'high' },
    { name: 'Stripe Key', pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/g, severity: 'critical' },
    { name: 'Database URL', pattern: /(?:postgres|mysql|mongodb):\/\/[^@\s]+@[^\s'"]+/gi, severity: 'critical' },
    { name: 'Slack Token', pattern: /xox[bpoas]-[A-Za-z0-9-]+/g, severity: 'high' },
    { name: 'Basic Auth Header', pattern: /Authorization:\s*Basic\s+[A-Za-z0-9+/=]{10,}/gi, severity: 'high' },
    { name: 'IP Address (hardcoded)', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, severity: 'low' },
  ];

  extraPatterns.forEach(p => {
    try { SECRET_PATTERNS.push({ name: 'Custom pattern', pattern: new RegExp(p, 'g'), severity: 'high' }); } catch { }
  });

  const sevOrder = { critical: 3, high: 2, low: 1 };
  const minSev = severity === 'critical' ? 3 : severity === 'high' ? 2 : 0;

  const findings = [];
  const isIgnored = (fp) => ignoreFiles.some(ig => fp.includes(ig.replace('*', '')));

  const scanFile = (fp) => {
    if (isIgnored(fp)) return;
    try {
      const content = fs.readFileSync(fp, 'utf-8');
      const lines = content.split('\n');
      for (const sp of SECRET_PATTERNS) {
        if ((sevOrder[sp.severity] || 0) < minSev) continue;
        sp.pattern.lastIndex = 0;
        let match;
        while ((match = sp.pattern.exec(content)) !== null) {
          const lineNum = content.slice(0, match.index).split('\n').length;
          const line = lines[lineNum - 1] || '';
          if (line.includes('example') || line.includes('placeholder') || line.includes('TODO')) continue;
          findings.push({
            file: fp, line: lineNum, type: sp.name, severity: sp.severity,
            snippet: line.trim().slice(0, 100),
          });
        }
      }
    } catch { }
  };

  const walkDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if (stat.isFile()) { scanFile(dir); return; }
    fs.readdirSync(dir).forEach(e => {
      if (e === 'node_modules' || e === '.git' || e === 'dist') return;
      const fp = path.join(dir, e);
      try {
        if (fs.statSync(fp).isDirectory()) walkDir(fp);
        else scanFile(fp);
      } catch { }
    });
  };

  walkDir(targetPath);
  findings.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0));

  const bySeverity = {};
  findings.forEach(f => { bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1; });

  return JSON.stringify({ status: 'success', totalFindings: findings.length, bySeverity, findings: findings.slice(0, 100) });
}

async function executeScanMalware(input) {
  const { path: targetPath, depth = 5, fileTypes = ['.js', '.ts', '.py', '.sh', '.php'] } = input;

  const SUSPICIOUS_PATTERNS = [
    { name: 'eval() usage', pattern: /\beval\s*\(/g, severity: 'high', description: 'Dynamic code execution' },
    { name: 'Function constructor', pattern: /new\s+Function\s*\(/g, severity: 'high', description: 'Dynamic function creation' },
    { name: 'Child process exec', pattern: /(?:exec|execSync|spawn)\s*\(\s*(?:req\.|input|user)/gi, severity: 'critical', description: 'Unsanitized shell execution' },
    { name: 'Base64 decode exec', pattern: /(?:atob|Buffer\.from)\s*\([^)]+,\s*['"]base64['"]\).*(?:eval|exec|Function)/g, severity: 'critical', description: 'Obfuscated code execution' },
    { name: 'Suspicious require', pattern: /require\s*\(\s*(?:req\.|input|user|process\.env)/g, severity: 'high', description: 'Dynamic module loading' },
    { name: 'Outbound data exfil', pattern: /(?:https?:\/\/[^/\s]+).*(?:process\.env|fs\.read|password|secret|key)/gi, severity: 'high', description: 'Potential data exfiltration' },
    { name: 'Crypto mining', pattern: /(?:coinhive|cryptonight|monero|stratum\+tcp)/gi, severity: 'critical', description: 'Cryptocurrency mining' },
    { name: 'Reverse shell', pattern: /(?:\/bin\/(?:bash|sh)|nc\s+-[elp]|ncat.*-e|bash\s+-i)/g, severity: 'critical', description: 'Reverse shell pattern' },
    { name: 'SQL injection vector', pattern: /(?:SELECT|INSERT|UPDATE|DELETE).*\$\{/gi, severity: 'high', description: 'Potential SQL injection via template literals' },
    { name: 'Prototype pollution', pattern: /__proto__|constructor\s*\[/g, severity: 'high', description: 'Prototype pollution risk' },
  ];

  const findings = [];

  const scanFile = (fp, currentDepth) => {
    if (currentDepth > depth) return;
    const ext = path.extname(fp);
    if (!fileTypes.includes(ext)) return;
    try {
      const content = fs.readFileSync(fp, 'utf-8');
      const lines = content.split('\n');
      for (const sp of SUSPICIOUS_PATTERNS) {
        sp.pattern.lastIndex = 0;
        let match;
        while ((match = sp.pattern.exec(content)) !== null) {
          const lineNum = content.slice(0, match.index).split('\n').length;
          findings.push({
            file: fp, line: lineNum, type: sp.name, severity: sp.severity,
            description: sp.description, snippet: (lines[lineNum - 1] || '').trim().slice(0, 120),
          });
        }
      }
    } catch { }
  };

  const walkDir = (dir, currentDepth = 0) => {
    if (!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if (stat.isFile()) { scanFile(dir, currentDepth); return; }
    if (currentDepth > depth) return;
    fs.readdirSync(dir).forEach(e => {
      if (e === 'node_modules' || e === '.git') return;
      const fp = path.join(dir, e);
      try {
        if (fs.statSync(fp).isDirectory()) walkDir(fp, currentDepth + 1);
        else scanFile(fp, currentDepth);
      } catch { }
    });
  };

  walkDir(targetPath);
  findings.sort((a, b) => (b.severity === 'critical' ? 2 : 1) - (a.severity === 'critical' ? 2 : 1));

  return JSON.stringify({ status: 'success', totalFindings: findings.length, findings: findings.slice(0, 100) });
}

async function executeAuthGenerate(input) {
  const { action, length = 32, charset = 'all', password: checkPassword, count = 1, prefix = '' } = input;

  switch (action) {
    case 'password': {
      const charsets = {
        alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        all: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?',
        hex: '0123456789abcdef',
        base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      };
      const chars = charsets[charset] || charsets.all;
      const passwords = Array.from({ length: Math.min(count, 50) }, () => {
        const bytes = crypto.randomBytes(length);
        return Array.from(bytes).map(b => chars[b % chars.length]).join('');
      });
      return JSON.stringify({ status: 'success', passwords, length, charset });
    }
    case 'api_key': {
      const keys = Array.from({ length: Math.min(count, 50) }, () => {
        return prefix + crypto.randomBytes(length).toString('base64url').slice(0, length);
      });
      return JSON.stringify({ status: 'success', keys, length, prefix });
    }
    case 'uuid': {
      const uuids = Array.from({ length: Math.min(count, 50) }, () => crypto.randomUUID());
      return JSON.stringify({ status: 'success', uuids });
    }
    case 'token': {
      const tokens = Array.from({ length: Math.min(count, 50) }, () => crypto.randomBytes(length).toString('hex'));
      return JSON.stringify({ status: 'success', tokens, length });
    }
    case 'otp_secret': {
      const secret = crypto.randomBytes(20).toString('base32' in Buffer.prototype ? 'base32' : 'hex');
      const base32Secret = Buffer.from(secret, 'hex').toString('base64').replace(/[+/=]/g, '').slice(0, 32).toUpperCase();
      return JSON.stringify({ status: 'success', secret: base32Secret, otpauthUrl: `otpauth://totp/App:user@example.com?secret=${base32Secret}&issuer=App` });
    }
    case 'password_strength': {
      if (!checkPassword) return JSON.stringify({ status: 'error', error: 'password required' });
      const checks = {
        length: checkPassword.length >= 8,
        uppercase: /[A-Z]/.test(checkPassword),
        lowercase: /[a-z]/.test(checkPassword),
        numbers: /\d/.test(checkPassword),
        symbols: /[^A-Za-z0-9]/.test(checkPassword),
        noCommon: !['password', '123456', 'qwerty', 'admin', 'letmein'].includes(checkPassword.toLowerCase()),
        noRepeating: !/(.)\1{2,}/.test(checkPassword),
      };
      const score = Object.values(checks).filter(Boolean).length;
      const strength = score <= 2 ? 'very_weak' : score <= 3 ? 'weak' : score <= 5 ? 'moderate' : score <= 6 ? 'strong' : 'very_strong';
      return JSON.stringify({ status: 'success', strength, score: `${score}/7`, checks, length: checkPassword.length });
    }
    case 'random_bytes': {
      const bytes = crypto.randomBytes(Math.min(length, 256));
      return JSON.stringify({ status: 'success', hex: bytes.toString('hex'), base64: bytes.toString('base64'), length: bytes.length });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown auth action: ${action}` });
  }
}

// ============================================================================
// EXECUTOR: crypto_random
// ============================================================================

async function executeCryptoRandom(input) {
  const { action, length, count = 1, charset = 'all', uppercase = true, symbols = true, encoding = 'hex', wordCount = 6, separator = '-', data } = input;

  switch (action) {
    case 'password': {
      const len = length || 20;
      const n = Math.min(count, 50);
      let chars = 'abcdefghijklmnopqrstuvwxyz';
      if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (charset !== 'alpha') chars += '0123456789';
      if (symbols && charset === 'all') chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (charset === 'alphanumeric') chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      if (charset === 'hex') chars = '0123456789abcdef';
      const passwords = [];
      for (let i = 0; i < n; i++) {
        const bytes = crypto.randomBytes(len);
        let pwd = '';
        for (let j = 0; j < len; j++) pwd += chars[bytes[j] % chars.length];
        const entropy = Math.log2(chars.length) * len;
        passwords.push({ password: pwd, length: len, entropy: +entropy.toFixed(1) });
      }
      return JSON.stringify({ status: 'success', passwords, charset, strength: passwords[0].entropy > 80 ? 'very strong' : passwords[0].entropy > 60 ? 'strong' : passwords[0].entropy > 40 ? 'moderate' : 'weak' });
    }
    case 'secret': {
      const len = length || 32;
      const n = Math.min(count, 20);
      const secrets = [];
      for (let i = 0; i < n; i++) {
        const buf = crypto.randomBytes(len);
        secrets.push({ secret: buf.toString(encoding), bytes: len, encoding });
      }
      return JSON.stringify({ status: 'success', secrets });
    }
    case 'nanoid': {
      const len = length || 21;
      const n = Math.min(count, 50);
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
      const ids = [];
      for (let i = 0; i < n; i++) {
        const bytes = crypto.randomBytes(len);
        let id = '';
        for (let j = 0; j < len; j++) id += alphabet[bytes[j] % alphabet.length];
        ids.push(id);
      }
      return JSON.stringify({ status: 'success', ids, length: len, collisionProbability: `~1 in 2^${Math.floor(Math.log2(64) * len)}` });
    }
    case 'uuid_v4': {
      const n = Math.min(count, 50);
      const uuids = [];
      for (let i = 0; i < n; i++) {
        uuids.push(crypto.randomUUID());
      }
      return JSON.stringify({ status: 'success', uuids });
    }
    case 'dice': {
      const words = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
        'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'action',
        'actor', 'actual', 'adapt', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic',
        'affair', 'afford', 'afraid', 'again', 'agent', 'agree', 'ahead', 'alien', 'allow', 'almost',
        'alone', 'alpha', 'already', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'anchor',
        'ancient', 'angle', 'animal', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'apart',
        'apology', 'apple', 'approve', 'arctic', 'arena', 'armor', 'army', 'arrive', 'arrow', 'artist',
        'asset', 'assist', 'assume', 'atom', 'attack', 'auction', 'audit', 'august', 'auto', 'avocado',
        'award', 'awesome', 'axis', 'baby', 'bachelor', 'bacon', 'badge', 'balance', 'banana', 'banner',
        'barrel', 'basket', 'battle', 'beach', 'beauty', 'become', 'believe', 'benefit', 'bicycle', 'blanket',
        'blossom', 'board', 'bonus', 'brain', 'brave', 'breeze', 'bridge', 'bright', 'bronze', 'brother',
        'budget', 'buffalo', 'burger', 'butter', 'cabin', 'camera', 'campus', 'candle', 'canyon', 'captain',
        'carbon', 'carpet', 'castle', 'catalog', 'cattle', 'ceiling', 'celery', 'cement', 'census', 'century',
        'chair', 'chalk', 'champion', 'change', 'chapter', 'cheese', 'cherry', 'chicken', 'choice', 'chunk',
        'cinema', 'circle', 'citizen', 'clarity', 'clever', 'climate', 'clinic', 'clock', 'cloud', 'cluster'];
      const wc = Math.min(wordCount, 12);
      const n = Math.min(count, 10);
      const passphrases = [];
      for (let i = 0; i < n; i++) {
        const bytes = crypto.randomBytes(wc);
        const phrase = Array.from(bytes).slice(0, wc).map(b => words[b % words.length]).join(separator);
        const entropy = Math.log2(words.length) * wc;
        passphrases.push({ passphrase: phrase, wordCount: wc, entropy: +entropy.toFixed(1) });
      }
      return JSON.stringify({ status: 'success', passphrases, wordListSize: words.length });
    }
    case 'entropy': {
      if (!data) return JSON.stringify({ status: 'error', error: 'data required' });
      const charSet = new Set(data.split(''));
      const freq = {};
      data.split('').forEach(c => { freq[c] = (freq[c] || 0) + 1; });
      let entropy = 0;
      for (const c of Object.values(freq)) {
        const p = c / data.length;
        entropy -= p * Math.log2(p);
      }
      const totalEntropy = entropy * data.length;
      const poolSize = charSet.size;
      const idealEntropy = Math.log2(poolSize) * data.length;
      return JSON.stringify({
        status: 'success', length: data.length, uniqueChars: poolSize,
        shannonEntropy: +entropy.toFixed(4), totalBits: +totalEntropy.toFixed(1),
        idealBits: +idealEntropy.toFixed(1), efficiency: +((totalEntropy / idealEntropy) * 100).toFixed(1),
        strength: totalEntropy > 128 ? 'excellent' : totalEntropy > 80 ? 'strong' : totalEntropy > 60 ? 'moderate' : totalEntropy > 40 ? 'weak' : 'very weak',
      });
    }
    case 'bytes': {
      const len = length || 32;
      const buf = crypto.randomBytes(len);
      return JSON.stringify({ status: 'success', bytes: buf.toString(encoding), length: len, encoding, bits: len * 8 });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown random action: ${action}` });
  }
}

// ============================================================================
// EXECUTOR: security_headers
// ============================================================================

async function executeSecurityHeaders(input) {
  const { action, url, allowedOrigins = [], scriptSrc = [], styleSrc = [], imgSrc = [], connectSrc = [], frameAncestors = [], csp, framework = 'express' } = input;

  switch (action) {
    case 'analyze': {
      if (!url) return JSON.stringify({ status: 'error', error: 'url required' });
      try {
        const parsedUrl = new URL(url);
        const mod = parsedUrl.protocol === 'https:' ? await import('https') : await import('http');
        const headers = await new Promise((resolve, reject) => {
          const req = mod.default.request(url, { method: 'HEAD', timeout: 10000 }, res => resolve(res.headers));
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
          req.end();
        });

        const checks = [
          { header: 'strict-transport-security', name: 'HSTS', critical: true },
          { header: 'content-security-policy', name: 'CSP', critical: true },
          { header: 'x-content-type-options', name: 'X-Content-Type-Options', critical: true },
          { header: 'x-frame-options', name: 'X-Frame-Options', critical: true },
          { header: 'x-xss-protection', name: 'X-XSS-Protection', critical: false },
          { header: 'referrer-policy', name: 'Referrer-Policy', critical: false },
          { header: 'permissions-policy', name: 'Permissions-Policy', critical: false },
          { header: 'cross-origin-opener-policy', name: 'COOP', critical: false },
          { header: 'cross-origin-resource-policy', name: 'CORP', critical: false },
          { header: 'cross-origin-embedder-policy', name: 'COEP', critical: false },
        ];

        const results = checks.map(c => ({
          header: c.name, present: !!headers[c.header], critical: c.critical,
          value: headers[c.header] || null,
        }));

        const presentCount = results.filter(r => r.present).length;
        const criticalMissing = results.filter(r => !r.present && r.critical);
        const score = Math.round((presentCount / checks.length) * 100);
        const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';

        return JSON.stringify({ status: 'success', url, grade, score, headers: results, criticalMissing: criticalMissing.map(r => r.header), server: headers['server'] || 'unknown' });
      } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
      }
    }
    case 'generate_csp': {
      const directives = ["default-src 'self'"];
      if (scriptSrc.length) directives.push(`script-src 'self' ${scriptSrc.join(' ')}`);
      else directives.push("script-src 'self'");
      if (styleSrc.length) directives.push(`style-src 'self' ${styleSrc.join(' ')}`);
      else directives.push("style-src 'self' 'unsafe-inline'");
      if (imgSrc.length) directives.push(`img-src 'self' ${imgSrc.join(' ')}`);
      else directives.push("img-src 'self' data: https:");
      if (connectSrc.length) directives.push(`connect-src 'self' ${connectSrc.join(' ')}`);
      else directives.push("connect-src 'self'");
      if (frameAncestors.length) directives.push(`frame-ancestors ${frameAncestors.join(' ')}`);
      else directives.push("frame-ancestors 'none'");
      directives.push("base-uri 'self'", "form-action 'self'", "object-src 'none'");
      const cspStr = directives.join('; ');
      return JSON.stringify({ status: 'success', csp: cspStr, directives: directives.length });
    }
    case 'generate_cors': {
      const origins = allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'];
      const configs = {
        express: `import cors from 'cors';

const corsOptions = {
  origin: ${JSON.stringify(origins, null, 2)},
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));`,
        nginx: `# CORS configuration
add_header 'Access-Control-Allow-Origin' '${origins[0]}' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Max-Age' '86400' always;

if ($request_method = 'OPTIONS') {
    return 204;
}`,
      };
      return JSON.stringify({ status: 'success', framework, origins, config: configs[framework] || configs.express });
    }
    case 'generate_all': {
      const headerConfigs = {
        express: `import helmet from 'helmet';

// Apply all security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Additional headers not covered by helmet
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});`,
        nginx: `# Security Headers (add to server or location block)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;`,
        apache: `# Security Headers (.htaccess or httpd.conf)
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"`,
        nextjs: `// next.config.js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};`,
      };
      return JSON.stringify({ status: 'success', framework, config: headerConfigs[framework] || headerConfigs.express });
    }
    case 'check_csp': {
      if (!csp) return JSON.stringify({ status: 'error', error: 'csp string required' });
      const directives = csp.split(';').map(d => d.trim()).filter(Boolean);
      const parsed = {};
      const issues = [];
      for (const dir of directives) {
        const parts = dir.split(/\s+/);
        const name = parts[0];
        const values = parts.slice(1);
        parsed[name] = values;
        if (values.includes("'unsafe-inline'") && name === 'script-src') issues.push("script-src has 'unsafe-inline' — XSS risk");
        if (values.includes("'unsafe-eval'")) issues.push(`${name} has 'unsafe-eval' — code injection risk`);
        if (values.includes('*')) issues.push(`${name} has wildcard '*' — too permissive`);
      }
      if (!parsed['default-src']) issues.push("Missing default-src — no fallback policy");
      if (!parsed['script-src'] && !parsed['default-src']) issues.push("No script-src or default-src — scripts unrestricted");
      if (!parsed['frame-ancestors']) issues.push("Missing frame-ancestors — clickjacking risk");
      return JSON.stringify({ status: 'success', directiveCount: directives.length, directives: parsed, issues, secure: issues.length === 0 });
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown headers action: ${action}` });
  }
}

// ============================================================================
// EXECUTOR: cert_tools
// ============================================================================

async function executeCertTools(input) {
  const { action, hostname, port = 443, commonName = 'localhost', organization = 'Development', altNames = [], days = 365, keySize = 2048, pem, outputPath } = input;

  switch (action) {
    case 'check_expiry': {
      if (!hostname) return JSON.stringify({ status: 'error', error: 'hostname required' });
      try {
        const tls = await import('tls');
        const cert = await new Promise((resolve, reject) => {
          const socket = tls.default.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: 10000 }, () => {
            const c = socket.getPeerCertificate();
            socket.destroy();
            resolve(c);
          });
          socket.on('error', reject);
          socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timeout')); });
        });
        if (!cert || !cert.valid_to) return JSON.stringify({ status: 'error', error: 'No certificate returned' });
        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const daysRemaining = Math.floor((validTo - Date.now()) / (86400 * 1000));
        return JSON.stringify({
          status: 'success', hostname, port, subject: cert.subject?.CN || hostname,
          issuer: cert.issuer?.O || cert.issuer?.CN || 'unknown',
          validFrom: validFrom.toISOString(), validTo: validTo.toISOString(),
          daysRemaining, expired: daysRemaining < 0,
          warning: daysRemaining < 30 ? 'Certificate expires soon' : null,
          serialNumber: cert.serialNumber,
        });
      } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
      }
    }
    case 'inspect': {
      if (!hostname) return JSON.stringify({ status: 'error', error: 'hostname required' });
      try {
        const tls = await import('tls');
        const cert = await new Promise((resolve, reject) => {
          const socket = tls.default.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: 10000 }, () => {
            const c = socket.getPeerCertificate(true);
            socket.destroy();
            resolve(c);
          });
          socket.on('error', reject);
          socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timeout')); });
        });
        const san = cert.subjectaltname ? cert.subjectaltname.split(', ').map(s => s.replace('DNS:', '')) : [];
        return JSON.stringify({
          status: 'success', hostname, subject: cert.subject, issuer: cert.issuer,
          validFrom: cert.valid_from, validTo: cert.valid_to,
          serialNumber: cert.serialNumber, fingerprint: cert.fingerprint,
          fingerprint256: cert.fingerprint256, subjectAltNames: san,
          keySize: cert.bits, protocol: `TLSv${cert.modulus ? '1.2+' : 'unknown'}`,
        });
      } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
      }
    }
    case 'generate_self_signed': {
      const { generateKeyPairSync, createSign, X509Certificate } = crypto;
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: keySize,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      // Build basic self-signed cert info (full x509 gen needs openssl - provide key pair + usage instructions)
      const certInfo = {
        commonName, organization, altNames,
        keySize, validDays: days,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      };

      if (outputPath) {
        const dir = outputPath;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'private.key'), privateKey);
        fs.writeFileSync(path.join(dir, 'public.key'), publicKey);
        fs.writeFileSync(path.join(dir, 'cert-info.json'), JSON.stringify(certInfo, null, 2));
        return JSON.stringify({ status: 'success', files: { privateKey: path.join(dir, 'private.key'), publicKey: path.join(dir, 'public.key'), info: path.join(dir, 'cert-info.json') }, certInfo, note: 'For a full X.509 cert, use: openssl req -new -x509 -key private.key -out cert.pem -days ' + days });
      }
      return JSON.stringify({ status: 'success', privateKey: privateKey.slice(0, 200) + '...', publicKey: publicKey.slice(0, 200) + '...', certInfo, opensslCommand: `openssl req -new -x509 -key private.key -out cert.pem -days ${days} -subj "/CN=${commonName}/O=${organization}"` });
    }
    case 'generate_csr': {
      const { generateKeyPairSync } = crypto;
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: keySize,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const csrInfo = { commonName, organization, altNames, keySize, generatedAt: new Date().toISOString() };
      const opensslCmd = `openssl req -new -key private.key -out request.csr -subj "/CN=${commonName}/O=${organization}"${altNames.length ? ` -addext "subjectAltName=${altNames.map(n => 'DNS:' + n).join(',')}"` : ''}`;

      if (outputPath) {
        const dir = outputPath;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'private.key'), privateKey);
        fs.writeFileSync(path.join(dir, 'public.key'), publicKey);
        return JSON.stringify({ status: 'success', files: { privateKey: path.join(dir, 'private.key'), publicKey: path.join(dir, 'public.key') }, csrInfo, opensslCommand: opensslCmd });
      }
      return JSON.stringify({ status: 'success', privateKey: privateKey.slice(0, 200) + '...', publicKey: publicKey.slice(0, 200) + '...', csrInfo, opensslCommand: opensslCmd });
    }
    case 'decode_pem': {
      if (!pem) return JSON.stringify({ status: 'error', error: 'pem required' });
      try {
        const x509 = new crypto.X509Certificate(pem);
        return JSON.stringify({
          status: 'success', subject: x509.subject, issuer: x509.issuer,
          validFrom: x509.validFrom, validTo: x509.validTo,
          serialNumber: x509.serialNumber, fingerprint: x509.fingerprint,
          fingerprint256: x509.fingerprint256, keyUsage: x509.keyUsage,
          subjectAltName: x509.subjectAltName,
          isCA: x509.ca,
        });
      } catch (e) {
        // Fallback: try to detect PEM type
        const type = pem.includes('CERTIFICATE') ? 'certificate' : pem.includes('PRIVATE KEY') ? 'private_key' : pem.includes('PUBLIC KEY') ? 'public_key' : 'unknown';
        return JSON.stringify({ status: 'partial', type, error: `Could not fully decode: ${e.message}`, pemLength: pem.length });
      }
    }
    case 'verify_chain': {
      if (!pem) return JSON.stringify({ status: 'error', error: 'pem required' });
      try {
        const certs = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
        const chain = certs.map((certPem, i) => {
          try {
            const x509 = new crypto.X509Certificate(certPem);
            return { index: i, subject: x509.subject, issuer: x509.issuer, validTo: x509.validTo, isCA: x509.ca };
          } catch (e) {
            return { index: i, error: e.message };
          }
        });
        return JSON.stringify({ status: 'success', chainLength: chain.length, certificates: chain, valid: chain.every(c => !c.error) });
      } catch (e) {
        return JSON.stringify({ status: 'error', error: e.message });
      }
    }
    default:
      return JSON.stringify({ status: 'error', error: `Unknown cert action: ${action}` });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function parseExpiry(str) {
  const match = str.match(/(\d+)\s*(s|m|h|d|w)/);
  if (!match) return 3600;
  const val = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  return val * (multipliers[unit] || 3600);
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeSecurityTool(toolName, input, ctx = {}) {
  switch (toolName) {
    case 'crypto_hash': return { result: await executeCryptoHash(input), sideEffects: null };
    case 'crypto_encrypt': return { result: await executeCryptoEncrypt(input), sideEffects: null };
    case 'crypto_sign': return { result: await executeCryptoSign(input), sideEffects: null };
    case 'scan_secrets': return { result: await executeScanSecrets(input), sideEffects: null };
    case 'scan_malware': return { result: await executeScanMalware(input), sideEffects: null };
    case 'auth_generate': return { result: await executeAuthGenerate(input), sideEffects: null };
    case 'crypto_random': return { result: await executeCryptoRandom(input), sideEffects: null };
    case 'security_headers': return { result: await executeSecurityHeaders(input), sideEffects: null };
    case 'cert_tools': return { result: await executeCertTools(input), sideEffects: null };
    default: return { result: JSON.stringify({ status: 'error', error: `Unknown security tool: ${toolName}` }), sideEffects: null };
  }
}

const SECURITY_TOOL_NAMES = new Set(SECURITY_TOOL_DEFINITIONS.map(t => t.name));
function isSecurityTool(toolName) { return SECURITY_TOOL_NAMES.has(toolName); }

export { SECURITY_TOOL_DEFINITIONS, executeSecurityTool, isSecurityTool };
