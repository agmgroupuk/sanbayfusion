import React from 'react';
import ToolExecutionPanel, { type ToolDefinition } from '../shared/ToolExecutionPanel';

interface AnalyticsPanelProps {
    isDarkMode?: boolean;
    chatMessages?: { role: string; text: string; timestamp: number }[];
    sessionStartTime?: number;
    currentCode?: string;
}

const ANALYTICS_TOOLS: ToolDefinition[] = [
    {
        id: 'code-profiler', icon: '⚡', label: 'Code Profiler', tool: 'analyze_performance',
        desc: 'Profile code for performance bottlenecks, memory leaks, and runtime complexity analysis',
        tag: 'profiler',
    },
    {
        id: 'bundle-analyzer', icon: '📦', label: 'Bundle Analyzer', tool: 'analyze_bundle',
        desc: 'Analyze bundle size, tree-shaking opportunities, and dependency weight across modules',
        tag: 'bundle',
    },
    {
        id: 'code-coverage', icon: '🎯', label: 'Code Coverage', tool: 'analyze_coverage',
        desc: 'Estimate test coverage, identify untested paths, and suggest missing test cases',
        tag: 'coverage',
    },
    {
        id: 'complexity', icon: '🧮', label: 'Complexity Analysis', tool: 'analyze_complexity',
        desc: 'Calculate cyclomatic complexity, cognitive complexity, and maintainability index for functions',
        tag: 'complexity',
    },
    {
        id: 'dependency-audit', icon: '🔗', label: 'Dependency Audit', tool: 'audit_dependencies',
        desc: 'Audit npm dependencies for outdated packages, vulnerabilities, duplicates, and license issues',
        tag: 'deps',
    },
    {
        id: 'error-tracker', icon: '🐛', label: 'Error Pattern Tracker', tool: 'track_errors',
        desc: 'Identify recurring error patterns, unhandled exceptions, and error-prone code sections',
        tag: 'errors',
    },
    {
        id: 'usage-metrics', icon: '📊', label: 'Usage Metrics', tool: 'generate_metrics',
        desc: 'Generate usage metrics reports: API call frequency, response times, and endpoint popularity',
        tag: 'metrics',
    },
    {
        id: 'accessibility-audit', icon: '♿', label: 'Accessibility Audit', tool: 'audit_accessibility',
        desc: 'Comprehensive WCAG accessibility audit with contrast ratios, ARIA labels, and keyboard navigation',
        tag: 'a11y',
    },
    {
        id: 'dead-code', icon: '💀', label: 'Dead Code Detector', tool: 'detect_dead_code',
        desc: 'Find unused exports, unreachable code, unused variables, and obsolete imports',
        tag: 'dead_code',
    },
    {
        id: 'tech-debt', icon: '🏗️', label: 'Tech Debt Report', tool: 'report_tech_debt',
        desc: 'Generate a technical debt report: code smells, TODO/FIXME count, deprecated API usage, refactoring priorities',
        tag: 'tech_debt',
    },
];

export default function AnalyticsPanel({ currentCode }: AnalyticsPanelProps) {
    return (
        <ToolExecutionPanel
            title="Analytics & Insights"
            icon="📊"
            tagline="Profile · Audit · Coverage · Complexity · Metrics"
            description="Analyze code quality, performance, test coverage, bundle size, and technical debt with AI-powered insights."
            accentColor="amber"
            tools={ANALYTICS_TOOLS}
            currentCode={currentCode}
            inputPlaceholder="Describe what to analyze or paste code to profile..."
            executeLabel="Analyze"
            buildPrompt={(tool, input, _fields, code) => {
                const base = input
                    ? `${tool.desc}. Specific request: ${input}.`
                    : `${tool.desc}. Run a comprehensive analysis.`;
                return `${base}${code ? `\n\nCode to analyze:\n${code.slice(0, 12000)}` : ''}\n\nProvide detailed, actionable findings with severity levels and specific recommendations.`;
            }}
        />
    );
}
