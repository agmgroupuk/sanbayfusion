// ─────────────────────────────────────────────────────────────
//  Data Science & Experimentation Tools  –  V4
//  Tools: data_profile, data_clean, data_visualize,
//         feature_engineer, model_compare, correlation_matrix,
//         hypothesis_test, outlier_detect, time_series, data_sample
// ─────────────────────────────────────────────────────────────
import prisma from '../lib/prisma.js';

/* ───── tool definitions ───── */
export const DATA_SCIENCE_TOOL_DEFINITIONS = [
    // 1 ─ Data Profile
    {
        name: 'data_profile',
        description: 'Profile datasets to generate statistical summaries: column types, distributions, missing values, outliers, correlations, cardinality, and data quality scores. Supports CSV, JSON, and tabular data.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['profile', 'summary', 'history'], description: 'Action to perform' },
                data: { type: 'array', items: { type: 'object' }, description: 'Array of row objects to profile' },
                name: { type: 'string', description: 'Dataset name' },
                columns: { type: 'array', items: { type: 'string' }, description: 'Specific columns to profile (default: all)' },
                profileId: { type: 'string', description: 'Profile ID for retrieval' },
            },
            required: ['action'],
        },
    },
    // 2 ─ Data Clean
    {
        name: 'data_clean',
        description: 'Clean and transform datasets: handle missing values, remove duplicates, fix types, normalize formats, detect/handle outliers, standardize text, and validate constraints.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['clean', 'preview', 'status', 'history'], description: 'Action to perform' },
                data: { type: 'array', items: { type: 'object' }, description: 'Array of row objects to clean' },
                name: { type: 'string', description: 'Dataset name' },
                operations: { type: 'array', items: { type: 'string' }, description: 'Cleaning operations: fill_missing, remove_duplicates, fix_types, trim_whitespace, normalize_case, remove_outliers, standardize_dates' },
                fillStrategy: { type: 'string', enum: ['mean', 'median', 'mode', 'zero', 'drop'], description: 'Strategy for filling missing values (default: mean)' },
                outlierMethod: { type: 'string', enum: ['iqr', 'zscore', 'isolation'], description: 'Outlier detection method (default: iqr)' },
                jobId: { type: 'string', description: 'Job ID for status check' },
            },
            required: ['action'],
        },
    },
    // 3 ─ Data Visualize
    {
        name: 'data_visualize',
        description: 'Generate data visualizations as structured chart specifications: bar, line, scatter, histogram, heatmap, pie, box plot, and more. Returns Vega-Lite compatible specs and ASCII previews.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['create', 'list', 'get'], description: 'Action to perform' },
                data: { type: 'array', items: { type: 'object' }, description: 'Data rows for the chart' },
                chartType: { type: 'string', enum: ['bar', 'line', 'scatter', 'histogram', 'heatmap', 'pie', 'box', 'area', 'table'], description: 'Chart type' },
                x: { type: 'string', description: 'X-axis column' },
                y: { type: 'string', description: 'Y-axis column' },
                color: { type: 'string', description: 'Color grouping column' },
                title: { type: 'string', description: 'Chart title' },
                vizId: { type: 'string', description: 'Visualization ID for retrieval' },
            },
            required: ['action'],
        },
    },
    // 4 ─ Feature Engineer
    {
        name: 'feature_engineer',
        description: 'Engineer features from raw data: create derived columns, bin numerics, encode categoricals, extract date parts, compute rolling aggregates, generate polynomial features, and normalize/scale values.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['transform', 'suggest', 'preview'], description: 'Action to perform' },
                data: { type: 'array', items: { type: 'object' }, description: 'Input data rows' },
                transformations: { type: 'array', items: { type: 'object' }, description: 'Array of { type, column, params } transformations' },
                targetColumn: { type: 'string', description: 'Target variable for suggestions' },
            },
            required: ['action'],
        },
    },
    // 5 ─ Model Compare
    {
        name: 'model_compare',
        description: 'Compare ML model performance across metrics: accuracy, precision, recall, F1, AUC-ROC, MSE, RMSE, MAE, R-squared. Supports model registration, benchmark tracking, and leaderboard generation.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['register', 'compare', 'leaderboard', 'history'], description: 'Action to perform' },
                name: { type: 'string', description: 'Model name' },
                version: { type: 'string', description: 'Model version' },
                framework: { type: 'string', description: 'Framework (sklearn, pytorch, tensorflow, xgboost, etc.)' },
                taskType: { type: 'string', enum: ['classification', 'regression', 'clustering', 'ranking'], description: 'ML task type' },
                metrics: { type: 'object', description: 'Metric values { accuracy, precision, recall, f1, auc, mse, rmse, mae, r2 }' },
                hyperparams: { type: 'object', description: 'Hyperparameters used' },
                modelIds: { type: 'array', items: { type: 'string' }, description: 'Model IDs to compare' },
                sortBy: { type: 'string', description: 'Metric to sort leaderboard by' },
            },
            required: ['action'],
        },
    },
    // 6 ─ Correlation Matrix
    {
        name: 'correlation_matrix',
        description: 'Compute correlation matrices between numeric columns. Detect strong/weak correlations, multicollinearity, and generate heatmap-ready output. Supports Pearson, Spearman, and Kendall methods.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['compute', 'top_correlations', 'multicollinearity'], description: 'Action' },
                data: { type: 'array', items: { type: 'object' }, description: 'Data rows' },
                columns: { type: 'array', items: { type: 'string' }, description: 'Columns to correlate (default: all numeric)' },
                method: { type: 'string', enum: ['pearson', 'spearman', 'kendall'], description: 'Correlation method. Default: pearson' },
                threshold: { type: 'number', description: 'Min absolute correlation to report (default: 0.5)' },
                vifThreshold: { type: 'number', description: '[multicollinearity] VIF threshold (default: 5.0)' },
            },
            required: ['action'],
        },
    },
    // 7 ─ Hypothesis Test
    {
        name: 'hypothesis_test',
        description: 'Statistical hypothesis testing: t-test (one/two-sample, paired), chi-square, ANOVA, z-test, Kolmogorov-Smirnov, Mann-Whitney U. Returns test statistic, p-value, confidence interval, effect size.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['t_test', 'chi_square', 'anova', 'z_test', 'ks_test', 'mann_whitney', 'summary'], description: 'Test type' },
                sampleA: { type: 'array', items: { type: 'number' }, description: 'First sample data' },
                sampleB: { type: 'array', items: { type: 'number' }, description: 'Second sample data (two-sample tests)' },
                observed: { type: 'array', items: { type: 'number' }, description: '[chi_square] Observed frequencies' },
                expected: { type: 'array', items: { type: 'number' }, description: '[chi_square] Expected frequencies' },
                groups: { type: 'array', items: { type: 'array', items: { type: 'number' } }, description: '[anova] Array of group arrays' },
                populationMean: { type: 'number', description: '[t_test one-sample/z_test] Known population mean' },
                populationStd: { type: 'number', description: '[z_test] Known population std dev' },
                alpha: { type: 'number', description: 'Significance level. Default: 0.05' },
                paired: { type: 'boolean', description: '[t_test] Paired test. Default: false' },
                alternative: { type: 'string', enum: ['two-sided', 'less', 'greater'], description: 'Alternative hypothesis. Default: two-sided' },
            },
            required: ['action'],
        },
    },
    // 8 ─ Outlier Detect
    {
        name: 'outlier_detect',
        description: 'Advanced outlier detection: IQR method, Z-score, Modified Z-score (MAD), isolation forest simulation, and Grubbs test. Returns outlier indices, values, scores, and visualizable boundaries.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['detect', 'iqr', 'zscore', 'modified_zscore', 'isolation', 'grubbs', 'compare_methods'], description: 'Detection method' },
                data: { type: 'array', items: { type: 'number' }, description: 'Numeric data array' },
                column: { type: 'string', description: 'Column name (for reporting)' },
                threshold: { type: 'number', description: 'Threshold (IQR multiplier or Z-score cutoff). Default: 1.5 for IQR, 3 for Z-score' },
                contamination: { type: 'number', description: '[isolation] Expected fraction of outliers (0-0.5). Default: 0.1' },
                returnClean: { type: 'boolean', description: 'Also return cleaned data. Default: false' },
            },
            required: ['action'],
        },
    },
    // 9 ─ Time Series
    {
        name: 'time_series',
        description: 'Time series analysis: decompose into trend/seasonal/residual, detect change points, compute rolling statistics, forecast with exponential smoothing, detect anomalies, and compute autocorrelation.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['decompose', 'forecast', 'anomaly', 'rolling_stats', 'autocorrelation', 'change_points', 'summary'], description: 'Analysis type' },
                values: { type: 'array', items: { type: 'number' }, description: 'Time series values (ordered)' },
                timestamps: { type: 'array', items: { type: 'string' }, description: 'Optional ISO timestamps' },
                period: { type: 'number', description: 'Seasonal period (e.g. 7 for weekly, 12 for monthly). Default: auto-detect' },
                forecastSteps: { type: 'number', description: '[forecast] Number of steps to predict. Default: 10' },
                smoothingFactor: { type: 'number', description: '[forecast] Alpha for exponential smoothing. Default: 0.3' },
                windowSize: { type: 'number', description: '[rolling_stats] Window size. Default: 7' },
                anomalyThreshold: { type: 'number', description: '[anomaly] Std dev threshold. Default: 2.5' },
                maxLags: { type: 'number', description: '[autocorrelation] Max lags. Default: 20' },
            },
            required: ['action'],
        },
    },
    // 10 ─ Data Sample
    {
        name: 'data_sample',
        description: 'Data sampling strategies: random, stratified, systematic, reservoir (streaming), bootstrap, and oversampling/undersampling for imbalanced datasets. Returns sampled data with sampling metadata.',
        category: 'data_science',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['random', 'stratified', 'systematic', 'reservoir', 'bootstrap', 'oversample', 'undersample'], description: 'Sampling strategy' },
                data: { type: 'array', items: { type: 'object' }, description: 'Input data rows' },
                sampleSize: { type: 'number', description: 'Number of samples to draw' },
                fraction: { type: 'number', description: 'Fraction to sample (0-1). Alternative to sampleSize' },
                stratifyColumn: { type: 'string', description: '[stratified] Column to stratify by' },
                targetColumn: { type: 'string', description: '[oversample/undersample] Target column for balancing' },
                step: { type: 'number', description: '[systematic] Every Nth item. Default: auto-computed' },
                replacement: { type: 'boolean', description: '[bootstrap] Sample with replacement. Default: true' },
                nBootstraps: { type: 'number', description: '[bootstrap] Number of bootstrap samples. Default: 1' },
                seed: { type: 'number', description: 'Random seed for reproducibility' },
            },
            required: ['action'],
        },
    },
];

/* ═══════════════════════════════════════════════════════════════
   EXECUTORS
   ═══════════════════════════════════════════════════════════════ */

// ── helpers ────────────────────────────────────────────────────
function inferType(values) {
    const sample = values.filter(v => v != null && v !== '').slice(0, 50);
    if (sample.length === 0) return 'empty';
    const numCount = sample.filter(v => !isNaN(Number(v))).length;
    if (numCount / sample.length > 0.8) return 'numeric';
    const datePattern = /^\d{4}[-/]\d{2}[-/]\d{2}/;
    const dateCount = sample.filter(v => datePattern.test(String(v))).length;
    if (dateCount / sample.length > 0.6) return 'date';
    const boolCount = sample.filter(v => ['true', 'false', '0', '1', 'yes', 'no'].includes(String(v).toLowerCase())).length;
    if (boolCount / sample.length > 0.8) return 'boolean';
    const uniqueRatio = new Set(sample.map(String)).size / sample.length;
    if (uniqueRatio < 0.1 && sample.length > 10) return 'categorical';
    return 'text';
}

function computeStats(nums) {
    if (nums.length === 0) return { count: 0, mean: 0, std: 0, min: 0, max: 0, median: 0, q25: 0, q75: 0 };
    const sorted = [...nums].sort((a, b) => a - b);
    const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
    const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
    const q = (p) => { const i = p * (sorted.length - 1); const lo = Math.floor(i); return lo === i ? sorted[lo] : sorted[lo] * (1 - (i - lo)) + sorted[lo + 1] * (i - lo); };
    return {
        count: nums.length, mean: Math.round(mean * 1000) / 1000,
        std: Math.round(Math.sqrt(variance) * 1000) / 1000,
        min: sorted[0], max: sorted[sorted.length - 1],
        median: q(0.5), q25: q(0.25), q75: q(0.75),
    };
}

// ── 1. data_profile ────────────────────────────────────────────
async function executeDataProfile(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'profile') {
        const { data = [], name = 'Untitled', columns: colFilter } = input;
        if (data.length === 0) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };

        const allCols = [...new Set(data.flatMap(row => Object.keys(row)))];
        const cols = colFilter && colFilter.length > 0 ? allCols.filter(c => colFilter.includes(c)) : allCols;

        const columnProfiles = cols.map(col => {
            const values = data.map(row => row[col]);
            const nonNull = values.filter(v => v != null && v !== '' && v !== undefined);
            const type = inferType(values);
            const missing = values.length - nonNull.length;
            const missingPct = Math.round((missing / values.length) * 100);
            const unique = new Set(nonNull.map(String)).size;
            const cardinality = unique;

            const profile = { column: col, type, totalRows: values.length, missing, missingPct, unique, cardinality };

            if (type === 'numeric') {
                const nums = nonNull.map(Number).filter(n => !isNaN(n));
                profile.stats = computeStats(nums);
                // Outlier detection (IQR)
                const iqr = profile.stats.q75 - profile.stats.q25;
                const lo = profile.stats.q25 - 1.5 * iqr;
                const hi = profile.stats.q75 + 1.5 * iqr;
                profile.outliers = nums.filter(n => n < lo || n > hi).length;
                // Distribution sketch (5 bins)
                const range = profile.stats.max - profile.stats.min;
                if (range > 0) {
                    const binSize = range / 5;
                    const bins = Array.from({ length: 5 }, (_, i) => ({ from: Math.round((profile.stats.min + binSize * i) * 100) / 100, to: Math.round((profile.stats.min + binSize * (i + 1)) * 100) / 100, count: 0 }));
                    nums.forEach(n => { const idx = Math.min(Math.floor((n - profile.stats.min) / binSize), 4); bins[idx].count++; });
                    profile.distribution = bins;
                }
            }

            if (type === 'text' || type === 'categorical') {
                const lengths = nonNull.map(v => String(v).length);
                profile.avgLength = Math.round(lengths.reduce((s, l) => s + l, 0) / Math.max(lengths.length, 1));
                profile.minLength = Math.min(...lengths, 0);
                profile.maxLength = Math.max(...lengths, 0);
                // Top values
                const freq = {};
                nonNull.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
                profile.topValues = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count, pct: Math.round((count / nonNull.length) * 100) }));
            }

            return profile;
        });

        // Data quality score (0-100)
        const avgMissing = columnProfiles.reduce((s, c) => s + c.missingPct, 0) / Math.max(cols.length, 1);
        const avgOutlierPct = columnProfiles.filter(c => c.outliers != null).reduce((s, c) => s + (c.outliers / Math.max(c.totalRows, 1) * 100), 0) / Math.max(columnProfiles.filter(c => c.outliers != null).length, 1);
        const duplicateRows = data.length - new Set(data.map(row => JSON.stringify(row))).size;
        const dupPct = (duplicateRows / Math.max(data.length, 1)) * 100;
        const qualityScore = Math.max(0, Math.round(100 - avgMissing * 1.5 - avgOutlierPct * 0.5 - dupPct * 1));

        const record = await db.dataProfile.create({
            data: {
                userId,
                name,
                rowCount: data.length,
                columnCount: cols.length,
                profile: { columns: columnProfiles, qualityScore, duplicateRows, avgMissingPct: Math.round(avgMissing) },
                qualityScore,
            },
        });

        return {
            result: JSON.stringify({
                profileId: record.id,
                name,
                rows: data.length,
                columns: cols.length,
                qualityScore,
                duplicateRows,
                columnProfiles: columnProfiles.slice(0, 20),
                summary: `Dataset "${name}": ${data.length} rows × ${cols.length} cols, quality ${qualityScore}/100, ${duplicateRows} duplicates`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'summary') {
        const { profileId } = input;
        if (!profileId) return { result: JSON.stringify({ error: 'profileId required' }), sideEffects: null };
        const p = await db.dataProfile.findUnique({ where: { id: profileId } });
        if (!p) return { result: JSON.stringify({ error: 'Profile not found' }), sideEffects: null };
        return { result: JSON.stringify({ id: p.id, name: p.name, rowCount: p.rowCount, columnCount: p.columnCount, qualityScore: p.qualityScore, profile: p.profile, createdAt: p.createdAt }), sideEffects: null };
    }

    if (action === 'history') {
        const profiles = await db.dataProfile.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
        return {
            result: JSON.stringify({
                count: profiles.length,
                profiles: profiles.map(p => ({ id: p.id, name: p.name, rows: p.rowCount, cols: p.columnCount, quality: p.qualityScore, createdAt: p.createdAt })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 2. data_clean ──────────────────────────────────────────────
async function executeDataClean(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'clean' || action === 'preview') {
        const { data = [], name = 'Untitled', operations = ['fill_missing', 'remove_duplicates', 'trim_whitespace'], fillStrategy = 'mean', outlierMethod = 'iqr' } = input;
        if (data.length === 0) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };

        let cleaned = JSON.parse(JSON.stringify(data)); // deep clone
        const log = [];
        const originalLen = cleaned.length;
        const allCols = [...new Set(cleaned.flatMap(row => Object.keys(row)))];

        // Remove duplicates
        if (operations.includes('remove_duplicates')) {
            const seen = new Set();
            const before = cleaned.length;
            cleaned = cleaned.filter(row => {
                const key = JSON.stringify(row);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            log.push({ op: 'remove_duplicates', removed: before - cleaned.length });
        }

        // Trim whitespace
        if (operations.includes('trim_whitespace')) {
            let trimmed = 0;
            cleaned.forEach(row => {
                allCols.forEach(col => {
                    if (typeof row[col] === 'string' && row[col] !== row[col].trim()) { row[col] = row[col].trim(); trimmed++; }
                });
            });
            log.push({ op: 'trim_whitespace', cellsTrimmed: trimmed });
        }

        // Normalize case
        if (operations.includes('normalize_case')) {
            let normalized = 0;
            cleaned.forEach(row => {
                allCols.forEach(col => {
                    if (typeof row[col] === 'string' && inferType([row[col]]) === 'text') { row[col] = row[col].toLowerCase(); normalized++; }
                });
            });
            log.push({ op: 'normalize_case', cellsNormalized: normalized });
        }

        // Fix types
        if (operations.includes('fix_types')) {
            let fixed = 0;
            allCols.forEach(col => {
                const type = inferType(cleaned.map(r => r[col]));
                if (type === 'numeric') {
                    cleaned.forEach(row => {
                        if (row[col] != null && typeof row[col] === 'string') {
                            const n = Number(row[col].replace(/[,$%]/g, ''));
                            if (!isNaN(n)) { row[col] = n; fixed++; }
                        }
                    });
                } else if (type === 'boolean') {
                    cleaned.forEach(row => {
                        const v = String(row[col]).toLowerCase();
                        if (['true', 'yes', '1'].includes(v)) { row[col] = true; fixed++; }
                        else if (['false', 'no', '0'].includes(v)) { row[col] = false; fixed++; }
                    });
                }
            });
            log.push({ op: 'fix_types', cellsFixed: fixed });
        }

        // Fill missing
        if (operations.includes('fill_missing')) {
            let filled = 0;
            allCols.forEach(col => {
                const values = cleaned.map(r => r[col]).filter(v => v != null && v !== '' && v !== undefined);
                const type = inferType(values);
                let fillVal;
                if (fillStrategy === 'drop') { /* handled separately */ }
                else if (type === 'numeric') {
                    const nums = values.map(Number).filter(n => !isNaN(n));
                    if (fillStrategy === 'mean') fillVal = nums.reduce((s, n) => s + n, 0) / Math.max(nums.length, 1);
                    else if (fillStrategy === 'median') { nums.sort((a, b) => a - b); fillVal = nums[Math.floor(nums.length / 2)]; }
                    else if (fillStrategy === 'mode') {
                        const freq = {}; nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
                        fillVal = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 0);
                    }
                    else fillVal = 0;
                } else {
                    // For text: mode
                    const freq = {}; values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
                    fillVal = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                }

                if (fillStrategy === 'drop') {
                    const before = cleaned.length;
                    cleaned = cleaned.filter(r => r[col] != null && r[col] !== '' && r[col] !== undefined);
                    filled += before - cleaned.length;
                } else if (fillVal !== undefined) {
                    cleaned.forEach(row => {
                        if (row[col] == null || row[col] === '' || row[col] === undefined) { row[col] = fillVal; filled++; }
                    });
                }
            });
            log.push({ op: 'fill_missing', cellsFilled: filled, strategy: fillStrategy });
        }

        // Remove outliers
        if (operations.includes('remove_outliers')) {
            let removed = 0;
            allCols.forEach(col => {
                const type = inferType(cleaned.map(r => r[col]));
                if (type !== 'numeric') return;
                const nums = cleaned.map(r => Number(r[col])).filter(n => !isNaN(n));
                if (nums.length < 4) return;

                if (outlierMethod === 'iqr') {
                    const sorted = [...nums].sort((a, b) => a - b);
                    const q25 = sorted[Math.floor(sorted.length * 0.25)];
                    const q75 = sorted[Math.floor(sorted.length * 0.75)];
                    const iqr = q75 - q25;
                    const lo = q25 - 1.5 * iqr;
                    const hi = q75 + 1.5 * iqr;
                    const before = cleaned.length;
                    cleaned = cleaned.filter(row => {
                        const v = Number(row[col]);
                        return !isNaN(v) ? (v >= lo && v <= hi) : true;
                    });
                    removed += before - cleaned.length;
                } else if (outlierMethod === 'zscore') {
                    const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
                    const std = Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length);
                    if (std > 0) {
                        const before = cleaned.length;
                        cleaned = cleaned.filter(row => {
                            const v = Number(row[col]);
                            return !isNaN(v) ? Math.abs((v - mean) / std) <= 3 : true;
                        });
                        removed += before - cleaned.length;
                    }
                }
            });
            log.push({ op: 'remove_outliers', method: outlierMethod, rowsRemoved: removed });
        }

        // Standardize dates
        if (operations.includes('standardize_dates')) {
            let standardized = 0;
            allCols.forEach(col => {
                const type = inferType(cleaned.map(r => r[col]));
                if (type !== 'date') return;
                cleaned.forEach(row => {
                    if (row[col]) {
                        const d = new Date(row[col]);
                        if (!isNaN(d.getTime())) { row[col] = d.toISOString().split('T')[0]; standardized++; }
                    }
                });
            });
            log.push({ op: 'standardize_dates', cellsStandardized: standardized });
        }

        const job = action === 'clean' ? await db.dataCleanJob.create({
            data: {
                userId,
                name,
                originalRows: originalLen,
                cleanedRows: cleaned.length,
                operations,
                changes: log,
                status: 'completed',
                config: { fillStrategy, outlierMethod },
            },
        }) : null;

        return {
            result: JSON.stringify({
                jobId: job?.id || null,
                mode: action,
                originalRows: originalLen,
                cleanedRows: cleaned.length,
                rowsRemoved: originalLen - cleaned.length,
                operations: log,
                preview: cleaned.slice(0, 5),
                summary: `Cleaned "${name}": ${originalLen} → ${cleaned.length} rows (${log.length} operations)`,
                ...(action === 'clean' ? { cleanedData: cleaned } : {}),
            }),
            sideEffects: null,
        };
    }

    if (action === 'status') {
        const { jobId } = input;
        if (!jobId) return { result: JSON.stringify({ error: 'jobId required' }), sideEffects: null };
        const job = await db.dataCleanJob.findUnique({ where: { id: jobId } });
        if (!job) return { result: JSON.stringify({ error: 'Job not found' }), sideEffects: null };
        return { result: JSON.stringify({ id: job.id, name: job.name, status: job.status, originalRows: job.originalRows, cleanedRows: job.cleanedRows, operations: job.changes, createdAt: job.createdAt }), sideEffects: null };
    }

    if (action === 'history') {
        const jobs = await db.dataCleanJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
        return {
            result: JSON.stringify({
                count: jobs.length,
                jobs: jobs.map(j => ({ id: j.id, name: j.name, status: j.status, original: j.originalRows, cleaned: j.cleanedRows, createdAt: j.createdAt })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 3. data_visualize ──────────────────────────────────────────
async function executeDataVisualize(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'create') {
        const { data = [], chartType = 'bar', x, y, color, title = 'Chart' } = input;
        if (data.length === 0) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };

        const allCols = [...new Set(data.flatMap(row => Object.keys(row)))];
        const xCol = x || allCols[0];
        const yCol = y || allCols[1] || allCols[0];

        // Build Vega-Lite spec
        const vegaSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title,
            width: 600,
            height: 400,
            data: { values: data.slice(0, 500) },
            mark: { type: chartType === 'histogram' ? 'bar' : chartType === 'box' ? 'boxplot' : chartType === 'area' ? 'area' : chartType },
            encoding: {},
        };

        // Configure encoding based on chart type
        switch (chartType) {
            case 'bar':
                vegaSpec.encoding = { x: { field: xCol, type: 'nominal' }, y: { field: yCol, type: 'quantitative', aggregate: 'sum' } };
                break;
            case 'line':
            case 'area':
                vegaSpec.encoding = { x: { field: xCol, type: 'ordinal' }, y: { field: yCol, type: 'quantitative' } };
                break;
            case 'scatter':
                vegaSpec.encoding = { x: { field: xCol, type: 'quantitative' }, y: { field: yCol, type: 'quantitative' } };
                break;
            case 'histogram':
                vegaSpec.encoding = { x: { field: xCol, bin: true, type: 'quantitative' }, y: { aggregate: 'count', type: 'quantitative' } };
                break;
            case 'pie':
                vegaSpec.mark = { type: 'arc' };
                vegaSpec.encoding = { theta: { field: yCol, type: 'quantitative' }, color: { field: xCol, type: 'nominal' } };
                break;
            case 'box':
                vegaSpec.encoding = { x: { field: xCol, type: 'nominal' }, y: { field: yCol, type: 'quantitative' } };
                break;
            case 'heatmap':
                vegaSpec.mark = { type: 'rect' };
                vegaSpec.encoding = { x: { field: xCol, type: 'nominal' }, y: { field: yCol, type: 'nominal' }, color: { field: color || yCol, type: 'quantitative', aggregate: 'count' } };
                break;
            case 'table':
                vegaSpec.mark = { type: 'text' };
                break;
            default:
                vegaSpec.encoding = { x: { field: xCol }, y: { field: yCol } };
        }

        if (color && chartType !== 'pie' && chartType !== 'heatmap') {
            vegaSpec.encoding.color = { field: color, type: 'nominal' };
        }

        // Generate ASCII preview
        let ascii = '';
        if (chartType === 'bar' || chartType === 'histogram') {
            const groups = {};
            data.forEach(row => { const k = String(row[xCol] || ''); groups[k] = (groups[k] || 0) + (Number(row[yCol]) || 1); });
            const maxVal = Math.max(...Object.values(groups), 1);
            const topEntries = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 12);
            ascii = topEntries.map(([label, val]) => {
                const barLen = Math.round((val / maxVal) * 30);
                return `${label.slice(0, 15).padEnd(16)}${'█'.repeat(barLen)} ${val}`;
            }).join('\n');
        } else if (chartType === 'table') {
            const headers = allCols.slice(0, 6);
            ascii = headers.map(h => h.slice(0, 12).padEnd(13)).join('│') + '\n' + '─'.repeat(13 * headers.length) + '\n';
            ascii += data.slice(0, 10).map(row => headers.map(h => String(row[h] || '').slice(0, 12).padEnd(13)).join('│')).join('\n');
        } else {
            ascii = `[${chartType} chart: ${xCol} vs ${yCol}, ${data.length} points]`;
        }

        const viz = await db.dataVisualization.create({
            data: {
                userId,
                title,
                chartType,
                spec: vegaSpec,
                dataSnapshot: { rowCount: data.length, columns: allCols, x: xCol, y: yCol, color },
            },
        });

        return {
            result: JSON.stringify({
                vizId: viz.id,
                title,
                chartType,
                xAxis: xCol,
                yAxis: yCol,
                dataPoints: data.length,
                vegaLiteSpec: vegaSpec,
                asciiPreview: ascii,
                renderUrl: `https://vega.github.io/editor/#/url/vega-lite/${Buffer.from(JSON.stringify(vegaSpec)).toString('base64').slice(0, 100)}...`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'list') {
        const vizs = await db.dataVisualization.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
        return {
            result: JSON.stringify({
                count: vizs.length,
                visualizations: vizs.map(v => ({ id: v.id, title: v.title, chartType: v.chartType, createdAt: v.createdAt })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'get') {
        const { vizId } = input;
        if (!vizId) return { result: JSON.stringify({ error: 'vizId required' }), sideEffects: null };
        const viz = await db.dataVisualization.findUnique({ where: { id: vizId } });
        if (!viz) return { result: JSON.stringify({ error: 'Visualization not found' }), sideEffects: null };
        return { result: JSON.stringify(viz), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 4. feature_engineer ────────────────────────────────────────
async function executeFeatureEngineer(input, ctx) {
    const { action } = input;

    if (action === 'transform' || action === 'preview') {
        const { data = [], transformations = [] } = input;
        if (data.length === 0) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        if (transformations.length === 0) return { result: JSON.stringify({ error: 'transformations array required' }), sideEffects: null };

        let result = JSON.parse(JSON.stringify(data));
        const log = [];

        transformations.forEach(tx => {
            const { type, column, params = {} } = tx;

            switch (type) {
                case 'bin': {
                    const bins = params.bins || 5;
                    const nums = result.map(r => Number(r[column])).filter(n => !isNaN(n));
                    const min = Math.min(...nums);
                    const range = Math.max(...nums) - min;
                    const binSize = range / bins;
                    result.forEach(row => {
                        const v = Number(row[column]);
                        if (!isNaN(v)) row[`${column}_bin`] = `bin_${Math.min(Math.floor((v - min) / binSize), bins - 1)}`;
                    });
                    log.push({ type: 'bin', column, newColumn: `${column}_bin`, bins });
                    break;
                }
                case 'one_hot': {
                    const values = [...new Set(result.map(r => String(r[column])))].slice(0, 20);
                    values.forEach(val => {
                        result.forEach(row => { row[`${column}_${val}`] = String(row[column]) === val ? 1 : 0; });
                    });
                    log.push({ type: 'one_hot', column, newColumns: values.map(v => `${column}_${v}`) });
                    break;
                }
                case 'label_encode': {
                    const values = [...new Set(result.map(r => String(r[column])))];
                    const mapping = Object.fromEntries(values.map((v, i) => [v, i]));
                    result.forEach(row => { row[`${column}_encoded`] = mapping[String(row[column])] ?? -1; });
                    log.push({ type: 'label_encode', column, newColumn: `${column}_encoded`, mapping });
                    break;
                }
                case 'normalize': {
                    const nums = result.map(r => Number(r[column])).filter(n => !isNaN(n));
                    const min = Math.min(...nums);
                    const max = Math.max(...nums);
                    const range = max - min || 1;
                    result.forEach(row => {
                        const v = Number(row[column]);
                        if (!isNaN(v)) row[`${column}_norm`] = Math.round(((v - min) / range) * 10000) / 10000;
                    });
                    log.push({ type: 'normalize', column, newColumn: `${column}_norm`, min, max });
                    break;
                }
                case 'standardize': {
                    const nums = result.map(r => Number(r[column])).filter(n => !isNaN(n));
                    const mean = nums.reduce((s, n) => s + n, 0) / Math.max(nums.length, 1);
                    const std = Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / Math.max(nums.length, 1)) || 1;
                    result.forEach(row => {
                        const v = Number(row[column]);
                        if (!isNaN(v)) row[`${column}_std`] = Math.round(((v - mean) / std) * 10000) / 10000;
                    });
                    log.push({ type: 'standardize', column, newColumn: `${column}_std`, mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100 });
                    break;
                }
                case 'log': {
                    result.forEach(row => {
                        const v = Number(row[column]);
                        if (!isNaN(v) && v > 0) row[`${column}_log`] = Math.round(Math.log(v) * 10000) / 10000;
                    });
                    log.push({ type: 'log', column, newColumn: `${column}_log` });
                    break;
                }
                case 'polynomial': {
                    const degree = params.degree || 2;
                    for (let d = 2; d <= degree; d++) {
                        result.forEach(row => {
                            const v = Number(row[column]);
                            if (!isNaN(v)) row[`${column}_pow${d}`] = Math.round(Math.pow(v, d) * 10000) / 10000;
                        });
                    }
                    log.push({ type: 'polynomial', column, degree, newColumns: Array.from({ length: degree - 1 }, (_, i) => `${column}_pow${i + 2}`) });
                    break;
                }
                case 'date_parts': {
                    result.forEach(row => {
                        const d = new Date(row[column]);
                        if (!isNaN(d.getTime())) {
                            row[`${column}_year`] = d.getFullYear();
                            row[`${column}_month`] = d.getMonth() + 1;
                            row[`${column}_day`] = d.getDate();
                            row[`${column}_dow`] = d.getDay();
                            row[`${column}_hour`] = d.getHours();
                        }
                    });
                    log.push({ type: 'date_parts', column, newColumns: ['year', 'month', 'day', 'dow', 'hour'].map(p => `${column}_${p}`) });
                    break;
                }
                case 'interaction': {
                    const col2 = params.column2;
                    if (col2) {
                        result.forEach(row => {
                            const v1 = Number(row[column]);
                            const v2 = Number(row[col2]);
                            if (!isNaN(v1) && !isNaN(v2)) row[`${column}_x_${col2}`] = Math.round(v1 * v2 * 10000) / 10000;
                        });
                        log.push({ type: 'interaction', columns: [column, col2], newColumn: `${column}_x_${col2}` });
                    }
                    break;
                }
                case 'rolling': {
                    const window = params.window || 3;
                    const agg = params.aggregate || 'mean';
                    const nums = result.map(r => Number(r[column]));
                    result.forEach((row, i) => {
                        const windowVals = nums.slice(Math.max(0, i - window + 1), i + 1).filter(n => !isNaN(n));
                        if (windowVals.length > 0) {
                            if (agg === 'mean') row[`${column}_rolling_${agg}${window}`] = Math.round((windowVals.reduce((s, n) => s + n, 0) / windowVals.length) * 10000) / 10000;
                            else if (agg === 'sum') row[`${column}_rolling_${agg}${window}`] = windowVals.reduce((s, n) => s + n, 0);
                            else if (agg === 'max') row[`${column}_rolling_${agg}${window}`] = Math.max(...windowVals);
                            else if (agg === 'min') row[`${column}_rolling_${agg}${window}`] = Math.min(...windowVals);
                        }
                    });
                    log.push({ type: 'rolling', column, window, aggregate: agg, newColumn: `${column}_rolling_${agg}${window}` });
                    break;
                }
                default:
                    log.push({ type, column, status: 'unsupported' });
            }
        });

        const newCols = [...new Set(result.flatMap(row => Object.keys(row)))];
        return {
            result: JSON.stringify({
                mode: action,
                originalColumns: [...new Set(data.flatMap(row => Object.keys(row)))].length,
                newColumns: newCols.length,
                featuresAdded: newCols.length - [...new Set(data.flatMap(row => Object.keys(row)))].length,
                transformations: log,
                preview: result.slice(0, 5),
                ...(action === 'transform' ? { transformedData: result } : {}),
            }),
            sideEffects: null,
        };
    }

    if (action === 'suggest') {
        const { data = [], targetColumn } = input;
        if (data.length === 0) return { result: JSON.stringify({ error: 'data required' }), sideEffects: null };

        const allCols = [...new Set(data.flatMap(row => Object.keys(row)))];
        const suggestions = [];

        allCols.forEach(col => {
            if (col === targetColumn) return;
            const type = inferType(data.map(r => r[col]));

            if (type === 'numeric') {
                suggestions.push({ column: col, type: 'normalize', reason: 'Normalize numeric feature to 0-1 range' });
                suggestions.push({ column: col, type: 'log', reason: 'Log transform to handle skewed distributions' });
                const nums = data.map(r => Number(r[col])).filter(n => !isNaN(n));
                const unique = new Set(nums).size;
                if (unique > 20) suggestions.push({ column: col, type: 'bin', params: { bins: 5 }, reason: 'Bin continuous variable into categories' });
            }
            if (type === 'categorical') {
                const unique = new Set(data.map(r => r[col])).size;
                if (unique <= 10) suggestions.push({ column: col, type: 'one_hot', reason: `One-hot encode (${unique} unique values)` });
                else suggestions.push({ column: col, type: 'label_encode', reason: `Label encode (${unique} unique values, too many for one-hot)` });
            }
            if (type === 'date') {
                suggestions.push({ column: col, type: 'date_parts', reason: 'Extract year, month, day, day-of-week, hour' });
            }
        });

        // Interaction suggestions for numeric pairs
        const numCols = allCols.filter(c => inferType(data.map(r => r[c])) === 'numeric' && c !== targetColumn);
        for (let i = 0; i < Math.min(numCols.length, 3); i++) {
            for (let j = i + 1; j < Math.min(numCols.length, 4); j++) {
                suggestions.push({ column: numCols[i], type: 'interaction', params: { column2: numCols[j] }, reason: `Interaction feature: ${numCols[i]} × ${numCols[j]}` });
            }
        }

        return {
            result: JSON.stringify({ totalSuggestions: suggestions.length, suggestions: suggestions.slice(0, 30), targetColumn }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 5. model_compare ───────────────────────────────────────────
async function executeModelCompare(input, ctx) {
    const db = ctx.prisma || prisma;
    const userId = ctx.userId || 'system';
    const { action } = input;

    if (action === 'register') {
        const { name = 'model', version = '1.0', framework = 'unknown', taskType = 'classification', metrics = {}, hyperparams = {} } = input;

        // Compute composite score based on task type
        let compositeScore = 0;
        if (taskType === 'classification') {
            compositeScore = ((metrics.accuracy || 0) * 0.2 + (metrics.precision || 0) * 0.2 + (metrics.recall || 0) * 0.2 + (metrics.f1 || 0) * 0.3 + (metrics.auc || 0) * 0.1) * 100;
        } else if (taskType === 'regression') {
            const r2 = metrics.r2 || 0;
            const normRmse = metrics.rmse ? Math.max(0, 1 - metrics.rmse) : 0;
            compositeScore = (r2 * 0.5 + normRmse * 0.5) * 100;
        } else {
            compositeScore = Object.values(metrics).reduce((s, v) => s + v, 0) / Math.max(Object.keys(metrics).length, 1) * 100;
        }

        const record = await db.mlModelRecord.create({
            data: {
                userId,
                name,
                version,
                framework,
                taskType,
                metrics,
                hyperparams,
                compositeScore: Math.round(compositeScore * 100) / 100,
            },
        });

        return {
            result: JSON.stringify({
                modelId: record.id,
                name,
                version,
                framework,
                taskType,
                metrics,
                compositeScore: Math.round(compositeScore * 100) / 100,
                message: `Model "${name}" v${version} registered with composite score ${Math.round(compositeScore)}/100`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'compare') {
        const { modelIds = [] } = input;
        if (modelIds.length < 2) return { result: JSON.stringify({ error: 'At least 2 modelIds required' }), sideEffects: null };

        const models = await db.mlModelRecord.findMany({ where: { id: { in: modelIds } } });
        if (models.length < 2) return { result: JSON.stringify({ error: 'Could not find enough models' }), sideEffects: null };

        // Compile comparison
        const allMetricNames = [...new Set(models.flatMap(m => Object.keys(m.metrics || {})))];
        const metricComparison = {};
        allMetricNames.forEach(metric => {
            const values = models.map(m => ({ model: `${m.name} v${m.version}`, value: (m.metrics || {})[metric] })).filter(v => v.value != null);
            const isHigherBetter = !['mse', 'rmse', 'mae'].includes(metric);
            const sorted = [...values].sort((a, b) => isHigherBetter ? b.value - a.value : a.value - b.value);
            metricComparison[metric] = { values, best: sorted[0]?.model, worst: sorted[sorted.length - 1]?.model, isHigherBetter };
        });

        const ranked = [...models].sort((a, b) => b.compositeScore - a.compositeScore);
        return {
            result: JSON.stringify({
                modelsCompared: models.length,
                models: models.map(m => ({ id: m.id, name: m.name, version: m.version, framework: m.framework, taskType: m.taskType, compositeScore: m.compositeScore, metrics: m.metrics })),
                metricComparison,
                ranking: ranked.map((m, i) => ({ rank: i + 1, name: `${m.name} v${m.version}`, compositeScore: m.compositeScore })),
                winner: `${ranked[0].name} v${ranked[0].version}`,
            }),
            sideEffects: null,
        };
    }

    if (action === 'leaderboard') {
        const { taskType, sortBy } = input;
        const where = { userId };
        if (taskType) where.taskType = taskType;

        const models = await db.mlModelRecord.findMany({ where, orderBy: { compositeScore: 'desc' }, take: 50 });

        if (sortBy && models.length > 0) {
            models.sort((a, b) => {
                const aVal = (a.metrics || {})[sortBy] || 0;
                const bVal = (b.metrics || {})[sortBy] || 0;
                const isHigherBetter = !['mse', 'rmse', 'mae'].includes(sortBy);
                return isHigherBetter ? bVal - aVal : aVal - bVal;
            });
        }

        return {
            result: JSON.stringify({
                count: models.length,
                sortedBy: sortBy || 'compositeScore',
                taskType: taskType || 'all',
                leaderboard: models.map((m, i) => ({
                    rank: i + 1,
                    id: m.id,
                    name: m.name,
                    version: m.version,
                    framework: m.framework,
                    taskType: m.taskType,
                    compositeScore: m.compositeScore,
                    metrics: m.metrics,
                    createdAt: m.createdAt,
                })),
            }),
            sideEffects: null,
        };
    }

    if (action === 'history') {
        const models = await db.mlModelRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
        return {
            result: JSON.stringify({
                count: models.length,
                models: models.map(m => ({ id: m.id, name: m.name, version: m.version, framework: m.framework, compositeScore: m.compositeScore, createdAt: m.createdAt })),
            }),
            sideEffects: null,
        };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 6. correlation_matrix ──────────────────────────────────────
function executeCorrelationMatrix(input, ctx) {
    const { action, data = [], columns = [], method = 'pearson' } = input;

    const getNumCols = (rows) => {
        if (!rows.length) return [];
        return [...new Set(rows.flatMap(r => Object.keys(r)))].filter(c => rows.some(r => !isNaN(Number(r[c])) && r[c] !== null && r[c] !== ''));
    };
    const vals = (rows, col) => rows.map(r => Number(r[col])).filter(n => !isNaN(n));
    const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const rankArr = (a) => { const s = a.map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v); const r = new Array(a.length); s.forEach((x, i) => r[x.i] = i + 1); return r; };
    const pearson = (x, y) => {
        const n = Math.min(x.length, y.length); if (n < 3) return 0;
        const mx = avg(x.slice(0, n)), my = avg(y.slice(0, n));
        let num = 0, dx = 0, dy = 0;
        for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
        return dx && dy ? num / Math.sqrt(dx * dy) : 0;
    };
    const corr = (x, y) => {
        if (method === 'spearman') return pearson(rankArr(x), rankArr(y));
        if (method === 'kendall') {
            const n = Math.min(x.length, y.length); let c = 0, d = 0;
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const p = (x[i] - x[j]) * (y[i] - y[j]); if (p > 0) c++; else if (p < 0) d++; }
            const t = c + d; return t ? (c - d) / t : 0;
        }
        return pearson(x, y);
    };
    const rnd = (v) => Math.round(v * 10000) / 10000;

    if (action === 'compute') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const cols = columns.length ? columns : getNumCols(data);
        const matrix = {};
        cols.forEach(c1 => { matrix[c1] = {}; const v1 = vals(data, c1); cols.forEach(c2 => { matrix[c1][c2] = rnd(corr(v1, vals(data, c2))); }); });
        return { result: JSON.stringify({ method, columns: cols, rows: data.length, matrix }), sideEffects: null };
    }

    if (action === 'top_correlations') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const cols = columns.length ? columns : getNumCols(data);
        const k = input.k || 10;
        const pairs = [];
        for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
            const c = corr(vals(data, cols[i]), vals(data, cols[j]));
            pairs.push({ col1: cols[i], col2: cols[j], correlation: rnd(c), absCorrelation: Math.abs(c) });
        }
        pairs.sort((a, b) => b.absCorrelation - a.absCorrelation);
        return { result: JSON.stringify({ method, totalPairs: pairs.length, top: pairs.slice(0, k), weakest: pairs.slice(-Math.min(k, pairs.length)).reverse() }), sideEffects: null };
    }

    if (action === 'multicollinearity') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const cols = columns.length ? columns : getNumCols(data);
        const vifs = cols.map(target => {
            const others = cols.filter(c => c !== target);
            if (!others.length) return { column: target, vif: 1 };
            const tv = vals(data, target);
            const maxR2 = Math.max(...others.map(c => { const r = corr(tv, vals(data, c)); return r * r; }));
            const vif = 1 / (1 - maxR2);
            return { column: target, vif: rnd(vif), r2: rnd(maxR2), concern: vif > 5 ? 'high' : vif > 2.5 ? 'moderate' : 'low' };
        });
        const prob = vifs.filter(v => v.vif > 5);
        return { result: JSON.stringify({ columns: cols.length, vifs, problematic: prob.length, summary: prob.length ? `${prob.length} column(s) with high VIF (>5): ${prob.map(v => v.column).join(', ')}` : 'No multicollinearity issues detected' }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 7. hypothesis_test ─────────────────────────────────────────
function executeHypothesisTest(input, ctx) {
    const { action, sample1 = [], sample2 = [], alpha = 0.05 } = input;
    const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const vari = (a) => { const m = avg(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };
    const sd = (a) => Math.sqrt(vari(a));
    const zToP = (z) => Math.max(0.0001, Math.min(1, Math.exp(-0.5 * z * z) * (1 / Math.sqrt(2 * Math.PI)) * 2));
    const tToP = (t, df) => zToP(Math.abs(t) * Math.sqrt(df / (df + t * t)));
    const rnd = (v) => Math.round(v * 10000) / 10000;

    if (action === 't_test') {
        if (sample1.length < 2) return { result: JSON.stringify({ error: 'sample1 with ≥2 values required' }), sideEffects: null };
        const m1 = avg(sample1), s1 = sd(sample1), n1 = sample1.length;
        if (sample2.length >= 2) {
            const m2 = avg(sample2), s2 = sd(sample2), n2 = sample2.length;
            const se = Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2);
            const t = se ? (m1 - m2) / se : 0;
            const df = Math.round(((s1 ** 2 / n1 + s2 ** 2 / n2) ** 2) / ((s1 ** 2 / n1) ** 2 / (n1 - 1) + (s2 ** 2 / n2) ** 2 / (n2 - 1)));
            const p = tToP(t, df);
            return { result: JSON.stringify({ test: 'two_sample_t_test', tStatistic: rnd(t), df, pValue: rnd(p), alpha, significant: p < alpha, mean1: rnd(m1), mean2: rnd(m2), difference: rnd(m1 - m2) }), sideEffects: null };
        }
        const mu = input.mu || 0, se = s1 / Math.sqrt(n1), t = se ? (m1 - mu) / se : 0, df = n1 - 1, p = tToP(t, df);
        return { result: JSON.stringify({ test: 'one_sample_t_test', tStatistic: rnd(t), df, pValue: rnd(p), alpha, significant: p < alpha, sampleMean: rnd(m1), hypothesizedMean: mu }), sideEffects: null };
    }

    if (action === 'chi_square') {
        const { observed = [], expected = [] } = input;
        if (!observed.length) return { result: JSON.stringify({ error: 'observed array required' }), sideEffects: null };
        const exp = expected.length ? expected : observed.map(() => avg(observed));
        let chiSq = 0;
        for (let i = 0; i < observed.length; i++) chiSq += exp[i] ? (observed[i] - exp[i]) ** 2 / exp[i] : 0;
        const df = observed.length - 1, p = zToP(Math.sqrt(chiSq));
        return { result: JSON.stringify({ test: 'chi_square', chiSquare: rnd(chiSq), df, pValue: rnd(p), alpha, significant: p < alpha, observed, expected: exp.map(e => Math.round(e * 100) / 100) }), sideEffects: null };
    }

    if (action === 'anova') {
        const { groups = [] } = input;
        if (groups.length < 2) return { result: JSON.stringify({ error: 'At least 2 groups required' }), sideEffects: null };
        const gm = avg(groups.flat()), k = groups.length, N = groups.reduce((s, g) => s + g.length, 0);
        const ssB = groups.reduce((s, g) => s + g.length * (avg(g) - gm) ** 2, 0);
        const ssW = groups.reduce((s, g) => s + g.reduce((ss, v) => ss + (v - avg(g)) ** 2, 0), 0);
        const dfB = k - 1, dfW = N - k, F = ssW ? (ssB / dfB) / (ssW / dfW) : 0, p = zToP(Math.sqrt(F));
        return { result: JSON.stringify({ test: 'one_way_anova', fStatistic: rnd(F), dfBetween: dfB, dfWithin: dfW, pValue: rnd(p), alpha, significant: p < alpha, groupMeans: groups.map((g, i) => ({ group: i, mean: rnd(avg(g)), n: g.length })), grandMean: rnd(gm) }), sideEffects: null };
    }

    if (action === 'z_test') {
        if (sample1.length < 2) return { result: JSON.stringify({ error: 'sample1 required' }), sideEffects: null };
        const m = avg(sample1), s = sd(sample1), n = sample1.length, mu = input.mu || 0;
        const z = (m - mu) / (s / Math.sqrt(n)), p = zToP(Math.abs(z));
        return { result: JSON.stringify({ test: 'z_test', zStatistic: rnd(z), pValue: rnd(p), alpha, significant: p < alpha, sampleMean: rnd(m), hypothesizedMean: mu, n }), sideEffects: null };
    }

    if (action === 'ks_test') {
        if (sample1.length < 2 || sample2.length < 2) return { result: JSON.stringify({ error: 'Two samples required' }), sideEffects: null };
        const s1 = [...sample1].sort((a, b) => a - b), s2 = [...sample2].sort((a, b) => a - b);
        const all = [...new Set([...s1, ...s2])].sort((a, b) => a - b);
        let maxD = 0;
        all.forEach(v => { maxD = Math.max(maxD, Math.abs(s1.filter(x => x <= v).length / s1.length - s2.filter(x => x <= v).length / s2.length)); });
        const p = zToP(maxD * Math.sqrt(s1.length * s2.length / (s1.length + s2.length)));
        return { result: JSON.stringify({ test: 'kolmogorov_smirnov', dStatistic: rnd(maxD), pValue: rnd(p), alpha, significant: p < alpha, n1: s1.length, n2: s2.length }), sideEffects: null };
    }

    if (action === 'mann_whitney') {
        if (sample1.length < 2 || sample2.length < 2) return { result: JSON.stringify({ error: 'Two samples required' }), sideEffects: null };
        const combined = [...sample1.map(v => ({ v, g: 1 })), ...sample2.map(v => ({ v, g: 2 }))].sort((a, b) => a.v - b.v);
        combined.forEach((c, i) => c.rank = i + 1);
        const R1 = combined.filter(c => c.g === 1).reduce((s, c) => s + c.rank, 0);
        const n1 = sample1.length, n2 = sample2.length;
        const U1 = R1 - n1 * (n1 + 1) / 2, U2 = n1 * n2 - U1, U = Math.min(U1, U2);
        const muU = n1 * n2 / 2, sigU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
        const z = sigU ? (U - muU) / sigU : 0, p = zToP(Math.abs(z));
        return { result: JSON.stringify({ test: 'mann_whitney_u', uStatistic: Math.round(U), zStatistic: rnd(z), pValue: rnd(p), alpha, significant: p < alpha, n1, n2, rankSum1: R1 }), sideEffects: null };
    }

    if (action === 'summary') {
        if (!sample1.length) return { result: JSON.stringify({ error: 'sample1 required' }), sideEffects: null };
        const sorted = [...sample1].sort((a, b) => a - b);
        const m = avg(sample1), s = sd(sample1), n = sample1.length;
        const q1 = sorted[Math.floor(n * 0.25)], q3 = sorted[Math.floor(n * 0.75)];
        const skew = s ? (n / ((n - 1) * (n - 2))) * sample1.reduce((ss, v) => ss + ((v - m) / s) ** 3, 0) : 0;
        const kurt = s ? sample1.reduce((ss, v) => ss + ((v - m) / s) ** 4, 0) / n - 3 : 0;
        return { result: JSON.stringify({ n, mean: rnd(m), stddev: rnd(s), variance: rnd(vari(sample1)), min: sorted[0], max: sorted[n - 1], median: sorted[Math.floor(n / 2)], q1, q3, iqr: q3 - q1, skewness: rnd(skew), kurtosis: rnd(kurt), normalityHint: Math.abs(skew) < 0.5 && Math.abs(kurt) < 1 ? 'approximately normal' : 'non-normal distribution' }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 8. outlier_detect ──────────────────────────────────────────
function executeOutlierDetect(input, ctx) {
    const { action, data = [], column, values = [], threshold = 1.5 } = input;
    const getVals = () => {
        if (values.length) return values.map(Number).filter(n => !isNaN(n));
        if (data.length && column) return data.map(r => Number(r[column])).filter(n => !isNaN(n));
        return [];
    };
    const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
    const sd = (a) => { const m = avg(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
    const madVal = (a) => { const md = med(a); return med(a.map(v => Math.abs(v - md))); };
    const rnd = (v) => Math.round(v * 10000) / 10000;

    if (action === 'detect' || action === 'iqr') {
        const v = getVals(); if (v.length < 4) return { result: JSON.stringify({ error: 'Need at least 4 values' }), sideEffects: null };
        const sorted = [...v].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(v.length * 0.25)], q3 = sorted[Math.floor(v.length * 0.75)], iqr = q3 - q1;
        const lo = q1 - threshold * iqr, hi = q3 + threshold * iqr;
        const out = v.filter(x => x < lo || x > hi).map(x => ({ value: x, type: x < lo ? 'low' : 'high' }));
        return { result: JSON.stringify({ method: 'iqr', threshold, q1, q3, iqr, lowerBound: rnd(lo), upperBound: rnd(hi), totalValues: v.length, outlierCount: out.length, outlierPercent: rnd(out.length / v.length * 100), outliers: out }), sideEffects: null };
    }

    if (action === 'zscore') {
        const v = getVals(); if (v.length < 3) return { result: JSON.stringify({ error: 'Need at least 3 values' }), sideEffects: null };
        const m = avg(v), s = sd(v), zT = input.zThreshold || 3;
        const scored = v.map(x => ({ value: x, zscore: rnd((x - m) / (s || 1)) }));
        const out = scored.filter(x => Math.abs(x.zscore) > zT);
        return { result: JSON.stringify({ method: 'zscore', zThreshold: zT, mean: rnd(m), std: rnd(s), totalValues: v.length, outlierCount: out.length, outliers: out }), sideEffects: null };
    }

    if (action === 'modified_zscore') {
        const v = getVals(); if (v.length < 3) return { result: JSON.stringify({ error: 'Need at least 3 values' }), sideEffects: null };
        const md = med(v), m = madVal(v), zT = input.zThreshold || 3.5;
        const scored = v.map(x => ({ value: x, modifiedZscore: rnd(0.6745 * (x - md) / (m || 1)) }));
        const out = scored.filter(x => Math.abs(x.modifiedZscore) > zT);
        return { result: JSON.stringify({ method: 'modified_zscore', threshold: zT, median: md, mad: m, totalValues: v.length, outlierCount: out.length, outliers: out }), sideEffects: null };
    }

    if (action === 'isolation') {
        const v = getVals(); if (v.length < 10) return { result: JSON.stringify({ error: 'Need at least 10 values' }), sideEffects: null };
        const m = avg(v), s = sd(v), aT = input.anomalyThreshold || 0.7;
        const scored = v.map(x => ({ value: x, anomalyScore: rnd(1 - Math.exp(-Math.abs(x - m) / (s || 1) / 2)) }));
        const out = scored.filter(x => x.anomalyScore > aT).sort((a, b) => b.anomalyScore - a.anomalyScore);
        return { result: JSON.stringify({ method: 'isolation_forest_approx', anomalyThreshold: aT, totalValues: v.length, outlierCount: out.length, outliers: out }), sideEffects: null };
    }

    if (action === 'grubbs') {
        const v = getVals(); if (v.length < 3) return { result: JSON.stringify({ error: 'Need at least 3 values' }), sideEffects: null };
        const m = avg(v), s = sd(v), n = v.length;
        const maxDev = Math.max(...v.map(x => Math.abs(x - m))), G = maxDev / (s || 1);
        const tCrit = 2.0, Gc = ((n - 1) / Math.sqrt(n)) * Math.sqrt(tCrit ** 2 / (n - 2 + tCrit ** 2));
        return { result: JSON.stringify({ method: 'grubbs', G: rnd(G), Gcritical: rnd(Gc), isOutlier: G > Gc, outlierValue: v.find(x => Math.abs(x - m) === maxDev), n, mean: rnd(m), std: rnd(s) }), sideEffects: null };
    }

    if (action === 'compare_methods') {
        const v = getVals(); if (v.length < 10) return { result: JSON.stringify({ error: 'Need at least 10 values' }), sideEffects: null };
        const m = avg(v), s = sd(v), md = med(v), ma = madVal(v);
        const sorted = [...v].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(v.length * 0.25)], q3 = sorted[Math.floor(v.length * 0.75)], iqr = q3 - q1;
        const iqrN = v.filter(x => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr).length;
        const zN = v.filter(x => Math.abs((x - m) / (s || 1)) > 3).length;
        const mzN = v.filter(x => Math.abs(0.6745 * (x - md) / (ma || 1)) > 3.5).length;
        return { result: JSON.stringify({ totalValues: v.length, methods: [{ name: 'IQR (1.5×)', outliers: iqrN, percent: rnd(iqrN / v.length * 100) }, { name: 'Z-Score (3σ)', outliers: zN, percent: rnd(zN / v.length * 100) }, { name: 'Modified Z-Score (MAD)', outliers: mzN, percent: rnd(mzN / v.length * 100) }], recommendation: mzN <= zN ? 'Modified Z-Score is most robust to non-normal distributions' : 'Standard Z-Score works well for normally distributed data' }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 9. time_series ─────────────────────────────────────────────
function executeTimeSeries(input, ctx) {
    const { action, data = [], valueColumn = 'value', period } = input;
    const getSeries = () => {
        if (data.length && typeof data[0] === 'object') return data.map(r => Number(r[valueColumn])).filter(n => !isNaN(n));
        if (data.length && typeof data[0] === 'number') return data;
        return [];
    };
    const avg = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
    const rnd = (v) => Math.round(v * 10000) / 10000;

    if (action === 'decompose') {
        const vals = getSeries(), p = period || Math.min(Math.max(Math.round(vals.length / 4), 2), 12);
        if (vals.length < p * 2) return { result: JSON.stringify({ error: `Need at least ${p * 2} values for period ${p}` }), sideEffects: null };
        const trend = vals.map((_, i) => rnd(avg(vals.slice(Math.max(0, i - Math.floor(p / 2)), Math.min(vals.length, i + Math.ceil(p / 2))))));
        const sp = {}; vals.forEach((v, i) => { const pos = i % p; if (!sp[pos]) sp[pos] = []; sp[pos].push(v - trend[i]); });
        const seasonal = vals.map((_, i) => rnd(avg(sp[i % p])));
        const residual = vals.map((v, i) => rnd(v - trend[i] - seasonal[i]));
        return { result: JSON.stringify({ period: p, length: vals.length, components: { trend: trend.slice(0, 20), seasonal: seasonal.slice(0, 20), residual: residual.slice(0, 20) }, trendDirection: trend[trend.length - 1] > trend[0] ? 'upward' : 'downward', seasonalStrength: rnd(Math.max(...seasonal.map(Math.abs))) }), sideEffects: null };
    }

    if (action === 'forecast') {
        const vals = getSeries(), horizon = input.horizon || 10;
        if (vals.length < 5) return { result: JSON.stringify({ error: 'Need at least 5 values' }), sideEffects: null };
        const alpha = input.alpha || 0.3, beta = input.beta || 0.1;
        let level = vals[0], tr = vals[1] - vals[0];
        for (let i = 1; i < vals.length; i++) { const pL = level; level = alpha * vals[i] + (1 - alpha) * (level + tr); tr = beta * (level - pL) + (1 - beta) * tr; }
        const fc = []; for (let h = 1; h <= horizon; h++) fc.push({ step: h, value: rnd(level + h * tr), lower: rnd(level + h * tr - 1.96 * Math.sqrt(h) * Math.abs(tr) * 3), upper: rnd(level + h * tr + 1.96 * Math.sqrt(h) * Math.abs(tr) * 3) });
        return { result: JSON.stringify({ method: 'double_exponential_smoothing', alpha, beta, horizon, lastValue: vals[vals.length - 1], forecast: fc, trendDirection: tr > 0 ? 'upward' : 'downward', trendStrength: rnd(Math.abs(tr)) }), sideEffects: null };
    }

    if (action === 'anomaly') {
        const vals = getSeries(); if (vals.length < 10) return { result: JSON.stringify({ error: 'Need at least 10 values' }), sideEffects: null };
        const win = input.window || 5, sens = input.sensitivity || 2, anomalies = [];
        for (let i = win; i < vals.length; i++) {
            const w = vals.slice(i - win, i), m = avg(w);
            const s = Math.sqrt(w.reduce((ss, v) => ss + (v - m) ** 2, 0) / w.length) || 1;
            const z = (vals[i] - m) / s;
            if (Math.abs(z) > sens) anomalies.push({ index: i, value: vals[i], expected: rnd(m), zscore: rnd(z), type: z > 0 ? 'spike' : 'dip' });
        }
        return { result: JSON.stringify({ method: 'rolling_zscore', window: win, sensitivity: sens, totalPoints: vals.length, anomalyCount: anomalies.length, anomalyRate: rnd(anomalies.length / vals.length * 100), anomalies }), sideEffects: null };
    }

    if (action === 'rolling_stats') {
        const vals = getSeries(), win = input.window || 7;
        if (vals.length < win) return { result: JSON.stringify({ error: `Need at least ${win} values` }), sideEffects: null };
        const stats = [];
        for (let i = win - 1; i < vals.length; i++) {
            const w = vals.slice(i - win + 1, i + 1), m = avg(w);
            stats.push({ index: i, mean: rnd(m), std: rnd(Math.sqrt(w.reduce((ss, v) => ss + (v - m) ** 2, 0) / w.length)), min: Math.min(...w), max: Math.max(...w) });
        }
        return { result: JSON.stringify({ window: win, totalPoints: vals.length, statsPoints: stats.length, stats: stats.slice(-20), volatility: rnd(avg(stats.map(s => s.std))) }), sideEffects: null };
    }

    if (action === 'autocorrelation') {
        const vals = getSeries(), maxLag = input.maxLag || Math.min(20, Math.floor(vals.length / 3));
        if (vals.length < 10) return { result: JSON.stringify({ error: 'Need at least 10 values' }), sideEffects: null };
        const m = avg(vals), c0 = vals.reduce((s, v) => s + (v - m) ** 2, 0);
        const acf = [];
        for (let lag = 1; lag <= maxLag; lag++) { let num = 0; for (let i = lag; i < vals.length; i++) num += (vals[i] - m) * (vals[i - lag] - m); acf.push({ lag, acf: c0 ? rnd(num / c0) : 0 }); }
        const sig = acf.filter(a => Math.abs(a.acf) > 1.96 / Math.sqrt(vals.length));
        return { result: JSON.stringify({ maxLag, totalPoints: vals.length, acf, significantLags: sig.map(a => a.lag), dominantPeriod: sig.length ? sig[0].lag : null }), sideEffects: null };
    }

    if (action === 'change_points') {
        const vals = getSeries(); if (vals.length < 10) return { result: JSON.stringify({ error: 'Need at least 10 values' }), sideEffects: null };
        const minSeg = input.minSegment || 5, raw = [];
        for (let i = minSeg; i < vals.length - minSeg; i++) {
            const L = vals.slice(i - minSeg, i), R = vals.slice(i, i + minSeg);
            const lm = avg(L), rm = avg(R), diff = Math.abs(rm - lm);
            const ps = Math.sqrt((L.reduce((s, v) => s + (v - lm) ** 2, 0) + R.reduce((s, v) => s + (v - rm) ** 2, 0)) / (2 * minSeg - 2)) || 1;
            const str = diff / ps;
            if (str > 2) raw.push({ index: i, value: vals[i], leftMean: rnd(lm), rightMean: rnd(rm), change: rnd(rm - lm), strength: rnd(str), direction: rm > lm ? 'increase' : 'decrease' });
        }
        raw.sort((a, b) => b.strength - a.strength);
        const filtered = []; raw.forEach(cp => { if (!filtered.some(f => Math.abs(f.index - cp.index) < minSeg)) filtered.push(cp); });
        filtered.sort((a, b) => a.index - b.index);
        return { result: JSON.stringify({ method: 'mean_shift', minSegment: minSeg, totalPoints: vals.length, changePointCount: filtered.length, changePoints: filtered }), sideEffects: null };
    }

    if (action === 'summary') {
        const vals = getSeries(); if (vals.length < 3) return { result: JSON.stringify({ error: 'Need at least 3 values' }), sideEffects: null };
        const m = avg(vals), diffs = vals.slice(1).map((v, i) => v - vals[i]);
        const slope = avg(diffs), vol = Math.sqrt(diffs.reduce((s, d) => s + (d - avg(diffs)) ** 2, 0) / diffs.length);
        return { result: JSON.stringify({ length: vals.length, mean: rnd(m), min: Math.min(...vals), max: Math.max(...vals), range: rnd(Math.max(...vals) - Math.min(...vals)), first: vals[0], last: vals[vals.length - 1], trendSlope: rnd(slope), trendDirection: slope > 0.01 ? 'upward' : slope < -0.01 ? 'downward' : 'flat', volatility: rnd(vol), percentChange: rnd((vals[vals.length - 1] - vals[0]) / (Math.abs(vals[0]) || 1) * 100) }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

// ── 10. data_sample ────────────────────────────────────────────
function executeDataSample(input, ctx) {
    const { action, data = [], n, fraction = 0.1, column, seed } = input;
    const rng = (() => { let s = seed || Date.now(); return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; }; })();
    const sz = n || Math.max(1, Math.round(data.length * fraction));
    const rnd = (v) => Math.round(v * 10000) / 10000;

    if (action === 'random') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const shuffled = [...data].sort(() => rng() - 0.5), sample = shuffled.slice(0, Math.min(sz, data.length));
        return { result: JSON.stringify({ method: 'random', originalSize: data.length, sampleSize: sample.length, fraction: rnd(sample.length / data.length), sample }), sideEffects: null };
    }

    if (action === 'stratified') {
        if (!column) return { result: JSON.stringify({ error: 'column required for stratified sampling' }), sideEffects: null };
        const groups = {}; data.forEach(r => { const k = String(r[column] || 'null'); if (!groups[k]) groups[k] = []; groups[k].push(r); });
        const sample = [];
        Object.entries(groups).forEach(([, rows]) => { const gN = Math.max(1, Math.round(sz * (rows.length / data.length))); const sh = [...rows].sort(() => rng() - 0.5); sample.push(...sh.slice(0, gN)); });
        return { result: JSON.stringify({ method: 'stratified', column, originalSize: data.length, sampleSize: sample.length, strata: Object.entries(groups).map(([k, v]) => ({ value: k, count: v.length, sampled: sample.filter(s => String(s[column]) === k).length })), sample }), sideEffects: null };
    }

    if (action === 'systematic') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const interval = Math.max(1, Math.floor(data.length / sz)), start = Math.floor(rng() * interval), sample = [];
        for (let i = start; i < data.length && sample.length < sz; i += interval) sample.push(data[i]);
        return { result: JSON.stringify({ method: 'systematic', originalSize: data.length, sampleSize: sample.length, interval, startIndex: start, sample }), sideEffects: null };
    }

    if (action === 'reservoir') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const k = Math.min(sz, data.length), res = data.slice(0, k);
        for (let i = k; i < data.length; i++) { const j = Math.floor(rng() * (i + 1)); if (j < k) res[j] = data[i]; }
        return { result: JSON.stringify({ method: 'reservoir', originalSize: data.length, sampleSize: res.length, description: 'Vitter reservoir sampling — ideal for streaming/unknown-size data', sample: res }), sideEffects: null };
    }

    if (action === 'bootstrap') {
        if (!data.length) return { result: JSON.stringify({ error: 'data array required' }), sideEffects: null };
        const nB = input.nBootstrap || 5, bsz = sz || data.length, bootstraps = [];
        for (let b = 0; b < nB; b++) { const s = []; for (let i = 0; i < bsz; i++) s.push(data[Math.floor(rng() * data.length)]); bootstraps.push(s); }
        return { result: JSON.stringify({ method: 'bootstrap', originalSize: data.length, nBootstrapSamples: nB, sampleSizeEach: bsz, withReplacement: true, bootstraps }), sideEffects: null };
    }

    if (action === 'oversample') {
        if (!column) return { result: JSON.stringify({ error: 'column required to identify minority class' }), sideEffects: null };
        const groups = {}; data.forEach(r => { const k = String(r[column] || 'null'); if (!groups[k]) groups[k] = []; groups[k].push(r); });
        const maxSz = Math.max(...Object.values(groups).map(g => g.length)), over = [];
        Object.entries(groups).forEach(([key, rows]) => { over.push(...rows); while (over.filter(r => String(r[column]) === key).length < maxSz) over.push(rows[Math.floor(rng() * rows.length)]); });
        return { result: JSON.stringify({ method: 'random_oversample', column, originalSize: data.length, oversampledSize: over.length, targetSize: maxSz, classCounts: Object.entries(groups).map(([k, v]) => ({ class: k, original: v.length, oversampled: maxSz })), sample: over.slice(0, 100) }), sideEffects: null };
    }

    if (action === 'undersample') {
        if (!column) return { result: JSON.stringify({ error: 'column required to identify majority class' }), sideEffects: null };
        const groups = {}; data.forEach(r => { const k = String(r[column] || 'null'); if (!groups[k]) groups[k] = []; groups[k].push(r); });
        const minSz = Math.min(...Object.values(groups).map(g => g.length)), under = [];
        Object.entries(groups).forEach(([, rows]) => { const sh = [...rows].sort(() => rng() - 0.5); under.push(...sh.slice(0, minSz)); });
        return { result: JSON.stringify({ method: 'random_undersample', column, originalSize: data.length, undersampledSize: under.length, targetSizePerClass: minSz, classCounts: Object.entries(groups).map(([k, v]) => ({ class: k, original: v.length, undersampled: minSz })), sample: under }), sideEffects: null };
    }

    return { result: JSON.stringify({ error: `Unknown action: ${action}` }), sideEffects: null };
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════ */

const _names = new Set(DATA_SCIENCE_TOOL_DEFINITIONS.map(t => t.name));
export function isDataScienceTool(name) { return _names.has(name); }

export async function executeDataScienceTool(toolName, input, ctx) {
    switch (toolName) {
        case 'data_profile': return executeDataProfile(input, ctx);
        case 'data_clean': return executeDataClean(input, ctx);
        case 'data_visualize': return executeDataVisualize(input, ctx);
        case 'feature_engineer': return executeFeatureEngineer(input, ctx);
        case 'model_compare': return executeModelCompare(input, ctx);
        case 'correlation_matrix': return executeCorrelationMatrix(input, ctx);
        case 'hypothesis_test': return executeHypothesisTest(input, ctx);
        case 'outlier_detect': return executeOutlierDetect(input, ctx);
        case 'time_series': return executeTimeSeries(input, ctx);
        case 'data_sample': return executeDataSample(input, ctx);
        default:
            return { result: JSON.stringify({ error: `Unknown data science tool: ${toolName}` }), sideEffects: null };
    }
}
