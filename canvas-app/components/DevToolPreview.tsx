/**
 * DevToolPreview — Replaces the app preview with contextual info
 * when a dev-tool panel (Cloud, Docs, Workflow, etc.) is active.
 */
import React from 'react';
import {
    Cloud, FileText, Zap, BarChart3, Shield, Globe, Activity,
    Hammer, FolderOpen, GitBranch, Package, KeyRound, Database, Film,
    Server, Cpu, HardDrive, Lock, Terminal, Rocket, BookOpen,
    Layers, PieChart, LineChart, Workflow, Sparkles,
} from 'lucide-react';

type SidebarTab = string;

interface DevToolPreviewProps {
    tab: SidebarTab;
}

interface ToolInfo {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;       // gradient from
    colorTo: string;     // gradient to
    description: string;
    features: { icon: React.ReactNode; title: string; desc: string }[];
}

const TOOL_INFO: Record<string, ToolInfo> = {
    cloud: {
        title: 'Cloud Deployment',
        subtitle: 'Deploy, Scale & Monitor',
        icon: <Cloud className="w-8 h-8" />,
        color: 'from-blue-500', colorTo: 'to-cyan-500',
        description: 'Deploy your app to any cloud provider, manage scaling, view live logs, and track costs — all from one panel.',
        features: [
            { icon: <Rocket className="w-4 h-4" />, title: 'One-Click Deploy', desc: 'Deploy to Railway, Vercel, AWS, GCP, Azure, and more with auto-configuration.' },
            { icon: <Cpu className="w-4 h-4" />, title: 'Auto-Scale', desc: 'Configure CPU, memory, and replica settings. Scale up or down in real-time.' },
            { icon: <Terminal className="w-4 h-4" />, title: 'Live Logs', desc: 'Stream production logs directly in the panel. Filter by level and service.' },
            { icon: <Lock className="w-4 h-4" />, title: 'Secrets Manager', desc: 'Securely store and manage environment variables and API keys.' },
            { icon: <BarChart3 className="w-4 h-4" />, title: 'Cost Analytics', desc: 'Track spending across services with usage trends and optimization tips.' },
            { icon: <Globe className="w-4 h-4" />, title: 'Custom Domains', desc: 'Map custom domains with automatic SSL certificate provisioning.' },
        ],
    },
    docs: {
        title: 'Documents',
        subtitle: 'Parse, Convert & Manage',
        icon: <FileText className="w-8 h-8" />,
        color: 'from-emerald-500', colorTo: 'to-teal-500',
        description: 'Parse PDFs, DOCX, CSV files, manage archives, write Markdown documentation, and transcribe audio.',
        features: [
            { icon: <FileText className="w-4 h-4" />, title: 'PDF/DOCX Parser', desc: 'Extract text, tables, and structure from PDF and Word documents.' },
            { icon: <Layers className="w-4 h-4" />, title: 'Archive Manager', desc: 'Create and extract ZIP, TAR, and compressed archives.' },
            { icon: <BookOpen className="w-4 h-4" />, title: 'Markdown Editor', desc: 'Write and preview Markdown documentation with live rendering.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Transcription', desc: 'Convert audio files to text with AI-powered speech recognition.' },
        ],
    },
    workflow: {
        title: 'Workflow Builder',
        subtitle: 'Automate & Schedule',
        icon: <Zap className="w-8 h-8" />,
        color: 'from-amber-500', colorTo: 'to-orange-500',
        description: 'Build visual workflows, schedule recurring tasks, and automate your development pipeline.',
        features: [
            { icon: <Layers className="w-4 h-4" />, title: 'Visual Builder', desc: 'Drag-and-drop workflow designer with conditional logic and branching.' },
            { icon: <Zap className="w-4 h-4" />, title: 'Execution Engine', desc: 'Run workflows manually or on trigger events. View real-time status.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Scheduling', desc: 'Set up cron-based schedules for automated task execution.' },
            { icon: <Sparkles className="w-4 h-4" />, title: 'AI Optimization', desc: 'Get AI suggestions to optimize workflow performance and reduce steps.' },
        ],
    },
    data: {
        title: 'Data Science',
        subtitle: 'Analyze, Visualize & Model',
        icon: <PieChart className="w-8 h-8" />,
        color: 'from-violet-500', colorTo: 'to-purple-500',
        description: 'Profile datasets, clean data, build visualizations, run analytics, and compare ML models.',
        features: [
            { icon: <BarChart3 className="w-4 h-4" />, title: 'Data Profiling', desc: 'Automatic statistical analysis with distribution charts and anomaly detection.' },
            { icon: <Sparkles className="w-4 h-4" />, title: 'Data Cleaning', desc: 'AI-powered suggestions for handling missing values, outliers, and transformations.' },
            { icon: <LineChart className="w-4 h-4" />, title: 'Visualization', desc: 'Generate charts, plots, and dashboards from your data in seconds.' },
            { icon: <Cpu className="w-4 h-4" />, title: 'ML Comparison', desc: 'Train and compare machine learning models side-by-side.' },
        ],
    },
    security: {
        title: 'Security Center',
        subtitle: 'Scan, Protect & Respond',
        icon: <Shield className="w-8 h-8" />,
        color: 'from-primary-500', colorTo: 'to-primary-500',
        description: 'Scan for vulnerabilities, manage secrets, encrypt data, model threats, and plan incident response.',
        features: [
            { icon: <Shield className="w-4 h-4" />, title: 'Vulnerability Scanner', desc: 'Detect OWASP Top 10 issues, hardcoded secrets, and dependency CVEs.' },
            { icon: <Lock className="w-4 h-4" />, title: 'Encryption Tools', desc: 'Encrypt/decrypt data with AES-256, RSA, and hashing algorithms.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Threat Modeling', desc: 'Map attack surfaces with STRIDE/DREAD frameworks and risk scoring.' },
            { icon: <Terminal className="w-4 h-4" />, title: 'Incident Response', desc: 'Pre-built runbooks for security incidents with step-by-step guides.' },
        ],
    },
    api: {
        title: 'API Tester',
        subtitle: 'Test, Mock & Generate',
        icon: <Globe className="w-8 h-8" />,
        color: 'from-cyan-500', colorTo: 'to-blue-500',
        description: 'Send HTTP requests, create mock servers, set up webhooks, and generate SDKs from your API.',
        features: [
            { icon: <Globe className="w-4 h-4" />, title: 'HTTP Client', desc: 'Send GET, POST, PUT, DELETE requests with custom headers and body.' },
            { icon: <Server className="w-4 h-4" />, title: 'Mock Server', desc: 'Spin up mock endpoints that return predefined responses for testing.' },
            { icon: <Zap className="w-4 h-4" />, title: 'Webhooks', desc: 'Create webhook listeners and inspect incoming payloads in real-time.' },
            { icon: <Terminal className="w-4 h-4" />, title: 'SDK Generator', desc: 'Auto-generate client SDKs in JavaScript, Python, and more.' },
        ],
    },
    monitoring: {
        title: 'Monitoring',
        subtitle: 'Logs, Metrics & Health',
        icon: <Activity className="w-8 h-8" />,
        color: 'from-green-500', colorTo: 'to-emerald-500',
        description: 'Monitor application health, track performance metrics, view logs, and set up alerts.',
        features: [
            { icon: <Activity className="w-4 h-4" />, title: 'Health Dashboard', desc: 'Real-time uptime monitoring with status indicators and response times.' },
            { icon: <BarChart3 className="w-4 h-4" />, title: 'Performance Metrics', desc: 'CPU, memory, request latency, and throughput visualizations.' },
            { icon: <Terminal className="w-4 h-4" />, title: 'Log Explorer', desc: 'Search and filter application logs by level, time range, and keywords.' },
            { icon: <Zap className="w-4 h-4" />, title: 'Alerts', desc: 'Set threshold-based alerts for errors, latency spikes, and downtime.' },
        ],
    },
    build: {
        title: 'Build System',
        subtitle: 'Configure & Run Builds',
        icon: <Hammer className="w-8 h-8" />,
        color: 'from-orange-500', colorTo: 'to-amber-500',
        description: 'Configure build pipelines, run builds, and manage build artifacts for your project.',
        features: [
            { icon: <Hammer className="w-4 h-4" />, title: 'Build Config', desc: 'Set up build commands, entry points, and output directories.' },
            { icon: <Terminal className="w-4 h-4" />, title: 'Build Runner', desc: 'Run builds with real-time output and error highlighting.' },
            { icon: <Layers className="w-4 h-4" />, title: 'Artifacts', desc: 'View and download build outputs, bundles, and generated files.' },
        ],
    },
    assets: {
        title: 'Asset Browser',
        subtitle: 'Images, Fonts & Media',
        icon: <FolderOpen className="w-8 h-8" />,
        color: 'from-pink-500', colorTo: 'to-primary-500',
        description: 'Browse, upload, and manage project images, fonts, icons, and media files.',
        features: [
            { icon: <FolderOpen className="w-4 h-4" />, title: 'File Browser', desc: 'Visual grid of all project assets with thumbnails and metadata.' },
            { icon: <Sparkles className="w-4 h-4" />, title: 'AI Image Gen', desc: 'Generate images, icons, and logos using AI directly in your project.' },
            { icon: <Layers className="w-4 h-4" />, title: 'Optimization', desc: 'Compress and optimize images for web with format conversion.' },
        ],
    },
    git: {
        title: 'Version Control',
        subtitle: 'Branches, Commits & Diff',
        icon: <GitBranch className="w-8 h-8" />,
        color: 'from-orange-600', colorTo: 'to-primary-500',
        description: 'Manage branches, view commit history, and compare file changes with the built-in Git client.',
        features: [
            { icon: <GitBranch className="w-4 h-4" />, title: 'Branch Manager', desc: 'Create, switch, merge, and delete branches visually.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Commit History', desc: 'View commit timeline with diffs and change summaries.' },
            { icon: <Layers className="w-4 h-4" />, title: 'Code Diff', desc: 'Side-by-side comparison of file changes across commits.' },
        ],
    },
    deps: {
        title: 'Dependencies',
        subtitle: 'Install & Manage Packages',
        icon: <Package className="w-8 h-8" />,
        color: 'from-indigo-500', colorTo: 'to-blue-500',
        description: 'Search, install, update, and remove npm packages and project dependencies.',
        features: [
            { icon: <Package className="w-4 h-4" />, title: 'Package Search', desc: 'Search npm registry and install packages with one click.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Update Checker', desc: 'View outdated packages with available update versions.' },
            { icon: <Shield className="w-4 h-4" />, title: 'Security Audit', desc: 'Check for known vulnerabilities in your dependency tree.' },
        ],
    },
    env: {
        title: 'Environment Variables',
        subtitle: 'Manage Secrets & Config',
        icon: <KeyRound className="w-8 h-8" />,
        color: 'from-yellow-500', colorTo: 'to-amber-500',
        description: 'Add, edit, and manage environment variables and configuration values for your project.',
        features: [
            { icon: <KeyRound className="w-4 h-4" />, title: 'Variable Editor', desc: 'Add and modify environment variables with type validation.' },
            { icon: <Lock className="w-4 h-4" />, title: 'Secret Values', desc: 'Toggle visibility of sensitive values with masked display.' },
            { icon: <Layers className="w-4 h-4" />, title: 'Multi-Environment', desc: 'Manage separate configs for dev, staging, and production.' },
        ],
    },
    database: {
        title: 'Database',
        subtitle: 'Schema, Queries & Migrations',
        icon: <Database className="w-8 h-8" />,
        color: 'from-teal-500', colorTo: 'to-cyan-500',
        description: 'Design database schemas, run SQL queries, and manage migrations visually.',
        features: [
            { icon: <Database className="w-4 h-4" />, title: 'Schema Designer', desc: 'Visual ERD builder with table creation, relationships, and indexes.' },
            { icon: <Terminal className="w-4 h-4" />, title: 'Query Runner', desc: 'Execute SQL queries with syntax highlighting and result tables.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Migrations', desc: 'Generate and run database migrations with rollback support.' },
        ],
    },
    video: {
        title: 'Video Editor',
        subtitle: 'Generate & Edit Videos',
        icon: <Film className="w-8 h-8" />,
        color: 'from-violet-600', colorTo: 'to-indigo-500',
        description: 'Generate AI videos, edit clips, add effects, and export in multiple formats.',
        features: [
            { icon: <Film className="w-4 h-4" />, title: 'AI Video Gen', desc: 'Generate videos from text prompts using AI models.' },
            { icon: <Sparkles className="w-4 h-4" />, title: 'Effects & Filters', desc: 'Apply filters, transitions, and visual effects to clips.' },
            { icon: <Activity className="w-4 h-4" />, title: 'Timeline Editor', desc: 'Cut, trim, and arrange clips on a visual timeline.' },
        ],
    },
};

// Tabs that are "workspace" tabs — preview stays visible
const WORKSPACE_TABS = new Set(['chat', 'files', 'voice', 'ai-tools', 'billing']);

export function isDevToolTab(tab: string): boolean {
    return !WORKSPACE_TABS.has(tab);
}

const DevToolPreview: React.FC<DevToolPreviewProps> = ({ tab }) => {
    const info = TOOL_INFO[tab];
    if (!info) {
        return (
            <div className="h-full flex items-center justify-center bg-canvas-main text-canvas-muted-deep text-sm">
                <p>Select an option from the panel to see details here.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-canvas-main custom-scrollbar">
            <div className="max-w-3xl mx-auto px-8 py-12">
                {/* Hero */}
                <div className="flex items-center gap-5 mb-8">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${info.color} ${info.colorTo} flex items-center justify-center text-white shadow-lg`}>
                        {info.icon}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{info.title}</h1>
                        <p className="text-sm text-canvas-muted mt-0.5">{info.subtitle}</p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-canvas-text leading-relaxed mb-10 max-w-xl">
                    {info.description}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {info.features.map((feat, i) => (
                        <div
                            key={i}
                            className="group p-4 rounded-xl bg-white/[0.02] border border-canvas-border hover:border-white/[0.12] hover:bg-white/[0.04] transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${info.color} ${info.colorTo} flex items-center justify-center text-white shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}>
                                    {feat.icon}
                                </div>
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-200 mb-1">{feat.title}</h3>
                                    <p className="text-[11px] text-canvas-muted-deep leading-relaxed">{feat.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Usage hint */}
                <div className="mt-10 p-4 rounded-xl bg-white/[0.02] border border-canvas-border text-center">
                    <p className="text-[11px] text-canvas-muted-deep">
                        Use the <span className="text-canvas-text font-medium">{info.title}</span> panel on the left to configure and interact with this tool.
                        Results and outputs will appear here.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DevToolPreview;
