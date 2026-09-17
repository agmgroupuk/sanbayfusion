import React from 'react';
import ToolExecutionPanel, { type ToolDefinition, type ExecutionResult } from './shared/ToolExecutionPanel';

interface SecurityScanPanelProps {
    currentCode?: string;
}

const SEVERITY_META: Record<string, { color: string; bg: string; icon: string }> = {
    critical: { color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/30', icon: '🔴' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: '🟠' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '🟡' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: '🔵' },
    info: { color: 'text-canvas-muted', bg: 'bg-gray-500/10 border-gray-700', icon: '⚪' },
};

const SCAN_TOOLS: ToolDefinition[] = [
    { id: 'vulnerabilities', icon: '🛡️', label: 'Vulnerabilities', tool: 'scan_vulnerabilities', desc: 'Scan for CVEs, insecure patterns, and OWASP Top 10 vulnerabilities in your codebase', tag: 'scan_vulnerabilities' },
    { id: 'secrets', icon: '🔑', label: 'Secrets Detection', tool: 'scan_secrets', desc: 'Detect hardcoded API keys, passwords, tokens, and credentials in source code', tag: 'scan_secrets' },
    { id: 'malware', icon: '🦠', label: 'Malware Analysis', tool: 'scan_malware', desc: 'Identify malicious code patterns, obfuscation techniques, and suspicious behavior', tag: 'scan_malware' },
    { id: 'dependencies', icon: '📦', label: 'Dependency Audit', tool: 'check_cve', desc: 'Check installed packages for known CVEs and outdated vulnerable dependencies', tag: 'check_cve' },
    { id: 'xss', icon: '⚡', label: 'XSS Scanner', tool: 'scan_vulnerabilities', desc: 'Detect cross-site scripting vulnerabilities including DOM-based, reflected, and stored XSS', tag: 'xss_scan' },
    { id: 'sqli', icon: '💉', label: 'SQL Injection', tool: 'scan_vulnerabilities', desc: 'Identify SQL injection risks in database queries and ORM usage', tag: 'sqli_scan' },
    { id: 'auth', icon: '🔐', label: 'Auth & Access', tool: 'scan_vulnerabilities', desc: 'Audit authentication flows, session management, and access control patterns', tag: 'auth_scan' },
    { id: 'crypto', icon: '🔒', label: 'Crypto Audit', tool: 'scan_vulnerabilities', desc: 'Check for weak encryption, insecure hashing algorithms, and cryptographic misuse', tag: 'crypto_scan' },
    { id: 'ssrf', icon: '🌐', label: 'SSRF Detection', tool: 'scan_vulnerabilities', desc: 'Find server-side request forgery risks in URL handling and external API calls', tag: 'ssrf_scan' },
    { id: 'config', icon: '⚙️', label: 'Config Security', tool: 'scan_vulnerabilities', desc: 'Audit security headers, CORS policies, CSP, and server configuration', tag: 'config_scan' },
];

export default function SecurityScanPanel({ currentCode }: SecurityScanPanelProps) {
    return (
        <ToolExecutionPanel
            title="Security Scanner"
            icon="🛡️"
            tagline="OWASP Top 10 · CVE Database · Secret Detection"
            description="Production security analysis suite: vulnerability scanning, secret detection, dependency auditing, and compliance checks — all connected to the AI security agent."
            accentColor="red"
            tools={SCAN_TOOLS}
            currentCode={currentCode}
            executeLabel="Execute Scan"
            inputPlaceholder="Describe specific areas to focus the scan on..."
            buildPrompt={(tool, input, _fields, code) =>
                input
                    ? `Run a ${tool.label} scan using the ${tool.tool} tool. Focus on: ${input}. Analyze the current project code and return detailed findings with severity levels, file locations, line numbers, and remediation recommendations.${code ? `\n\nCode:\n${code.slice(0, 15000)}` : ''}`
                    : `Run a comprehensive ${tool.label} scan using the ${tool.tool} tool on the current project. Return detailed findings with severity levels (critical/high/medium/low/info), vulnerability types, affected files with line numbers, and specific remediation recommendations.${code ? `\n\nCode:\n${code.slice(0, 15000)}` : ''}`
            }
            renderResult={(result: ExecutionResult) => {
                let findings: any[] = [];
                if (result.rawData?.findings) {
                    findings = result.rawData.findings;
                } else {
                    return (
                        <pre className="text-[11px] font-mono text-canvas-text whitespace-pre-wrap break-words bg-black/30 rounded-lg p-3 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                            {result.output}
                        </pre>
                    );
                }

                if (findings.length === 0) {
                    return <div className="text-center py-4"><p className="text-xs text-emerald-400">✅ No security issues found</p></div>;
                }

                return (
                    <div className="space-y-2">
                        {findings.map((f: any, i: number) => {
                            const meta = SEVERITY_META[f.severity] || SEVERITY_META.info;
                            return (
                                <div key={i} className={`rounded-lg px-3.5 py-3 border ${meta.bg}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">{meta.icon}</span>
                                        <span className={`text-[10px] font-bold uppercase ${meta.color}`}>{f.severity}</span>
                                        <span className="text-[10px] text-canvas-muted font-mono">{f.type}</span>
                                        {f.file && <span className="text-[10px] text-gray-600 ml-auto font-mono truncate max-w-[150px]">{f.file}{f.line ? `:${f.line}` : ''}</span>}
                                    </div>
                                    <p className="text-xs text-canvas-text mt-1.5 leading-relaxed">{f.message}</p>
                                    {f.recommendation && (
                                        <p className="text-[10px] text-cyan-400/70 mt-1.5 leading-relaxed border-t border-canvas-border pt-1.5">💡 {f.recommendation}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            }}
        />
    );
}
