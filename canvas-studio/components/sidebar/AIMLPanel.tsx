import React from 'react';
import ToolExecutionPanel, { type ToolDefinition } from '../shared/ToolExecutionPanel';

interface AIMLPanelProps {
    currentCode?: string;
    onApplyCode?: (code: string) => void;
    isDarkMode?: boolean;
}

const AI_ML_TOOLS: ToolDefinition[] = [
    {
        id: 'code-gen', icon: '✨', label: 'AI Code Generation', tool: 'generate_code',
        desc: 'Generate code from natural language descriptions with AI — components, functions, full apps',
        tag: 'code_gen',
        fields: [
            {
                id: 'model', label: 'Model', type: 'select', options: [
                    { value: 'mistral-large-latest', label: 'Mistral Large' },
                    { value: 'grok-3', label: 'Grok 3 (xAI)' },
                    { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
                ], defaultValue: 'mistral-large-latest'
            },
        ],
    },
    {
        id: 'refactor', icon: '🔧', label: 'Refactor Code', tool: 'refactor_code',
        desc: 'Refactor code to be cleaner, more maintainable, and follow best practices with AI assistance',
        tag: 'refactor',
    },
    {
        id: 'typescript', icon: '🔷', label: 'Add TypeScript', tool: 'convert_typescript',
        desc: 'Convert JavaScript to TypeScript with proper type definitions, interfaces, and generics',
        tag: 'typescript',
    },
    {
        id: 'tests', icon: '🧪', label: 'Generate Tests', tool: 'generate_tests',
        desc: 'Write comprehensive unit tests using Jest and React Testing Library with edge case coverage',
        tag: 'tests',
    },
    {
        id: 'optimize', icon: '⚡', label: 'Optimize Performance', tool: 'optimize_perf',
        desc: 'Optimize for performance — reduce re-renders, memoize, lazy load, code split, and tree shake',
        tag: 'perf_optimize',
    },
    {
        id: 'ai-chat', icon: '💬', label: 'Add AI Chat', tool: 'add_ai_chat',
        desc: 'Add an AI chatbot component with streaming responses and conversation history to your app',
        tag: 'ai_chat',
    },
    {
        id: 'sentiment', icon: '😊', label: 'Sentiment Analysis', tool: 'sentiment_analysis',
        desc: 'Add text input with real-time AI sentiment analysis visualization to your application',
        tag: 'sentiment',
    },
    {
        id: 'quality', icon: '📊', label: 'Code Quality Score', tool: 'code_quality',
        desc: 'Rate code quality on a scale of 1-10 with breakdown: readability, maintainability, performance, security',
        tag: 'quality_score',
    },
    {
        id: 'patterns', icon: '🏗️', label: 'Design Patterns', tool: 'design_patterns',
        desc: 'Analyze design patterns used in code — identify correct usage and improvement opportunities',
        tag: 'design_patterns',
    },
    {
        id: 'style-guide', icon: '📋', label: 'Extract Coding Style', tool: 'coding_style',
        desc: 'Analyze coding patterns: naming conventions, component structure, styling, state management preferences',
        tag: 'coding_style',
    },
];

export default function AIMLPanel({ currentCode, onApplyCode }: AIMLPanelProps) {
    return (
        <ToolExecutionPanel
            title="AI & Machine Learning"
            icon="🤖"
            tagline="Code Gen · Analysis · Testing · Optimization"
            description="AI-powered development tools: generate code, refactor, add TypeScript, write tests, optimize performance, analyze quality, and extract patterns."
            accentColor="violet"
            tools={AI_ML_TOOLS}
            currentCode={currentCode}
            onApplyCode={onApplyCode}
            inputPlaceholder="Describe what you want the AI to generate, analyze, or improve..."
            executeLabel="Run AI"
            buildPrompt={(tool, input, fields, code) => {
                const base = input
                    ? `${tool.desc}. Specific request: ${input}.`
                    : `${tool.desc}. Perform a comprehensive analysis.`;
                return `${base}${code ? `\n\nCurrent code:\n${code.slice(0, 12000)}` : ''}\n\nProvide detailed, actionable results with code examples where applicable.`;
            }}
        />
    );
}
