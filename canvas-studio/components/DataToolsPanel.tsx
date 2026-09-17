import React from 'react';
import ToolExecutionPanel, { type ToolDefinition } from './shared/ToolExecutionPanel';

interface DataToolsPanelProps {
    currentCode?: string;
}

const DATA_TOOLS: ToolDefinition[] = [
    { id: 'load-csv', icon: '📥', label: 'Load CSV/JSON', tool: 'read_data', desc: 'Import datasets from CSV, JSON, XML, or Excel files — profile schema, detect types, and preview rows', tag: 'read_data' },
    { id: 'transform', icon: '🔄', label: 'Transform Data', tool: 'transform_data', desc: 'Filter, sort, group, join, pivot, and normalize data with conditional expressions', tag: 'transform_data' },
    { id: 'analyze', icon: '📊', label: 'Statistical Analysis', tool: 'analyze_data', desc: 'Run descriptive statistics, correlations, distributions, and outlier detection on columns', tag: 'analyze_data' },
    { id: 'visualize', icon: '📈', label: 'Visualize Data', tool: 'visualize_data', desc: 'Generate bar, line, scatter, pie, heatmap, and histogram charts from your data', tag: 'visualize_data' },
    { id: 'clean', icon: '🧹', label: 'Data Cleaning', tool: 'clean_data', desc: 'Deduplicate, handle nulls, trim whitespace, normalize types, and fix encoding issues', tag: 'clean_data' },
    { id: 'export', icon: '📤', label: 'Export Data', tool: 'export_data', desc: 'Export processed data to CSV, JSON, SQL, or Parquet format with compression options', tag: 'export_data' },
    { id: 'merge', icon: '🔗', label: 'Merge Datasets', tool: 'transform_data', desc: 'Inner/outer/left/right join two datasets on matching columns or keys', tag: 'merge_data' },
    { id: 'schema', icon: '🗂️', label: 'Schema Inspector', tool: 'profile_data', desc: 'Inspect column types, unique counts, null percentages, and value distributions', tag: 'profile_data' },
    { id: 'sql', icon: '🗃️', label: 'SQL Query', tool: 'analyze_data', desc: 'Run SQL queries against loaded datasets — SELECT, GROUP BY, JOIN, aggregations', tag: 'sql_query' },
    { id: 'timeseries', icon: '📉', label: 'Time Series', tool: 'analyze_data', desc: 'Decompose time series, detect trends, seasonality, and anomalies', tag: 'timeseries' },
];

export default function DataToolsPanel({ currentCode }: DataToolsPanelProps) {
    return (
        <ToolExecutionPanel
            title="Data Tools"
            icon="📊"
            tagline="ETL · Analytics · Visualization · SQL"
            description="Full data engineering pipeline: load any format, transform with conditions, analyze statistics, visualize charts, and export results."
            accentColor="lime"
            tools={DATA_TOOLS}
            currentCode={currentCode}
            inputLabel="Input / Parameters"
            inputPlaceholder="Describe what to do — e.g. data source, columns, conditions..."
            requireInput={true}
            executeLabel="Execute"
            buildPrompt={(tool, input, _fields, code) =>
                `Use the ${tool.tool} tool to: ${input}. Provide detailed output with results, statistics, and recommendations.${code ? `\n\nCode:\n${code.slice(0, 15000)}` : ''}`
            }
        />
    );
}
