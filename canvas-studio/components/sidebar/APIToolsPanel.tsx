import React from 'react';
import ToolExecutionPanel, { type ToolDefinition } from '../shared/ToolExecutionPanel';

interface APIToolsPanelProps {
    isDarkMode?: boolean;
    currentCode?: string;
}

const API_TOOLS: ToolDefinition[] = [
    {
        id: 'rest-test', icon: '🧪', label: 'REST API Tester', tool: 'fetch_url',
        desc: 'Send HTTP requests (GET/POST/PUT/DELETE/PATCH) to any endpoint and inspect responses',
        tag: 'rest_test',
        fields: [
            {
                id: 'method', label: 'Method', type: 'select', options: [
                    { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' },
                    { value: 'PATCH', label: 'PATCH' },
                ], defaultValue: 'GET'
            },
            { id: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/endpoint', required: true },
            { id: 'body', label: 'Request Body (JSON)', type: 'textarea', placeholder: '{"key": "value"}' },
        ],
    },
    {
        id: 'api-docs', icon: '📖', label: 'API Documentation', tool: 'generate_api_docs',
        desc: 'Auto-generate OpenAPI/Swagger documentation from your API routes and handlers',
        tag: 'api_docs',
    },
    {
        id: 'mock-api', icon: '🎭', label: 'Mock API Generator', tool: 'generate_mock_api',
        desc: 'Generate mock API endpoints with realistic fake data for frontend development and testing',
        tag: 'mock_api',
    },
    {
        id: 'graphql', icon: '🔮', label: 'GraphQL Builder', tool: 'graphql_query',
        desc: 'Build and test GraphQL queries, mutations, and subscriptions with schema introspection',
        tag: 'graphql',
    },
    {
        id: 'auth-flow', icon: '🔐', label: 'Auth Flow Builder', tool: 'auth_flow',
        desc: 'Design OAuth2, JWT, and API key authentication flows with token management',
        tag: 'auth_flow',
    },
    {
        id: 'rate-limit', icon: '🚦', label: 'Rate Limit Analyzer', tool: 'rate_limit_check',
        desc: 'Test and analyze API rate limiting behavior, throttling policies, and quota headers',
        tag: 'rate_limit',
    },
    {
        id: 'webhook', icon: '🪝', label: 'Webhook Tester', tool: 'webhook_test',
        desc: 'Create webhook endpoints, inspect payloads, test delivery, and verify signatures',
        tag: 'webhook',
    },
    {
        id: 'schema-validate', icon: '✅', label: 'Schema Validator', tool: 'validate_schema',
        desc: 'Validate API request/response payloads against JSON Schema, Zod, or TypeScript types',
        tag: 'schema_validate',
    },
    {
        id: 'curl-gen', icon: '💻', label: 'cURL Generator', tool: 'generate_curl',
        desc: 'Generate cURL commands from request configurations, or import cURL into the tester',
        tag: 'curl_gen',
    },
    {
        id: 'api-perf', icon: '⚡', label: 'API Performance', tool: 'api_benchmark',
        desc: 'Benchmark API endpoint latency, throughput, and response times with load testing',
        tag: 'api_perf',
    },
];

export default function APIToolsPanel({ currentCode }: APIToolsPanelProps) {
    return (
        <ToolExecutionPanel
            title="API Tools"
            icon="🔌"
            tagline="REST · GraphQL · Auth · Webhooks · Performance"
            description="Complete API development toolkit: test endpoints, generate docs, build mock APIs, validate schemas, and benchmark performance."
            accentColor="blue"
            tools={API_TOOLS}
            currentCode={currentCode}
            inputPlaceholder="Describe the API operation, endpoint, or what you need..."
            executeLabel="Execute"
            buildPrompt={(tool, input, fields, code) => {
                if (tool.id === 'rest-test' && fields.url) {
                    return `Use the fetch_url tool to make a ${fields.method || 'GET'} request to ${fields.url}.${fields.body ? ` Request body: ${fields.body}` : ''}\n\nReturn the full response including status code, headers, and body.`;
                }
                const base = input
                    ? `${tool.desc}. Specific request: ${input}.`
                    : `${tool.desc}. Perform a comprehensive operation.`;
                return `${base}${code ? `\n\nCurrent code:\n${code.slice(0, 12000)}` : ''}\n\nProvide detailed, actionable results.`;
            }}
        />
    );
}
