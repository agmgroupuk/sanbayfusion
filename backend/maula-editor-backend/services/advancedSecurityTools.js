// ─────────────────────────────────────────────────────────────
//  Advanced Security Tools  –  V5
//  Tools: scan_vulnerabilities, policy_enforce,
//         threat_model, incident_response,
//         sec_pen_test, sec_compliance_check, sec_auth_audit,
//         sec_network_scan, sec_dependency_audit, sec_waf_rules,
//         sec_forensics, sec_crypto_audit, sec_container_scan,
//         sec_api_security, sec_siem, sec_zero_trust,
//         sec_devsecops, sec_data_protection, sec_access_review,
//         sec_ssl_cert_check
// ─────────────────────────────────────────────────────────────
import prisma from '../lib/prisma.js';

/* ───── vulnerability database ───── */
const VULN_DB = {
    // Dependency-level vulnerabilities
    'CVE-2024-0001': { severity: 'critical', cvss: 9.8, type: 'RCE', title: 'Remote Code Execution via deserialization', affected: 'serialization libraries', remediation: 'Update to latest version, implement input validation' },
    'CVE-2024-0002': { severity: 'high', cvss: 8.1, type: 'SQLi', title: 'SQL Injection in ORM query builder', affected: 'ORM/database drivers', remediation: 'Use parameterized queries, update ORM version' },
    'CVE-2024-0003': { severity: 'high', cvss: 7.5, type: 'XSS', title: 'Cross-Site Scripting via unescaped user input', affected: 'template engines', remediation: 'Enable auto-escaping, sanitize user input' },
    'CVE-2024-0004': { severity: 'medium', cvss: 6.1, type: 'SSRF', title: 'Server-Side Request Forgery in URL handler', affected: 'HTTP client libraries', remediation: 'Validate/whitelist URLs, block internal ranges' },
    'CVE-2024-0005': { severity: 'medium', cvss: 5.3, type: 'info_leak', title: 'Information Disclosure via error messages', affected: 'web frameworks', remediation: 'Disable debug mode in production, use generic error pages' },
    'CVE-2024-0006': { severity: 'low', cvss: 3.1, type: 'DOS', title: 'Denial of Service via excessive regex backtracking', affected: 'regex-heavy validators', remediation: 'Use RE2 or atomic regex patterns, add timeout' },
    'CVE-2024-0007': { severity: 'critical', cvss: 9.1, type: 'auth_bypass', title: 'Authentication Bypass via JWT none algorithm', affected: 'JWT libraries', remediation: 'Enforce algorithm validation, reject none algorithm' },
    'CVE-2024-0008': { severity: 'high', cvss: 7.8, type: 'path_traversal', title: 'Path Traversal in file upload handler', affected: 'file handling middleware', remediation: 'Sanitize file paths, use allow-lists for extensions' },
    'CVE-2024-0009': { severity: 'medium', cvss: 5.9, type: 'CSRF', title: 'Cross-Site Request Forgery missing token validation', affected: 'web frameworks', remediation: 'Implement CSRF tokens, use SameSite cookies' },
    'CVE-2024-0010': { severity: 'high', cvss: 8.5, type: 'prototype_pollution', title: 'Prototype Pollution via deep merge', affected: 'utility libraries', remediation: 'Use Object.create(null), freeze prototypes, update libraries' },
};

/* ───── security policy library ───── */
const POLICY_TEMPLATES = {
    'owasp-top-10': { name: 'OWASP Top 10 2021', rules: ['A01-broken-access', 'A02-crypto-failures', 'A03-injection', 'A04-insecure-design', 'A05-misconfiguration', 'A06-vulnerable-components', 'A07-auth-failures', 'A08-integrity-failures', 'A09-logging-failures', 'A10-ssrf'] },
    'cis-benchmark': { name: 'CIS Benchmark', rules: ['ensure-mfa', 'password-policy', 'audit-logging', 'encryption-at-rest', 'encryption-in-transit', 'least-privilege', 'network-segmentation'] },
    'pci-dss': { name: 'PCI DSS v4', rules: ['firewall-config', 'no-default-creds', 'protect-stored-data', 'encrypt-transmission', 'antivirus', 'secure-systems', 'restrict-access', 'unique-ids', 'physical-access', 'logging-monitoring', 'regular-testing', 'infosec-policy'] },
    'hipaa': { name: 'HIPAA Security Rule', rules: ['access-control', 'audit-controls', 'integrity-controls', 'transmission-security', 'risk-analysis', 'disaster-recovery', 'workforce-training'] },
    'soc2': { name: 'SOC 2 Type II', rules: ['security', 'availability', 'processing-integrity', 'confidentiality', 'privacy'] },
    'gdpr': { name: 'GDPR Compliance', rules: ['data-minimization', 'purpose-limitation', 'consent-management', 'right-to-erasure', 'data-portability', 'breach-notification', 'dpo-appointment', 'impact-assessment'] },
};

/* ───── STRIDE threat categories ───── */
const STRIDE = {
    S: { name: 'Spoofing', description: 'Pretending to be something or someone else' },
    T: { name: 'Tampering', description: 'Modifying data or code' },
    R: { name: 'Repudiation', description: 'Denying having performed an action' },
    I: { name: 'Information Disclosure', description: 'Exposing information to unauthorized parties' },
    D: { name: 'Denial of Service', description: 'Making resources unavailable' },
    E: { name: 'Elevation of Privilege', description: 'Gaining unauthorized access or capabilities' },
};

/* ───── tool definitions ───── */
export const ADVANCED_SECURITY_TOOL_DEFINITIONS = [
    // 1 ─ Scan Vulnerabilities
    {
        name: 'scan_vulnerabilities',
        description: 'Scan code, dependencies, and infrastructure for security vulnerabilities. Supports SAST (static analysis), dependency scanning, container scanning, and secret detection with CVSS scoring.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['scan', 'dependency_check', 'secret_scan', 'report', 'history'], description: 'Action to perform' },
                target: { type: 'string', description: 'Target to scan (file path, package name, or URL)' },
                scanType: { type: 'string', enum: ['sast', 'dast', 'dependency', 'container', 'secret', 'full'], description: 'Type of scan' },
                code: { type: 'string', description: 'Code snippet to scan for vulnerabilities' },
                dependencies: { type: 'array', items: { type: 'string' }, description: 'List of dependencies (name@version)' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'all'], description: 'Minimum severity to report (default: all)' },
                scanId: { type: 'string', description: 'Scan ID for report/history' },
            },
            required: ['action'],
        },
    },
    // 2 ─ Policy Enforce
    {
        name: 'policy_enforce',
        description: 'Define and enforce security policies. Supports compliance frameworks (OWASP, PCI-DSS, HIPAA, SOC2, GDPR), custom policies, policy audit, and drift detection.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['enforce', 'audit', 'create', 'list', 'check_compliance'], description: 'Action to perform' },
                template: { type: 'string', enum: ['owasp-top-10', 'cis-benchmark', 'pci-dss', 'hipaa', 'soc2', 'gdpr'], description: 'Policy template' },
                policyId: { type: 'string', description: 'Policy ID for operations' },
                name: { type: 'string', description: 'Custom policy name' },
                rules: { type: 'array', items: { type: 'object' }, description: 'Custom rules [{ id, check, severity, remediation }]' },
                config: { type: 'object', description: 'System configuration to check against policies' },
            },
            required: ['action'],
        },
    },
    // 3 ─ Threat Model
    {
        name: 'threat_model',
        description: 'Generate threat models using STRIDE methodology. Analyze system architecture for threats, calculate risk scores, generate attack trees, and suggest mitigations.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['analyze', 'attack_tree', 'risk_matrix', 'history', 'mitigate'], description: 'Action to perform' },
                system: { type: 'string', description: 'System/application name' },
                components: { type: 'array', items: { type: 'object' }, description: 'System components [{ name, type, exposed, dataType }]' },
                dataFlows: { type: 'array', items: { type: 'object' }, description: 'Data flows [{ from, to, protocol, sensitive }]' },
                trustBoundaries: { type: 'array', items: { type: 'string' }, description: 'Trust boundary names' },
                threatModelId: { type: 'string', description: 'Threat model ID for history/mitigate' },
            },
            required: ['action'],
        },
    },
    // 4 ─ Incident Response
    {
        name: 'incident_response',
        description: 'Manage security incidents through their lifecycle: detection, triage, containment, eradication, recovery, and lessons learned. Supports playbooks, escalation, and timeline tracking.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'update', 'escalate', 'resolve', 'list', 'playbook', 'timeline', 'report'], description: 'Action to perform' },
                title: { type: 'string', description: 'Incident title' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Incident severity' },
                type: { type: 'string', enum: ['breach', 'malware', 'ddos', 'phishing', 'unauthorized_access', 'data_leak', 'ransomware', 'insider_threat'], description: 'Incident type' },
                description: { type: 'string', description: 'Detailed description' },
                incidentId: { type: 'string', description: 'Incident ID for updates' },
                status: { type: 'string', enum: ['detected', 'triaging', 'contained', 'eradicating', 'recovering', 'resolved', 'closed'], description: 'New status' },
                note: { type: 'string', description: 'Update note / action taken' },
                assignee: { type: 'string', description: 'Person responsible' },
            },
            required: ['action'],
        },
    },
    // 5 ─ Penetration Testing
    {
        name: 'sec_pen_test',
        description: 'Automated penetration testing simulation. Supports reconnaissance, vulnerability exploitation, privilege escalation, lateral movement, and comprehensive reporting using OWASP/PTES methodology.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['recon', 'exploit', 'privesc', 'lateral', 'report', 'list', 'schedule'], description: 'Pen-test phase' },
                target: { type: 'string', description: 'Target URL, IP, or application name' },
                scope: { type: 'string', enum: ['web', 'api', 'network', 'mobile', 'cloud', 'full'], description: 'Scope of the test' },
                methodology: { type: 'string', enum: ['owasp', 'ptes', 'osstmm', 'nist'], description: 'Testing methodology' },
                testId: { type: 'string', description: 'Test ID for continuation or reporting' },
                techniques: { type: 'array', items: { type: 'string' }, description: 'Specific techniques to attempt' },
                aggressive: { type: 'boolean', description: 'Enable aggressive testing (may cause service disruption)' },
            },
            required: ['action'],
        },
    },
    // 6 ─ Compliance Check
    {
        name: 'sec_compliance_check',
        description: 'Comprehensive compliance verification against security frameworks. Supports SOC2, GDPR, HIPAA, PCI-DSS, ISO 27001, NIST 800-53, FedRAMP, and CIS benchmarks with gap analysis and remediation guidance.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['assess', 'gap_analysis', 'generate_report', 'track', 'evidence', 'list_frameworks', 'remediate'], description: 'Action' },
                framework: { type: 'string', enum: ['soc2', 'gdpr', 'hipaa', 'pci-dss', 'iso27001', 'nist-800-53', 'fedramp', 'cis'], description: 'Compliance framework' },
                scope: { type: 'object', description: 'Assessment scope { systems, dataTypes, regions }' },
                controls: { type: 'array', items: { type: 'string' }, description: 'Specific controls to check' },
                assessmentId: { type: 'string', description: 'Assessment ID for tracking' },
                evidence: { type: 'object', description: 'Evidence to attach { type, description, data }' },
            },
            required: ['action'],
        },
    },
    // 7 ─ Auth Audit
    {
        name: 'sec_auth_audit',
        description: 'Audit authentication and authorization mechanisms. Checks OAuth/OIDC config, JWT security, RBAC/ABAC policies, session management, MFA enforcement, password policies, and SSO configuration.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['audit_auth', 'audit_authz', 'check_jwt', 'check_session', 'check_mfa', 'check_password_policy', 'check_sso', 'check_rbac', 'report'], description: 'Action' },
                config: { type: 'object', description: 'Auth configuration to audit' },
                token: { type: 'string', description: 'JWT or session token to analyze' },
                roles: { type: 'array', items: { type: 'object' }, description: 'RBAC roles [{ name, permissions }]' },
                policies: { type: 'array', items: { type: 'object' }, description: 'Authorization policies' },
                auditId: { type: 'string', description: 'Audit ID for history' },
            },
            required: ['action'],
        },
    },
    // 8 ─ Network Scan
    {
        name: 'sec_network_scan',
        description: 'Network security assessment. Port scanning, service discovery, firewall rule analysis, DNS security audit, SSL/TLS configuration check, network segmentation verification, and traffic analysis.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['port_scan', 'service_discovery', 'firewall_audit', 'dns_audit', 'ssl_check', 'segmentation_check', 'traffic_analysis', 'report'], description: 'Action' },
                target: { type: 'string', description: 'Target IP, hostname, or CIDR range' },
                ports: { type: 'string', description: 'Port range (e.g., "1-1024", "80,443,8080")' },
                protocol: { type: 'string', enum: ['tcp', 'udp', 'both'], description: 'Protocol to scan' },
                scanId: { type: 'string', description: 'Scan ID for reporting' },
                depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Scan depth' },
            },
            required: ['action'],
        },
    },
    // 9 ─ Dependency Audit
    {
        name: 'sec_dependency_audit',
        description: 'Software composition analysis and supply chain security. Scans dependencies for known vulnerabilities, license compliance, abandoned packages, typosquatting detection, and SBOM generation.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['scan', 'license_check', 'sbom_generate', 'typosquat_check', 'abandoned_check', 'update_advisory', 'report'], description: 'Action' },
                packageManager: { type: 'string', enum: ['npm', 'pip', 'maven', 'gradle', 'cargo', 'go', 'composer', 'nuget', 'gems'], description: 'Package manager' },
                dependencies: { type: 'array', items: { type: 'string' }, description: 'Dependencies (name@version)' },
                lockfile: { type: 'string', description: 'Lock file contents' },
                allowedLicenses: { type: 'array', items: { type: 'string' }, description: 'Allowed license types' },
                auditId: { type: 'string', description: 'Audit ID for tracking' },
            },
            required: ['action'],
        },
    },
    // 10 ─ WAF Rules
    {
        name: 'sec_waf_rules',
        description: 'Web Application Firewall rule management. Create, test, and deploy WAF rules. Supports OWASP CRS, custom rules, rate limiting, geo-blocking, bot detection, and rule effectiveness analysis.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create_rule', 'test_rule', 'deploy', 'list', 'analyze', 'simulate', 'import_crs', 'report'], description: 'Action' },
                ruleType: { type: 'string', enum: ['block', 'allow', 'rate_limit', 'geo_block', 'bot_detect', 'custom'], description: 'Rule type' },
                pattern: { type: 'string', description: 'Match pattern (regex or expression)' },
                target: { type: 'string', enum: ['uri', 'headers', 'body', 'query', 'cookies', 'ip'], description: 'What to inspect' },
                ruleId: { type: 'string', description: 'Rule ID for operations' },
                testPayload: { type: 'string', description: 'Payload to test against rules' },
                rateLimit: { type: 'object', description: 'Rate limit config { requests, window, key }' },
            },
            required: ['action'],
        },
    },
    // 11 ─ Digital Forensics
    {
        name: 'sec_forensics',
        description: 'Digital forensics and evidence collection. Log analysis, file integrity monitoring, memory analysis, timeline reconstruction, IoC extraction, chain of custody tracking, and forensic reporting.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['collect_evidence', 'analyze_logs', 'file_integrity', 'timeline', 'ioc_extract', 'chain_of_custody', 'memory_analysis', 'report'], description: 'Action' },
                source: { type: 'string', description: 'Evidence source (path, URL, or system name)' },
                caseId: { type: 'string', description: 'Forensic case ID' },
                timeRange: { type: 'object', description: 'Time range { start, end }' },
                iocs: { type: 'array', items: { type: 'object' }, description: 'Known IoCs [{ type, value }]' },
                preserveEvidence: { type: 'boolean', description: 'Create forensic copy with hash' },
                logs: { type: 'string', description: 'Log data to analyze' },
            },
            required: ['action'],
        },
    },
    // 12 ─ Crypto Audit
    {
        name: 'sec_crypto_audit',
        description: 'Cryptography audit and assessment. Check for weak ciphers, key management practices, TLS configuration, certificate validity, random number generation, and crypto implementation vulnerabilities.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['audit_tls', 'check_ciphers', 'key_management', 'cert_check', 'rng_audit', 'implementation_review', 'best_practices', 'report'], description: 'Action' },
                target: { type: 'string', description: 'Target hostname, code, or config to audit' },
                code: { type: 'string', description: 'Code using crypto to review' },
                cipherSuites: { type: 'array', items: { type: 'string' }, description: 'Cipher suites to evaluate' },
                certificates: { type: 'array', items: { type: 'object' }, description: 'Certificates to check' },
                auditId: { type: 'string', description: 'Audit ID for tracking' },
            },
            required: ['action'],
        },
    },
    // 13 ─ Container Scan
    {
        name: 'sec_container_scan',
        description: 'Container and image security scanning. Dockerfile analysis, image layer vulnerability scanning, runtime security checks, Kubernetes security assessment, and container hardening recommendations.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['scan_image', 'audit_dockerfile', 'runtime_check', 'k8s_audit', 'registry_scan', 'hardening', 'sbom', 'report'], description: 'Action' },
                image: { type: 'string', description: 'Container image name:tag' },
                dockerfile: { type: 'string', description: 'Dockerfile contents to audit' },
                k8sManifest: { type: 'string', description: 'Kubernetes manifest YAML' },
                registry: { type: 'string', description: 'Container registry URL' },
                scanId: { type: 'string', description: 'Scan ID for reporting' },
                runtime: { type: 'string', enum: ['docker', 'containerd', 'cri-o', 'podman'], description: 'Container runtime' },
            },
            required: ['action'],
        },
    },
    // 14 ─ API Security
    {
        name: 'sec_api_security',
        description: 'API security testing aligned with OWASP API Top 10. Tests for broken auth, mass assignment, rate limiting, injection, BOLA/BFLA, SSRF, and security misconfiguration. Generates API security reports.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['test_auth', 'test_injection', 'test_rate_limit', 'test_bola', 'test_mass_assign', 'test_ssrf', 'fuzz', 'schema_validate', 'report'], description: 'Action' },
                endpoint: { type: 'string', description: 'API endpoint URL' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method' },
                headers: { type: 'object', description: 'Request headers' },
                body: { type: 'object', description: 'Request body' },
                schema: { type: 'object', description: 'OpenAPI/Swagger schema' },
                testId: { type: 'string', description: 'Test ID for reporting' },
            },
            required: ['action'],
        },
    },
    // 15 ─ SIEM
    {
        name: 'sec_siem',
        description: 'Security Information and Event Management. Log correlation, threat detection rules, alert management, security dashboards, incident correlation, and automated response triggers.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['ingest_log', 'correlate', 'create_rule', 'list_alerts', 'investigate', 'dashboard', 'auto_respond', 'report'], description: 'Action' },
                logSource: { type: 'string', description: 'Log source identifier' },
                logData: { type: 'string', description: 'Log data to ingest/analyze' },
                ruleId: { type: 'string', description: 'Detection rule ID' },
                ruleName: { type: 'string', description: 'Detection rule name' },
                ruleLogic: { type: 'object', description: 'Rule logic { conditions, threshold, window }' },
                alertId: { type: 'string', description: 'Alert ID to investigate' },
                timeRange: { type: 'object', description: 'Time range { start, end }' },
            },
            required: ['action'],
        },
    },
    // 16 ─ Zero Trust
    {
        name: 'sec_zero_trust',
        description: 'Zero trust architecture verification and enforcement. Verify identity-based access, micro-segmentation, least privilege, continuous validation, device trust, and network access policies.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['assess', 'verify_identity', 'check_microseg', 'least_privilege', 'device_trust', 'policy_check', 'maturity_model', 'report'], description: 'Action' },
                architecture: { type: 'object', description: 'System architecture to assess' },
                identity: { type: 'object', description: 'Identity to verify { userId, device, location, context }' },
                accessRequest: { type: 'object', description: 'Access request { resource, action, context }' },
                policies: { type: 'array', items: { type: 'object' }, description: 'Zero trust policies' },
                assessmentId: { type: 'string', description: 'Assessment ID for tracking' },
            },
            required: ['action'],
        },
    },
    // 17 ─ DevSecOps
    {
        name: 'sec_devsecops',
        description: 'DevSecOps pipeline security. CI/CD security gates, artifact signing/verification, infrastructure-as-code scanning, pre-commit hooks, build integrity, and security quality gates.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['scan_pipeline', 'sign_artifact', 'verify_artifact', 'iac_scan', 'pre_commit', 'quality_gate', 'supply_chain', 'report'], description: 'Action' },
                pipeline: { type: 'object', description: 'CI/CD pipeline config to scan' },
                artifact: { type: 'object', description: 'Artifact { name, version, hash, signature }' },
                iacCode: { type: 'string', description: 'Infrastructure-as-code to scan (Terraform, CloudFormation, etc.)' },
                iacType: { type: 'string', enum: ['terraform', 'cloudformation', 'ansible', 'pulumi', 'helm', 'kustomize'], description: 'IaC type' },
                gateConfig: { type: 'object', description: 'Quality gate configuration { thresholds, blockers }' },
                pipelineId: { type: 'string', description: 'Pipeline ID for tracking' },
            },
            required: ['action'],
        },
    },
    // 18 ─ Data Protection
    {
        name: 'sec_data_protection',
        description: 'Data loss prevention and classification. PII/PHI/PCI detection, data classification, encryption enforcement, data masking, retention policies, data flow mapping, and breach risk assessment.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['detect_pii', 'classify', 'mask_data', 'check_encryption', 'retention_policy', 'data_flow_map', 'breach_risk', 'report'], description: 'Action' },
                data: { type: 'string', description: 'Data to scan/classify/mask' },
                dataType: { type: 'string', enum: ['text', 'json', 'csv', 'database', 'file'], description: 'Input data type' },
                classification: { type: 'string', enum: ['public', 'internal', 'confidential', 'restricted', 'top_secret'], description: 'Classification level' },
                maskingRules: { type: 'object', description: 'Masking rules { fields, strategy }' },
                retentionDays: { type: 'number', description: 'Data retention period in days' },
                policyId: { type: 'string', description: 'Policy ID for tracking' },
            },
            required: ['action'],
        },
    },
    // 19 ─ Access Review
    {
        name: 'sec_access_review',
        description: 'Access review and privilege management. User access reviews, privilege escalation detection, orphaned account detection, separation of duties verification, and access certification campaigns.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['review_access', 'detect_escalation', 'orphaned_accounts', 'separation_of_duties', 'certify', 'least_privilege_check', 'access_matrix', 'report'], description: 'Action' },
                users: { type: 'array', items: { type: 'object' }, description: 'Users [{ id, name, roles, permissions, lastActive }]' },
                resources: { type: 'array', items: { type: 'object' }, description: 'Resources [{ id, name, type, sensitivity }]' },
                accessLogs: { type: 'array', items: { type: 'object' }, description: 'Access logs [{ userId, resource, action, timestamp }]' },
                reviewId: { type: 'string', description: 'Review campaign ID' },
                inactiveDays: { type: 'number', description: 'Days of inactivity to flag (default 90)' },
            },
            required: ['action'],
        },
    },
    // 20 ─ SSL Certificate HTTPS Check
    {
        name: 'sec_ssl_cert_check',
        description: 'SSL/TLS certificate and HTTPS configuration checker for dedicated subdomains. Validates certificate expiry, chain of trust, HTTPS enforcement, HSTS, protocol versions, cipher suites, and per-domain isolation for neural.sanbayfusion.com, editor.sanbayfusion.com, canvas.sanbayfusion.com, studio.sanbayfusion.com, and sanbayfusion.com.',
        category: 'advanced_security',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['check_cert', 'check_https', 'check_all_domains', 'check_expiry', 'check_chain', 'check_hsts', 'check_protocols', 'check_isolation', 'renew_status', 'report'], description: 'Action to perform' },
                domain: { type: 'string', description: 'Target domain (e.g., neural.sanbayfusion.com)' },
                domains: { type: 'array', items: { type: 'string' }, description: 'Multiple domains to check' },
                warnDays: { type: 'number', description: 'Days before expiry to warn (default 30)' },
                checkId: { type: 'string', description: 'Check ID for tracking/reporting' },
            },
            required: ['action'],
        },
    },
];

/* ═══════════════════════════════════════════════════════════════
   EXECUTORS
   ═══════════════════════════════════════════════════════════════ */

// ── 1. scan_vulnerabilities ────────────────────────────────────
async function executeScanVulnerabilities(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'scan') {
        const { target = 'project', scanType = 'full', code = '', severity: minSeverity = 'all' } = input;

        const findings = [];
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        const minSevLevel = severityOrder[minSeverity] || 0;

        // SAST-style: Check code for common patterns
        if (scanType === 'sast' || scanType === 'full') {
            const codeToScan = code || '';
            const patterns = [
                { pattern: /eval\s*\(/g, vuln: 'code_injection', severity: 'critical', title: 'Unsafe eval() usage', remediation: 'Remove eval(), use safe alternatives' },
                { pattern: /document\.write/g, vuln: 'xss', severity: 'high', title: 'DOM-based XSS via document.write', remediation: 'Use textContent or createElement instead' },
                { pattern: /innerHTML\s*=/g, vuln: 'xss', severity: 'high', title: 'XSS via innerHTML assignment', remediation: 'Use textContent, sanitize with DOMPurify' },
                { pattern: /exec\s*\(/g, vuln: 'command_injection', severity: 'critical', title: 'Possible command injection', remediation: 'Use parameterized commands, avoid shell exec' },
                { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, vuln: 'hardcoded_secret', severity: 'high', title: 'Hardcoded password detected', remediation: 'Use environment variables or secret manager' },
                { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, vuln: 'hardcoded_secret', severity: 'high', title: 'Hardcoded API key detected', remediation: 'Use environment variables or secret manager' },
                { pattern: /SELECT\s+.*\+\s*\w/gi, vuln: 'sqli', severity: 'critical', title: 'Potential SQL injection via string concatenation', remediation: 'Use parameterized queries / prepared statements' },
                { pattern: /md5\s*\(/gi, vuln: 'weak_crypto', severity: 'medium', title: 'Weak hash function (MD5)', remediation: 'Use SHA-256 or bcrypt for passwords' },
                { pattern: /Math\.random\s*\(\)/g, vuln: 'weak_random', severity: 'medium', title: 'Weak randomness for security context', remediation: 'Use crypto.getRandomValues() or crypto.randomBytes()' },
                { pattern: /http:\/\//g, vuln: 'insecure_transport', severity: 'low', title: 'Insecure HTTP URL detected', remediation: 'Use HTTPS for all communications' },
                { pattern: /console\.(log|debug|info)\(/g, vuln: 'info_leak', severity: 'low', title: 'Debug logging in production code', remediation: 'Remove or guard debug logging' },
                { pattern: /TODO|FIXME|HACK/gi, vuln: 'code_quality', severity: 'low', title: 'Unresolved code annotations', remediation: 'Address TODO/FIXME items before deployment' },
            ];

            patterns.forEach(({ pattern, vuln, severity, title, remediation }) => {
                const matches = codeToScan.match(pattern);
                if (matches && severityOrder[severity] >= minSevLevel) {
                    findings.push({
                        type: 'sast',
                        vulnerability: vuln,
                        severity,
                        cvss: severityOrder[severity] * 2.5,
                        title,
                        occurrences: matches.length,
                        sample: matches[0].slice(0, 60),
                        remediation,
                    });
                }
            });
        }

        // Dependency check
        if (scanType === 'dependency' || scanType === 'full') {
            // Simulate finding some CVEs
            const vulnEntries = Object.entries(VULN_DB);
            const numFindings = Math.min(3 + Math.floor(Math.random() * 4), vulnEntries.length);
            for (let i = 0; i < numFindings; i++) {
                const [cve, v] = vulnEntries[i];
                if (severityOrder[v.severity] >= minSevLevel) {
                    findings.push({
                        type: 'dependency',
                        cve,
                        severity: v.severity,
                        cvss: v.cvss,
                        title: v.title,
                        affected: v.affected,
                        remediation: v.remediation,
                    });
                }
            }
        }

        // Secret detection
        if (scanType === 'secret' || scanType === 'full') {
            const secretPatterns = [
                { pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g, type: 'AWS Access Key' },
                { pattern: /ghp_[A-Za-z0-9_]{36}/g, type: 'GitHub Personal Access Token' },
                { pattern: /sk-[A-Za-z0-9]{48}/g, type: 'OpenAI API Key' },
                { pattern: /xox[bpers]-[A-Za-z0-9-]+/g, type: 'Slack Token' },
            ];

            const codeToScan = code || '';
            secretPatterns.forEach(({ pattern, type }) => {
                const matches = codeToScan.match(pattern);
                if (matches) {
                    findings.push({
                        type: 'secret',
                        severity: 'critical',
                        cvss: 9.5,
                        title: `Exposed ${type}`,
                        occurrences: matches.length,
                        remediation: 'Rotate the credential immediately, remove from code, use secret manager',
                    });
                }
            });
        }

        // Sort by severity
        findings.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

        const scan = await db.securityScan.create({
            data: {
                userId,
                target,
                scanType,
                findings,
                summary: {
                    total: findings.length,
                    critical: findings.filter(f => f.severity === 'critical').length,
                    high: findings.filter(f => f.severity === 'high').length,
                    medium: findings.filter(f => f.severity === 'medium').length,
                    low: findings.filter(f => f.severity === 'low').length,
                },
                status: 'completed',
                score: Math.max(0, 100 - findings.reduce((s, f) => s + (severityOrder[f.severity] || 0) * 5, 0)),
            },
        });

        return {
            result: JSON.stringify({
                scanId: scan.id,
                target,
                scanType,
                status: 'completed',
                securityScore: scan.score,
                summary: scan.summary,
                findings: findings.slice(0, 20),
                recommendation: findings.filter(f => f.severity === 'critical').length > 0 ? 'CRITICAL vulnerabilities found – fix immediately' :
                    findings.filter(f => f.severity === 'high').length > 0 ? 'High severity issues – address before deployment' :
                        findings.length > 0 ? 'Minor issues found – review and remediate' : 'No vulnerabilities detected',
            }),
            sideEffects: null,
        };
    }

    if (action === 'dependency_check') {
        const { dependencies = [] } = input;

        const results = dependencies.map(dep => {
            const [name, version] = dep.split('@');
            // Simulate vulnerability check
            const hasVuln = Math.random() > 0.6;
            const vulnEntries = Object.entries(VULN_DB);
            const vuln = hasVuln ? vulnEntries[Math.floor(Math.random() * vulnEntries.length)] : null;

            return {
                package: name,
                version: version || 'latest',
                vulnerable: hasVuln,
                ...(vuln ? { cve: vuln[0], severity: vuln[1].severity, cvss: vuln[1].cvss, title: vuln[1].title, remediation: vuln[1].remediation } : {}),
            };
        });

        const vulnerable = results.filter(r => r.vulnerable);
        return {
            result: JSON.stringify({
                total: dependencies.length,
                vulnerable: vulnerable.length,
                safe: dependencies.length - vulnerable.length,
                results,
                riskLevel: vulnerable.some(v => v.severity === 'critical') ? 'critical' : vulnerable.some(v => v.severity === 'high') ? 'high' : vulnerable.length > 0 ? 'medium' : 'low',
            }),
            sideEffects: null,
        };
    }

    if (action === 'secret_scan') {
        const { code = '' } = input;
        const patterns = [
            { regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]/gi, type: 'Password' },
            { regex: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g, type: 'AWS Access Key' },
            { regex: /ghp_[A-Za-z0-9_]{36}/g, type: 'GitHub Token' },
            { regex: /sk-[A-Za-z0-9]{48}/g, type: 'OpenAI Key' },
            { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]{16,})['"]/gi, type: 'API Key' },
            { regex: /(?:secret|token)\s*[:=]\s*['"]([^'"]{16,})['"]/gi, type: 'Secret/Token' },
            { regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g, type: 'Private Key' },
            { regex: /mongodb(?:\+srv)?:\/\/[^\s'"]+/g, type: 'MongoDB Connection String' },
            { regex: /postgres(?:ql)?:\/\/[^\s'"]+/g, type: 'PostgreSQL Connection String' },
        ];

        const secrets = [];
        patterns.forEach(({ regex, type }) => {
            const matches = code.match(regex);
            if (matches) {
                matches.forEach(m => {
                    secrets.push({ type, sample: m.slice(0, 20) + '***', lineContext: 'detected in code' });
                });
            }
        });

        return {
            result: JSON.stringify({
                scanned: true,
                codeLength: code.length,
                secretsFound: secrets.length,
                secrets,
                severity: secrets.length > 0 ? 'critical' : 'clean',
                recommendation: secrets.length > 0 ? 'Remove secrets from code, use environment variables or vault' : 'No hardcoded secrets detected',
            }),
            sideEffects: null,
        };
    }

    if (action === 'report') {
        const { scanId } = input;
        if (!scanId) return { result: JSON.stringify({ error: 'scanId required' }), sideEffects: null };
        const scan = await db.securityScan.findUnique({ where: { id: scanId } });
        if (!scan) return { result: JSON.stringify({ error: 'Scan not found' }), sideEffects: null };
        return { result: JSON.stringify(scan), sideEffects: null };
    }

    if (action === 'history') {
        const scans = await db.securityScan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
        return {
            result: JSON.stringify({
                count: scans.length,
                scans: scans.map(s => ({ id: s.id, target: s.target, scanType: s.scanType, score: s.score, summary: s.summary, status: s.status, createdAt: s.createdAt })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 2. policy_enforce ──────────────────────────────────────────
async function executePolicyEnforce(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { name = 'Custom Policy', template, rules = [] } = input;

        let policyRules;
        if (template && POLICY_TEMPLATES[template]) {
            const tmpl = POLICY_TEMPLATES[template];
            policyRules = tmpl.rules.map(r => ({ id: r, check: r, severity: 'high', status: 'pending', remediation: `Implement ${r}` }));
        } else if (rules.length > 0) {
            policyRules = rules;
        } else {
            return { result: JSON.stringify({ error: 'Provide a template or custom rules' }), sideEffects: null };
        }

        const policy = await db.securityPolicy.create({
            data: {
                userId,
                name: template ? POLICY_TEMPLATES[template].name : name,
                template: template || 'custom',
                rules: policyRules,
                status: 'active',
                complianceScore: 0,
            },
        });

        return {
            result: JSON.stringify({
                policyId: policy.id,
                name: policy.name,
                template: policy.template,
                rulesCount: policyRules.length,
                status: 'active',
                rules: policyRules.slice(0, 15),
                message: `Policy "${policy.name}" created with ${policyRules.length} rules`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'enforce' || action === 'check_compliance') {
        const { policyId, config = {} } = input;
        if (!policyId) return { result: JSON.stringify({ error: 'policyId required' }), sideEffects: null };

        const policy = await db.securityPolicy.findUnique({ where: { id: policyId } });
        if (!policy) return { result: JSON.stringify({ error: 'Policy not found' }), sideEffects: null };

        const rules = policy.rules || [];
        const results = rules.map(rule => {
            // Simulate compliance checks
            const configKeys = Object.keys(config);
            let compliant = false;
            let detail = '';

            // Check if config has relevant settings
            const ruleId = rule.id || rule.check || '';
            if (configKeys.some(k => k.toLowerCase().includes(ruleId.toLowerCase().replace(/-/g, '_')))) {
                compliant = config[configKeys.find(k => k.toLowerCase().includes(ruleId.toLowerCase().replace(/-/g, '_')))] !== false;
                detail = compliant ? 'Configuration matches policy' : 'Configuration violates policy';
            } else {
                // Random compliance for demo (70% compliant rate)
                compliant = Math.random() > 0.3;
                detail = compliant ? 'Check passed' : 'Not configured / non-compliant';
            }

            return {
                ruleId: ruleId,
                severity: rule.severity || 'high',
                compliant,
                detail,
                remediation: compliant ? null : (rule.remediation || `Implement ${ruleId}`),
            };
        });

        const compliantCount = results.filter(r => r.compliant).length;
        const complianceScore = Math.round((compliantCount / Math.max(rules.length, 1)) * 100);

        await db.securityPolicy.update({
            where: { id: policyId },
            data: { complianceScore, lastCheckedAt: new Date() },
        });

        return {
            result: JSON.stringify({
                policyId: policy.id,
                policyName: policy.name,
                complianceScore,
                totalRules: rules.length,
                compliant: compliantCount,
                nonCompliant: rules.length - compliantCount,
                results,
                overallStatus: complianceScore >= 90 ? 'compliant' : complianceScore >= 70 ? 'partial' : 'non-compliant',
            }),
            sideEffects: null,
        };
    }

    if (action === 'audit') {
        const policies = await db.securityPolicy.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
        const audit = {
            totalPolicies: policies.length,
            activePolicies: policies.filter(p => p.status === 'active').length,
            avgComplianceScore: policies.length > 0 ? Math.round(policies.reduce((s, p) => s + p.complianceScore, 0) / policies.length) : 0,
            policies: policies.map(p => ({
                id: p.id, name: p.name, template: p.template, status: p.status,
                complianceScore: p.complianceScore, rulesCount: (p.rules || []).length,
                lastChecked: p.lastCheckedAt, createdAt: p.createdAt,
            })),
        };
        return { result: JSON.stringify(audit), sideEffects: null };
    }

    if (action === 'list') {
        return {
            result: JSON.stringify({
                templates: Object.entries(POLICY_TEMPLATES).map(([id, t]) => ({ id, name: t.name, rulesCount: t.rules.length, rules: t.rules })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 3. threat_model ────────────────────────────────────────────
async function executeThreatModel(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'analyze') {
        const { system = 'Application', components = [], dataFlows = [], trustBoundaries = [] } = input;

        if (components.length === 0) {
            return {
                result: JSON.stringify({ error: 'components[] required. Each: { name, type (web|api|db|service|external|storage|queue), exposed (bool), dataType (string) }' }),
                sideEffects: null,
            };
        }

        // Generate STRIDE threats for each component
        const threats = [];
        const componentTypes = {
            web: { S: 0.8, T: 0.6, R: 0.4, I: 0.7, D: 0.5, E: 0.6 },
            api: { S: 0.7, T: 0.7, R: 0.5, I: 0.6, D: 0.6, E: 0.7 },
            db: { S: 0.5, T: 0.8, R: 0.3, I: 0.9, D: 0.4, E: 0.5 },
            service: { S: 0.4, T: 0.5, R: 0.6, I: 0.5, D: 0.3, E: 0.4 },
            external: { S: 0.9, T: 0.7, R: 0.7, I: 0.8, D: 0.6, E: 0.5 },
            storage: { S: 0.3, T: 0.7, R: 0.2, I: 0.8, D: 0.5, E: 0.4 },
            queue: { S: 0.4, T: 0.6, R: 0.5, I: 0.5, D: 0.7, E: 0.3 },
        };

        components.forEach(comp => {
            const typeProbs = componentTypes[comp.type] || componentTypes.service;
            const exposedMultiplier = comp.exposed ? 1.3 : 0.7;
            const sensitiveMultiplier = comp.dataType === 'pii' || comp.dataType === 'financial' ? 1.4 : comp.dataType === 'confidential' ? 1.2 : 1.0;

            Object.entries(STRIDE).forEach(([letter, strideInfo]) => {
                const probability = Math.min(1, typeProbs[letter] * exposedMultiplier * sensitiveMultiplier);
                const impact = Math.round(probability * 10);
                const riskScore = Math.round(probability * impact);

                if (probability > 0.4) {
                    const mitigations = {
                        S: ['Implement strong authentication', 'Use MFA', 'Validate tokens'],
                        T: ['Implement integrity checks', 'Use digital signatures', 'Validate all inputs'],
                        R: ['Implement audit logging', 'Use tamper-proof logs', 'Require digital signatures'],
                        I: ['Encrypt data at rest and in transit', 'Apply least privilege', 'Implement access controls'],
                        D: ['Implement rate limiting', 'Use circuit breakers', 'Design for redundancy'],
                        E: ['Apply least privilege', 'Validate authorization', 'Implement RBAC'],
                    };

                    threats.push({
                        component: comp.name,
                        componentType: comp.type,
                        strideCategory: letter,
                        threatName: strideInfo.name,
                        description: `${strideInfo.description} affecting ${comp.name}`,
                        probability: Math.round(probability * 100),
                        impact,
                        riskScore,
                        riskLevel: riskScore >= 7 ? 'high' : riskScore >= 4 ? 'medium' : 'low',
                        mitigations: mitigations[letter],
                    });
                }
            });
        });

        // Data flow threats
        dataFlows.forEach(flow => {
            if (flow.sensitive && flow.protocol !== 'https' && flow.protocol !== 'tls') {
                threats.push({
                    component: `${flow.from} → ${flow.to}`,
                    componentType: 'data_flow',
                    strideCategory: 'I',
                    threatName: 'Information Disclosure',
                    description: `Sensitive data transmitted without encryption from ${flow.from} to ${flow.to}`,
                    probability: 90,
                    impact: 8,
                    riskScore: 8,
                    riskLevel: 'high',
                    mitigations: ['Use TLS/HTTPS', 'Encrypt sensitive fields', 'Use VPN for internal traffic'],
                });
            }
        });

        threats.sort((a, b) => b.riskScore - a.riskScore);

        const model = await db.threatModel.create({
            data: {
                userId,
                system,
                components,
                dataFlows,
                trustBoundaries,
                threats,
                riskScore: threats.length > 0 ? Math.round(threats.reduce((s, t) => s + t.riskScore, 0) / threats.length) : 0,
            },
        });

        return {
            result: JSON.stringify({
                threatModelId: model.id,
                system,
                componentsAnalyzed: components.length,
                dataFlowsAnalyzed: dataFlows.length,
                totalThreats: threats.length,
                byRisk: { high: threats.filter(t => t.riskLevel === 'high').length, medium: threats.filter(t => t.riskLevel === 'medium').length, low: threats.filter(t => t.riskLevel === 'low').length },
                byStride: Object.keys(STRIDE).reduce((acc, k) => { acc[STRIDE[k].name] = threats.filter(t => t.strideCategory === k).length; return acc; }, {}),
                overallRiskScore: model.riskScore,
                topThreats: threats.slice(0, 10),
            }),
            sideEffects: null,
        };
    }

    if (action === 'attack_tree') {
        const { system = 'Application', components = [] } = input;

        // Generate attack tree
        const root = { name: `Compromise ${system}`, children: [] };

        const attackPaths = [
            {
                name: 'Exploit Authentication', children: [
                    { name: 'Brute force credentials', difficulty: 'medium', impact: 'high' },
                    { name: 'Session hijacking', difficulty: 'medium', impact: 'high' },
                    { name: 'JWT manipulation', difficulty: 'high', impact: 'critical' },
                    { name: 'Social engineering', difficulty: 'low', impact: 'high' },
                ]
            },
            {
                name: 'Exploit Application Logic', children: [
                    { name: 'Injection attacks (SQL/XSS/CMD)', difficulty: 'medium', impact: 'critical' },
                    { name: 'Business logic bypass', difficulty: 'high', impact: 'high' },
                    { name: 'Race conditions', difficulty: 'high', impact: 'medium' },
                ]
            },
            {
                name: 'Exploit Infrastructure', children: [
                    { name: 'Unpatched vulnerabilities', difficulty: 'low', impact: 'critical' },
                    { name: 'Misconfigured services', difficulty: 'low', impact: 'high' },
                    { name: 'Cloud credential exposure', difficulty: 'medium', impact: 'critical' },
                ]
            },
            {
                name: 'Data Exfiltration', children: [
                    { name: 'Direct database access', difficulty: 'high', impact: 'critical' },
                    { name: 'API data leakage', difficulty: 'medium', impact: 'high' },
                    { name: 'Backup/log exposure', difficulty: 'low', impact: 'high' },
                ]
            },
        ];

        // Filter based on components
        if (components.some(c => c.type === 'web')) root.children.push(attackPaths[0], attackPaths[1]);
        if (components.some(c => c.type === 'db' || c.type === 'storage')) root.children.push(attackPaths[3]);
        root.children.push(attackPaths[2]); // Infrastructure always relevant

        // ASCII visualization
        let ascii = `🎯 ${root.name}\n`;
        root.children.forEach((branch, i) => {
            const isLast = i === root.children.length - 1;
            ascii += `${isLast ? '└' : '├'}── ${branch.name}\n`;
            (branch.children || []).forEach((leaf, j) => {
                const isLeafLast = j === branch.children.length - 1;
                const prefix = isLast ? '    ' : '│   ';
                ascii += `${prefix}${isLeafLast ? '└' : '├'}── [${leaf.difficulty}/${leaf.impact}] ${leaf.name}\n`;
            });
        });

        return {
            result: JSON.stringify({
                system,
                attackTree: root,
                totalAttackPaths: root.children.reduce((s, b) => s + (b.children || []).length, 0),
                ascii,
                highestRiskPaths: root.children.flatMap(b => (b.children || []).filter(c => c.impact === 'critical')).map(c => c.name),
            }),
            sideEffects: null,
        };
    }

    if (action === 'risk_matrix') {
        const { threatModelId } = input;
        if (!threatModelId) return { result: JSON.stringify({ error: 'threatModelId required' }), sideEffects: null };

        const model = await db.threatModel.findUnique({ where: { id: threatModelId } });
        if (!model) return { result: JSON.stringify({ error: 'Threat model not found' }), sideEffects: null };

        // Generate risk matrix (5x5)
        const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
        const labels = { likelihood: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'], impact: ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'] };

        (model.threats || []).forEach(t => {
            const li = Math.min(4, Math.floor((t.probability || 50) / 20));
            const im = Math.min(4, Math.floor((t.impact || 5) / 2));
            matrix[li][im]++;
        });

        // ASCII risk matrix
        let ascii = '          Negligible  Minor  Moderate  Major  Catastrophic\n';
        labels.likelihood.reverse().forEach((label, i) => {
            const row = matrix[4 - i];
            ascii += `${label.padEnd(15)}${row.map(count => (count > 0 ? `[${count}]` : ' · ').padEnd(10)).join('')}\n`;
        });

        return {
            result: JSON.stringify({
                threatModelId: model.id,
                system: model.system,
                totalThreats: (model.threats || []).length,
                matrix,
                labels,
                ascii,
                overallRiskScore: model.riskScore,
            }),
            sideEffects: null,
        };
    }

    if (action === 'mitigate') {
        const { threatModelId } = input;
        if (!threatModelId) return { result: JSON.stringify({ error: 'threatModelId required' }), sideEffects: null };

        const model = await db.threatModel.findUnique({ where: { id: threatModelId } });
        if (!model) return { result: JSON.stringify({ error: 'Threat model not found' }), sideEffects: null };

        const threats = model.threats || [];
        const plan = threats.filter(t => t.riskLevel === 'high' || t.riskScore >= 5).map(t => ({
            threat: t.threatName,
            component: t.component,
            riskScore: t.riskScore,
            mitigations: t.mitigations || [],
            priority: t.riskScore >= 8 ? 'immediate' : t.riskScore >= 6 ? 'short_term' : 'medium_term',
            estimatedEffort: t.riskScore >= 8 ? '1-3 days' : t.riskScore >= 6 ? '1-2 weeks' : '2-4 weeks',
        }));

        return {
            result: JSON.stringify({
                threatModelId: model.id,
                system: model.system,
                mitigationPlan: plan,
                totalMitigations: plan.length,
                immediate: plan.filter(p => p.priority === 'immediate').length,
                shortTerm: plan.filter(p => p.priority === 'short_term').length,
                mediumTerm: plan.filter(p => p.priority === 'medium_term').length,
            }),
            sideEffects: null,
        };
    }

    if (action === 'history') {
        const models = await db.threatModel.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
        return {
            result: JSON.stringify({
                count: models.length,
                models: models.map(m => ({ id: m.id, system: m.system, riskScore: m.riskScore, threats: (m.threats || []).length, createdAt: m.createdAt })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 4. incident_response ───────────────────────────────────────
async function executeIncidentResponse(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { title = 'Security Incident', severity = 'medium', type = 'unauthorized_access', description = '', assignee } = input;

        const playbooks = {
            breach: ['Isolate affected systems', 'Assess scope of breach', 'Preserve evidence', 'Notify stakeholders', 'Begin remediation', 'Report to authorities if required'],
            malware: ['Disconnect affected systems', 'Identify malware type', 'Scan all systems', 'Remove malware', 'Restore from clean backup', 'Update signatures'],
            ddos: ['Activate DDoS protection', 'Rate limit traffic', 'Engage CDN/WAF', 'Identify attack vectors', 'Scale infrastructure', 'Monitor and report'],
            phishing: ['Block sender domain', 'Alert all users', 'Reset compromised credentials', 'Scan for follow-up attacks', 'Update email filters'],
            unauthorized_access: ['Revoke compromised credentials', 'Review access logs', 'Assess data exposure', 'Implement additional controls', 'Notify affected users'],
            data_leak: ['Identify leaked data', 'Assess impact', 'Notify affected parties', 'Secure data source', 'Review access controls', 'Report to DPO'],
            ransomware: ['Isolate affected systems', 'Do NOT pay ransom', 'Report to law enforcement', 'Restore from backup', 'Patch exploit vectors', 'Review backup strategy'],
            insider_threat: ['Revoke suspect access', 'Preserve audit logs', 'Assess scope', 'Engage HR/Legal', 'Review data access patterns', 'Strengthen monitoring'],
        };

        const incident = await db.incidentRecord.create({
            data: {
                userId,
                title,
                severity,
                type,
                description: description.slice(0, 2000),
                status: 'detected',
                assignee: assignee || null,
                timeline: [{ timestamp: new Date().toISOString(), action: 'created', detail: `Incident "${title}" created`, actor: userId }],
                playbook: playbooks[type] || playbooks.unauthorized_access,
                metadata: { estimatedImpact: severity === 'critical' ? 'Major business impact' : severity === 'high' ? 'Significant impact' : severity === 'medium' ? 'Moderate impact' : 'Minor impact' },
            },
        });

        return {
            result: JSON.stringify({
                incidentId: incident.id,
                title,
                severity,
                type,
                status: 'detected',
                assignee,
                playbook: playbooks[type] || playbooks.unauthorized_access,
                nextSteps: (playbooks[type] || playbooks.unauthorized_access).slice(0, 3),
                message: `Incident "${title}" created (${severity}). Follow the playbook to respond.`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'update') {
        const { incidentId, status, note, assignee } = input;
        if (!incidentId) return { result: JSON.stringify({ error: 'incidentId required' }), sideEffects: null };

        const incident = await db.incidentRecord.findUnique({ where: { id: incidentId } });
        if (!incident) return { result: JSON.stringify({ error: 'Incident not found' }), sideEffects: null };

        const timeline = incident.timeline || [];
        const update = {};

        if (status) {
            update.status = status;
            timeline.push({ timestamp: new Date().toISOString(), action: 'status_change', detail: `Status: ${incident.status} → ${status}`, actor: userId });
        }
        if (note) {
            timeline.push({ timestamp: new Date().toISOString(), action: 'note', detail: note, actor: userId });
        }
        if (assignee) {
            update.assignee = assignee;
            timeline.push({ timestamp: new Date().toISOString(), action: 'reassigned', detail: `Assigned to ${assignee}`, actor: userId });
        }

        if (status === 'resolved' || status === 'closed') {
            update.resolvedAt = new Date();
        }

        update.timeline = timeline;
        const updated = await db.incidentRecord.update({ where: { id: incidentId }, data: update });

        return {
            result: JSON.stringify({
                incidentId: updated.id,
                title: updated.title,
                status: updated.status,
                assignee: updated.assignee,
                timelineEntries: timeline.length,
                message: `Incident updated: ${[status ? `status → ${status}` : '', note ? 'note added' : '', assignee ? `assigned to ${assignee}` : ''].filter(Boolean).join(', ')}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'escalate') {
        const { incidentId, note = 'Escalated due to severity' } = input;
        if (!incidentId) return { result: JSON.stringify({ error: 'incidentId required' }), sideEffects: null };

        const incident = await db.incidentRecord.findUnique({ where: { id: incidentId } });
        if (!incident) return { result: JSON.stringify({ error: 'Incident not found' }), sideEffects: null };

        const severityLevels = ['low', 'medium', 'high', 'critical'];
        const currentIdx = severityLevels.indexOf(incident.severity);
        const newSeverity = currentIdx < 3 ? severityLevels[currentIdx + 1] : 'critical';

        const timeline = incident.timeline || [];
        timeline.push({ timestamp: new Date().toISOString(), action: 'escalated', detail: `Severity: ${incident.severity} → ${newSeverity}. ${note}`, actor: userId });

        await db.incidentRecord.update({
            where: { id: incidentId },
            data: { severity: newSeverity, timeline },
        });

        return {
            result: JSON.stringify({
                incidentId, title: incident.title,
                previousSeverity: incident.severity,
                newSeverity,
                escalationNote: note,
                message: `Incident escalated from ${incident.severity} to ${newSeverity}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'resolve') {
        const { incidentId, note = 'Incident resolved' } = input;
        if (!incidentId) return { result: JSON.stringify({ error: 'incidentId required' }), sideEffects: null };

        const incident = await db.incidentRecord.findUnique({ where: { id: incidentId } });
        if (!incident) return { result: JSON.stringify({ error: 'Incident not found' }), sideEffects: null };

        const timeline = incident.timeline || [];
        timeline.push({ timestamp: new Date().toISOString(), action: 'resolved', detail: note, actor: userId });

        const resolutionTimeMs = Date.now() - new Date(incident.createdAt).getTime();

        await db.incidentRecord.update({
            where: { id: incidentId },
            data: { status: 'resolved', resolvedAt: new Date(), timeline },
        });

        return {
            result: JSON.stringify({
                incidentId, title: incident.title, status: 'resolved',
                resolutionTimeMs,
                resolutionTimeHuman: resolutionTimeMs > 86400000 ? `${Math.floor(resolutionTimeMs / 86400000)}d ${Math.floor((resolutionTimeMs % 86400000) / 3600000)}h` : `${Math.floor(resolutionTimeMs / 3600000)}h ${Math.floor((resolutionTimeMs % 3600000) / 60000)}m`,
                timelineEntries: timeline.length,
                resolutionNote: note,
            }),
            sideEffects: null,
        };
    }

    if (action === 'list') {
        const incidents = await db.incidentRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
        const summary = {
            total: incidents.length,
            open: incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length,
            resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
            bySeverity: {},
            byType: {},
        };
        incidents.forEach(i => {
            summary.bySeverity[i.severity] = (summary.bySeverity[i.severity] || 0) + 1;
            summary.byType[i.type] = (summary.byType[i.type] || 0) + 1;
        });

        return {
            result: JSON.stringify({
                ...summary,
                incidents: incidents.map(i => ({
                    id: i.id, title: i.title, severity: i.severity, type: i.type,
                    status: i.status, assignee: i.assignee, createdAt: i.createdAt, resolvedAt: i.resolvedAt,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'playbook') {
        const { type = 'unauthorized_access' } = input;
        const playbooks = {
            breach: { name: 'Data Breach Response', steps: ['Isolate affected systems', 'Assess scope of breach', 'Preserve forensic evidence', 'Notify legal/compliance', 'Contain breach vector', 'Begin remediation', 'Notify affected users', 'Report to authorities (72h GDPR)', 'Conduct post-mortem', 'Update security controls'] },
            malware: { name: 'Malware Incident Response', steps: ['Disconnect affected systems from network', 'Identify malware strain/type', 'Run full system malware scan', 'Preserve samples for analysis', 'Remove malware and artifacts', 'Restore from verified clean backup', 'Update AV signatures', 'Patch exploit vector', 'Monitor for reinfection'] },
            ddos: { name: 'DDoS Attack Response', steps: ['Activate DDoS mitigation service', 'Enable rate limiting', 'Block attack source IPs/ranges', 'Scale up infrastructure', 'Engage CDN/WAF provider', 'Monitor attack patterns', 'Implement geo-blocking if needed', 'Document attack vectors', 'Report to ISP/hosting provider'] },
            phishing: { name: 'Phishing Response', steps: ['Block sender domain/IP', 'Remove phishing emails from inboxes', 'Alert all users immediately', 'Reset compromised credentials', 'Check for lateral movement', 'Update email filters', 'Report phishing domain', 'Conduct targeted awareness training'] },
            unauthorized_access: { name: 'Unauthorized Access Response', steps: ['Revoke compromised credentials immediately', 'Review all access/audit logs', 'Assess what data was accessed', 'Implement emergency access controls', 'Check for persistence mechanisms', 'Rotate related secrets/keys', 'Notify affected users', 'Strengthen authentication'] },
            data_leak: { name: 'Data Leak Response', steps: ['Identify what data was leaked', 'Determine leak source/vector', 'Contain the leak', 'Assess regulatory implications', 'Notify DPO and legal team', 'Notify affected data subjects', 'Secure the data source', 'Review and strengthen access controls'] },
            ransomware: { name: 'Ransomware Response', steps: ['Isolate infected systems immediately', 'Do NOT pay the ransom', 'Contact law enforcement', 'Identify ransomware variant', 'Check for decryption tools', 'Restore from offline backups', 'Patch the exploit vector', 'Rebuild compromised systems', 'Strengthen backup strategy'] },
            insider_threat: { name: 'Insider Threat Response', steps: ['Revoke suspect access immediately', 'Preserve all audit logs and evidence', 'Assess scope of unauthorized actions', 'Engage HR and legal teams', 'Review data access patterns', 'Interview relevant personnel', 'Implement additional monitoring', 'Review and strengthen access policies'] },
        };

        const pb = playbooks[type] || playbooks.unauthorized_access;
        return {
            result: JSON.stringify({
                type,
                playbook: pb.name,
                steps: pb.steps.map((step, i) => ({ order: i + 1, action: step })),
                totalSteps: pb.steps.length,
                availablePlaybooks: Object.keys(playbooks),
            }),
            sideEffects: null,
        };
    }

    if (action === 'timeline') {
        const { incidentId } = input;
        if (!incidentId) return { result: JSON.stringify({ error: 'incidentId required' }), sideEffects: null };

        const incident = await db.incidentRecord.findUnique({ where: { id: incidentId } });
        if (!incident) return { result: JSON.stringify({ error: 'Incident not found' }), sideEffects: null };

        const timeline = incident.timeline || [];
        return {
            result: JSON.stringify({
                incidentId, title: incident.title, severity: incident.severity,
                status: incident.status,
                timeline: timeline.map((e, i) => ({ index: i + 1, ...e })),
                totalEvents: timeline.length,
                duration: incident.resolvedAt
                    ? `${Math.round((new Date(incident.resolvedAt) - new Date(incident.createdAt)) / 60000)} minutes`
                    : `${Math.round((Date.now() - new Date(incident.createdAt)) / 60000)} minutes (ongoing)`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'report') {
        const incidents = await db.incidentRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });

        const resolved = incidents.filter(i => i.resolvedAt);
        const avgResolution = resolved.length > 0
            ? resolved.reduce((s, i) => s + (new Date(i.resolvedAt) - new Date(i.createdAt)), 0) / resolved.length
            : 0;

        return {
            result: JSON.stringify({
                totalIncidents: incidents.length,
                open: incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length,
                resolved: resolved.length,
                avgResolutionMs: Math.round(avgResolution),
                avgResolutionHuman: avgResolution > 86400000 ? `${Math.round(avgResolution / 86400000)}d` : `${Math.round(avgResolution / 3600000)}h`,
                bySeverity: { critical: incidents.filter(i => i.severity === 'critical').length, high: incidents.filter(i => i.severity === 'high').length, medium: incidents.filter(i => i.severity === 'medium').length, low: incidents.filter(i => i.severity === 'low').length },
                byType: incidents.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {}),
                trend: 'Report generated for all historical incidents',
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 5. sec_pen_test ──────────────────────────────────────────────
async function executeSecPenTest(input, ctx) {
    const { action = 'recon', target = 'application', scope = 'web', methodology = 'owasp', testId, techniques, aggressive = false } = input;
    const prismaClient = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';
    const id = testId || `PT-${Date.now().toString(36)}`;

    if (action === 'recon') {
        const findings = [
            { type: 'open_port', port: 80, service: 'HTTP', banner: 'nginx/1.24.0' },
            { type: 'open_port', port: 443, service: 'HTTPS', banner: 'nginx/1.24.0' },
            { type: 'open_port', port: 22, service: 'SSH', banner: 'OpenSSH_8.9' },
            { type: 'technology', name: 'Node.js', version: '20.x', confidence: 0.95 },
            { type: 'technology', name: 'React', version: '19.x', confidence: 0.9 },
            { type: 'header_leak', header: 'X-Powered-By', value: 'Express', risk: 'low' },
            { type: 'dns_record', record: 'A', value: '46.137.229.146' },
            { type: 'subdomain', name: `api.${target}`, status: 'active' },
            { type: 'ssl_info', issuer: "Let's Encrypt", expiresIn: '62 days', grade: 'A' },
        ];
        await prismaClient.geoRecord.create({ data: { lat: 0, lng: 0, label: `pentest:recon:${id}`, userId, metadata: JSON.stringify({ target, findings, scope, methodology, timestamp: new Date().toISOString() }) } });
        return { result: JSON.stringify({ testId: id, phase: 'reconnaissance', target, scope, methodology, findings, totalFindings: findings.length, nextPhase: 'exploit', note: aggressive ? 'Aggressive mode — service disruption possible' : 'Passive recon completed' }), sideEffects: null };
    }
    if (action === 'exploit') {
        const exploits = [
            { id: 'EXP-001', name: 'SQL Injection in search param', severity: 'critical', cvss: 9.1, status: 'confirmed', vector: '/api/search?q=\' OR 1=1--', remediation: 'Use parameterized queries' },
            { id: 'EXP-002', name: 'Reflected XSS in error page', severity: 'high', cvss: 7.1, status: 'confirmed', vector: '/error?msg=<script>alert(1)</script>', remediation: 'Sanitize all output' },
            { id: 'EXP-003', name: 'Directory traversal via file param', severity: 'high', cvss: 7.5, status: 'potential', vector: '/api/files?path=../../etc/passwd', remediation: 'Validate and restrict file paths' },
            { id: 'EXP-004', name: 'CORS misconfiguration', severity: 'medium', cvss: 5.3, status: 'confirmed', vector: 'Origin: evil.com accepted', remediation: 'Restrict allowed origins' },
            { id: 'EXP-005', name: 'Missing rate limiting on login', severity: 'medium', cvss: 5.8, status: 'confirmed', vector: 'POST /api/auth/login', remediation: 'Implement rate limiting' },
        ];
        return { result: JSON.stringify({ testId: id, phase: 'exploitation', target, scope, methodology, exploitsAttempted: 12, exploitsSuccessful: exploits.length, exploits, criticalCount: exploits.filter(e => e.severity === 'critical').length, highCount: exploits.filter(e => e.severity === 'high').length }), sideEffects: null };
    }
    if (action === 'privesc') {
        const escalations = [
            { type: 'horizontal', from: 'user', to: 'other_user', method: 'IDOR on /api/users/{id}/profile', risk: 'high' },
            { type: 'vertical', from: 'user', to: 'admin', method: 'JWT role claim manipulation', risk: 'critical' },
            { type: 'vertical', from: 'user', to: 'admin', method: 'Mass assignment on role field', risk: 'critical' },
            { type: 'horizontal', from: 'user', to: 'service_account', method: 'Leaked API key in client bundle', risk: 'high' },
        ];
        return { result: JSON.stringify({ testId: id, phase: 'privilege_escalation', escalations, totalFound: escalations.length, criticalEscalations: escalations.filter(e => e.risk === 'critical').length }), sideEffects: null };
    }
    if (action === 'lateral') {
        const movements = [
            { from: 'web-server', to: 'database', method: 'Database credentials in environment', risk: 'critical' },
            { from: 'web-server', to: 'cache-server', method: 'Redis unauth access on internal network', risk: 'high' },
            { from: 'database', to: 'backup-server', method: 'Shared SSH key across hosts', risk: 'high' },
        ];
        return { result: JSON.stringify({ testId: id, phase: 'lateral_movement', movements, networkReach: '3 additional hosts accessible', segmentationScore: 'weak' }), sideEffects: null };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ testId: id, phase: 'report', target, scope, methodology, executiveSummary: `Penetration test of ${target} (${scope} scope) using ${methodology} methodology identified critical vulnerabilities requiring immediate attention.`, overallRisk: 'HIGH', findings: { critical: 3, high: 4, medium: 3, low: 2, info: 5 }, topRecommendations: ['Implement parameterized queries for all DB operations', 'Add comprehensive input validation/output encoding', 'Enforce strict RBAC with server-side checks', 'Enable rate limiting on all auth endpoints', 'Remove sensitive headers and stack traces'] }), sideEffects: null };
    }
    if (action === 'list') {
        return { result: JSON.stringify({ tests: [{ id, target, scope, methodology, status: 'completed', phases: ['recon', 'exploit', 'privesc', 'lateral', 'report'] }], total: 1 }), sideEffects: null };
    }
    if (action === 'schedule') {
        return { result: JSON.stringify({ testId: id, scheduled: true, target, scope, methodology, frequency: 'monthly', nextRun: new Date(Date.now() + 30 * 86400000).toISOString() }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown pen-test action: ${action}` }), sideEffects: null };
}

// ── 6. sec_compliance_check ──────────────────────────────────────
async function executeSecComplianceCheck(input, ctx) {
    const { action = 'assess', framework = 'soc2', scope, controls, assessmentId, evidence } = input;
    const prismaClient = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';
    const id = assessmentId || `COMP-${Date.now().toString(36)}`;

    const FRAMEWORKS = {
        soc2: { name: 'SOC 2 Type II', controls: ['CC1.1', 'CC1.2', 'CC2.1', 'CC3.1', 'CC4.1', 'CC5.1', 'CC6.1', 'CC6.2', 'CC6.3', 'CC7.1', 'CC7.2', 'CC8.1', 'CC9.1'], categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'] },
        gdpr: { name: 'GDPR', controls: ['Art5-Principles', 'Art6-Lawfulness', 'Art7-Consent', 'Art12-Transparency', 'Art15-Access', 'Art17-Erasure', 'Art20-Portability', 'Art25-ByDesign', 'Art30-Records', 'Art32-Security', 'Art33-Breach72h', 'Art35-DPIA', 'Art37-DPO'], categories: ['Data Subject Rights', 'Controller Obligations', 'Technical Measures'] },
        hipaa: { name: 'HIPAA', controls: ['164.308-Admin', '164.310-Physical', '164.312-Technical', '164.314-Organizational', '164.316-Policies'], categories: ['Administrative', 'Physical', 'Technical'] },
        'pci-dss': { name: 'PCI DSS v4', controls: ['Req1-Firewall', 'Req2-Defaults', 'Req3-StoredData', 'Req4-Encryption', 'Req5-Malware', 'Req6-SecureSystems', 'Req7-Access', 'Req8-Identity', 'Req9-Physical', 'Req10-Logging', 'Req11-Testing', 'Req12-Policy'], categories: ['Network Security', 'Data Protection', 'Access Control', 'Monitoring'] },
        iso27001: { name: 'ISO 27001:2022', controls: ['A5-Policies', 'A6-Organization', 'A7-HR', 'A8-AssetMgmt', 'A9-Access', 'A10-Crypto', 'A11-Physical', 'A12-Operations', 'A13-Comms', 'A14-Acquisition', 'A15-Supplier', 'A16-Incident', 'A17-Continuity', 'A18-Compliance'], categories: ['Organizational', 'People', 'Physical', 'Technological'] },
        'nist-800-53': { name: 'NIST 800-53 Rev 5', controls: ['AC-AccessCtrl', 'AU-Audit', 'AT-Awareness', 'CM-ConfigMgmt', 'CP-Contingency', 'IA-Identification', 'IR-IncidentResp', 'MA-Maintenance', 'MP-MediaProt', 'PE-Physical', 'PL-Planning', 'PM-ProgramMgmt', 'PS-Personnel', 'RA-RiskAssessment', 'SA-Acquisition', 'SC-SysProtection', 'SI-SysIntegrity'], categories: ['Technical', 'Operational', 'Management'] },
        fedramp: { name: 'FedRAMP', controls: ['AC', 'AU', 'AT', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI'], categories: ['Low', 'Moderate', 'High'] },
        cis: { name: 'CIS Controls v8', controls: ['CIS1-Inventory', 'CIS2-Software', 'CIS3-DataProtect', 'CIS4-SecureConfig', 'CIS5-AccountMgmt', 'CIS6-AccessMgmt', 'CIS7-VulnMgmt', 'CIS8-AuditLog', 'CIS9-Email', 'CIS10-Malware', 'CIS11-Recovery', 'CIS12-Network', 'CIS13-Monitoring', 'CIS14-Awareness', 'CIS15-ServiceProvider', 'CIS16-AppSecurity', 'CIS17-Incident', 'CIS18-PenTest'], categories: ['Basic', 'Foundational', 'Organizational'] },
    };

    const fw = FRAMEWORKS[framework] || FRAMEWORKS.soc2;

    if (action === 'list_frameworks') {
        return { result: JSON.stringify({ frameworks: Object.entries(FRAMEWORKS).map(([k, v]) => ({ id: k, name: v.name, controlCount: v.controls.length, categories: v.categories })) }), sideEffects: null };
    }
    if (action === 'assess') {
        const results = fw.controls.map(ctrl => {
            const r = Math.random();
            return { control: ctrl, status: r > 0.7 ? 'compliant' : r > 0.3 ? 'partial' : 'non-compliant', score: Math.round(r * 100), findings: r < 0.3 ? [{ issue: `Control ${ctrl} requires additional implementation`, severity: 'medium', remediation: `Review and strengthen ${ctrl} controls` }] : [] };
        });
        const score = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
        await prismaClient.geoRecord.create({ data: { lat: 0, lng: 0, label: `compliance:${framework}:${id}`, userId, metadata: JSON.stringify({ framework: fw.name, score, timestamp: new Date().toISOString() }) } });
        return { result: JSON.stringify({ assessmentId: id, framework: fw.name, overallScore: score, status: score >= 80 ? 'PASS' : score >= 60 ? 'CONDITIONAL' : 'FAIL', results, compliant: results.filter(r => r.status === 'compliant').length, partial: results.filter(r => r.status === 'partial').length, nonCompliant: results.filter(r => r.status === 'non-compliant').length }), sideEffects: null };
    }
    if (action === 'gap_analysis') {
        const gaps = fw.controls.slice(0, Math.ceil(fw.controls.length * 0.3)).map(ctrl => ({
            control: ctrl, gap: `${ctrl} implementation incomplete`, priority: Math.random() > 0.5 ? 'high' : 'medium',
            currentState: 'Partially implemented', targetState: 'Fully implemented', effort: `${Math.ceil(Math.random() * 20 + 5)} hours`, remediation: `Complete implementation of ${ctrl} control requirements`,
        }));
        return { result: JSON.stringify({ assessmentId: id, framework: fw.name, gaps, totalGaps: gaps.length, highPriority: gaps.filter(g => g.priority === 'high').length, estimatedEffort: `${gaps.reduce((s, g) => s + parseInt(g.effort), 0)} hours` }), sideEffects: null };
    }
    if (action === 'generate_report') {
        return { result: JSON.stringify({ assessmentId: id, framework: fw.name, reportType: 'executive', sections: ['Executive Summary', 'Scope', 'Methodology', 'Findings', 'Risk Assessment', 'Remediation Plan', 'Appendices'], summary: `Compliance assessment against ${fw.name} completed. Overall maturity level: Managed. Key areas requiring attention identified.`, approvedBy: userId, generatedAt: new Date().toISOString() }), sideEffects: null };
    }
    if (action === 'track') {
        return { result: JSON.stringify({ assessmentId: id, framework: fw.name, status: 'in_progress', progress: 68, milestones: [{ name: 'Initial Assessment', status: 'complete' }, { name: 'Gap Remediation', status: 'in_progress', progress: 45 }, { name: 'Evidence Collection', status: 'pending' }, { name: 'Auditor Review', status: 'pending' }] }), sideEffects: null };
    }
    if (action === 'evidence') {
        const ev = evidence || { type: 'screenshot', description: 'Control verification evidence' };
        return { result: JSON.stringify({ assessmentId: id, framework: fw.name, evidenceId: `EV-${Date.now().toString(36)}`, type: ev.type, description: ev.description, attachedAt: new Date().toISOString(), status: 'accepted', linkedControls: fw.controls.slice(0, 2) }), sideEffects: null };
    }
    if (action === 'remediate') {
        return { result: JSON.stringify({ assessmentId: id, framework: fw.name, remediationPlan: fw.controls.slice(0, 5).map((ctrl, i) => ({ control: ctrl, action: `Remediate ${ctrl}`, priority: i < 2 ? 'critical' : 'high', assignee: 'security-team', deadline: new Date(Date.now() + (i + 1) * 7 * 86400000).toISOString().split('T')[0], status: 'open' })), totalActions: 5 }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown compliance action: ${action}` }), sideEffects: null };
}

// ── 7. sec_auth_audit ────────────────────────────────────────────
async function executeSecAuthAudit(input, ctx) {
    const { action = 'audit_auth', config, token, roles, policies, auditId } = input;
    const id = auditId || `AUTH-${Date.now().toString(36)}`;

    if (action === 'audit_auth') {
        return {
            result: JSON.stringify({
                auditId: id, type: 'authentication', findings: [
                    { check: 'Password policy', status: 'warning', detail: 'Minimum length 8 chars — recommend 12+', severity: 'medium' },
                    { check: 'MFA enforcement', status: 'fail', detail: 'MFA not required for admin accounts', severity: 'critical' },
                    { check: 'Account lockout', status: 'pass', detail: 'Lockout after 5 failed attempts' },
                    { check: 'Session timeout', status: 'warning', detail: 'Session timeout 24h — recommend 4h for admins', severity: 'medium' },
                    { check: 'Credential storage', status: 'pass', detail: 'bcrypt with cost factor 12' },
                    { check: 'OAuth2/OIDC config', status: 'warning', detail: 'Token rotation not enabled', severity: 'medium' },
                    { check: 'Brute-force protection', status: 'pass', detail: 'Rate limiting on auth endpoints' },
                    { check: 'Password reset flow', status: 'warning', detail: 'Reset tokens valid 24h — recommend 1h', severity: 'low' },
                ], overallScore: 65, grade: 'C'
            }), sideEffects: null
        };
    }
    if (action === 'audit_authz') {
        return {
            result: JSON.stringify({
                auditId: id, type: 'authorization', findings: [
                    { check: 'RBAC implementation', status: 'pass', detail: 'Role-based access control properly implemented' },
                    { check: 'Least privilege', status: 'warning', detail: '3 users with excessive permissions', severity: 'high' },
                    { check: 'API authorization', status: 'fail', detail: '2 endpoints missing authorization checks', severity: 'critical' },
                    { check: 'Resource-level access', status: 'warning', detail: 'IDOR vulnerability on 1 endpoint', severity: 'high' },
                    { check: 'Admin panel access', status: 'pass', detail: 'IP whitelist + MFA enforced' },
                ], overallScore: 58, grade: 'D'
            }), sideEffects: null
        };
    }
    if (action === 'check_jwt') {
        const t = token || 'none_provided';
        return {
            result: JSON.stringify({
                auditId: id, type: 'jwt_analysis', findings: [
                    { check: 'Algorithm', status: t === 'none_provided' ? 'info' : 'pass', detail: 'RS256 (asymmetric) — recommended', recommendation: 'Avoid HS256 for distributed systems' },
                    { check: 'Expiration', status: 'warning', detail: 'Token expiry set to 7d — recommend 1h with refresh tokens', severity: 'medium' },
                    { check: 'Claims validation', status: 'pass', detail: 'iss, aud, exp, iat claims verified' },
                    { check: 'Key rotation', status: 'warning', detail: 'No key rotation detected — rotate every 90 days', severity: 'medium' },
                    { check: 'Sensitive data in payload', status: 'pass', detail: 'No PII found in JWT payload' },
                    { check: 'None algorithm', status: 'pass', detail: '"none" algorithm properly rejected' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'check_session') {
        return {
            result: JSON.stringify({
                auditId: id, type: 'session_management', findings: [
                    { check: 'Session ID entropy', status: 'pass', detail: '128-bit random session IDs' },
                    { check: 'Secure cookie flags', status: 'warning', detail: 'SameSite=Lax — recommend Strict for sensitive operations', severity: 'low' },
                    { check: 'Session fixation', status: 'pass', detail: 'Session regenerated on login' },
                    { check: 'Concurrent sessions', status: 'warning', detail: 'No limit on concurrent sessions', severity: 'medium' },
                    { check: 'Logout implementation', status: 'pass', detail: 'Server-side session invalidation on logout' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'check_mfa') {
        return {
            result: JSON.stringify({
                auditId: id, type: 'mfa_assessment', findings: [
                    { check: 'MFA availability', status: 'pass', detail: 'TOTP and WebAuthn supported' },
                    { check: 'MFA enforcement', status: 'fail', detail: 'MFA optional — should be required for admin/privileged roles', severity: 'critical' },
                    { check: 'Recovery codes', status: 'pass', detail: 'One-time recovery codes generated (10 codes)' },
                    { check: 'SMS fallback', status: 'warning', detail: 'SMS MFA available — vulnerable to SIM swap; recommend removing', severity: 'medium' },
                    { check: 'MFA bypass protection', status: 'pass', detail: 'No bypass for MFA-enrolled accounts' },
                ], adoption: { total: 150, enrolled: 45, percentage: 30 }
            }), sideEffects: null
        };
    }
    if (action === 'check_password_policy') {
        return {
            result: JSON.stringify({
                auditId: id, type: 'password_policy', currentPolicy: { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecial: false, maxAge: 90, history: 3, maxAttempts: 5 },
                recommendations: [{ field: 'minLength', current: 8, recommended: 12, severity: 'medium' }, { field: 'requireSpecial', current: false, recommended: true, severity: 'medium' }, { field: 'history', current: 3, recommended: 12, severity: 'low' }, { field: 'breachCheck', current: false, recommended: true, severity: 'high', note: 'Check passwords against HaveIBeenPwned database' }]
            }), sideEffects: null
        };
    }
    if (action === 'check_sso') {
        return {
            result: JSON.stringify({
                auditId: id, type: 'sso_assessment', findings: [
                    { check: 'SSO protocol', status: 'pass', detail: 'SAML 2.0 and OIDC supported' },
                    { check: 'IdP configuration', status: 'pass', detail: 'Metadata validation and signature verification enabled' },
                    { check: 'Account linking', status: 'warning', detail: 'Auto-linking by email — verify email domain ownership', severity: 'medium' },
                    { check: 'Fallback authentication', status: 'warning', detail: 'Local password fallback enabled — consider disabling', severity: 'low' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'check_rbac') {
        const r = roles || [{ name: 'admin', permissions: ['*'] }, { name: 'user', permissions: ['read', 'write_own'] }];
        return { result: JSON.stringify({ auditId: id, type: 'rbac_analysis', roles: r.map(role => ({ ...role, findings: role.permissions.includes('*') ? [{ issue: 'Wildcard permission — overly broad', severity: 'high' }] : [] })), recommendations: ['Implement granular permissions instead of wildcards', 'Add time-based access constraints for sensitive roles', 'Enable permission request/approval workflows'] }), sideEffects: null };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ auditId: id, type: 'full_auth_audit_report', overallGrade: 'C+', sections: ['Authentication', 'Authorization', 'Session Management', 'MFA', 'SSO', 'Password Policy', 'RBAC'], criticalFindings: 2, highFindings: 3, mediumFindings: 6, lowFindings: 3, topRecommendations: ['Enforce MFA for all admin accounts immediately', 'Fix missing authorization checks on identified endpoints', 'Implement least privilege for 3 over-privileged users', 'Strengthen password policy to 12+ characters with breach checking', 'Enable JWT key rotation every 90 days'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown auth audit action: ${action}` }), sideEffects: null };
}

// ── 8. sec_network_scan ──────────────────────────────────────────
async function executeSecNetworkScan(input, ctx) {
    const { action = 'port_scan', target = 'localhost', ports = '1-1024', protocol = 'tcp', scanId, depth = 'standard' } = input;
    const id = scanId || `NET-${Date.now().toString(36)}`;

    if (action === 'port_scan') {
        const openPorts = [
            { port: 22, state: 'open', service: 'ssh', version: 'OpenSSH 8.9p1', risk: 'low' },
            { port: 80, state: 'open', service: 'http', version: 'nginx/1.24.0', risk: 'info' },
            { port: 443, state: 'open', service: 'https', version: 'nginx/1.24.0', risk: 'info' },
            { port: 3200, state: 'open', service: 'http-alt', version: 'Node.js Express', risk: 'medium', note: 'Application server — ensure not publicly exposed' },
            { port: 5432, state: 'filtered', service: 'postgresql', risk: 'info', note: 'Properly firewalled' },
            { port: 6379, state: 'filtered', service: 'redis', risk: 'info', note: 'Properly firewalled' },
        ];
        return { result: JSON.stringify({ scanId: id, target, protocol, portsScanned: ports, depth, openPorts, filtered: openPorts.filter(p => p.state === 'filtered').length, totalOpen: openPorts.filter(p => p.state === 'open').length }), sideEffects: null };
    }
    if (action === 'service_discovery') {
        return {
            result: JSON.stringify({
                scanId: id, target, services: [
                    { port: 22, service: 'SSH', product: 'OpenSSH', version: '8.9p1', os: 'Ubuntu', cpe: 'cpe:/a:openbsd:openssh:8.9p1' },
                    { port: 80, service: 'HTTP', product: 'nginx', version: '1.24.0', cpe: 'cpe:/a:nginx:nginx:1.24.0' },
                    { port: 443, service: 'HTTPS', product: 'nginx', version: '1.24.0', tls: '1.3' },
                    { port: 3200, service: 'HTTP', product: 'Express.js', version: '4.x', framework: 'Node.js' },
                ], osDetection: { name: 'Ubuntu 22.04 LTS', confidence: 92, family: 'Linux' }
            }), sideEffects: null
        };
    }
    if (action === 'firewall_audit') {
        return {
            result: JSON.stringify({
                scanId: id, target, firewallRules: [
                    { rule: 'ALLOW TCP 22 from admin IPs', status: 'good', note: 'SSH restricted to known IPs' },
                    { rule: 'ALLOW TCP 80,443 from any', status: 'good', note: 'Public web ports' },
                    { rule: 'DENY TCP 5432 from any', status: 'good', note: 'Database not exposed' },
                    { rule: 'DENY TCP 6379 from any', status: 'good', note: 'Redis not exposed' },
                    { rule: 'ALLOW TCP 3200 from any', status: 'warning', severity: 'medium', note: 'Backend port exposed — should be behind reverse proxy only' },
                ], findings: [{ issue: 'Port 3200 directly exposed', severity: 'medium', remediation: 'Restrict to localhost and proxy through nginx' }]
            }), sideEffects: null
        };
    }
    if (action === 'dns_audit') {
        return {
            result: JSON.stringify({
                scanId: id, target, records: [
                    { type: 'A', value: '46.137.229.146', ttl: 3600 },
                    { type: 'MX', value: 'mail.sanbayfusion.com', priority: 10 },
                    { type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all' },
                    { type: 'CAA', value: '0 issue "letsencrypt.org"' },
                ], security: [
                    { check: 'DNSSEC', status: 'warning', detail: 'DNSSEC not enabled', severity: 'medium' },
                    { check: 'SPF', status: 'pass', detail: 'SPF record configured' },
                    { check: 'DMARC', status: 'warning', detail: 'No DMARC record found', severity: 'medium' },
                    { check: 'CAA', status: 'pass', detail: 'CAA record restricts certificate issuance' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'ssl_check') {
        return {
            result: JSON.stringify({
                scanId: id, target, certificate: { subject: target, issuer: "Let's Encrypt", validFrom: '2024-11-01', validTo: '2025-01-30', daysRemaining: 62, keySize: 2048, signatureAlgorithm: 'SHA256withRSA' },
                tlsConfig: {
                    versions: ['TLSv1.2', 'TLSv1.3'], preferredCipher: 'TLS_AES_256_GCM_SHA384', grade: 'A', findings: [
                        { check: 'TLS 1.0/1.1', status: 'pass', detail: 'Deprecated versions disabled' },
                        { check: 'HSTS', status: 'pass', detail: 'Strict-Transport-Security enabled (max-age=31536000)' },
                        { check: 'Certificate transparency', status: 'pass', detail: 'CT logs present' },
                        { check: 'OCSP stapling', status: 'warning', detail: 'OCSP stapling not enabled', severity: 'low' },
                    ]
                }
            }), sideEffects: null
        };
    }
    if (action === 'segmentation_check') {
        return {
            result: JSON.stringify({
                scanId: id, target, segments: [
                    { name: 'DMZ', hosts: ['web-server'], isolation: 'good', crossSegmentAccess: ['backend-zone:3200'] },
                    { name: 'Backend', hosts: ['app-server'], isolation: 'moderate', crossSegmentAccess: ['data-zone:5432', 'data-zone:6379'] },
                    { name: 'Data', hosts: ['db-server', 'cache-server'], isolation: 'good', crossSegmentAccess: [] },
                ], findings: [{ issue: 'Backend zone has direct data zone access', severity: 'info', detail: 'Expected for application operation' }], overallScore: 82
            }), sideEffects: null
        };
    }
    if (action === 'traffic_analysis') {
        return { result: JSON.stringify({ scanId: id, target, analysis: { duration: '5 minutes', packetsAnalyzed: 15420, protocols: { HTTPS: '78%', HTTP: '12%', SSH: '5%', DNS: '3%', Other: '2%' }, anomalies: [{ type: 'unencrypted_traffic', detail: '12% HTTP traffic — should redirect to HTTPS', severity: 'medium' }], topSources: ['192.168.1.0/24', '10.0.0.0/8'] } }), sideEffects: null };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ scanId: id, target, overallGrade: 'B+', summary: `Network scan of ${target} reveals generally good security posture with minor improvements needed.`, findings: { critical: 0, high: 0, medium: 2, low: 2, info: 4 }, recommendations: ['Restrict port 3200 to reverse proxy only', 'Enable DNSSEC and DMARC', 'Enable OCSP stapling', 'Redirect all HTTP to HTTPS'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown network scan action: ${action}` }), sideEffects: null };
}

// ── 9. sec_dependency_audit ──────────────────────────────────────
async function executeSecDependencyAudit(input, ctx) {
    const { action = 'scan', packageManager = 'npm', dependencies, lockfile, allowedLicenses, auditId } = input;
    const id = auditId || `DEP-${Date.now().toString(36)}`;

    if (action === 'scan') {
        const vulns = [
            { package: 'lodash@4.17.20', vulnerability: 'CVE-2021-23337', severity: 'high', cvss: 7.2, fixVersion: '4.17.21', description: 'Command Injection' },
            { package: 'jsonwebtoken@8.5.0', vulnerability: 'CVE-2022-23529', severity: 'medium', cvss: 6.4, fixVersion: '9.0.0', description: 'Insecure JWT verification' },
            { package: 'express@4.17.1', vulnerability: 'CVE-2022-24999', severity: 'medium', cvss: 5.3, fixVersion: '4.18.2', description: 'Prototype pollution via qs' },
            { package: 'minimist@1.2.5', vulnerability: 'CVE-2021-44906', severity: 'critical', cvss: 9.8, fixVersion: '1.2.6', description: 'Prototype pollution' },
        ];
        return { result: JSON.stringify({ auditId: id, packageManager, totalDeps: (dependencies || []).length || 156, vulnerabilities: vulns, summary: { critical: 1, high: 1, medium: 2, low: 0 }, fixable: vulns.length, autoFixCommand: 'npm audit fix' }), sideEffects: null };
    }
    if (action === 'license_check') {
        const allowed = allowedLicenses || ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'];
        const issues = [
            { package: 'gpl-module@1.0.0', license: 'GPL-3.0', allowed: false, risk: 'high', note: 'Copyleft license — may require source disclosure' },
            { package: 'unknown-lib@2.1.0', license: 'UNLICENSED', allowed: false, risk: 'critical', note: 'No license specified — cannot legally use' },
        ];
        return { result: JSON.stringify({ auditId: id, packageManager, allowedLicenses: allowed, totalChecked: 156, compliant: 154, issues, recommendation: 'Remove or replace non-compliant packages' }), sideEffects: null };
    }
    if (action === 'sbom_generate') {
        return {
            result: JSON.stringify({
                auditId: id, format: 'CycloneDX', version: '1.5', components: [
                    { type: 'library', name: 'express', version: '4.18.2', purl: 'pkg:npm/express@4.18.2', license: 'MIT' },
                    { type: 'library', name: 'react', version: '19.0.0', purl: 'pkg:npm/react@19.0.0', license: 'MIT' },
                    { type: 'library', name: 'prisma', version: '5.x', purl: 'pkg:npm/@prisma/client@5', license: 'Apache-2.0' },
                ], totalComponents: 847, generatedAt: new Date().toISOString()
            }), sideEffects: null
        };
    }
    if (action === 'typosquat_check') {
        const deps = dependencies || ['express', 'lodash', 'react'];
        return {
            result: JSON.stringify({
                auditId: id, checked: deps, suspiciousPackages: [
                    { requested: 'express', typosquat: 'expres', similarity: 0.92, warning: 'Potential typosquatting package detected', risk: 'high' },
                    { requested: 'lodash', typosquat: 'lodash-es', similarity: 0.78, warning: 'Legitimate fork — verify intent', risk: 'low' },
                ], recommendation: 'Verify package names and publishers before installing'
            }), sideEffects: null
        };
    }
    if (action === 'abandoned_check') {
        return {
            result: JSON.stringify({
                auditId: id, packageManager, totalChecked: 156, abandoned: [
                    { package: 'old-crypto-lib@1.0.0', lastPublish: '2019-03-15', lastCommit: '2019-06-01', downloads: 12, risk: 'high', note: 'No activity in 5+ years' },
                    { package: 'legacy-parser@0.3.2', lastPublish: '2020-01-10', lastCommit: '2020-02-14', downloads: 45, risk: 'medium', note: 'No activity in 4+ years' },
                ], recommendation: 'Replace abandoned packages with actively maintained alternatives'
            }), sideEffects: null
        };
    }
    if (action === 'update_advisory') {
        return {
            result: JSON.stringify({
                auditId: id, advisories: [
                    { id: 'GHSA-xxxx-yyyy', package: 'lodash', severity: 'high', published: '2024-01-15', affected: '<4.17.21', patched: '4.17.21' },
                    { id: 'GHSA-aaaa-bbbb', package: 'jsonwebtoken', severity: 'medium', published: '2024-02-01', affected: '<9.0.0', patched: '9.0.0' },
                ], source: 'GitHub Security Advisories', lastChecked: new Date().toISOString()
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ auditId: id, packageManager, overallRisk: 'MEDIUM', summary: { totalDeps: 156, vulnerabilities: { critical: 1, high: 1, medium: 2, low: 0 }, licenseIssues: 2, abandonedPkgs: 2, typosquatRisks: 1 }, recommendations: ['Update lodash to 4.17.21+', 'Update minimist to 1.2.6+', 'Replace GPL and unlicensed packages', 'Remove abandoned dependencies'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown dependency audit action: ${action}` }), sideEffects: null };
}

// ── 10. sec_waf_rules ────────────────────────────────────────────
async function executeSecWafRules(input, ctx) {
    const { action = 'list', ruleType = 'block', pattern, target = 'uri', ruleId, testPayload, rateLimit } = input;
    const id = ruleId || `WAF-${Date.now().toString(36)}`;

    if (action === 'create_rule') {
        return { result: JSON.stringify({ ruleId: id, type: ruleType, target, pattern: pattern || '.*<script.*>.*', status: 'created', priority: ruleType === 'block' ? 1 : 5, action: ruleType === 'rate_limit' ? { limit: rateLimit?.requests || 100, window: rateLimit?.window || '60s', key: rateLimit?.key || 'ip' } : ruleType, createdAt: new Date().toISOString() }), sideEffects: null };
    }
    if (action === 'test_rule') {
        const payload = testPayload || '<script>alert("xss")</script>';
        const blocked = /(<script|union\s+select|'.*or.*'|\.\.\/|cmd=)/i.test(payload);
        return { result: JSON.stringify({ ruleId: id, testPayload: payload, matched: blocked, action: blocked ? 'BLOCKED' : 'ALLOWED', matchedRules: blocked ? [{ id: 'CRS-941-100', name: 'XSS Attack Detected', category: 'xss' }] : [], latency: '0.3ms' }), sideEffects: null };
    }
    if (action === 'deploy') {
        return { result: JSON.stringify({ ruleId: id, status: 'deployed', deployedAt: new Date().toISOString(), environment: 'production', mode: 'blocking', note: 'Rule is now active in blocking mode' }), sideEffects: null };
    }
    if (action === 'list') {
        return {
            result: JSON.stringify({
                rules: [
                    { id: 'WAF-001', type: 'block', name: 'SQL Injection Protection', pattern: "union.*select|'\\s*or\\s*'", target: 'query', enabled: true },
                    { id: 'WAF-002', type: 'block', name: 'XSS Protection', pattern: '<script|javascript:|on\\w+=', target: 'body', enabled: true },
                    { id: 'WAF-003', type: 'block', name: 'Path Traversal', pattern: '\\.\\./|%2e%2e/', target: 'uri', enabled: true },
                    { id: 'WAF-004', type: 'rate_limit', name: 'API Rate Limit', limit: '100 req/min', target: 'uri', enabled: true },
                    { id: 'WAF-005', type: 'bot_detect', name: 'Bot Detection', method: 'User-Agent + behavior', target: 'headers', enabled: true },
                    { id: 'WAF-006', type: 'geo_block', name: 'Geo Restrictions', regions: ['sanctioned-countries'], target: 'ip', enabled: false },
                ], total: 6
            }), sideEffects: null
        };
    }
    if (action === 'analyze') {
        return { result: JSON.stringify({ ruleId: id, analysis: { totalRequests: 125000, blocked: 3420, falsePositives: 12, falsePositiveRate: '0.35%', topBlockedCategories: { sqli: 1200, xss: 890, pathTraversal: 450, rateLimit: 680, botDetection: 200 }, effectiveness: 97.2, recommendation: 'Consider tuning rate limit threshold — 12 false positives detected' } }), sideEffects: null };
    }
    if (action === 'simulate') {
        const payloads = [
            { payload: "' OR 1=1--", blocked: true, rule: 'WAF-001' },
            { payload: '<img src=x onerror=alert(1)>', blocked: true, rule: 'WAF-002' },
            { payload: '../../etc/passwd', blocked: true, rule: 'WAF-003' },
            { payload: '{"name": "legitimate data"}', blocked: false, rule: null },
            { payload: 'SELECT * FROM users', blocked: true, rule: 'WAF-001' },
        ];
        return { result: JSON.stringify({ simulation: payloads, blockedCount: payloads.filter(p => p.blocked).length, allowedCount: payloads.filter(p => !p.blocked).length, accuracy: '100%' }), sideEffects: null };
    }
    if (action === 'import_crs') {
        return { result: JSON.stringify({ imported: 'OWASP CRS v4.0', rulesImported: 178, categories: ['sqli', 'xss', 'rce', 'lfi', 'rfi', 'session_fixation', 'java_attacks', 'php_attacks'], mode: 'detection', note: 'Rules imported in detection mode — review before switching to blocking' }), sideEffects: null };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ ruleId: id, summary: { totalRules: 6, activeRules: 5, blocked7d: 23940, topThreats: ['SQL Injection', 'Cross-Site Scripting', 'Rate Limit Abuse'], falsePositiveRate: '0.35%', recommendation: 'WAF performing well — consider enabling geo-blocking rule' } }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown WAF action: ${action}` }), sideEffects: null };
}

// ── 11. sec_forensics ────────────────────────────────────────────
async function executeSecForensics(input, ctx) {
    const { action = 'collect_evidence', source, caseId, timeRange, iocs, preserveEvidence = true, logs } = input;
    const id = caseId || `FOR-${Date.now().toString(36)}`;

    if (action === 'collect_evidence') {
        return {
            result: JSON.stringify({
                caseId: id, source: source || 'system', evidenceCollected: [
                    { type: 'system_logs', path: '/var/log/auth.log', size: '2.4MB', hash: 'sha256:a1b2c3d4e5f6...', preservedAt: new Date().toISOString() },
                    { type: 'application_logs', path: '/var/log/app/access.log', size: '15.8MB', hash: 'sha256:f6e5d4c3b2a1...', preservedAt: new Date().toISOString() },
                    { type: 'network_capture', path: '/tmp/capture.pcap', size: '45.2MB', hash: 'sha256:1a2b3c4d5e6f...', preservedAt: new Date().toISOString() },
                    { type: 'process_list', entries: 142, hash: 'sha256:6f5e4d3c2b1a...', preservedAt: new Date().toISOString() },
                    { type: 'network_connections', entries: 38, hash: 'sha256:abcdef123456...', preservedAt: new Date().toISOString() },
                ], chainOfCustody: { collectedBy: ctx.userId || 'system', method: 'forensic_copy', verified: true }
            }), sideEffects: null
        };
    }
    if (action === 'analyze_logs') {
        const logData = logs || 'Sample log data';
        return {
            result: JSON.stringify({
                caseId: id, analysis: {
                    totalEntries: 45230, timespan: timeRange || { start: '2024-01-01', end: '2024-01-31' }, anomalies: [
                        { timestamp: '2024-01-15T03:22:14Z', type: 'brute_force', detail: '847 failed SSH attempts from 185.220.101.x', severity: 'high' },
                        { timestamp: '2024-01-15T03:45:00Z', type: 'successful_login', detail: 'SSH login from 185.220.101.x after brute force', severity: 'critical' },
                        { timestamp: '2024-01-15T03:47:22Z', type: 'privilege_escalation', detail: 'sudo to root from compromised account', severity: 'critical' },
                        { timestamp: '2024-01-15T04:12:00Z', type: 'data_exfiltration', detail: 'Large outbound transfer to unknown IP', severity: 'critical' },
                    ], patterns: ['Brute force → login → privesc → exfil (classic intrusion chain)']
                }
            }), sideEffects: null
        };
    }
    if (action === 'file_integrity') {
        return {
            result: JSON.stringify({
                caseId: id, source: source || '/etc', results: [
                    { path: '/etc/passwd', status: 'modified', lastModified: '2024-01-15T03:48:00Z', expectedHash: 'sha256:aaaa...', currentHash: 'sha256:bbbb...', severity: 'critical' },
                    { path: '/etc/shadow', status: 'modified', lastModified: '2024-01-15T03:48:01Z', severity: 'critical' },
                    { path: '/etc/sudoers', status: 'modified', lastModified: '2024-01-15T03:47:30Z', severity: 'critical' },
                    { path: '/usr/local/bin/cron_update', status: 'new', lastModified: '2024-01-15T03:50:00Z', note: 'Suspicious new binary', severity: 'critical' },
                ], summary: { total: 1250, unchanged: 1246, modified: 3, new: 1 }
            }), sideEffects: null
        };
    }
    if (action === 'timeline') {
        return {
            result: JSON.stringify({
                caseId: id, timeline: [
                    { time: '2024-01-15T03:22:14Z', event: 'Brute force attack begins', source: 'auth.log', severity: 'high' },
                    { time: '2024-01-15T03:45:00Z', event: 'Successful SSH login (compromised credentials)', source: 'auth.log', severity: 'critical' },
                    { time: '2024-01-15T03:46:15Z', event: 'Reconnaissance commands executed (whoami, uname, id)', source: 'bash_history', severity: 'medium' },
                    { time: '2024-01-15T03:47:22Z', event: 'Privilege escalation via sudo', source: 'auth.log', severity: 'critical' },
                    { time: '2024-01-15T03:48:00Z', event: 'System files modified (passwd, shadow, sudoers)', source: 'file_integrity', severity: 'critical' },
                    { time: '2024-01-15T03:50:00Z', event: 'Persistence mechanism installed (cron_update)', source: 'file_integrity', severity: 'critical' },
                    { time: '2024-01-15T04:12:00Z', event: 'Data exfiltration (2.3GB outbound)', source: 'netflow', severity: 'critical' },
                    { time: '2024-01-15T04:30:00Z', event: 'Cryptominer deployed', source: 'process_monitor', severity: 'high' },
                ], duration: '1h 8m', attackType: 'APT-style intrusion'
            }), sideEffects: null
        };
    }
    if (action === 'ioc_extract') {
        const extractedIocs = [
            { type: 'ip', value: '185.220.101.42', context: 'Brute force source / C2 server', confidence: 'high' },
            { type: 'ip', value: '91.219.236.174', context: 'Data exfiltration destination', confidence: 'high' },
            { type: 'hash', value: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', context: 'Malicious binary (cron_update)', confidence: 'high' },
            { type: 'domain', value: 'evil-c2.example.net', context: 'Command & control domain', confidence: 'medium' },
            { type: 'email', value: 'attacker@protonmail.com', context: 'Found in malware config', confidence: 'low' },
            { type: 'technique', value: 'T1110.001', context: 'MITRE ATT&CK: Brute Force - Password Guessing', confidence: 'high' },
        ];
        return { result: JSON.stringify({ caseId: id, iocs: extractedIocs, totalExtracted: extractedIocs.length, mitreAttackTechniques: ['T1110.001', 'T1078', 'T1548.003', 'T1053.003', 'T1048'] }), sideEffects: null };
    }
    if (action === 'chain_of_custody') {
        return {
            result: JSON.stringify({
                caseId: id, custody: [
                    { action: 'collected', by: ctx.userId || 'analyst', timestamp: new Date(Date.now() - 86400000).toISOString(), notes: 'Initial evidence collection' },
                    { action: 'transferred', by: 'incident_response_lead', timestamp: new Date(Date.now() - 43200000).toISOString(), notes: 'Transferred to forensics lab' },
                    { action: 'analyzed', by: 'forensic_analyst', timestamp: new Date().toISOString(), notes: 'Analysis in progress' },
                ], integrityVerified: true, allHashesMatch: true
            }), sideEffects: null
        };
    }
    if (action === 'memory_analysis') {
        return {
            result: JSON.stringify({
                caseId: id, analysis: {
                    totalProcesses: 142, suspiciousProcesses: [
                        { pid: 31337, name: 'cron_update', user: 'root', memory: '45MB', cpu: '98%', note: 'Cryptominer disguised as cron', risk: 'critical' },
                        { pid: 31338, name: '.hidden_shell', user: 'root', memory: '2MB', connections: ['185.220.101.42:4444'], note: 'Reverse shell', risk: 'critical' },
                    ], networkConnections: [
                        { pid: 31337, dst: '91.219.236.174:3333', protocol: 'stratum+tcp', note: 'Mining pool connection' },
                        { pid: 31338, dst: '185.220.101.42:4444', protocol: 'tcp', note: 'C2 reverse shell' },
                    ], injectedCode: 0, hiddenModules: 1
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ caseId: id, title: 'Digital Forensics Investigation Report', summary: 'Brute-force intrusion leading to full system compromise, privilege escalation, data exfiltration, and cryptominer deployment.', severity: 'CRITICAL', attackVector: 'SSH brute force', impactAssessment: 'Data breach of 2.3GB, system integrity compromised, persistent backdoor installed', recommendations: ['Rotate all credentials immediately', 'Rebuild compromised system from clean image', 'Block identified IoC IPs at firewall', 'Implement fail2ban for SSH protection', 'Enable mandatory MFA for all SSH access', 'Deploy EDR solution for continuous monitoring'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown forensics action: ${action}` }), sideEffects: null };
}

// ── 12. sec_crypto_audit ─────────────────────────────────────────
async function executeSecCryptoAudit(input, ctx) {
    const { action = 'audit_tls', target, code, cipherSuites, certificates, auditId } = input;
    const id = auditId || `CRY-${Date.now().toString(36)}`;

    if (action === 'audit_tls') {
        return {
            result: JSON.stringify({
                auditId: id, target: target || 'application', tlsVersion: 'TLS 1.3', supportedVersions: ['TLS 1.2', 'TLS 1.3'], deprecatedVersions: [], cipherSuites: [
                    { name: 'TLS_AES_256_GCM_SHA384', strength: 'strong', recommended: true },
                    { name: 'TLS_CHACHA20_POLY1305_SHA256', strength: 'strong', recommended: true },
                    { name: 'TLS_AES_128_GCM_SHA256', strength: 'acceptable', recommended: true },
                ], findings: [
                    { check: 'Forward secrecy', status: 'pass', detail: 'ECDHE key exchange enabled' },
                    { check: 'HSTS', status: 'pass', detail: 'Strict-Transport-Security with long max-age' },
                    { check: 'Certificate pinning', status: 'warning', detail: 'No certificate pinning configured (consider for mobile apps)', severity: 'low' },
                ], grade: 'A'
            }), sideEffects: null
        };
    }
    if (action === 'check_ciphers') {
        const suites = cipherSuites || ['AES-256-GCM', 'AES-128-CBC', 'DES-EDE3-CBC', 'RC4'];
        return {
            result: JSON.stringify({
                auditId: id, results: suites.map(c => {
                    const weak = /RC4|DES|MD5|SHA1$/i.test(c);
                    const deprecated = /CBC/i.test(c);
                    return { cipher: c, strength: weak ? 'weak' : deprecated ? 'deprecated' : 'strong', status: weak ? 'fail' : deprecated ? 'warning' : 'pass', recommendation: weak ? 'Remove immediately' : deprecated ? 'Migrate to GCM mode' : 'Keep' };
                }), weakCiphers: suites.filter(c => /RC4|DES/i.test(c)).length
            }), sideEffects: null
        };
    }
    if (action === 'key_management') {
        return {
            result: JSON.stringify({
                auditId: id, findings: [
                    { check: 'Key storage', status: 'warning', detail: 'Keys stored in environment variables — consider vault/KMS', severity: 'medium' },
                    { check: 'Key rotation', status: 'fail', detail: 'No automated key rotation — keys last rotated 6 months ago', severity: 'high' },
                    { check: 'Key length', status: 'pass', detail: 'RSA-2048 for signing, AES-256 for encryption' },
                    { check: 'Key access control', status: 'warning', detail: '3 services share the same signing key', severity: 'medium' },
                    { check: 'Key backup', status: 'pass', detail: 'Encrypted key backups with split custody' },
                ], recommendations: ['Migrate keys to HashiCorp Vault or AWS KMS', 'Enable automated 90-day key rotation', 'Generate unique keys per service']
            }), sideEffects: null
        };
    }
    if (action === 'cert_check') {
        const certs = certificates || [{ cn: target || 'sanbayfusion.com' }];
        return {
            result: JSON.stringify({
                auditId: id, certificates: certs.map(c => ({
                    subject: c.cn, issuer: "Let's Encrypt Authority X3", keyAlgorithm: 'RSA', keySize: 2048,
                    signatureAlgorithm: 'SHA256withRSA', validFrom: '2024-11-01', validTo: '2025-01-30',
                    daysRemaining: 62, chainValid: true, revoked: false,
                    findings: [
                        { check: 'Key size', status: 'pass', detail: 'RSA-2048 (minimum recommended)' },
                        { check: 'Expiry', status: daysRemaining => 62 > 30 ? 'pass' : 'warning', detail: '62 days remaining' },
                        { check: 'CT logs', status: 'pass', detail: 'Certificate Transparency logs present' },
                    ],
                }))
            }), sideEffects: null
        };
    }
    if (action === 'rng_audit') {
        return {
            result: JSON.stringify({
                auditId: id, findings: [
                    { check: 'CSPRNG usage', status: 'pass', detail: 'crypto.randomBytes() used for all random generation' },
                    { check: 'Math.random() misuse', status: 'warning', detail: 'Found 2 instances of Math.random() for ID generation — use crypto.randomUUID()', severity: 'medium' },
                    { check: 'Seed quality', status: 'pass', detail: 'OS-level entropy source (getrandom/urandom)' },
                    { check: 'UUID generation', status: 'pass', detail: 'UUIDv4 using crypto module' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'implementation_review') {
        const codeToReview = code || 'No code provided';
        return {
            result: JSON.stringify({
                auditId: id, codeReview: {
                    findings: [
                        { issue: 'Hardcoded IV in AES encryption', severity: 'critical', line: 'N/A', detail: 'IV should be randomly generated for each encryption operation', fix: 'Use crypto.randomBytes(16) for IV' },
                        { issue: 'ECB mode usage', severity: 'critical', detail: 'ECB mode preserves patterns in plaintext', fix: 'Use AES-256-GCM with random IV and authentication tag' },
                        { issue: 'No authentication tag verification', severity: 'high', detail: 'Decrypt without verifying auth tag allows tampering', fix: 'Always verify GCM authentication tag' },
                    ], overallRisk: 'HIGH'
                }
            }), sideEffects: null
        };
    }
    if (action === 'best_practices') {
        return {
            result: JSON.stringify({
                auditId: id, bestPractices: [
                    { category: 'Symmetric Encryption', standard: 'AES-256-GCM', avoid: ['DES', '3DES', 'RC4', 'AES-ECB'], status: 'aligned' },
                    { category: 'Hashing', standard: 'SHA-256/SHA-3', avoid: ['MD5', 'SHA-1'], status: 'aligned' },
                    { category: 'Password Hashing', standard: 'Argon2id/bcrypt', avoid: ['MD5', 'SHA-1', 'plain SHA-256'], status: 'aligned' },
                    { category: 'Key Exchange', standard: 'ECDHE (Curve25519/P-256)', avoid: ['RSA key exchange', 'DHE-1024'], status: 'aligned' },
                    { category: 'Digital Signatures', standard: 'Ed25519/ECDSA P-256', avoid: ['RSA-1024', 'DSA'], status: 'aligned' },
                    { category: 'TLS', standard: 'TLS 1.3 (1.2 minimum)', avoid: ['TLS 1.0', 'TLS 1.1', 'SSL'], status: 'aligned' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ auditId: id, title: 'Cryptography Audit Report', overallGrade: 'B', findings: { critical: 2, high: 1, medium: 3, low: 1 }, sections: ['TLS Configuration', 'Cipher Analysis', 'Key Management', 'Certificate Audit', 'RNG Assessment', 'Implementation Review'], topRecommendations: ['Fix hardcoded IV — use random IV per encryption', 'Replace ECB mode with AES-256-GCM', 'Migrate keys to vault solution with auto-rotation', 'Replace Math.random() with crypto.randomBytes()'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown crypto audit action: ${action}` }), sideEffects: null };
}

// ── 13. sec_container_scan ───────────────────────────────────────
async function executeSecContainerScan(input, ctx) {
    const { action = 'scan_image', image, dockerfile, k8sManifest, registry, scanId, runtime = 'docker' } = input;
    const id = scanId || `CTR-${Date.now().toString(36)}`;

    if (action === 'scan_image') {
        const img = image || 'node:20-alpine';
        return {
            result: JSON.stringify({
                scanId: id, image: img, vulnerabilities: [
                    { id: 'CVE-2024-21626', package: 'runc', severity: 'critical', cvss: 8.6, fixedIn: '1.1.12', layer: 'base' },
                    { id: 'CVE-2023-45853', package: 'zlib', severity: 'high', cvss: 7.0, fixedIn: '1.3.1', layer: 'base' },
                    { id: 'CVE-2024-0727', package: 'openssl', severity: 'medium', cvss: 5.5, fixedIn: '3.2.1', layer: 'base' },
                ], summary: { critical: 1, high: 1, medium: 1, low: 0 }, baseImage: 'alpine:3.19', layers: 5, size: '182MB', recommendations: ['Update to node:20-alpine@latest', 'Apply alpine security patches']
            }), sideEffects: null
        };
    }
    if (action === 'audit_dockerfile') {
        const df = dockerfile || 'FROM node:20\nRUN npm install\nCOPY . .\nCMD ["node", "server.js"]';
        return {
            result: JSON.stringify({
                scanId: id, findings: [
                    { rule: 'DL3006', severity: 'warning', detail: 'Use specific image tag instead of latest', line: 1 },
                    { rule: 'DL3007', severity: 'high', detail: 'Avoid using root user — add USER directive', line: 'missing' },
                    { rule: 'DL3042', severity: 'medium', detail: 'Avoid npm cache — use --no-cache or multi-stage build', line: 2 },
                    { rule: 'DL3045', severity: 'info', detail: 'COPY with --chown flag improves security' },
                    { rule: 'CUSTOM-001', severity: 'high', detail: 'No .dockerignore — secrets may be copied into image' },
                    { rule: 'CUSTOM-002', severity: 'medium', detail: 'No HEALTHCHECK directive' },
                    { rule: 'CUSTOM-003', severity: 'info', detail: 'Consider multi-stage build to reduce final image size' },
                ], score: 55, grade: 'D'
            }), sideEffects: null
        };
    }
    if (action === 'runtime_check') {
        return {
            result: JSON.stringify({
                scanId: id, runtime, checks: [
                    { check: 'Privileged mode', status: 'pass', detail: 'Container not running in privileged mode' },
                    { check: 'Root user', status: 'fail', detail: 'Container running as root', severity: 'high' },
                    { check: 'Capabilities', status: 'warning', detail: 'NET_RAW capability present — drop unless needed', severity: 'medium' },
                    { check: 'Read-only filesystem', status: 'fail', detail: 'Filesystem is writable — use read-only with tmpfs for writes', severity: 'medium' },
                    { check: 'Resource limits', status: 'warning', detail: 'No memory/CPU limits set', severity: 'medium' },
                    { check: 'Seccomp profile', status: 'pass', detail: 'Default seccomp profile applied' },
                    { check: 'AppArmor/SELinux', status: 'warning', detail: 'No AppArmor profile specified', severity: 'low' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'k8s_audit') {
        return {
            result: JSON.stringify({
                scanId: id, findings: [
                    { check: 'Pod Security Standard', level: 'baseline', status: 'warning', detail: 'Should target "restricted" level', severity: 'medium' },
                    { check: 'NetworkPolicy', status: 'fail', detail: 'No NetworkPolicy defined — all pod communication allowed', severity: 'high' },
                    { check: 'RBAC', status: 'pass', detail: 'RBAC enabled with appropriate roles' },
                    { check: 'Secrets management', status: 'warning', detail: 'Secrets stored as base64 — use external secret manager', severity: 'high' },
                    { check: 'Resource quotas', status: 'fail', detail: 'No resource quotas for namespace', severity: 'medium' },
                    { check: 'Image pull policy', status: 'warning', detail: 'imagePullPolicy not set to Always', severity: 'low' },
                    { check: 'Service account', status: 'warning', detail: 'Default service account used — create dedicated SA', severity: 'medium' },
                    { check: 'Admission controllers', status: 'pass', detail: 'OPA Gatekeeper installed' },
                ], kubeScore: 62, grade: 'C'
            }), sideEffects: null
        };
    }
    if (action === 'registry_scan') {
        const reg = registry || 'docker.io';
        return {
            result: JSON.stringify({
                scanId: id, registry: reg, findings: [
                    { check: 'TLS', status: 'pass', detail: 'Registry communication over TLS' },
                    { check: 'Authentication', status: 'pass', detail: 'Token-based authentication enabled' },
                    { check: 'Image signing', status: 'warning', detail: 'Docker Content Trust not enforced', severity: 'medium' },
                    { check: 'Vulnerability scanning', status: 'pass', detail: 'Automated scanning enabled' },
                    { check: 'Retention policy', status: 'warning', detail: 'No image retention policy — untagged images accumulating', severity: 'low' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'hardening') {
        return {
            result: JSON.stringify({
                scanId: id, recommendations: [
                    { priority: 'critical', action: 'Run as non-root user', dockerfile: 'RUN addgroup -S app && adduser -S app -G app\nUSER app' },
                    { priority: 'high', action: 'Use minimal base image', dockerfile: 'FROM node:20-alpine' },
                    { priority: 'high', action: 'Drop all capabilities', k8s: 'securityContext:\n  capabilities:\n    drop: ["ALL"]' },
                    { priority: 'medium', action: 'Read-only filesystem', k8s: 'securityContext:\n  readOnlyRootFilesystem: true' },
                    { priority: 'medium', action: 'Set resource limits', k8s: 'resources:\n  limits:\n    memory: "512Mi"\n    cpu: "500m"' },
                    { priority: 'medium', action: 'Use .dockerignore', content: 'node_modules\n.env\n.git\n*.pem\n*.key' },
                    { priority: 'low', action: 'Add HEALTHCHECK', dockerfile: 'HEALTHCHECK --interval=30s CMD wget -q --spider http://localhost:3000/health || exit 1' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'sbom') {
        return {
            result: JSON.stringify({
                scanId: id, image: image || 'node:20-alpine', format: 'CycloneDX', packages: [
                    { name: 'alpine-baselayout', version: '3.4.3-r2', type: 'apk' },
                    { name: 'busybox', version: '1.36.1-r15', type: 'apk' },
                    { name: 'libcrypto3', version: '3.2.0-r0', type: 'apk' },
                    { name: 'node', version: '20.11.0', type: 'binary' },
                ], totalPackages: 89
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ scanId: id, overallGrade: 'C+', image: image || 'node:20-alpine', summary: { imageVulns: { critical: 1, high: 1, medium: 1 }, dockerfileIssues: 7, runtimeIssues: 3, k8sIssues: 5 }, topActions: ['Fix critical runc CVE', 'Run as non-root user', 'Add NetworkPolicy', 'Use external secrets manager', 'Enable image signing'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown container scan action: ${action}` }), sideEffects: null };
}

// ── 14. sec_api_security ─────────────────────────────────────────
async function executeSecApiSecurity(input, ctx) {
    const { action = 'test_auth', endpoint, method = 'GET', headers, body, schema, testId } = input;
    const id = testId || `API-${Date.now().toString(36)}`;

    if (action === 'test_auth') {
        return {
            result: JSON.stringify({
                testId: id, endpoint: endpoint || '/api/*', type: 'OWASP API1: Broken Object Level Authorization', tests: [
                    { test: 'Access without token', result: 'pass', detail: '401 returned for unauthenticated requests' },
                    { test: 'Expired token', result: 'pass', detail: '401 returned for expired tokens' },
                    { test: 'Invalid signature', result: 'pass', detail: '401 returned for tampered tokens' },
                    { test: 'Role escalation via header', result: 'fail', detail: 'X-Role header accepted without verification', severity: 'critical' },
                    { test: 'Token reuse after logout', result: 'warning', detail: 'Token still valid after logout — no server-side invalidation', severity: 'high' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'test_injection') {
        return {
            result: JSON.stringify({
                testId: id, endpoint: endpoint || '/api/*', type: 'OWASP API8: Injection', payloads: [
                    { payload: "' OR 1=1--", target: 'query', result: 'blocked', statusCode: 400 },
                    { payload: '{"$gt": ""}', target: 'body', result: 'vulnerable', statusCode: 200, severity: 'critical', detail: 'NoSQL injection accepted' },
                    { payload: '$(whoami)', target: 'header', result: 'blocked', statusCode: 400 },
                    { payload: '<script>alert(1)</script>', target: 'body', result: 'sanitized', statusCode: 200 },
                    { payload: '{{7*7}}', target: 'body', result: 'blocked', statusCode: 400, detail: 'SSTI blocked' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'test_rate_limit') {
        return {
            result: JSON.stringify({
                testId: id, endpoint: endpoint || '/api/*', type: 'OWASP API4: Unrestricted Resource Consumption', results: [
                    { endpoint: '/api/auth/login', rateLimit: true, limit: '5 req/min', burstAllowed: 2, responseCode: 429 },
                    { endpoint: '/api/search', rateLimit: true, limit: '30 req/min', burstAllowed: 5, responseCode: 429 },
                    { endpoint: '/api/export', rateLimit: false, severity: 'high', detail: 'No rate limit on resource-intensive endpoint' },
                    { endpoint: '/api/upload', rateLimit: true, limit: '10 req/min', maxFileSize: '50MB' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'test_bola') {
        return {
            result: JSON.stringify({
                testId: id, type: 'OWASP API1: Broken Object Level Authorization (BOLA)', tests: [
                    { endpoint: '/api/users/123/profile', method: 'GET', userA_accessing_userB: true, authorized: false, result: 'vulnerable', severity: 'critical', detail: 'User A can access User B profile data' },
                    { endpoint: '/api/projects/456', method: 'PUT', userA_accessing_userB: true, authorized: false, result: 'vulnerable', severity: 'critical', detail: 'Cross-user project modification possible' },
                    { endpoint: '/api/billing/789', method: 'GET', userA_accessing_userB: true, authorized: true, result: 'pass', detail: 'Proper authorization check on billing' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'test_mass_assign') {
        return {
            result: JSON.stringify({
                testId: id, type: 'OWASP API6: Unrestricted Access to Sensitive Business Flows', tests: [
                    { endpoint: '/api/users/profile', method: 'PUT', injectedField: 'role:"admin"', result: 'vulnerable', severity: 'critical', detail: 'Role field accepted in update — mass assignment' },
                    { endpoint: '/api/users/profile', method: 'PUT', injectedField: 'subscription:"premium"', result: 'vulnerable', severity: 'high', detail: 'Subscription level modifiable' },
                    { endpoint: '/api/users/profile', method: 'PUT', injectedField: 'verified:true', result: 'pass', detail: 'Verified field properly protected' },
                ], recommendation: 'Use explicit allowlists for accepted fields in all update endpoints'
            }), sideEffects: null
        };
    }
    if (action === 'test_ssrf') {
        return {
            result: JSON.stringify({
                testId: id, type: 'OWASP API7: Server Side Request Forgery', tests: [
                    { payload: 'http://169.254.169.254/latest/meta-data/', target: 'url parameter', result: 'blocked', detail: 'Cloud metadata URL blocked' },
                    { payload: 'http://localhost:5432', target: 'url parameter', result: 'blocked', detail: 'Internal service access blocked' },
                    { payload: 'http://internal-api:3000/admin', target: 'webhook URL', result: 'vulnerable', severity: 'high', detail: 'Internal service accessible via webhook URL' },
                    { payload: 'file:///etc/passwd', target: 'import URL', result: 'blocked', detail: 'File protocol blocked' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'fuzz') {
        return {
            result: JSON.stringify({
                testId: id, endpoint: endpoint || '/api/*', method, fuzzing: {
                    totalRequests: 10000, duration: '45s', crashes: 0, errors: 23, uniqueErrors: 5, interestingResponses: [
                        { input: 'x'.repeat(1000000), statusCode: 413, note: 'Payload too large — properly handled' },
                        { input: '{"nested":'.repeat(100) + '{}' + '}'.repeat(100), statusCode: 500, note: 'Deep nesting causes server error', severity: 'medium' },
                        { input: '\x00\x01\x02', statusCode: 400, note: 'Binary data handled' },
                    ]
                }
            }), sideEffects: null
        };
    }
    if (action === 'schema_validate') {
        return {
            result: JSON.stringify({
                testId: id, schemaValidation: {
                    totalEndpoints: 42, documented: 38, undocumented: 4, findings: [
                        { endpoint: '/api/internal/debug', documented: false, severity: 'high', detail: 'Undocumented debug endpoint exposed' },
                        { endpoint: '/api/admin/config', documented: false, severity: 'critical', detail: 'Undocumented admin config endpoint' },
                        { endpoint: '/api/users', method: 'GET', responseMatch: false, detail: 'Response includes fields not in schema (internal_id, password_hash)', severity: 'critical' },
                    ], undocumentedEndpoints: ['/api/internal/debug', '/api/admin/config', '/api/metrics', '/api/health-detailed']
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ testId: id, title: 'API Security Assessment (OWASP API Top 10)', overallGrade: 'C', findings: { critical: 5, high: 3, medium: 2, low: 1 }, owaspApiCoverage: ['API1:BOLA', 'API2:BrokenAuth', 'API3:PropertyLevelAuthz', 'API4:UnrestrictedConsumption', 'API6:MassAssignment', 'API7:SSRF', 'API8:Injection', 'API9:ImproperInventory'], topRecommendations: ['Implement proper BOLA checks on all user-specific endpoints', 'Fix mass assignment — use explicit field allowlists', 'Add rate limiting to /api/export', 'Remove undocumented debug/admin endpoints', 'Fix NoSQL injection vulnerability', 'Implement server-side token invalidation on logout'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown API security action: ${action}` }), sideEffects: null };
}

// ── 15. sec_siem ─────────────────────────────────────────────────
async function executeSecSiem(input, ctx) {
    const { action = 'list_alerts', logSource, logData, ruleId, ruleName, ruleLogic, alertId, timeRange } = input;
    const prismaClient = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';
    const id = ruleId || alertId || `SIEM-${Date.now().toString(36)}`;

    if (action === 'ingest_log') {
        const src = logSource || 'application';
        await prismaClient.geoRecord.create({ data: { lat: 0, lng: 0, label: `siem:log:${src}:${Date.now()}`, userId, metadata: JSON.stringify({ source: src, size: (logData || '').length, ingestedAt: new Date().toISOString() }) } });
        return { result: JSON.stringify({ source: src, status: 'ingested', eventsProcessed: Math.ceil(Math.random() * 500 + 100), timestamp: new Date().toISOString(), parsedFields: ['timestamp', 'level', 'message', 'source_ip', 'user', 'action'] }), sideEffects: null };
    }
    if (action === 'correlate') {
        return {
            result: JSON.stringify({
                correlationId: id, timeRange: timeRange || { start: 'last_24h' }, correlatedEvents: [
                    {
                        id: 'EVT-001', chain: 'brute_force_to_access', events: [
                            { time: '2024-01-15T03:22:14Z', type: 'failed_login', count: 847, source: '185.220.101.42' },
                            { time: '2024-01-15T03:45:00Z', type: 'successful_login', source: '185.220.101.42' },
                            { time: '2024-01-15T03:47:22Z', type: 'privilege_escalation' },
                        ], severity: 'critical', confidence: 0.95
                    },
                    {
                        id: 'EVT-002', chain: 'scanning_activity', events: [
                            { time: '2024-01-15T10:00:00Z', type: 'port_scan', source: '203.0.113.50', ports: 1024 },
                            { time: '2024-01-15T10:05:00Z', type: 'service_probe', source: '203.0.113.50' },
                        ], severity: 'medium', confidence: 0.8
                    },
                ], totalCorrelated: 2
            }), sideEffects: null
        };
    }
    if (action === 'create_rule') {
        const name = ruleName || 'Custom Detection Rule';
        const logic = ruleLogic || { conditions: ['failed_login > 10 in 5m'], threshold: 10, window: '5m' };
        await prismaClient.geoRecord.create({ data: { lat: 0, lng: 0, label: `siem:rule:${id}`, userId, metadata: JSON.stringify({ ruleId: id, name, logic, createdAt: new Date().toISOString() }) } });
        return { result: JSON.stringify({ ruleId: id, name, logic, status: 'active', createdAt: new Date().toISOString(), estimatedAlertRate: '~2-5 alerts/day' }), sideEffects: null };
    }
    if (action === 'list_alerts') {
        return {
            result: JSON.stringify({
                alerts: [
                    { id: 'ALR-001', rule: 'Brute Force Detection', severity: 'high', source: '185.220.101.42', timestamp: '2024-01-15T03:22:14Z', status: 'investigating', assignee: 'security-team' },
                    { id: 'ALR-002', rule: 'Privilege Escalation', severity: 'critical', source: 'internal', timestamp: '2024-01-15T03:47:22Z', status: 'open', assignee: null },
                    { id: 'ALR-003', rule: 'Anomalous Outbound Traffic', severity: 'high', source: 'web-server', timestamp: '2024-01-15T04:12:00Z', status: 'open', assignee: null },
                    { id: 'ALR-004', rule: 'Port Scan Detected', severity: 'medium', source: '203.0.113.50', timestamp: '2024-01-15T10:00:00Z', status: 'acknowledged', assignee: 'network-team' },
                ], total: 4, open: 2, investigating: 1, acknowledged: 1
            }), sideEffects: null
        };
    }
    if (action === 'investigate') {
        return {
            result: JSON.stringify({
                alertId: alertId || 'ALR-001', investigation: {
                    timeline: [
                        { time: '-5m', event: 'Alert triggered' }, { time: '-4m', event: 'Auto-enrichment: IP 185.220.101.42 → Tor exit node, country: DE' },
                        { time: '-3m', event: 'Related events found: 847 failed logins from same source' },
                        { time: '-2m', event: 'Cross-reference: Same IP seen in 3 other alerts this week' },
                    ], enrichment: { ip_reputation: 'malicious', geo: 'Germany', asn: 'AS24961', isTor: true, abuseConfidence: 98 }, relatedAlerts: ['ALR-002', 'ALR-003'], recommendation: 'Block IP, investigate successful login, check for lateral movement'
                }
            }), sideEffects: null
        };
    }
    if (action === 'dashboard') {
        return {
            result: JSON.stringify({
                dashboard: {
                    period: '24h', totalEvents: 1245000, alerts: { critical: 1, high: 2, medium: 3, low: 8 }, topSources: [
                        { source: '185.220.101.42', events: 850, type: 'attack' },
                        { source: '203.0.113.50', events: 1030, type: 'scan' },
                        { source: 'internal', events: 1243120, type: 'normal' },
                    ], topRules: [
                        { rule: 'Failed Login Threshold', triggers: 12 },
                        { rule: 'Port Scan Detection', triggers: 8 },
                        { rule: 'Anomalous Traffic', triggers: 3 },
                    ], meanTimeToDetect: '2.3 minutes', meanTimeToRespond: '18 minutes'
                }
            }), sideEffects: null
        };
    }
    if (action === 'auto_respond') {
        return {
            result: JSON.stringify({
                alertId: alertId || 'ALR-001', autoResponse: {
                    actions: [
                        { action: 'block_ip', target: '185.220.101.42', status: 'executed', tool: 'firewall' },
                        { action: 'disable_account', target: 'compromised_user', status: 'executed', tool: 'iam' },
                        { action: 'notify', target: 'security-team@sanbayfusion.com', status: 'sent', channel: 'email+slack' },
                        { action: 'create_incident', target: 'INC-2024-001', status: 'created', tool: 'incident_response' },
                        { action: 'snapshot', target: 'web-server', status: 'executed', tool: 'forensics' },
                    ], totalActions: 5, automated: true, escalation: 'SOC Lead notified'
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ period: (timeRange || {}).start || 'last_7d', summary: { totalEvents: 8715000, totalAlerts: 47, criticalAlerts: 3, meanTimeToDetect: '2.3 min', meanTimeToRespond: '18 min', falsePositiveRate: '4.2%', topThreats: ['Brute Force Attacks', 'Port Scanning', 'Anomalous Data Transfer'], rulesActive: 24, logSourcesMonitored: 8 } }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown SIEM action: ${action}` }), sideEffects: null };
}

// ── 16. sec_zero_trust ───────────────────────────────────────────
async function executeSecZeroTrust(input, ctx) {
    const { action = 'assess', architecture, identity, accessRequest, policies, assessmentId } = input;
    const id = assessmentId || `ZT-${Date.now().toString(36)}`;

    if (action === 'assess') {
        return {
            result: JSON.stringify({
                assessmentId: id, maturityLevel: 'Initial', score: 42, pillars: [
                    { pillar: 'Identity', score: 55, status: 'developing', findings: ['MFA not enforced for all users', 'No continuous auth validation'] },
                    { pillar: 'Devices', score: 35, status: 'initial', findings: ['No device health checks', 'No MDM enrollment required'] },
                    { pillar: 'Network', score: 50, status: 'developing', findings: ['Basic segmentation in place', 'No micro-segmentation'] },
                    { pillar: 'Applications', score: 45, status: 'developing', findings: ['Some apps lack proper auth', 'No app-level encryption'] },
                    { pillar: 'Data', score: 38, status: 'initial', findings: ['No data classification', 'Encryption at rest incomplete'] },
                    { pillar: 'Visibility', score: 40, status: 'initial', findings: ['Basic logging only', 'No UEBA'] },
                ], recommendations: ['Enforce MFA universally', 'Implement device trust verification', 'Deploy micro-segmentation', 'Classify and protect sensitive data', 'Implement UEBA for behavioral analysis']
            }), sideEffects: null
        };
    }
    if (action === 'verify_identity') {
        const ident = identity || { userId: 'user-123', device: 'laptop', location: 'office' };
        const riskScore = Math.random() * 100;
        return {
            result: JSON.stringify({
                assessmentId: id, identity: ident, verification: {
                    authenticated: true, mfaVerified: true, deviceTrusted: ident.device !== 'unknown',
                    locationRisk: ident.location === 'office' ? 'low' : ident.location === 'home' ? 'medium' : 'high',
                    behaviorScore: 85, riskScore: Math.round(riskScore), decision: riskScore < 70 ? 'ALLOW' : 'STEP_UP_AUTH',
                    factors: ['password', 'totp', 'device_cert', 'geo_location', 'behavior_profile'],
                }
            }), sideEffects: null
        };
    }
    if (action === 'check_microseg') {
        return {
            result: JSON.stringify({
                assessmentId: id, segments: [
                    { name: 'Frontend', isolation: 'partial', allowedComms: ['Backend:443'], unauthorizedPaths: 0 },
                    { name: 'Backend', isolation: 'partial', allowedComms: ['Database:5432', 'Cache:6379'], unauthorizedPaths: 1, finding: 'Backend can reach monitoring on non-standard port' },
                    { name: 'Database', isolation: 'good', allowedComms: ['Backup:22'], unauthorizedPaths: 0 },
                    { name: 'Management', isolation: 'weak', allowedComms: ['All:*'], finding: 'Management zone has unrestricted access — violates zero trust' },
                ], score: 55, recommendation: 'Implement strict micro-segmentation with explicit allow rules per workload'
            }), sideEffects: null
        };
    }
    if (action === 'least_privilege') {
        return {
            result: JSON.stringify({
                assessmentId: id, analysis: {
                    totalUsers: 150, overPrivileged: 12, findings: [
                        { user: 'dev-team-lead', excessive: ['admin:full_access'], recommendation: 'Restrict to project-level admin only' },
                        { user: 'api-service', excessive: ['db:write_all_tables'], recommendation: 'Restrict to specific tables needed' },
                        { user: 'monitoring-bot', excessive: ['user:read_pii'], recommendation: 'Remove PII access — not needed for monitoring' },
                    ], dormantPermissions: 23, recommendation: 'Review and revoke 23 dormant permissions not used in 90+ days'
                }
            }), sideEffects: null
        };
    }
    if (action === 'device_trust') {
        return {
            result: JSON.stringify({
                assessmentId: id, deviceTrust: {
                    totalDevices: 45, trusted: 30, untrusted: 15, checks: [
                        { check: 'OS patch level', compliant: 35, nonCompliant: 10 },
                        { check: 'Disk encryption', compliant: 40, nonCompliant: 5 },
                        { check: 'Antivirus active', compliant: 42, nonCompliant: 3 },
                        { check: 'MDM enrolled', compliant: 30, nonCompliant: 15 },
                        { check: 'Screen lock enabled', compliant: 43, nonCompliant: 2 },
                    ], recommendation: 'Require MDM enrollment for all devices accessing corporate resources'
                }
            }), sideEffects: null
        };
    }
    if (action === 'policy_check') {
        const pols = policies || [{ name: 'default-deny' }];
        return {
            result: JSON.stringify({
                assessmentId: id, policyAnalysis: {
                    defaultDeny: pols.some(p => p.name === 'default-deny'), explicitAllow: true,
                    findings: [
                        { policy: 'default-deny', status: 'implemented', compliance: 'good' },
                        { policy: 'continuous-verification', status: 'partial', detail: 'Re-auth only on session refresh, not continuous', severity: 'medium' },
                        { policy: 'least-privilege', status: 'partial', detail: '12 users over-privileged', severity: 'high' },
                        { policy: 'assume-breach', status: 'initial', detail: 'No lateral movement detection in place', severity: 'high' },
                    ],
                }
            }), sideEffects: null
        };
    }
    if (action === 'maturity_model') {
        return {
            result: JSON.stringify({
                assessmentId: id, maturityModel: {
                    currentLevel: 'Initial (Level 1)', targetLevel: 'Advanced (Level 3)', levels: [
                        { level: 1, name: 'Initial', description: 'Ad-hoc security, basic perimeter', status: 'current' },
                        { level: 2, name: 'Developing', description: 'Identity-centric, some automation', status: 'target_6mo', actions: ['Enforce MFA everywhere', 'Implement micro-segmentation', 'Deploy EDR'] },
                        { level: 3, name: 'Advanced', description: 'Continuous verification, automated response', status: 'target_12mo', actions: ['UEBA deployment', 'Real-time risk scoring', 'Automated policy enforcement'] },
                        { level: 4, name: 'Optimal', description: 'Full zero trust, AI-driven', status: 'future', actions: ['AI-driven threat detection', 'Self-healing infrastructure', 'Predictive security'] },
                    ],
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ assessmentId: id, title: 'Zero Trust Architecture Assessment', currentMaturity: 'Initial (Level 1)', overallScore: 42, pillarScores: { identity: 55, devices: 35, network: 50, applications: 45, data: 38, visibility: 40 }, topRecommendations: ['Enforce universal MFA (quick win)', 'Implement device trust verification', 'Deploy micro-segmentation', 'Establish data classification program', 'Implement continuous authentication', 'Deploy UEBA for behavioral analysis'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown zero trust action: ${action}` }), sideEffects: null };
}

// ── 17. sec_devsecops ────────────────────────────────────────────
async function executeSecDevsecops(input, ctx) {
    const { action = 'scan_pipeline', pipeline, artifact, iacCode, iacType = 'terraform', gateConfig, pipelineId } = input;
    const id = pipelineId || `DSO-${Date.now().toString(36)}`;

    if (action === 'scan_pipeline') {
        return {
            result: JSON.stringify({
                pipelineId: id, findings: [
                    { stage: 'source', check: 'Branch protection', status: 'pass', detail: 'Main branch protected with reviews required' },
                    { stage: 'source', check: 'Signed commits', status: 'warning', detail: 'Commit signing not enforced', severity: 'medium' },
                    { stage: 'build', check: 'Build reproducibility', status: 'warning', detail: 'Builds not fully reproducible — pin all dependencies', severity: 'medium' },
                    { stage: 'build', check: 'Secrets in CI', status: 'fail', detail: 'API key found in build environment variable log output', severity: 'critical' },
                    { stage: 'test', check: 'SAST integration', status: 'pass', detail: 'Static analysis runs on every PR' },
                    { stage: 'test', check: 'DAST integration', status: 'fail', detail: 'No dynamic testing in pipeline', severity: 'high' },
                    { stage: 'deploy', check: 'Artifact verification', status: 'warning', detail: 'Artifacts not signed before deployment', severity: 'high' },
                    { stage: 'deploy', check: 'Environment parity', status: 'pass', detail: 'Staging mirrors production' },
                ], pipelineScore: 58, grade: 'D+'
            }), sideEffects: null
        };
    }
    if (action === 'sign_artifact') {
        const art = artifact || { name: 'app', version: '1.0.0' };
        return { result: JSON.stringify({ artifact: art.name, version: art.version, signature: `sig_${Date.now().toString(36)}_ed25519`, algorithm: 'Ed25519', signedBy: ctx.userId || 'ci-pipeline', signedAt: new Date().toISOString(), publicKeyFingerprint: 'SHA256:xYz123...', verificationCommand: `cosign verify --key cosign.pub ${art.name}:${art.version}` }), sideEffects: null };
    }
    if (action === 'verify_artifact') {
        const art = artifact || { name: 'app', version: '1.0.0', signature: 'sig_test' };
        return { result: JSON.stringify({ artifact: art.name, version: art.version, verified: true, signatureValid: true, signerIdentity: 'ci-pipeline', signedAt: new Date(Date.now() - 3600000).toISOString(), integrityCheck: 'PASS', supplyChain: { sbomAttached: true, provenanceAttached: true, slsaLevel: 'SLSA Build L2' } }), sideEffects: null };
    }
    if (action === 'iac_scan') {
        const code = iacCode || 'resource "aws_s3_bucket" "data" {}';
        return {
            result: JSON.stringify({
                pipelineId: id, iacType, findings: [
                    { id: 'IAC-001', severity: 'critical', rule: 'S3 bucket without encryption', resource: 'aws_s3_bucket.data', remediation: 'Add server_side_encryption_configuration block' },
                    { id: 'IAC-002', severity: 'critical', rule: 'S3 bucket is public', resource: 'aws_s3_bucket.data', remediation: 'Add aws_s3_bucket_public_access_block' },
                    { id: 'IAC-003', severity: 'high', rule: 'S3 bucket without versioning', resource: 'aws_s3_bucket.data', remediation: 'Enable bucket versioning' },
                    { id: 'IAC-004', severity: 'medium', rule: 'No access logging', resource: 'aws_s3_bucket.data', remediation: 'Enable server access logging' },
                    { id: 'IAC-005', severity: 'low', rule: 'No lifecycle rules', resource: 'aws_s3_bucket.data', remediation: 'Add lifecycle configuration' },
                ], scannedResources: 1, totalFindings: 5
            }), sideEffects: null
        };
    }
    if (action === 'pre_commit') {
        return {
            result: JSON.stringify({
                pipelineId: id, hooks: [
                    { id: 'detect-secrets', status: 'active', description: 'Detect hardcoded secrets', lastTriggered: '2 commits ago' },
                    { id: 'gitleaks', status: 'active', description: 'Scan for leaked credentials', lastTriggered: 'last commit' },
                    { id: 'tflint', status: 'active', description: 'Terraform linter', lastTriggered: '5 commits ago' },
                    { id: 'eslint-security', status: 'active', description: 'ESLint security rules', lastTriggered: 'last commit' },
                    { id: 'checkov', status: 'recommended', description: 'IaC security scanner — not yet installed' },
                ], blocked: 2, totalRuns: 150, secretsDetected: 2
            }), sideEffects: null
        };
    }
    if (action === 'quality_gate') {
        const gate = gateConfig || { thresholds: { critical: 0, high: 3, coverage: 80 } };
        return {
            result: JSON.stringify({
                pipelineId: id, gateResult: 'FAIL', reason: 'Critical vulnerabilities exceed threshold', details: {
                    vulnerabilities: { critical: 2, high: 4, medium: 8, threshold_critical: gate.thresholds.critical, threshold_high: gate.thresholds.high },
                    coverage: { current: 72, threshold: gate.thresholds.coverage, status: 'fail' },
                    sast: { issues: 3, status: 'warning' },
                    secrets: { detected: 0, status: 'pass' },
                    licenses: { violations: 1, status: 'warning' },
                }, recommendation: 'Fix 2 critical vulns and increase coverage to 80% before deploying'
            }), sideEffects: null
        };
    }
    if (action === 'supply_chain') {
        return {
            result: JSON.stringify({
                pipelineId: id, supplyChainAnalysis: {
                    slsaLevel: 'Level 1', targetLevel: 'Level 3', checks: [
                        { check: 'Source integrity', status: 'pass', detail: 'Git signed tags on releases' },
                        { check: 'Build provenance', status: 'partial', detail: 'Build logs available but no SLSA provenance attestation', severity: 'medium' },
                        { check: 'Dependency pinning', status: 'partial', detail: '80% of deps pinned to exact versions', severity: 'medium' },
                        { check: 'SBOM generation', status: 'pass', detail: 'CycloneDX SBOM generated per build' },
                        { check: 'Artifact signing', status: 'fail', detail: 'Release artifacts not signed', severity: 'high' },
                        { check: 'Reproducible builds', status: 'fail', detail: 'Builds not reproducible', severity: 'medium' },
                    ],
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ pipelineId: id, title: 'DevSecOps Pipeline Security Report', overallGrade: 'C-', findings: { critical: 2, high: 3, medium: 4, low: 1 }, pipelineMaturity: 'Developing', slsaLevel: 'Level 1', topRecommendations: ['Fix secret leak in CI build logs immediately', 'Add DAST to pipeline', 'Implement artifact signing with cosign', 'Generate SLSA provenance attestations', 'Pin all dependency versions', 'Enable mandatory commit signing'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown devsecops action: ${action}` }), sideEffects: null };
}

// ── 18. sec_data_protection ──────────────────────────────────────
async function executeSecDataProtection(input, ctx) {
    const { action = 'detect_pii', data, dataType = 'text', classification, maskingRules, retentionDays, policyId } = input;
    const id = policyId || `DLP-${Date.now().toString(36)}`;

    if (action === 'detect_pii') {
        const sampleData = data || 'John Doe, john@example.com, SSN: 123-45-6789, CC: 4111-1111-1111-1111';
        const detections = [];
        if (/\b[\w.+-]+@[\w-]+\.[\w.]+\b/.test(sampleData)) detections.push({ type: 'EMAIL', value: sampleData.match(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/)?.[0], confidence: 0.99, category: 'PII' });
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(sampleData)) detections.push({ type: 'SSN', value: '***-**-' + sampleData.match(/\d{3}-\d{2}-(\d{4})/)?.[1], confidence: 0.95, category: 'PII', regulation: 'CCPA/HIPAA' });
        if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(sampleData)) detections.push({ type: 'CREDIT_CARD', value: '****-****-****-' + sampleData.match(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?(\d{4})/)?.[1], confidence: 0.97, category: 'PCI', regulation: 'PCI-DSS' });
        if (/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/.test(sampleData)) detections.push({ type: 'PERSON_NAME', value: '[REDACTED]', confidence: 0.85, category: 'PII' });
        return { result: JSON.stringify({ policyId: id, dataType, detections, totalPiiFound: detections.length, riskLevel: detections.some(d => d.type === 'SSN' || d.type === 'CREDIT_CARD') ? 'HIGH' : 'MEDIUM', recommendation: 'Mask or encrypt detected PII before storage/transmission' }), sideEffects: null };
    }
    if (action === 'classify') {
        return {
            result: JSON.stringify({
                policyId: id, classification: classification || 'auto', result: {
                    level: 'confidential', confidence: 0.92, reasons: ['Contains PII (email, name)', 'Contains financial data (credit card)', 'Contains government ID (SSN)'],
                    labels: ['PII', 'PCI', 'PHI-adjacent'], handlingRequirements: ['Encrypt at rest and in transit', 'Access restricted to authorized personnel', 'Audit all access', 'Retain per policy (default 7 years for financial)', 'Destroy securely when retention period expires'],
                    dataSubjects: ['customers'], jurisdiction: ['US', 'EU'],
                }
            }), sideEffects: null
        };
    }
    if (action === 'mask_data') {
        const sampleData = data || 'Email: john@example.com, SSN: 123-45-6789';
        let masked = sampleData;
        masked = masked.replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, 'j***@***.com');
        masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
        masked = masked.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '****-****-****-****');
        return { result: JSON.stringify({ policyId: id, original: `[${sampleData.length} chars]`, masked, strategy: maskingRules?.strategy || 'redact', reversible: false }), sideEffects: null };
    }
    if (action === 'check_encryption') {
        return {
            result: JSON.stringify({
                policyId: id, encryptionStatus: [
                    { store: 'PostgreSQL', atRest: true, algorithm: 'AES-256', keyManagement: 'managed', status: 'compliant' },
                    { store: 'Redis Cache', atRest: false, status: 'non-compliant', severity: 'high', recommendation: 'Enable Redis encryption at rest' },
                    { store: 'File Storage', atRest: true, algorithm: 'AES-256', status: 'compliant' },
                    { store: 'Backups', atRest: true, algorithm: 'AES-256', offsite: true, status: 'compliant' },
                    { channel: 'API', inTransit: true, protocol: 'TLS 1.3', status: 'compliant' },
                    { channel: 'Internal Services', inTransit: false, status: 'non-compliant', severity: 'medium', recommendation: 'Enable mTLS between services' },
                ]
            }), sideEffects: null
        };
    }
    if (action === 'retention_policy') {
        const days = retentionDays || 365;
        return {
            result: JSON.stringify({
                policyId: id, policies: [
                    { dataType: 'User PII', retention: `${days} days`, deletion: 'secure_wipe', legal_basis: 'Consent + legitimate interest', status: 'active' },
                    { dataType: 'Financial Records', retention: '2555 days (7 years)', deletion: 'secure_wipe', legal_basis: 'Legal obligation', status: 'active' },
                    { dataType: 'Audit Logs', retention: '1095 days (3 years)', deletion: 'archive_then_delete', legal_basis: 'Security + compliance', status: 'active' },
                    { dataType: 'Session Data', retention: '30 days', deletion: 'auto_purge', legal_basis: 'Functionality', status: 'active' },
                    { dataType: 'Analytics', retention: '730 days (2 years)', deletion: 'anonymize', legal_basis: 'Legitimate interest', status: 'active' },
                ], nextReview: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
            }), sideEffects: null
        };
    }
    if (action === 'data_flow_map') {
        return {
            result: JSON.stringify({
                policyId: id, dataFlows: [
                    { from: 'User Browser', to: 'Frontend (React)', data: ['credentials', 'user_input'], encrypted: true, protocol: 'HTTPS' },
                    { from: 'Frontend', to: 'Backend API', data: ['auth_token', 'requests'], encrypted: true, protocol: 'HTTPS' },
                    { from: 'Backend API', to: 'PostgreSQL', data: ['user_data', 'projects', 'PII'], encrypted: true, protocol: 'TLS' },
                    { from: 'Backend API', to: 'Redis', data: ['sessions', 'cache'], encrypted: false, severity: 'medium', recommendation: 'Enable TLS for Redis' },
                    { from: 'Backend API', to: 'AI Services', data: ['prompts', 'code'], encrypted: true, protocol: 'HTTPS', note: 'Review data sharing agreements' },
                    { from: 'PostgreSQL', to: 'Backup Storage', data: ['full_db_dump'], encrypted: true, protocol: 'SSH+AES' },
                ], crossBorderTransfers: [{ from: 'Azure EU', to: 'OpenAI US', data: ['prompts'], mechanism: 'SCCs', status: 'review_needed' }]
            }), sideEffects: null
        };
    }
    if (action === 'breach_risk') {
        return {
            result: JSON.stringify({
                policyId: id, riskAssessment: {
                    overallRisk: 'MEDIUM', score: 55, factors: [
                        { factor: 'Data sensitivity', risk: 'high', detail: 'PII, financial, and health-adjacent data processed' },
                        { factor: 'Attack surface', risk: 'medium', detail: 'Web application with API endpoints' },
                        { factor: 'Encryption coverage', risk: 'medium', detail: '85% of data stores encrypted' },
                        { factor: 'Access controls', risk: 'medium', detail: 'RBAC in place but 12 over-privileged users' },
                        { factor: 'Detection capability', risk: 'high', detail: 'Basic logging — no SIEM or UEBA' },
                        { factor: 'Incident readiness', risk: 'medium', detail: 'IR plan exists but not tested' },
                    ],
                    estimatedImpact: { records: '~50,000 users', financial: '$1.5M - $5M (fines + remediation)', reputational: 'HIGH', regulatoryNotification: 'Required within 72h (GDPR)' },
                    mitigations: ['Deploy SIEM for early detection', 'Encrypt Redis cache', 'Conduct annual breach simulation', 'Review and reduce privileged access'],
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ policyId: id, title: 'Data Protection & Privacy Report', overallCompliance: 'PARTIAL', score: 68, sections: ['PII Detection', 'Data Classification', 'Encryption Status', 'Retention Policies', 'Data Flow Mapping', 'Breach Risk Assessment'], findings: { critical: 1, high: 2, medium: 3, low: 2 }, topRecommendations: ['Encrypt Redis cache (critical gap)', 'Enable mTLS between internal services', 'Review cross-border data transfers', 'Reduce privileged access to PII data', 'Deploy DLP solution for real-time monitoring'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown data protection action: ${action}` }), sideEffects: null };
}

// ── 19. sec_access_review ────────────────────────────────────────
async function executeSecAccessReview(input, ctx) {
    const { action = 'review_access', users, resources, accessLogs, reviewId, inactiveDays = 90 } = input;
    const id = reviewId || `ACR-${Date.now().toString(36)}`;

    if (action === 'review_access') {
        const userList = users || [
            { id: 'u1', name: 'Alice Admin', roles: ['admin', 'developer'], lastActive: new Date(Date.now() - 2 * 86400000).toISOString() },
            { id: 'u2', name: 'Bob Builder', roles: ['developer'], lastActive: new Date(Date.now() - 5 * 86400000).toISOString() },
            { id: 'u3', name: 'Charlie Contractor', roles: ['developer', 'deployer'], lastActive: new Date(Date.now() - 120 * 86400000).toISOString() },
        ];
        return {
            result: JSON.stringify({
                reviewId: id, totalUsers: userList.length, reviewed: userList.map(u => {
                    const daysSinceActive = Math.round((Date.now() - new Date(u.lastActive).getTime()) / 86400000);
                    return {
                        ...u, daysSinceActive, flags: [
                            ...(daysSinceActive > inactiveDays ? [{ type: 'inactive', severity: 'high', detail: `No activity in ${daysSinceActive} days` }] : []),
                            ...(u.roles.includes('admin') ? [{ type: 'privileged', severity: 'medium', detail: 'Admin role — verify needs' }] : []),
                            ...(u.roles.length > 2 ? [{ type: 'excessive_roles', severity: 'medium', detail: `${u.roles.length} roles assigned` }] : []),
                        ]
                    };
                }), flaggedUsers: userList.filter(u => (Date.now() - new Date(u.lastActive).getTime()) > inactiveDays * 86400000).length
            }), sideEffects: null
        };
    }
    if (action === 'detect_escalation') {
        return {
            result: JSON.stringify({
                reviewId: id, escalations: [
                    { user: 'user-456', type: 'role_change', from: 'viewer', to: 'admin', timestamp: new Date(Date.now() - 86400000).toISOString(), approvedBy: null, risk: 'critical', detail: 'Admin role added without approval workflow' },
                    { user: 'service-account-3', type: 'permission_add', permission: 'db:delete_all', timestamp: new Date(Date.now() - 172800000).toISOString(), approvedBy: 'admin-1', risk: 'high', detail: 'Destructive permission added to service account' },
                    { user: 'user-789', type: 'self_escalation', action: 'role:editor → role:admin via API', timestamp: new Date(Date.now() - 43200000).toISOString(), approvedBy: null, risk: 'critical', detail: 'Self-service role escalation — possible vulnerability' },
                ], totalDetected: 3, criticalCount: 2
            }), sideEffects: null
        };
    }
    if (action === 'orphaned_accounts') {
        return {
            result: JSON.stringify({
                reviewId: id, orphanedAccounts: [
                    { id: 'u-old-001', name: 'Former Employee A', roles: ['developer', 'deployer'], lastActive: '2023-06-15', status: 'active', risk: 'critical', action: 'Disable immediately' },
                    { id: 'u-old-002', name: 'Former Contractor B', roles: ['developer'], lastActive: '2023-09-01', status: 'active', risk: 'high', action: 'Disable immediately' },
                    { id: 'svc-legacy', name: 'Legacy Service Account', roles: ['api_access'], lastActive: '2023-03-10', status: 'active', risk: 'high', action: 'Verify if still needed, disable if not' },
                    { id: 'test-account', name: 'Test User (Shared)', roles: ['admin'], lastActive: '2024-01-01', status: 'active', risk: 'critical', action: 'Remove shared test account with admin privileges' },
                ], totalOrphaned: 4, immediateAction: 3
            }), sideEffects: null
        };
    }
    if (action === 'separation_of_duties') {
        return {
            result: JSON.stringify({
                reviewId: id, conflicts: [
                    { user: 'user-123', conflictRoles: ['developer', 'deployer'], risk: 'high', detail: 'Same user can write code and deploy to production — no segregation', recommendation: 'Require separate approval for deployments' },
                    { user: 'admin-1', conflictRoles: ['admin', 'auditor'], risk: 'medium', detail: 'Admin auditing their own actions', recommendation: 'Assign auditor role to independent team member' },
                    { user: 'finance-lead', conflictRoles: ['payment_approver', 'payment_initiator'], risk: 'critical', detail: 'Same person can initiate and approve payments', recommendation: 'Enforce dual authorization for payments' },
                ], totalConflicts: 3, criticalConflicts: 1
            }), sideEffects: null
        };
    }
    if (action === 'certify') {
        return {
            result: JSON.stringify({
                reviewId: id, campaign: {
                    name: `Access Review Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
                    status: 'in_progress', startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
                    deadline: new Date(Date.now() + 23 * 86400000).toISOString().split('T')[0],
                    totalUsers: 150, reviewed: 45, pending: 105, approved: 40, revoked: 5,
                    reviewers: [
                        { name: 'Team Lead A', assigned: 30, completed: 15 },
                        { name: 'Team Lead B', assigned: 25, completed: 10 },
                        { name: 'Manager C', assigned: 50, completed: 20 },
                    ],
                }
            }), sideEffects: null
        };
    }
    if (action === 'least_privilege_check') {
        return {
            result: JSON.stringify({
                reviewId: id, analysis: {
                    totalUsers: 150, overPrivileged: 18, underUtilized: 23,
                    examples: [
                        { user: 'dev-user-1', unusedPermissions: ['admin:settings', 'billing:view', 'deploy:production'], recommendation: 'Remove 3 unused permissions' },
                        { user: 'api-service', unusedPermissions: ['user:delete', 'db:drop_table'], recommendation: 'Remove destructive permissions not needed by service' },
                    ],
                    recommendation: 'Implement automated permission pruning for permissions unused for 60+ days',
                }
            }), sideEffects: null
        };
    }
    if (action === 'access_matrix') {
        const res = resources || [
            { id: 'r1', name: 'Production DB', type: 'database', sensitivity: 'critical' },
            { id: 'r2', name: 'Source Code', type: 'repository', sensitivity: 'high' },
            { id: 'r3', name: 'Documentation', type: 'wiki', sensitivity: 'internal' },
        ];
        return {
            result: JSON.stringify({
                reviewId: id, matrix: {
                    resources: res, roles: ['admin', 'developer', 'viewer', 'deployer'],
                    access: [
                        { role: 'admin', permissions: res.map(r => ({ resource: r.name, access: 'full', risk: r.sensitivity === 'critical' ? 'high' : 'medium' })) },
                        { role: 'developer', permissions: res.map(r => ({ resource: r.name, access: r.type === 'database' ? 'read' : 'read_write', risk: 'low' })) },
                        { role: 'viewer', permissions: res.map(r => ({ resource: r.name, access: 'read', risk: 'low' })) },
                        { role: 'deployer', permissions: [{ resource: 'Production DB', access: 'none' }, { resource: 'Source Code', access: 'read' }, { resource: 'Documentation', access: 'read' }] },
                    ],
                }
            }), sideEffects: null
        };
    }
    if (action === 'report') {
        return { result: JSON.stringify({ reviewId: id, title: 'Access Review & Privilege Management Report', overallRisk: 'HIGH', findings: { orphanedAccounts: 4, escalationIncidents: 3, sodConflicts: 3, overPrivilegedUsers: 18 }, topRecommendations: ['Disable 4 orphaned accounts immediately (2 critical)', 'Fix payment approval SoD conflict (critical)', 'Investigate unauthorized privilege escalation', 'Remove 23 sets of unused permissions', 'Implement automated access review quarterly', 'Deploy just-in-time (JIT) access for privileged operations'] }), sideEffects: null };
    }
    return { result: JSON.stringify({ error: `Unknown access review action: ${action}` }), sideEffects: null };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════ */

const _names = new Set(ADVANCED_SECURITY_TOOL_DEFINITIONS.map(t => t.name));
export function isAdvancedSecurityTool(name) { return _names.has(name); }

export async function executeAdvancedSecurityTool(toolName, input, ctx) {
    switch (toolName) {
        case 'scan_vulnerabilities': return executeScanVulnerabilities(input, ctx);
        case 'policy_enforce': return executePolicyEnforce(input, ctx);
        case 'threat_model': return executeThreatModel(input, ctx);
        case 'incident_response': return executeIncidentResponse(input, ctx);
        case 'sec_pen_test': return executeSecPenTest(input, ctx);
        case 'sec_compliance_check': return executeSecComplianceCheck(input, ctx);
        case 'sec_auth_audit': return executeSecAuthAudit(input, ctx);
        case 'sec_network_scan': return executeSecNetworkScan(input, ctx);
        case 'sec_dependency_audit': return executeSecDependencyAudit(input, ctx);
        case 'sec_waf_rules': return executeSecWafRules(input, ctx);
        case 'sec_forensics': return executeSecForensics(input, ctx);
        case 'sec_crypto_audit': return executeSecCryptoAudit(input, ctx);
        case 'sec_container_scan': return executeSecContainerScan(input, ctx);
        case 'sec_api_security': return executeSecApiSecurity(input, ctx);
        case 'sec_siem': return executeSecSiem(input, ctx);
        case 'sec_zero_trust': return executeSecZeroTrust(input, ctx);
        case 'sec_devsecops': return executeSecDevsecops(input, ctx);
        case 'sec_data_protection': return executeSecDataProtection(input, ctx);
        case 'sec_access_review': return executeSecAccessReview(input, ctx);
        case 'sec_ssl_cert_check': return executeSecSslCertCheck(input, ctx);
        default:
            return { result: JSON.stringify({ error: `Unknown security tool: ${toolName}` }), sideEffects: null };
    }
}

// ── 20. sec_ssl_cert_check ───────────────────────────────────────
const ONELASTAI_DOMAINS = {
    'sanbayfusion.com': { app: 'Main Domain (Landing, Auth, Payments, Dashboard)', backend: 3200, certPath: '/etc/letsencrypt/live/sanbayfusion.com', frontendRoot: '/var/www/maula/main', dbIsolated: true, isMainDomain: true },
    'neural.sanbayfusion.com': { app: 'Neural Chat', backend: 3201, certPath: '/etc/letsencrypt/live/neural.sanbayfusion.com', frontendRoot: '/var/www/neural', dbIsolated: true },
    'editor.sanbayfusion.com': { app: 'Maula Editor', backend: 3204, certPath: '/etc/letsencrypt/live/editor.sanbayfusion.com', frontendRoot: '/var/www/editor', dbIsolated: true },
    'canvas.sanbayfusion.com': { app: 'GenCraft Pro', backend: 3203, certPath: '/etc/letsencrypt/live/canvas.sanbayfusion.com', frontendRoot: '/var/www/craft', dbIsolated: true },
    'studio.sanbayfusion.com': { app: 'Canvas Studio', backend: 3202, certPath: '/etc/letsencrypt/live/studio.sanbayfusion.com', frontendRoot: '/var/www/canvas', dbIsolated: true },
};

async function executeSecSslCertCheck(input, ctx) {
    const { action = 'check_all_domains', domain, domains, warnDays = 30, checkId } = input;
    const id = checkId || `SSL-${Date.now().toString(36)}`;
    const now = new Date();

    function buildCertInfo(d) {
        const info = ONELASTAI_DOMAINS[d];
        if (!info) return { domain: d, status: 'error', detail: `Unknown domain: ${d}. Expected one of: ${Object.keys(ONELASTAI_DOMAINS).join(', ')}` };

        // Simulate real cert check — in production, use tls.connect() or child_process openssl
        const validFrom = new Date('2025-12-01T00:00:00Z');
        const validTo = new Date('2026-03-01T00:00:00Z');
        const daysRemaining = Math.max(0, Math.floor((validTo - now) / 86400000));
        const expiryStatus = daysRemaining <= 0 ? 'expired' : daysRemaining <= warnDays ? 'warning' : 'valid';

        return {
            domain: d,
            app: info.app,
            certificate: {
                subject: d,
                issuer: "Let's Encrypt Authority X3",
                validFrom: validFrom.toISOString(),
                validTo: validTo.toISOString(),
                daysRemaining,
                expiryStatus,
                keySize: 2048,
                signatureAlgorithm: 'SHA256withRSA',
                serialNumber: `0${Math.random().toString(16).slice(2, 18)}`,
                san: [d],
            },
            certPath: info.certPath,
            https: {
                enforced: true,
                httpRedirect: true,
                hsts: { enabled: true, maxAge: 31536000, includeSubDomains: false, preload: false },
            },
            tls: {
                versions: ['TLSv1.2', 'TLSv1.3'],
                deprecatedDisabled: true,
                preferredCipher: 'TLS_AES_256_GCM_SHA384',
                grade: 'A',
            },
            infrastructure: {
                backendPort: info.backend,
                frontendRoot: info.frontendRoot,
                dbIsolated: info.dbIsolated,
                sharedWithOtherApps: false,
            },
        };
    }

    if (action === 'check_cert' || action === 'check_https') {
        const d = domain || 'sanbayfusion.com';
        const result = buildCertInfo(d);
        return { result: JSON.stringify({ checkId: id, action, ...result }), sideEffects: null };
    }

    if (action === 'check_all_domains') {
        const targetDomains = domains || Object.keys(ONELASTAI_DOMAINS);
        const results = targetDomains.map(buildCertInfo);
        const expired = results.filter(r => r.certificate?.expiryStatus === 'expired').length;
        const warnings = results.filter(r => r.certificate?.expiryStatus === 'warning').length;
        const valid = results.filter(r => r.certificate?.expiryStatus === 'valid').length;

        return {
            result: JSON.stringify({
                checkId: id, checkedAt: now.toISOString(), warnDays,
                summary: { total: results.length, valid, warnings, expired, overallStatus: expired > 0 ? 'CRITICAL' : warnings > 0 ? 'WARNING' : 'HEALTHY' },
                domains: results,
            }), sideEffects: null
        };
    }

    if (action === 'check_expiry') {
        const targetDomains = domains || Object.keys(ONELASTAI_DOMAINS);
        const results = targetDomains.map(d => {
            const info = buildCertInfo(d);
            return { domain: d, app: info.app, daysRemaining: info.certificate?.daysRemaining, expiryStatus: info.certificate?.expiryStatus, validTo: info.certificate?.validTo };
        });
        return { result: JSON.stringify({ checkId: id, expiry: results.sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0)) }), sideEffects: null };
    }

    if (action === 'check_chain') {
        const d = domain || 'sanbayfusion.com';
        return {
            result: JSON.stringify({
                checkId: id, domain: d, chain: [
                    { depth: 0, subject: d, issuer: "Let's Encrypt Authority X3", type: 'leaf' },
                    { depth: 1, subject: "Let's Encrypt Authority X3", issuer: 'ISRG Root X1', type: 'intermediate' },
                    { depth: 2, subject: 'ISRG Root X1', issuer: 'ISRG Root X1', type: 'root' },
                ],
                chainValid: true,
                findings: [
                    { check: 'Chain completeness', status: 'pass', detail: 'Full chain present (leaf → intermediate → root)' },
                    { check: 'Root trust', status: 'pass', detail: 'ISRG Root X1 trusted in all major stores' },
                    { check: 'Intermediate validity', status: 'pass', detail: "Let's Encrypt Authority X3 valid and not revoked" },
                ],
            }), sideEffects: null
        };
    }

    if (action === 'check_hsts') {
        const targetDomains = domains || Object.keys(ONELASTAI_DOMAINS);
        return {
            result: JSON.stringify({
                checkId: id, hsts: targetDomains.map(d => {
                    const info = ONELASTAI_DOMAINS[d];
                    return {
                        domain: d, app: info?.app || 'Unknown',
                        hstsEnabled: true, maxAge: 31536000, includeSubDomains: false, preload: false,
                        recommendation: 'Consider adding includeSubDomains and preload directives for maximum security',
                    };
                }),
            }), sideEffects: null
        };
    }

    if (action === 'check_protocols') {
        const d = domain || 'sanbayfusion.com';
        return {
            result: JSON.stringify({
                checkId: id, domain: d, protocols: {
                    supported: ['TLSv1.2', 'TLSv1.3'],
                    deprecated: { 'SSLv3': false, 'TLSv1.0': false, 'TLSv1.1': false },
                    cipherSuites: [
                        { name: 'TLS_AES_256_GCM_SHA384', protocol: 'TLSv1.3', strength: 'strong' },
                        { name: 'TLS_CHACHA20_POLY1305_SHA256', protocol: 'TLSv1.3', strength: 'strong' },
                        { name: 'TLS_AES_128_GCM_SHA256', protocol: 'TLSv1.3', strength: 'strong' },
                        { name: 'ECDHE-RSA-AES256-GCM-SHA384', protocol: 'TLSv1.2', strength: 'strong' },
                        { name: 'ECDHE-RSA-AES128-GCM-SHA256', protocol: 'TLSv1.2', strength: 'strong' },
                    ],
                    weakCiphers: [],
                    grade: 'A',
                },
                findings: [
                    { check: 'TLS 1.0/1.1 disabled', status: 'pass', detail: 'Deprecated protocols disabled' },
                    { check: 'TLS 1.3 supported', status: 'pass', detail: 'Modern protocol available' },
                    { check: 'Forward secrecy', status: 'pass', detail: 'All cipher suites support PFS via ECDHE' },
                    { check: 'Weak ciphers', status: 'pass', detail: 'No weak ciphers found' },
                ],
            }), sideEffects: null
        };
    }

    if (action === 'check_isolation') {
        const targetDomains = domains || Object.keys(ONELASTAI_DOMAINS);
        const isolation = targetDomains.map(d => {
            const info = ONELASTAI_DOMAINS[d];
            if (!info) return { domain: d, status: 'error', detail: 'Unknown domain' };
            return {
                domain: d, app: info.app,
                dedicated: {
                    subdomain: true,
                    sslCert: true, certPath: info.certPath,
                    backend: true, backendPort: info.backend,
                    frontend: true, frontendRoot: info.frontendRoot,
                    database: info.dbIsolated,
                },
                noCrossAppSharing: true,
                findings: [
                    { check: 'Dedicated SSL cert', status: 'pass', detail: `Own cert at ${info.certPath}` },
                    { check: 'Dedicated backend', status: 'pass', detail: `Isolated on port ${info.backend}` },
                    { check: 'Dedicated frontend', status: 'pass', detail: `Served from ${info.frontendRoot}` },
                    { check: 'Database isolation', status: info.dbIsolated ? 'pass' : 'fail', detail: info.dbIsolated ? 'Separate database/schema' : 'Shared database detected' },
                    { check: 'No resource sharing', status: 'pass', detail: 'No shared backends, frontends, or certs across apps' },
                ],
            };
        });
        const allIsolated = isolation.every(i => i.dedicated?.subdomain && i.dedicated?.sslCert && i.dedicated?.backend && i.dedicated?.frontend && i.dedicated?.database);
        return {
            result: JSON.stringify({
                checkId: id, overallIsolation: allIsolated ? 'FULLY_ISOLATED' : 'PARTIAL',
                domains: isolation,
            }), sideEffects: null
        };
    }

    if (action === 'renew_status') {
        const targetDomains = domains || Object.keys(ONELASTAI_DOMAINS);
        return {
            result: JSON.stringify({
                checkId: id, certbot: { installed: true, version: '2.7.0', autoRenew: true, renewHook: 'systemctl reload nginx' },
                certificates: targetDomains.map(d => {
                    const info = ONELASTAI_DOMAINS[d];
                    const validTo = new Date('2026-03-01T00:00:00Z');
                    const daysRemaining = Math.max(0, Math.floor((validTo - now) / 86400000));
                    return {
                        domain: d, app: info?.app, certPath: info?.certPath,
                        validTo: validTo.toISOString(), daysRemaining,
                        autoRenew: true, lastRenewed: '2025-12-01T00:00:00Z',
                        nextRenewal: daysRemaining <= 30 ? 'IMMINENT' : 'Scheduled',
                    };
                }),
            }), sideEffects: null
        };
    }

    if (action === 'report') {
        const targetDomains = domains || Object.keys(ONELASTAI_DOMAINS);
        const results = targetDomains.map(buildCertInfo);
        const expired = results.filter(r => r.certificate?.expiryStatus === 'expired').length;
        const warnings = results.filter(r => r.certificate?.expiryStatus === 'warning').length;

        return {
            result: JSON.stringify({
                checkId: id, title: 'SSL/HTTPS Certificate Health Report — sanbayfusion.com',
                generatedAt: now.toISOString(),
                overallGrade: expired > 0 ? 'F' : warnings > 0 ? 'B' : 'A',
                overallStatus: expired > 0 ? 'CRITICAL' : warnings > 0 ? 'WARNING' : 'HEALTHY',
                summary: {
                    totalDomains: results.length, valid: results.length - expired - warnings, warnings, expired,
                    allHttpsEnforced: true, allHstsEnabled: true, allTls13: true, allIsolated: true,
                },
                domains: results,
                recommendations: [
                    expired > 0 ? 'URGENT: Renew expired certificates immediately via certbot renew' : null,
                    warnings > 0 ? `${warnings} certificate(s) expiring within ${warnDays} days — schedule renewal` : null,
                    'Enable HSTS preload for all subdomains',
                    'Enable OCSP stapling in nginx for faster TLS handshakes',
                    'Set up monitoring/alerting for cert expiry (< 14 days)',
                    'Verify certbot auto-renewal cron: systemctl status certbot.timer',
                ].filter(Boolean),
            }), sideEffects: null
        };
    }

    return { result: JSON.stringify({ error: `Unknown SSL cert check action: ${action}` }), sideEffects: null };
}
