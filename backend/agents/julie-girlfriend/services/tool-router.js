// ============================================================================
// MULTI-PROVIDER TOOL ROUTER — MICRO-BUCKET EDITION
// Classifies each user message into ONE of 11 micro-buckets and returns only
// the relevant tool subset (SHARED ∪ bucket). Cuts payload from 13–167 → 13–75
// tools per call → 2–3× faster TTFT and ~60% lower input-token cost.
//
// Buckets (parent provider):
//   conversational   (mistral)  ~13 tools  — small talk, no tool signals
//   image            (openai)   ~50 tools
//   video_audio      (openai)   ~47 tools
//   web_archive      (openai)   ~65 tools
//   code_dev         (xai)      ~55 tools
//   data_engineer    (xai)      ~58 tools
//   security_cloud   (xai)      ~75 tools
//   data_analytics   (mistral)  ~65 tools
//   business_ops     (mistral)  ~71 tools
//   geo_markdown     (mistral)  ~57 tools
//   workflow_collab  (mistral)  ~83 tools
// ============================================================================

// ── SHARED TOOLS — every bucket gets these
const SHARED_TOOLS = new Set([
    'calculate', 'get_current_time', 'get_weather', 'think_step_by_step', 'editor_select',
    'web_search', 'fetch_url', 'fetch_webpage',
    'create_file', 'read_file', 'write_file', 'modify_file', 'delete_file',
    'move_file', 'copy_file', 'rename_file', 'list_files', 'create_folder',
    'list_folders', 'zip_files', 'unzip_files', 'file_exists', 'get_project_tree',
    'file_watch', 'sync_files',
    'agent_memory', 'agent_safety', 'agent_ui', 'agent_control',
    'agent_workflow', 'agent_delegate', 'agent_metrics',
    'agent_spawn', 'agent_reflect', 'agent_handoff', 'agent_memory_search', 'prompt_template',
    'save_context', 'recall_context', 'summarize_file',
    'read_json',
]);

// ── MICRO-BUCKETS — each maps to a parent provider and contains a tight tool set
const BUCKETS = {
    // ── OpenAI buckets ────────────────────────────────────────────────
    image: {
        provider: 'openai',
        tools: new Set([
            'generate_image', 'image_create', 'image_transform', 'image_convert',
            'image_compose', 'image_filter', 'image_analyze', 'image_batch',
            'image_background', 'image_face', 'image_ai', 'image_export', 'image_ocr',
        ]),
    },
    video_audio: {
        provider: 'openai',
        tools: new Set([
            'generate_video', 'video_transform', 'video_convert', 'video_analyze',
            'video_overlay', 'video_filter', 'video_audio', 'video_ai', 'video_batch',
            'transcribe_audio',
        ]),
    },
    web_archive: {
        provider: 'openai',
        tools: new Set([
            'web_screenshot', 'web_lighthouse', 'web_scrape',
            'web_analyze', 'web_scaffold', 'web_optimize', 'web_transform',
            'archive_core', 'archive_edit', 'archive_structure', 'archive_security',
            'archive_bulk', 'archive_convert', 'archive_intelligence', 'archive_deploy',
            'create_zip', 'list_zip_contents', 'extract_zip',
            'llm_chat', 'llm_embed', 'llm_finetune', 'llm_analyze', 'llm_moderate',
            'llm_router', 'llm_cost_optimize', 'llm_guardrail', 'llm_evaluate',
            'llm_fallback', 'llm_cache',
        ]),
    },

    // ── xAI buckets ───────────────────────────────────────────────────
    code_dev: {
        provider: 'xai',
        tools: new Set([
            'execute_code', 'run_code',
            'dev_filesystem', 'dev_search', 'dev_intelligence', 'dev_debug',
            'dev_test', 'dev_git', 'dev_npm', 'dev_docker',
            'generate_code', 'debug_code', 'search_in_files', 'find_file_by_name',
            'run_command', 'git_status', 'git_log', 'get_symbols',
        ]),
    },
    data_engineer: {
        provider: 'xai',
        tools: new Set([
            'db_query', 'db_schema', 'db_backup', 'db_migrate', 'db_analyze', 'db_connect',
            'http_request', 'api_request', 'api_mock', 'api_document', 'api_test',
            'api_transform', 'api_validate', 'api_proxy', 'api_diff',
            'webhook_listen', 'sdk_generate',
            'ml_train', 'ml_predict', 'ml_pipeline', 'model_compare', 'model_explain',
        ]),
    },
    security_cloud: {
        provider: 'xai',
        tools: new Set([
            'crypto_hash', 'crypto_encrypt', 'crypto_sign',
            'scan_secrets', 'scan_malware', 'scan_dependency', 'scan_vulnerabilities',
            'auth_generate', 'password_audit', 'ssl_inspect',
            'policy_enforce', 'threat_model', 'incident_response',
            'pentest_recon', 'waf_manage', 'siem_query', 'zero_trust',
            'container_security', 'api_security', 'supply_chain',
            'security_audit', 'security_compliance', 'security_firewall',
            'security_forensics', 'security_pentest', 'security_rbac',
            'cloud_deploy', 'cloud_scale', 'cloud_logs', 'cloud_secrets', 'cloud_cost',
            'cloud_storage', 'cloud_dns', 'cloud_monitor', 'cloud_network',
            'cloud_container', 'cloud_iam', 'cloud_backup', 'cloud_domain',
        ]),
    },

    // ── Mistral buckets ───────────────────────────────────────────────
    data_analytics: {
        provider: 'mistral',
        tools: new Set([
            'parse_pdf', 'parse_docx', 'parse_csv', 'parse_json', 'parse_markdown', 'parse_html',
            'data_visualize', 'data_export', 'data_clean', 'data_profile', 'data_transform',
            'data_pipeline', 'report_generate', 'kpi_dashboard', 'pivot_table',
            'trend_analyze', 'forecast_model', 'feature_engineer',
            'data_correlate', 'data_sample', 'outlier_detect',
            'analytics_track', 'analytics_dashboard', 'analytics_export',
            'log_parse', 'log_aggregate', 'monitor_health', 'telemetry_send', 'metrics_collect',
        ]),
    },
    business_ops: {
        provider: 'mistral',
        tools: new Set([
            'invoice_generate', 'expense_track', 'budget_plan', 'financial_report',
            'tax_calculate', 'currency_convert', 'payment_process',
            'project_create', 'task_manage', 'milestone_track', 'gantt_generate',
            'sprint_plan', 'resource_allocate', 'deadline_track',
            'lead_track', 'pipeline_manage', 'deal_forecast', 'customer_profile',
            'sales_report', 'proposal_generate', 'contract_draft',
            'resume_parse', 'job_post', 'interview_schedule', 'employee_onboard',
            'payroll_calculate', 'performance_review', 'org_chart',
            'contract_analyze', 'compliance_check', 'nda_generate', 'terms_generate',
            'privacy_audit', 'regulatory_report', 'ip_search',
        ]),
    },
    geo_markdown: {
        provider: 'mistral',
        tools: new Set([
            'geo_geocode', 'geo_route', 'geo_distance', 'geo_fence', 'geo_search',
            'geo_timezone', 'geo_elevation', 'geo_ip', 'geo_cluster', 'geo_transform',
            'geo_address_validate', 'geo_ip_locate', 'geo_poi',
            'markdown_convert', 'markdown_validate', 'markdown_generate', 'markdown_toc',
            'markdown_format', 'markdown_merge', 'markdown_extract', 'markdown_slides',
        ]),
    },
    workflow_collab: {
        provider: 'mistral',
        tools: new Set([
            'workflow_create', 'workflow_execute', 'workflow_schedule', 'workflow_visualize',
            'workflow_optimize', 'workflow_template', 'workflow_history', 'workflow_validate',
            'kg_create', 'kg_query', 'kg_visualize', 'kg_merge', 'kg_reason',
            'kg_import', 'kg_export', 'kg_stats',
            'growth_analyze', 'pricing_simulate', 'ab_test', 'ab_test_run', 'ab_test_analyze',
            'lead_enrich', 'campaign_generate', 'campaign_track', 'cohort_analyze',
            'funnel_optimize', 'attribution_model', 'brand_monitor', 'content_calendar',
            'seo_audit', 'keyword_research', 'social_post',
            'team_invite', 'role_assign', 'comment_thread', 'task_assign',
            'approval_flow', 'activity_log', 'access_audit', 'notify_team',
            'email_draft', 'email_template', 'newsletter_create', 'notification_send',
            'sms_send', 'calendar_manage', 'meeting_schedule',
        ]),
    },
};

// ── CONVERSATIONAL — fallback when no bucket signals fire (~13 tools)
const CONVERSATIONAL_TOOLS = new Set([
    'calculate', 'get_current_time', 'get_weather', 'think_step_by_step',
    'web_search', 'fetch_url', 'fetch_webpage',
    'agent_memory', 'agent_memory_search',
    'generate_image', 'generate_video',
    'create_file', 'read_file',
]);

// ── BUCKET INTENT SIGNALS — weighted regex per bucket
const BUCKET_SIGNALS = {
    image: [
        { pattern: /\b(image|picture|photo|draw\w*|sketch\w*|illustrat\w*|icon|logo|avatar|thumbnail|banner|poster|infographic)\b/i, weight: 6 },
        { pattern: /\b(generate\s*(an?\s*)?(image|picture|photo|art|illustration|icon|logo))\b/i, weight: 9 },
        { pattern: /\b(dall[\s-]?e|midjourney|stable\s*diffusion|flux)\b/i, weight: 7 },
        { pattern: /\b(resize\w*|crop\w*|rotat\w*|flip\w*|blur\w*|sharpen\w*|watermark\w*|collage|montage)\b/i, weight: 4 },
        { pattern: /\b(background\s*(remov\w*|replac\w*|blur\w*))\b/i, weight: 7 },
        { pattern: /\b(face\s*(detect\w*|crop\w*|blur\w*|mask\w*|recogni\w*))\b/i, weight: 7 },
        { pattern: /\b(ocr|text\s*from\s*image|read\s*text\s*in)\b/i, weight: 7 },
    ],
    video_audio: [
        { pattern: /\b(video|clip|footage|animat\w*|movie|film|trailer|reel)\b/i, weight: 6 },
        { pattern: /\b(subtitle\w*|caption\w*|video\s*overlay|picture\s*in\s*picture)\b/i, weight: 5 },
        { pattern: /\b(transcode\w*|convert\s*video|mp4|webm|avi|mov|gif)\b/i, weight: 6 },
        { pattern: /\b(transcrib\w*|speech\s*to\s*text|audio\s*to\s*text|whisper|voice\s*to\s*text)\b/i, weight: 7 },
    ],
    web_archive: [
        { pattern: /\b(screenshot\w*|lighthouse|web\s*audit|accessibility\s*audit)\b/i, weight: 6 },
        { pattern: /\b(scrape\w*|crawl\w*|extract\s*(html|content)\s*from)\b/i, weight: 5 },
        { pattern: /\b(scaffold\w*|boilerplate|component\s*generat\w*)\b/i, weight: 5 },
        { pattern: /\b(zip|unzip|tar|archive\w*|compress\w*|extract\s*(file|archive))\b/i, weight: 5 },
        { pattern: /\b(embed(ding)?s?|fine[\s-]?tun\w*|moderat\w*|guardrail\w*|llm\s*rout\w*|llm\s*eval\w*)\b/i, weight: 5 },
    ],
    code_dev: [
        { pattern: /\b(code|program\w*|script\w*|function\w*|class\w*|method\w*|variable\w*|debug\w*|compil\w*|refactor\w*)\b/i, weight: 4 },
        { pattern: /\b(execut\w*|run\s*(code|script|command|test)|interpret\w*)\b/i, weight: 6 },
        { pattern: /\b(javascript|typescript|python|java|c\+\+|rust|go|ruby|php|swift|kotlin|node|deno)\b/i, weight: 5 },
        { pattern: /\b(git\s*(status|log|diff|commit|push|pull|clone|branch|merge|rebase))\b/i, weight: 8 },
        { pattern: /\b(npm\s*(install|audit|publish|update|run)|yarn|pnpm|pip\s*install)\b/i, weight: 7 },
        { pattern: /\b(docker\w*|container\w*|kubernetes|k8s|compose|dockerfile|pod\w*|helm)\b/i, weight: 6 },
        { pattern: /\b(jest|vitest|mocha|pytest|unittest|test\s*suite|test\s*case|coverage)\b/i, weight: 6 },
        { pattern: /\b(lint\w*|eslint|prettier|format\s*code)\b/i, weight: 5 },
    ],
    data_engineer: [
        { pattern: /\b(sql|query|database\w*|table\w*|schema\w*|migrat\w*|postgres\w*|mysql|sqlite|mongo\w*|redis)\b/i, weight: 6 },
        { pattern: /\bselect\s+(\*|\w+)\s+from\b/i, weight: 9 },
        { pattern: /\b(insert\s+into|create\s+table|alter\s+table|drop\s+table|update\s+\w+\s+set|delete\s+from)\b/i, weight: 8 },
        { pattern: /\b(explain\s+plan|slow\s*quer\w*|index\w*|constraint\w*|foreign\s*key|join\s+\w+\s+on)\b/i, weight: 7 },
        { pattern: /\b(api|endpoint\w*|rest\w*|graphql|grpc|webhook\w*|swagger|openapi)\b/i, weight: 5 },
        { pattern: /\b(http\s*(get|post|put|patch|delete|request))\b/i, weight: 6 },
        { pattern: /\b(curl|postman|insomnia|fetch\s*api)\b/i, weight: 6 },
        { pattern: /\b(sdk\s*generat\w*|client\s*sdk)\b/i, weight: 7 },
        { pattern: /\b(train\s*(model|ml)|machine\s*learning|regression|clustering|knn|k[\s-]?means)\b/i, weight: 6 },
        { pattern: /\b(inferenc\w*|predict\w*|feature\s*importance|shap|lime)\b/i, weight: 6 },
    ],
    security_cloud: [
        { pattern: /\b(security|vulnerabilit\w*|exploit\w*|penetrat\w*|pentest\w*|xss|sqli|csrf|ssrf|injection\w*)\b/i, weight: 6 },
        { pattern: /\b(encrypt\w*|decrypt\w*|hash\w*|sign\w*|verify\w*|jwt|oauth|token\w*|certificat\w*|ssl|tls)\b/i, weight: 6 },
        { pattern: /\b(firewall\w*|waf|rbac|access\s*control|zero\s*trust|siem|incident\s*response)\b/i, weight: 7 },
        { pattern: /\b(scan\s*(secret\w*|malware|vulnerabilit\w*)|threat\s*model\w*|compliance)\b/i, weight: 7 },
        { pattern: /\b(owasp|soc\s*2|hipaa|pci[\s-]?dss|gdpr|iso\s*27001)\b/i, weight: 7 },
        { pattern: /\b(deploy\w*|cloud\w*|aws|gcp|azure|vercel|netlify|heroku|railway|render)\b/i, weight: 5 },
        { pattern: /\b(scal\w*|auto[\s-]?scal\w*|replica\w*|load\s*balanc\w*|cdn|dns|vpc|subnet)\b/i, weight: 6 },
        { pattern: /\b(ci[\s/]?cd|pipeline\w*|github\s*action\w*|jenkins|terraform|ansible)\b/i, weight: 6 },
    ],
    data_analytics: [
        { pattern: /\b(parse\w*|extract\w*|read)\s*(pdf|docx?|csv|json|xml|html|markdown)\b/i, weight: 6 },
        { pattern: /\b(document\w*|spreadsheet\w*|report\w*|receipt\w*|form\w*)\b/i, weight: 3 },
        { pattern: /\b(analyz\w*|analysis|statistic\w*|correlat\w*|profil\w*|dataset\w*|outlier\w*|sample\w*|clean\s*data)\b/i, weight: 5 },
        { pattern: /\b(chart\w*|graph\w*|visualiz\w*|histogram\w*|dashboard\w*|kpi|metric\w*)\b/i, weight: 5 },
        { pattern: /\b(forecast\w*|trend\w*|pivot\s*table|feature\s*engineer\w*)\b/i, weight: 6 },
        { pattern: /\b(log\s*(parse|aggregat|analyz)\w*|telemetry|monitor\w*\s*health)\b/i, weight: 6 },
    ],
    business_ops: [
        { pattern: /\b(budget\w*|expense\w*|financ\w*|invoice\w*|tax\w*|payroll\w*|salary\w*|revenue\w*|profit\w*|cost\w*)\b/i, weight: 5 },
        { pattern: /\b(project\s*manag\w*|sprint\w*|milestone\w*|deadline\w*|gantt|resource\s*allocat\w*)\b/i, weight: 5 },
        { pattern: /\b(hr|hiring|recruit\w*|onboard\w*|performance\s*review|interview\w*|resume\w*|job\s*post\w*)\b/i, weight: 6 },
        { pattern: /\b(crm|lead\w*|customer\w*|deal\w*|sales\w*|pipeline\w*|forecast\w*|funnel\w*)\b/i, weight: 5 },
        { pattern: /\b(contract\w*|nda|terms\s*of\s*service|regulat\w*|legal\w*|compliance)\b/i, weight: 5 },
    ],
    geo_markdown: [
        { pattern: /\b(geocod\w*|address\w*|lat(itude)?|lon(gitude)?|location\w*|map\w*|route\w*|direction\w*|distance\w*|isochrone)\b/i, weight: 6 },
        { pattern: /\b(timezone\w*|geofence\w*|ip\s*locat\w*|nearby|poi|point\s*of\s*interest)\b/i, weight: 6 },
        { pattern: /\b(markdown|table\s*of\s*content\w*|toc|format\s*(markdown|document)|slides?)\b/i, weight: 6 },
    ],
    workflow_collab: [
        { pattern: /\b(workflow\w*|automat\w*|schedule\w*)\b/i, weight: 5 },
        { pattern: /\b(knowledge\s*graph|ontology|kg\s*query|semantic\s*graph)\b/i, weight: 6 },
        { pattern: /\b(growth\s*analy\w*|ab[\s-]?test\w*|cohort\w*|attribution\s*model|seo\s*audit|keyword\s*research)\b/i, weight: 6 },
        { pattern: /\b(marketing|campaign\w*|newsletter\w*|seo|social\s*media|content\s*calendar|brand\w*)\b/i, weight: 5 },
        { pattern: /\b(team\w*|invite\w*|assign\w*|approval\w*|notify\w*|meeting\w*|calendar\w*)\b/i, weight: 4 },
        { pattern: /\b(email\s*(draft|template)|sms\s*send|notification\s*send)\b/i, weight: 5 },
    ],
};

// ── PROVIDER CONFIG — bucket parent → API key route + model
const PROVIDER_MODELS = {
    mistral: { provider: 'mistral', model: 'mistral-small-latest' },
    openai:  { provider: 'openai',  model: 'gpt-4o' },
    xai:     { provider: 'xai',     model: 'grok-3-fast' },
};

// ── SESSION MEMORY — bucket-level momentum (replaces provider-level usage)
const sessionToolUsage = new Map(); // sessionId → { bucketName: count, ... }

// ── BUCKET → PARENT PROVIDER LOOKUP (built once)
const TOOL_TO_BUCKET = (() => {
    const m = new Map();
    for (const [name, b] of Object.entries(BUCKETS)) {
        for (const t of b.tools) m.set(t, name);
    }
    return m;
})();

/**
 * Classify a user message into a bucket.
 * Returns { bucket, provider, scores, confidence, reason, toolTier }
 */
export function classifyIntent(message, sessionId = null, conversationHistory = []) {
    const scores = {};
    for (const k of Object.keys(BUCKETS)) scores[k] = 0;

    // 1. Score current message
    for (const [bucket, signals] of Object.entries(BUCKET_SIGNALS)) {
        for (const { pattern, weight } of signals) {
            const matches = message.match(new RegExp(pattern, 'gi'));
            if (matches) scores[bucket] += weight * matches.length;
        }
    }

    // 2. Conversation context — last 3 messages contribute 30%
    const recent = conversationHistory.slice(-3);
    for (const msg of recent) {
        const text = msg.content || msg.text || '';
        if (!text) continue;
        for (const [bucket, signals] of Object.entries(BUCKET_SIGNALS)) {
            for (const { pattern, weight } of signals) {
                if (pattern.test(text)) scores[bucket] += Math.ceil(weight * 0.3);
            }
        }
    }

    // 3. Session momentum — past tool calls bias same bucket
    if (sessionId && sessionToolUsage.has(sessionId)) {
        const usage = sessionToolUsage.get(sessionId);
        for (const [bucket, count] of Object.entries(usage)) {
            scores[bucket] = (scores[bucket] || 0) + count * 2;
        }
    }

    // 4. Pick winner
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topBucket, topScore] = sorted[0];
    const [, secondScore] = sorted[1] || ['', 0];

    if (topScore === 0) {
        return {
            bucket: 'conversational',
            provider: 'mistral',
            scores,
            reason: 'no_signals_default',
            confidence: 'low',
            toolTier: 'conversational',
        };
    }

    const margin = topScore > 0 ? (topScore - secondScore) / topScore : 0;
    const confidence = margin > 0.4 ? 'high' : margin > 0.15 ? 'medium' : 'low';

    return {
        bucket: topBucket,
        provider: BUCKETS[topBucket].provider,
        scores,
        reason: `bucket_match_${confidence}`,
        confidence,
    };
}

/**
 * Record bucket usage after a tool executes — drives session momentum.
 */
export function recordToolUsage(sessionId, toolName) {
    if (!sessionId) return;
    const bucket = TOOL_TO_BUCKET.get(toolName);
    if (!bucket) return; // shared tools don't shift momentum
    if (!sessionToolUsage.has(sessionId)) sessionToolUsage.set(sessionId, {});
    const usage = sessionToolUsage.get(sessionId);
    usage[bucket] = (usage[bucket] || 0) + 1;
}

export function clearSessionUsage(sessionId) {
    sessionToolUsage.delete(sessionId);
}

/**
 * Filter all tools to SHARED ∪ given bucket's tools.
 */
function getToolsForBucket(allTools, bucketName) {
    if (bucketName === 'conversational') {
        return allTools.filter(t => CONVERSATIONAL_TOOLS.has(t.function?.name || t.name));
    }
    const bucket = BUCKETS[bucketName];
    if (!bucket) return allTools;
    return allTools.filter(t => {
        const name = t.function?.name || t.name;
        return SHARED_TOOLS.has(name) || bucket.tools.has(name);
    });
}

/**
 * Backward-compat: filter by parent provider (returns all sub-buckets of that provider).
 * Used by getToolCounts() for monitoring dashboards.
 */
export function getToolsForRoute(allTools, routeProvider) {
    const providerTools = new Set();
    for (const b of Object.values(BUCKETS)) {
        if (b.provider === routeProvider) {
            for (const t of b.tools) providerTools.add(t);
        }
    }
    return allTools.filter(t => {
        const name = t.function?.name || t.name;
        return SHARED_TOOLS.has(name) || providerTools.has(name);
    });
}

/**
 * Main entry point — classify message, return { provider, model, tools, classification }.
 */
export function routeRequest(message, agentId, allTools, opts = {}) {
    const { sessionId, conversationHistory = [] } = opts;

    const classification = classifyIntent(message, sessionId, conversationHistory);
    const route = PROVIDER_MODELS[classification.provider] || PROVIDER_MODELS.mistral;
    const tools = getToolsForBucket(
        allTools,
        classification.toolTier === 'conversational' ? 'conversational' : classification.bucket
    );

    console.log(
        `[ToolRouter] Bucket: ${classification.bucket} → ${route.provider} ` +
        `(${classification.confidence}) | Tools: ${tools.length}/${allTools.length} | ${classification.reason}`
    );

    return {
        provider: route.provider,
        model: route.model,
        tools,
        classification,
    };
}

/**
 * Stats for monitoring — returns per-bucket and per-provider tool counts.
 */
export function getToolCounts(allTools) {
    const buckets = {};
    for (const name of Object.keys(BUCKETS)) {
        buckets[name] = getToolsForBucket(allTools, name).length;
    }
    return {
        total: allTools.length,
        shared: allTools.filter(t => SHARED_TOOLS.has(t.function?.name || t.name)).length,
        conversational: getToolsForBucket(allTools, 'conversational').length,
        buckets,
        mistral: getToolsForRoute(allTools, 'mistral').length,
        openai: getToolsForRoute(allTools, 'openai').length,
        xai: getToolsForRoute(allTools, 'xai').length,
    };
}
