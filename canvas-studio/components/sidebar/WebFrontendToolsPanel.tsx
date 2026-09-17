import React from 'react';
import ToolExecutionPanel, { type ToolDefinition } from '../shared/ToolExecutionPanel';

interface WebFrontendToolsPanelProps {
    currentCode?: string;
    onApplyChanges?: (code: string) => void;
    isDarkMode?: boolean;
}

const WEB_TOOLS: ToolDefinition[] = [
    { id: 'palette', icon: '🎨', label: 'Color Palette Generator', tool: 'generate_color_palette', desc: 'Generate accessible color palettes, harmonies, shades, and WCAG-compliant contrast pairs from any base color', tag: 'color_palette' },
    { id: 'contrast', icon: '👁️', label: 'Contrast Checker', tool: 'check_contrast', desc: 'Verify foreground/background color pairs against WCAG 2.1 AA and AAA contrast ratio requirements', tag: 'contrast_check' },
    { id: 'typography', icon: '🔤', label: 'Type Scale Generator', tool: 'generate_type_scale', desc: 'Generate modular type scales with rem/em/px values, line heights, and font stack recommendations', tag: 'type_scale' },
    { id: 'spacing', icon: '📏', label: 'Spacing System', tool: 'generate_spacing', desc: 'Create consistent spacing scales (4px/8px base), grid systems, and layout token sets', tag: 'spacing_system' },
    { id: 'responsive', icon: '📱', label: 'Responsive Audit', tool: 'audit_responsive', desc: 'Analyze breakpoint coverage, fluid typography, container queries, and mobile-first patterns', tag: 'responsive_audit' },
    { id: 'a11y', icon: '♿', label: 'Accessibility Audit', tool: 'audit_accessibility', desc: 'Full WCAG 2.1 compliance check: ARIA, keyboard nav, screen reader, focus management, semantic HTML', tag: 'a11y_audit' },
    { id: 'perf', icon: '⚡', label: 'Performance Analysis', tool: 'analyze_performance', desc: 'Bundle size, render performance, code splitting, lazy loading, memoization, and network optimization', tag: 'perf_analysis' },
    { id: 'css-gen', icon: '💅', label: 'CSS Generator', tool: 'generate_css', desc: 'Generate Tailwind classes, CSS variables, animations, gradients, shadows, and glass morphism effects', tag: 'css_generator' },
    { id: 'seo', icon: '🔍', label: 'SEO Analyzer', tool: 'analyze_seo', desc: 'Check meta tags, Open Graph, structured data, headings hierarchy, and Core Web Vitals optimization', tag: 'seo_analyzer' },
    { id: 'component', icon: '🧩', label: 'Component Audit', tool: 'audit_component', desc: 'Analyze component architecture, prop drilling, state management, and composition patterns', tag: 'component_audit' },
];

export default function WebFrontendToolsPanel({ currentCode, onApplyChanges }: WebFrontendToolsPanelProps) {
    return (
        <ToolExecutionPanel
            title="Web & Frontend"
            icon="🌐"
            tagline="Colors · Type · A11y · Perf · SEO"
            description="Complete frontend engineering toolkit: design tokens, accessibility audits, performance analysis, and component architecture review."
            accentColor="cyan"
            tools={WEB_TOOLS}
            currentCode={currentCode}
            onApplyCode={onApplyChanges}
            inputLabel="Focus Area (Optional)"
            inputPlaceholder="Describe specific areas to analyze..."
            executeLabel="Execute Analysis"
            buildPrompt={(tool, input, _fields, code) =>
                input
                    ? `Perform a ${tool.label} analysis. Focus on: ${input}. ${code ? `\n\nCode:\n${code.slice(0, 12000)}` : ''}\n\nProvide specific, actionable results with code examples where applicable.`
                    : `Perform a comprehensive ${tool.label} analysis on the current project code. ${code ? `\n\nCode:\n${code.slice(0, 12000)}` : ''}\n\nProvide detailed findings, scores, and specific actionable recommendations with code fixes.`
            }
        />
    );
}
