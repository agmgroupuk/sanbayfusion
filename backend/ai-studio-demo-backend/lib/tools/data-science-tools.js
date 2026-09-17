/**
 * DATA SCIENCE & EXPERIMENTATION TOOLS (8 tools)
 * data_profile, data_clean, data_visualize, feature_engineer, model_compare,
 * data_sample, outlier_detect, data_correlate
 *
 * Statistical profiling, data cleaning pipelines, chart generation,
 * feature engineering transformations, ML model comparison,
 * sampling/splitting, outlier detection, correlation analysis.
 * ALL state persisted in PostgreSQL via Prisma — NO localStorage.
 */

import { prisma } from '../prisma.js';
import crypto from 'crypto';

// ── data_profile ────────────────────────────────────────────────
async function dataProfile(params) {
    const { action = 'analyze', userId, ...opts } = params;

    try {
        switch (action) {
            case 'analyze': {
                if (!opts.data || !Array.isArray(opts.data) || opts.data.length === 0) {
                    return { success: false, error: 'data array required (array of objects)' };
                }
                const data = opts.data;
                const sample = data.slice(0, 5);
                const columns = Object.keys(data[0]);

                const profile = {};
                for (const col of columns) {
                    const values = data.map(r => r[col]);
                    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
                    const uniqueVals = new Set(nonNull.map(String));

                    const type = inferDataType(nonNull);
                    const colProfile = {
                        type,
                        count: values.length,
                        nonNull: nonNull.length,
                        nullCount: values.length - nonNull.length,
                        nullPct: `${((values.length - nonNull.length) / values.length * 100).toFixed(1)}%`,
                        uniqueCount: uniqueVals.size,
                        uniquePct: `${(uniqueVals.size / Math.max(nonNull.length, 1) * 100).toFixed(1)}%`,
                    };

                    if (type === 'numeric') {
                        const nums = nonNull.map(Number).filter(n => !isNaN(n));
                        nums.sort((a, b) => a - b);
                        colProfile.min = nums[0];
                        colProfile.max = nums[nums.length - 1];
                        colProfile.mean = round(nums.reduce((a, b) => a + b, 0) / nums.length, 4);
                        colProfile.median = round(percentile(nums, 50), 4);
                        colProfile.stdDev = round(stdDev(nums), 4);
                        colProfile.p25 = round(percentile(nums, 25), 4);
                        colProfile.p75 = round(percentile(nums, 75), 4);
                        colProfile.iqr = round(colProfile.p75 - colProfile.p25, 4);
                        colProfile.skewness = round(skewness(nums), 4);
                        colProfile.kurtosis = round(kurtosis(nums), 4);
                        colProfile.outliers = nums.filter(n => n < colProfile.p25 - 1.5 * colProfile.iqr || n > colProfile.p75 + 1.5 * colProfile.iqr).length;
                    } else if (type === 'categorical') {
                        const freq = {};
                        for (const v of nonNull) { freq[String(v)] = (freq[String(v)] || 0) + 1; }
                        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
                        colProfile.topValues = sorted.slice(0, 10).map(([val, cnt]) => ({ value: val, count: cnt, pct: `${(cnt / nonNull.length * 100).toFixed(1)}%` }));
                        colProfile.entropy = round(entropy(Object.values(freq), nonNull.length), 4);
                    } else if (type === 'datetime') {
                        const dates = nonNull.map(v => new Date(v)).filter(d => !isNaN(d));
                        if (dates.length > 0) {
                            dates.sort((a, b) => a - b);
                            colProfile.earliest = dates[0].toISOString();
                            colProfile.latest = dates[dates.length - 1].toISOString();
                            colProfile.range = `${Math.round((dates[dates.length - 1] - dates[0]) / 86400000)} days`;
                        }
                    }
                    profile[col] = colProfile;
                }

                // Dataset-level stats
                const correlations = computeCorrelations(data, columns);

                // Persist profile
                await prisma.toolExecution.create({
                    data: {
                        toolName: 'data_profile',
                        category: 'data-science',
                        action,
                        userId: userId || 'system',
                        params: { action, rowCount: data.length, columns },
                        result: { profile: 'stored', columns: columns.length },
                        success: true,
                        durationMs: 0,
                    },
                });

                return {
                    success: true,
                    rows: data.length,
                    columns: columns.length,
                    sample,
                    profile,
                    correlations: correlations.length > 0 ? correlations : undefined,
                    qualityScore: computeQualityScore(profile),
                };
            }

            case 'summary': {
                if (!opts.data || !Array.isArray(opts.data)) return { success: false, error: 'data array required' };
                const data = opts.data;
                const cols = Object.keys(data[0]);
                const numericCols = cols.filter(c => data.every(r => typeof r[c] === 'number' || (typeof r[c] === 'string' && !isNaN(Number(r[c])))));

                return {
                    success: true,
                    rows: data.length,
                    columns: cols.length,
                    numericColumns: numericCols,
                    categoricalColumns: cols.filter(c => !numericCols.includes(c)),
                    memoryEstimate: `${(JSON.stringify(data).length / 1024).toFixed(1)} KB`,
                    sample: data.slice(0, 3),
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use analyze, summary.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── data_clean ──────────────────────────────────────────────────
async function dataClean(params) {
    const { action = 'auto', ...opts } = params;

    try {
        if (!opts.data || !Array.isArray(opts.data) || opts.data.length === 0) {
            return { success: false, error: 'data array required' };
        }
        let data = JSON.parse(JSON.stringify(opts.data)); // deep clone
        const log = [];

        switch (action) {
            case 'auto': {
                // 1. Remove exact duplicates
                const beforeDup = data.length;
                const seen = new Set();
                data = data.filter(row => {
                    const key = JSON.stringify(row);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                if (data.length < beforeDup) log.push(`Removed ${beforeDup - data.length} duplicate rows`);

                // 2. Handle nulls/empty strings
                const columns = Object.keys(data[0]);
                for (const col of columns) {
                    const nonNull = data.filter(r => r[col] !== null && r[col] !== undefined && r[col] !== '');
                    const nullPct = (data.length - nonNull.length) / data.length;

                    if (nullPct > 0.5) {
                        // Drop column if >50% null
                        data.forEach(r => delete r[col]);
                        log.push(`Dropped column '${col}' (${(nullPct * 100).toFixed(0)}% null)`);
                    } else if (nullPct > 0 && inferDataType(nonNull.map(r => r[col])) === 'numeric') {
                        // Fill numeric with median
                        const vals = nonNull.map(r => Number(r[col])).filter(n => !isNaN(n));
                        vals.sort((a, b) => a - b);
                        const med = percentile(vals, 50);
                        let filled = 0;
                        data.forEach(r => {
                            if (r[col] === null || r[col] === undefined || r[col] === '') {
                                r[col] = med;
                                filled++;
                            }
                        });
                        if (filled > 0) log.push(`Filled ${filled} nulls in '${col}' with median (${med})`);
                    } else if (nullPct > 0) {
                        // Fill categorical with mode
                        const freq = {};
                        nonNull.forEach(r => { freq[String(r[col])] = (freq[String(r[col])] || 0) + 1; });
                        const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
                        let filled = 0;
                        data.forEach(r => {
                            if (r[col] === null || r[col] === undefined || r[col] === '') {
                                r[col] = mode;
                                filled++;
                            }
                        });
                        if (filled > 0) log.push(`Filled ${filled} nulls in '${col}' with mode ('${mode}')`);
                    }
                }

                // 3. Trim strings
                data.forEach(row => {
                    for (const key of Object.keys(row)) {
                        if (typeof row[key] === 'string') row[key] = row[key].trim();
                    }
                });
                log.push('Trimmed whitespace from string values');

                // 4. Remove outliers if requested
                if (opts.removeOutliers) {
                    const beforeOutlier = data.length;
                    const numCols = Object.keys(data[0]).filter(c => data.every(r => typeof r[c] === 'number'));
                    for (const col of numCols) {
                        const vals = data.map(r => r[col]).sort((a, b) => a - b);
                        const q1 = percentile(vals, 25);
                        const q3 = percentile(vals, 75);
                        const iqr = q3 - q1;
                        data = data.filter(r => r[col] >= q1 - 1.5 * iqr && r[col] <= q3 + 1.5 * iqr);
                    }
                    if (data.length < beforeOutlier) log.push(`Removed ${beforeOutlier - data.length} outlier rows`);
                }

                return { success: true, data, rowsBefore: opts.data.length, rowsAfter: data.length, operations: log };
            }

            case 'deduplicate': {
                const before = data.length;
                const keyCol = opts.key;
                if (keyCol) {
                    const seen = new Set();
                    data = data.filter(row => {
                        const key = String(row[keyCol]);
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                } else {
                    const seen = new Set();
                    data = data.filter(row => {
                        const key = JSON.stringify(row);
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                }
                return { success: true, data, removed: before - data.length };
            }

            case 'fill': {
                if (!opts.column) return { success: false, error: 'column required' };
                const strategy = opts.strategy || 'median';
                const col = opts.column;
                let filled = 0;

                if (strategy === 'median' || strategy === 'mean') {
                    const vals = data.map(r => Number(r[col])).filter(n => !isNaN(n));
                    vals.sort((a, b) => a - b);
                    const fillVal = strategy === 'median' ? percentile(vals, 50) : vals.reduce((a, b) => a + b, 0) / vals.length;
                    data.forEach(r => {
                        if (r[col] === null || r[col] === undefined || r[col] === '') { r[col] = round(fillVal, 4); filled++; }
                    });
                } else if (strategy === 'mode') {
                    const freq = {};
                    data.forEach(r => { if (r[col] != null && r[col] !== '') freq[String(r[col])] = (freq[String(r[col])] || 0) + 1; });
                    const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
                    data.forEach(r => {
                        if (r[col] === null || r[col] === undefined || r[col] === '') { r[col] = mode; filled++; }
                    });
                } else if (strategy === 'value') {
                    const val = opts.value;
                    data.forEach(r => {
                        if (r[col] === null || r[col] === undefined || r[col] === '') { r[col] = val; filled++; }
                    });
                }

                return { success: true, data, filled, strategy };
            }

            case 'normalize': {
                if (!opts.columns || !Array.isArray(opts.columns)) return { success: false, error: 'columns array required' };
                const method = opts.method || 'minmax';
                const normalized = {};

                for (const col of opts.columns) {
                    const vals = data.map(r => Number(r[col])).filter(n => !isNaN(n));
                    if (method === 'minmax') {
                        const min = Math.min(...vals);
                        const max = Math.max(...vals);
                        const range = max - min || 1;
                        data.forEach(r => { if (typeof r[col] === 'number' || !isNaN(Number(r[col]))) r[col] = round((Number(r[col]) - min) / range, 6); });
                        normalized[col] = { method: 'min-max', min, max };
                    } else if (method === 'zscore') {
                        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                        const std = stdDev(vals);
                        data.forEach(r => { if (typeof r[col] === 'number' || !isNaN(Number(r[col]))) r[col] = round((Number(r[col]) - mean) / (std || 1), 6); });
                        normalized[col] = { method: 'z-score', mean: round(mean, 4), std: round(std, 4) };
                    }
                }

                return { success: true, data, normalized };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use auto, deduplicate, fill, normalize.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── data_visualize ──────────────────────────────────────────────
async function dataVisualize(params) {
    const { action = 'chart', ...opts } = params;

    try {
        switch (action) {
            case 'chart': {
                if (!opts.data || !Array.isArray(opts.data)) return { success: false, error: 'data array required' };
                const chartType = opts.type || 'bar';
                const data = opts.data;

                switch (chartType) {
                    case 'bar': {
                        const xCol = opts.x || Object.keys(data[0])[0];
                        const yCol = opts.y || Object.keys(data[0])[1];
                        const maxVal = Math.max(...data.map(r => Number(r[yCol]) || 0));

                        let chart = `## ${opts.title || `${yCol} by ${xCol}`}\n\n`;
                        chart += '```\n';
                        for (const row of data.slice(0, 30)) {
                            const val = Number(row[yCol]) || 0;
                            const barLen = Math.round(val / maxVal * 40);
                            const label = String(row[xCol]).padEnd(20).slice(0, 20);
                            chart += `${label} ${'█'.repeat(barLen)} ${val}\n`;
                        }
                        chart += '```\n';
                        return { success: true, chart, type: 'bar', rows: data.length };
                    }

                    case 'histogram': {
                        const col = opts.column || Object.keys(data[0])[0];
                        const vals = data.map(r => Number(r[col])).filter(n => !isNaN(n)).sort((a, b) => a - b);
                        const bins = opts.bins || 10;
                        const min = vals[0];
                        const max = vals[vals.length - 1];
                        const binWidth = (max - min) / bins;

                        const buckets = Array(bins).fill(0);
                        for (const v of vals) {
                            const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
                            buckets[idx]++;
                        }
                        const maxBucket = Math.max(...buckets);

                        let chart = `## Histogram: ${col}\n\n`;
                        chart += '```\n';
                        for (let i = 0; i < bins; i++) {
                            const lo = round(min + i * binWidth, 2);
                            const hi = round(min + (i + 1) * binWidth, 2);
                            const label = `[${lo}-${hi})`.padEnd(18).slice(0, 18);
                            const barLen = Math.round(buckets[i] / maxBucket * 35);
                            chart += `${label} ${'█'.repeat(barLen)} ${buckets[i]}\n`;
                        }
                        chart += '```\n';
                        return { success: true, chart, type: 'histogram', bins, min, max };
                    }

                    case 'scatter': {
                        const xCol = opts.x || Object.keys(data[0])[0];
                        const yCol = opts.y || Object.keys(data[0])[1];
                        const vals = data.map(r => ({ x: Number(r[xCol]), y: Number(r[yCol]) })).filter(v => !isNaN(v.x) && !isNaN(v.y));

                        const xMin = Math.min(...vals.map(v => v.x));
                        const xMax = Math.max(...vals.map(v => v.x));
                        const yMin = Math.min(...vals.map(v => v.y));
                        const yMax = Math.max(...vals.map(v => v.y));

                        const gridH = 20, gridW = 50;
                        const grid = Array.from({ length: gridH }, () => Array(gridW).fill(' '));

                        for (const v of vals) {
                            const gx = Math.min(Math.floor((v.x - xMin) / ((xMax - xMin) || 1) * (gridW - 1)), gridW - 1);
                            const gy = Math.min(Math.floor((1 - (v.y - yMin) / ((yMax - yMin) || 1)) * (gridH - 1)), gridH - 1);
                            grid[gy][gx] = '●';
                        }

                        let chart = `## Scatter: ${yCol} vs ${xCol}\n\n`;
                        chart += '```\n';
                        chart += `${round(yMax, 1)} ┤\n`;
                        for (const row of grid) chart += `     │${row.join('')}\n`;
                        chart += `${round(yMin, 1)} ┤${'─'.repeat(gridW)}\n`;
                        chart += `     ${String(round(xMin, 1)).padEnd(Math.floor(gridW / 2))}${round(xMax, 1)}\n`;
                        chart += '```\n';

                        // Compute correlation
                        const corr = pearsonCorrelation(vals.map(v => v.x), vals.map(v => v.y));
                        return { success: true, chart, type: 'scatter', correlation: round(corr, 4), points: vals.length };
                    }

                    case 'heatmap': {
                        if (!opts.matrix) return { success: false, error: 'matrix (2D array) required for heatmap' };
                        const labels = opts.labels || opts.matrix.map((_, i) => `R${i}`);
                        const colLabels = opts.colLabels || opts.matrix[0].map((_, i) => `C${i}`);

                        let chart = `## ${opts.title || 'Heatmap'}\n\n`;
                        chart += '```\n';
                        chart += '     ' + colLabels.map(l => l.slice(0, 6).padStart(7)).join('') + '\n';
                        const blocks = [' ', '░', '▒', '▓', '█'];
                        for (let i = 0; i < opts.matrix.length; i++) {
                            const label = (labels[i] || '').slice(0, 4).padEnd(5);
                            const cells = opts.matrix[i].map(v => {
                                const idx = Math.min(Math.floor(Math.abs(v) * 4), 4);
                                return blocks[idx].repeat(7);
                            }).join('');
                            chart += `${label}${cells}\n`;
                        }
                        chart += '```\n';
                        return { success: true, chart, type: 'heatmap' };
                    }

                    case 'line': {
                        const xCol = opts.x || Object.keys(data[0])[0];
                        const yCol = opts.y || Object.keys(data[0])[1];
                        const vals = data.map(r => ({ x: r[xCol], y: Number(r[yCol]) })).filter(v => !isNaN(v.y));
                        const maxVal = Math.max(...vals.map(v => v.y));
                        const minVal = Math.min(...vals.map(v => v.y));

                        let chart = `## ${opts.title || `${yCol} over ${xCol}`}\n\n`;
                        chart += '```\n';
                        const height = 15;
                        const range = maxVal - minVal || 1;
                        const points = vals.slice(0, 60);
                        const grid = Array.from({ length: height }, () => Array(points.length).fill(' '));

                        for (let i = 0; i < points.length; i++) {
                            const y = Math.floor((points[i].y - minVal) / range * (height - 1));
                            grid[height - 1 - y][i] = '●';
                            // Connect with lines
                            if (i > 0) {
                                const prevY = Math.floor((points[i - 1].y - minVal) / range * (height - 1));
                                const step = prevY < y ? 1 : -1;
                                for (let j = prevY; j !== y; j += step) {
                                    grid[height - 1 - j][i] = '│';
                                }
                            }
                        }

                        chart += `${round(maxVal, 1)} ┤\n`;
                        for (const row of grid) chart += `     │${row.join('')}\n`;
                        chart += `${round(minVal, 1)} ┤${'─'.repeat(points.length)}\n`;
                        chart += '```\n';
                        return { success: true, chart, type: 'line', points: vals.length };
                    }

                    default:
                        return { success: false, error: `Unknown chart: ${chartType}. Use bar, histogram, scatter, heatmap, line.` };
                }
            }

            case 'mermaid': {
                if (!opts.data) return { success: false, error: 'data required' };
                const chartType = opts.type || 'pie';
                let mermaid = '';

                if (chartType === 'pie') {
                    const labelCol = opts.label || Object.keys(opts.data[0])[0];
                    const valueCol = opts.value || Object.keys(opts.data[0])[1];
                    mermaid = `pie title ${opts.title || 'Distribution'}\n`;
                    for (const row of opts.data.slice(0, 10)) {
                        mermaid += `    "${row[labelCol]}" : ${row[valueCol]}\n`;
                    }
                } else if (chartType === 'xy') {
                    mermaid = `xychart-beta\n    title "${opts.title || 'Chart'}"\n`;
                    const xCol = opts.x || Object.keys(opts.data[0])[0];
                    const yCol = opts.y || Object.keys(opts.data[0])[1];
                    const xVals = opts.data.map(r => `"${r[xCol]}"`).join(', ');
                    const yVals = opts.data.map(r => r[yCol]).join(', ');
                    mermaid += `    x-axis [${xVals}]\n`;
                    mermaid += `    y-axis "${yCol}"\n`;
                    mermaid += `    bar [${yVals}]\n`;
                }

                return { success: true, mermaid: '```mermaid\n' + mermaid + '```' };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use chart, mermaid.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── feature_engineer ────────────────────────────────────────────
async function featureEngineer(params) {
    const { action = 'transform', ...opts } = params;

    try {
        if (!opts.data || !Array.isArray(opts.data) || opts.data.length === 0) {
            return { success: false, error: 'data array required' };
        }
        let data = JSON.parse(JSON.stringify(opts.data));

        switch (action) {
            case 'transform': {
                const transforms = opts.transforms || [];
                const applied = [];

                for (const t of transforms) {
                    switch (t.type) {
                        case 'log': {
                            data.forEach(r => { r[`${t.column}_log`] = r[t.column] > 0 ? round(Math.log(r[t.column]), 6) : null; });
                            applied.push(`log(${t.column})`);
                            break;
                        }
                        case 'sqrt': {
                            data.forEach(r => { r[`${t.column}_sqrt`] = r[t.column] >= 0 ? round(Math.sqrt(r[t.column]), 6) : null; });
                            applied.push(`sqrt(${t.column})`);
                            break;
                        }
                        case 'square': {
                            data.forEach(r => { r[`${t.column}_sq`] = round(r[t.column] ** 2, 6); });
                            applied.push(`${t.column}^2`);
                            break;
                        }
                        case 'interaction': {
                            if (!t.columns || t.columns.length < 2) break;
                            const [c1, c2] = t.columns;
                            data.forEach(r => { r[`${c1}_x_${c2}`] = round(Number(r[c1]) * Number(r[c2]), 6); });
                            applied.push(`${c1} × ${c2}`);
                            break;
                        }
                        case 'ratio': {
                            if (!t.numerator || !t.denominator) break;
                            data.forEach(r => {
                                const d = Number(r[t.denominator]);
                                r[`${t.numerator}_per_${t.denominator}`] = d !== 0 ? round(Number(r[t.numerator]) / d, 6) : null;
                            });
                            applied.push(`${t.numerator} / ${t.denominator}`);
                            break;
                        }
                        case 'bin': {
                            const vals = data.map(r => Number(r[t.column])).filter(n => !isNaN(n)).sort((a, b) => a - b);
                            const bins = t.bins || 5;
                            const min = vals[0];
                            const binWidth = (vals[vals.length - 1] - min) / bins;
                            data.forEach(r => {
                                const v = Number(r[t.column]);
                                if (isNaN(v)) { r[`${t.column}_bin`] = null; return; }
                                const bin = Math.min(Math.floor((v - min) / binWidth), bins - 1);
                                r[`${t.column}_bin`] = `bin_${bin}`;
                            });
                            applied.push(`bin(${t.column}, ${bins})`);
                            break;
                        }
                        case 'one_hot': {
                            const uniqueVals = [...new Set(data.map(r => r[t.column]))].sort();
                            for (const val of uniqueVals.slice(0, 20)) {
                                data.forEach(r => { r[`${t.column}_${val}`] = r[t.column] === val ? 1 : 0; });
                            }
                            applied.push(`one_hot(${t.column}) → ${uniqueVals.length} columns`);
                            break;
                        }
                        case 'lag': {
                            const lag = t.lag || 1;
                            for (let i = 0; i < data.length; i++) {
                                data[i][`${t.column}_lag${lag}`] = i >= lag ? data[i - lag][t.column] : null;
                            }
                            applied.push(`lag(${t.column}, ${lag})`);
                            break;
                        }
                        case 'rolling_mean': {
                            const window = t.window || 3;
                            for (let i = 0; i < data.length; i++) {
                                if (i < window - 1) {
                                    data[i][`${t.column}_rm${window}`] = null;
                                } else {
                                    const slice = data.slice(i - window + 1, i + 1).map(r => Number(r[t.column]));
                                    data[i][`${t.column}_rm${window}`] = round(slice.reduce((a, b) => a + b, 0) / window, 6);
                                }
                            }
                            applied.push(`rolling_mean(${t.column}, ${window})`);
                            break;
                        }
                    }
                }

                return { success: true, data, applied, newColumns: Object.keys(data[0]).length - Object.keys(opts.data[0]).length };
            }

            case 'suggest': {
                const cols = Object.keys(data[0]);
                const numericCols = cols.filter(c => data.slice(0, 10).every(r => typeof r[c] === 'number' || !isNaN(Number(r[c]))));
                const catCols = cols.filter(c => !numericCols.includes(c));

                const suggestions = [];
                for (const c of numericCols) {
                    const vals = data.map(r => Number(r[c])).filter(n => !isNaN(n));
                    const skew = skewness(vals);
                    if (Math.abs(skew) > 1) suggestions.push({ column: c, transform: 'log', reason: `High skewness (${round(skew, 2)}) — log transform may help` });
                }
                for (let i = 0; i < numericCols.length; i++) {
                    for (let j = i + 1; j < numericCols.length && j < i + 3; j++) {
                        suggestions.push({ columns: [numericCols[i], numericCols[j]], transform: 'interaction', reason: 'Feature interaction may capture non-linear relationships' });
                    }
                }
                for (const c of catCols) {
                    const unique = new Set(data.map(r => r[c])).size;
                    if (unique <= 10) suggestions.push({ column: c, transform: 'one_hot', reason: `Low cardinality (${unique}) — one-hot encoding suitable` });
                }

                return { success: true, suggestions, numericColumns: numericCols, categoricalColumns: catCols };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use transform, suggest.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── model_compare ───────────────────────────────────────────────
async function modelCompare(params) {
    const { action = 'evaluate', userId, ...opts } = params;

    try {
        switch (action) {
            case 'evaluate': {
                if (!opts.predictions || !opts.actuals) return { success: false, error: 'predictions and actuals arrays required' };
                const preds = opts.predictions;
                const actuals = opts.actuals;
                if (preds.length !== actuals.length) return { success: false, error: 'predictions and actuals must have same length' };

                const taskType = opts.taskType || (actuals.every(v => typeof v === 'number') ? 'regression' : 'classification');

                if (taskType === 'regression') {
                    const n = preds.length;
                    let sumErr = 0, sumAbsErr = 0, sumSqErr = 0, sumActual = 0, sumSqActual = 0;
                    for (let i = 0; i < n; i++) {
                        const err = preds[i] - actuals[i];
                        sumErr += err;
                        sumAbsErr += Math.abs(err);
                        sumSqErr += err * err;
                        sumActual += actuals[i];
                        sumSqActual += actuals[i] * actuals[i];
                    }
                    const meanActual = sumActual / n;
                    const ssRes = sumSqErr;
                    const ssTot = actuals.reduce((s, a) => s + (a - meanActual) ** 2, 0);

                    return {
                        success: true,
                        taskType: 'regression',
                        metrics: {
                            mae: round(sumAbsErr / n, 6),
                            mse: round(sumSqErr / n, 6),
                            rmse: round(Math.sqrt(sumSqErr / n), 6),
                            r2: round(1 - ssRes / (ssTot || 1), 6),
                            mape: round(actuals.reduce((s, a, i) => s + (a !== 0 ? Math.abs((a - preds[i]) / a) : 0), 0) / n * 100, 2),
                            meanBias: round(sumErr / n, 6),
                        },
                        n,
                    };
                } else {
                    // Classification metrics
                    const classes = [...new Set([...actuals, ...preds])].sort();
                    const confusion = {};
                    for (const c of classes) confusion[c] = {};
                    for (const c1 of classes) for (const c2 of classes) confusion[c1][c2] = 0;

                    let correct = 0;
                    for (let i = 0; i < preds.length; i++) {
                        confusion[actuals[i]][preds[i]]++;
                        if (preds[i] === actuals[i]) correct++;
                    }

                    const perClass = {};
                    for (const c of classes) {
                        const tp = confusion[c][c];
                        const fp = classes.reduce((s, r) => s + (r !== c ? confusion[r][c] : 0), 0);
                        const fn = classes.reduce((s, p) => s + (p !== c ? confusion[c][p] : 0), 0);
                        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
                        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
                        const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
                        perClass[c] = { precision: round(precision, 4), recall: round(recall, 4), f1: round(f1, 4), support: tp + fn };
                    }

                    const accuracy = correct / preds.length;
                    const macroF1 = round(Object.values(perClass).reduce((s, c) => s + c.f1, 0) / classes.length, 4);

                    return {
                        success: true,
                        taskType: 'classification',
                        metrics: { accuracy: round(accuracy, 4), macroF1, classes: classes.length },
                        perClass,
                        confusionMatrix: confusion,
                        n: preds.length,
                    };
                }
            }

            case 'compare': {
                if (!opts.models || !Array.isArray(opts.models)) return { success: false, error: 'models array required' };
                // Compare multiple model results
                const results = opts.models.map(m => {
                    if (!m.predictions || !m.actuals) return { name: m.name, error: 'predictions and actuals required' };
                    const n = m.predictions.length;
                    let sumSqErr = 0, sumAbsErr = 0;
                    for (let i = 0; i < n; i++) {
                        const err = m.predictions[i] - m.actuals[i];
                        sumSqErr += err * err;
                        sumAbsErr += Math.abs(err);
                    }
                    return {
                        name: m.name,
                        rmse: round(Math.sqrt(sumSqErr / n), 6),
                        mae: round(sumAbsErr / n, 6),
                        n,
                    };
                });
                results.sort((a, b) => (a.rmse || 99999) - (b.rmse || 99999));

                return { success: true, ranked: results, best: results[0]?.name };
            }

            case 'cross_validate': {
                if (!opts.data || !opts.target) return { success: false, error: 'data and target column required' };
                const folds = opts.folds || 5;
                const data = opts.data;
                const n = data.length;
                const foldSize = Math.floor(n / folds);

                // Simulate k-fold with simple mean prediction (baseline)
                const results = [];
                for (let k = 0; k < folds; k++) {
                    const testStart = k * foldSize;
                    const testEnd = k === folds - 1 ? n : (k + 1) * foldSize;
                    const train = [...data.slice(0, testStart), ...data.slice(testEnd)];
                    const test = data.slice(testStart, testEnd);

                    const trainMean = train.reduce((s, r) => s + Number(r[opts.target]), 0) / train.length;
                    let sumSqErr = 0;
                    for (const row of test) {
                        const err = Number(row[opts.target]) - trainMean;
                        sumSqErr += err * err;
                    }
                    results.push({ fold: k + 1, trainSize: train.length, testSize: test.length, rmse: round(Math.sqrt(sumSqErr / test.length), 6) });
                }

                const avgRmse = round(results.reduce((s, r) => s + r.rmse, 0) / folds, 6);
                const stdRmse = round(stdDev(results.map(r => r.rmse)), 6);

                return {
                    success: true,
                    folds: results,
                    avgRmse,
                    stdRmse,
                    note: 'Baseline model (mean prediction). Use with actual model predictions for meaningful comparison.',
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use evaluate, compare, cross_validate.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// STATISTICAL HELPERS
// ═══════════════════════════════════════════════════════════════

function round(v, d) { return Math.round(v * 10 ** d) / 10 ** d; }

function percentile(sorted, p) {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

function skewness(arr) {
    const n = arr.length;
    if (n < 3) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const s = stdDev(arr);
    if (s === 0) return 0;
    return arr.reduce((sum, v) => sum + ((v - mean) / s) ** 3, 0) * n / ((n - 1) * (n - 2));
}

function kurtosis(arr) {
    const n = arr.length;
    if (n < 4) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const s = stdDev(arr);
    if (s === 0) return 0;
    const k = arr.reduce((sum, v) => sum + ((v - mean) / s) ** 4, 0) / n;
    return k - 3; // excess kurtosis
}

function entropy(counts, total) {
    return -counts.reduce((s, c) => {
        const p = c / total;
        return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
}

function pearsonCorrelation(x, y) {
    const n = x.length;
    if (n < 2) return 0;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
        num += (x[i] - mx) * (y[i] - my);
        dx += (x[i] - mx) ** 2;
        dy += (y[i] - my) ** 2;
    }
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : num / denom;
}

function inferDataType(values) {
    if (values.length === 0) return 'unknown';
    const sample = values.slice(0, 20);
    const numericCount = sample.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')).length;
    if (numericCount > sample.length * 0.8) return 'numeric';
    const dateCount = sample.filter(v => !isNaN(Date.parse(v)) && typeof v === 'string' && v.length > 5).length;
    if (dateCount > sample.length * 0.8) return 'datetime';
    return 'categorical';
}

function computeCorrelations(data, columns) {
    const numericCols = columns.filter(c => data.slice(0, 10).every(r => typeof r[c] === 'number' || !isNaN(Number(r[c]))));
    if (numericCols.length < 2) return [];
    const correlations = [];
    for (let i = 0; i < numericCols.length && i < 10; i++) {
        for (let j = i + 1; j < numericCols.length && j < 10; j++) {
            const x = data.map(r => Number(r[numericCols[i]]));
            const y = data.map(r => Number(r[numericCols[j]]));
            const corr = pearsonCorrelation(x, y);
            if (Math.abs(corr) > 0.3) {
                correlations.push({ columns: [numericCols[i], numericCols[j]], correlation: round(corr, 4), strength: Math.abs(corr) > 0.7 ? 'strong' : 'moderate' });
            }
        }
    }
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

// ── data_sample ─────────────────────────────────────────────────
async function dataSample(params) {
    const { action = 'random', ...opts } = params;
    try {
        const data = opts.data;
        if (!Array.isArray(data) || data.length === 0) return { success: false, error: 'data array required' };

        switch (action) {
            case 'random': {
                const size = opts.size || Math.min(Math.ceil(data.length * 0.2), 100);
                const shuffled = [...data].sort(() => Math.random() - 0.5);
                const sample = shuffled.slice(0, size);
                return { success: true, sample, sampleSize: sample.length, totalSize: data.length, method: 'random' };
            }

            case 'stratified': {
                if (!opts.column) return { success: false, error: 'column required for stratified sampling' };
                const ratio = opts.ratio || 0.2;
                const groups = {};
                for (const row of data) {
                    const key = String(row[opts.column] ?? 'null');
                    (groups[key] = groups[key] || []).push(row);
                }
                const sample = [];
                const strata = {};
                for (const [key, rows] of Object.entries(groups)) {
                    const n = Math.max(1, Math.round(rows.length * ratio));
                    const shuffled = [...rows].sort(() => Math.random() - 0.5);
                    const picked = shuffled.slice(0, n);
                    sample.push(...picked);
                    strata[key] = { total: rows.length, sampled: picked.length };
                }
                return { success: true, sample, sampleSize: sample.length, totalSize: data.length, method: 'stratified', strata };
            }

            case 'split': {
                const ratio = opts.ratio || 0.8;
                const shuffled = [...data].sort(() => Math.random() - 0.5);
                const splitIdx = Math.round(shuffled.length * ratio);
                const train = shuffled.slice(0, splitIdx);
                const test = shuffled.slice(splitIdx);
                return { success: true, train, test, trainSize: train.length, testSize: test.length, ratio, method: 'train_test_split' };
            }

            case 'bootstrap': {
                const size = opts.size || data.length;
                const sample = [];
                for (let i = 0; i < size; i++) {
                    sample.push(data[Math.floor(Math.random() * data.length)]);
                }
                const uniqueCount = new Set(sample.map(JSON.stringify)).size;
                return { success: true, sample, sampleSize: sample.length, uniqueRows: uniqueCount, method: 'bootstrap' };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use random, stratified, split, bootstrap.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── outlier_detect ──────────────────────────────────────────────
async function outlierDetect(params) {
    const { action = 'detect', ...opts } = params;
    try {
        const data = opts.data;
        if (!Array.isArray(data) || data.length === 0) return { success: false, error: 'data array required' };

        switch (action) {
            case 'detect': {
                if (!opts.column) return { success: false, error: 'column required' };
                const method = opts.method || 'iqr';
                const values = data.map(r => parseFloat(r[opts.column])).filter(v => !isNaN(v));
                if (values.length === 0) return { success: false, error: `No numeric values in column "${opts.column}"` };

                let outlierIndices = [];
                let bounds = {};

                if (method === 'iqr') {
                    const sorted = [...values].sort((a, b) => a - b);
                    const q1 = sorted[Math.floor(sorted.length * 0.25)];
                    const q3 = sorted[Math.floor(sorted.length * 0.75)];
                    const iqr = q3 - q1;
                    const multiplier = opts.threshold || 1.5;
                    bounds = { lower: round(q1 - multiplier * iqr, 4), upper: round(q3 + multiplier * iqr, 4), q1: round(q1, 4), q3: round(q3, 4), iqr: round(iqr, 4) };
                    outlierIndices = values.map((v, i) => v < bounds.lower || v > bounds.upper ? i : -1).filter(i => i >= 0);
                } else if (method === 'zscore') {
                    const mean = values.reduce((s, v) => s + v, 0) / values.length;
                    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
                    const threshold = opts.threshold || 3;
                    bounds = { mean: round(mean, 4), std: round(std, 4), threshold };
                    outlierIndices = values.map((v, i) => Math.abs((v - mean) / (std || 1)) > threshold ? i : -1).filter(i => i >= 0);
                } else if (method === 'modified_zscore') {
                    const sorted = [...values].sort((a, b) => a - b);
                    const median = sorted[Math.floor(sorted.length / 2)];
                    const mad = [...values].map(v => Math.abs(v - median)).sort((a, b) => a - b)[Math.floor(values.length / 2)];
                    const threshold = opts.threshold || 3.5;
                    bounds = { median: round(median, 4), mad: round(mad, 4), threshold };
                    outlierIndices = values.map((v, i) => {
                        const mz = 0.6745 * (v - median) / (mad || 1);
                        return Math.abs(mz) > threshold ? i : -1;
                    }).filter(i => i >= 0);
                }

                const outliers = outlierIndices.map(i => ({ index: i, value: values[i], row: data[i] }));
                return { success: true, column: opts.column, method, outliers, outlierCount: outliers.length, totalRows: data.length, bounds };
            }

            case 'remove': {
                if (!opts.column) return { success: false, error: 'column required' };
                const method = opts.method || 'iqr';
                const values = data.map(r => parseFloat(r[opts.column])).filter(v => !isNaN(v));
                const sorted = [...values].sort((a, b) => a - b);
                const q1 = sorted[Math.floor(sorted.length * 0.25)];
                const q3 = sorted[Math.floor(sorted.length * 0.75)];
                const iqr = q3 - q1;
                const multiplier = opts.threshold || 1.5;
                const lower = q1 - multiplier * iqr;
                const upper = q3 + multiplier * iqr;

                const cleaned = data.filter(r => {
                    const v = parseFloat(r[opts.column]);
                    return !isNaN(v) && v >= lower && v <= upper;
                });
                return { success: true, cleaned, removedCount: data.length - cleaned.length, cleanedSize: cleaned.length, bounds: { lower: round(lower, 4), upper: round(upper, 4) } };
            }

            case 'multi_column': {
                const columns = opts.columns || Object.keys(data[0] || {}).filter(k => !isNaN(parseFloat(data[0][k])));
                const results = {};
                for (const col of columns) {
                    const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
                    if (values.length === 0) continue;
                    const sorted = [...values].sort((a, b) => a - b);
                    const q1 = sorted[Math.floor(sorted.length * 0.25)];
                    const q3 = sorted[Math.floor(sorted.length * 0.75)];
                    const iqr = q3 - q1;
                    const lower = q1 - 1.5 * iqr;
                    const upper = q3 + 1.5 * iqr;
                    const outlierCount = values.filter(v => v < lower || v > upper).length;
                    results[col] = { outlierCount, outlierPct: round(outlierCount / values.length * 100, 1), bounds: { lower: round(lower, 4), upper: round(upper, 4) } };
                }
                return { success: true, columns: results, totalRows: data.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use detect, remove, multi_column.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── data_correlate ──────────────────────────────────────────────
async function dataCorrelate(params) {
    const { action = 'matrix', ...opts } = params;
    try {
        const data = opts.data;
        if (!Array.isArray(data) || data.length === 0) return { success: false, error: 'data array required' };

        switch (action) {
            case 'matrix': {
                const columns = opts.columns || Object.keys(data[0] || {}).filter(k => !isNaN(parseFloat(data[0][k])));
                const matrix = {};
                for (const col1 of columns) {
                    matrix[col1] = {};
                    for (const col2 of columns) {
                        const pairs = data.map(r => [parseFloat(r[col1]), parseFloat(r[col2])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
                        matrix[col1][col2] = round(pearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1])), 4);
                    }
                }
                return { success: true, matrix, columns, size: columns.length };
            }

            case 'pair': {
                if (!opts.column1 || !opts.column2) return { success: false, error: 'column1 and column2 required' };
                const pairs = data.map(r => [parseFloat(r[opts.column1]), parseFloat(r[opts.column2])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
                const corr = pearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
                const strength = Math.abs(corr) > 0.7 ? 'strong' : Math.abs(corr) > 0.4 ? 'moderate' : Math.abs(corr) > 0.2 ? 'weak' : 'negligible';
                const direction = corr > 0 ? 'positive' : corr < 0 ? 'negative' : 'none';
                return { success: true, column1: opts.column1, column2: opts.column2, correlation: round(corr, 4), strength, direction, sampleSize: pairs.length };
            }

            case 'top': {
                const columns = opts.columns || Object.keys(data[0] || {}).filter(k => !isNaN(parseFloat(data[0][k])));
                const results = [];
                for (let i = 0; i < columns.length; i++) {
                    for (let j = i + 1; j < columns.length; j++) {
                        const pairs = data.map(r => [parseFloat(r[columns[i]]), parseFloat(r[columns[j]])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
                        const corr = pearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
                        results.push({ column1: columns[i], column2: columns[j], correlation: round(corr, 4), absCorrelation: round(Math.abs(corr), 4) });
                    }
                }
                results.sort((a, b) => b.absCorrelation - a.absCorrelation);
                const limit = opts.limit || 10;
                return { success: true, topCorrelations: results.slice(0, limit), totalPairs: results.length };
            }

            case 'target': {
                if (!opts.target) return { success: false, error: 'target column required' };
                const columns = opts.columns || Object.keys(data[0] || {}).filter(k => k !== opts.target && !isNaN(parseFloat(data[0][k])));
                const results = [];
                for (const col of columns) {
                    const pairs = data.map(r => [parseFloat(r[col]), parseFloat(r[opts.target])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
                    const corr = pearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
                    results.push({ feature: col, correlation: round(corr, 4), absCorrelation: round(Math.abs(corr), 4) });
                }
                results.sort((a, b) => b.absCorrelation - a.absCorrelation);
                return { success: true, target: opts.target, featureImportance: results };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use matrix, pair, top, target.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function computeQualityScore(profile) {
    const cols = Object.values(profile);
    const nullScore = 100 - cols.reduce((s, c) => s + parseFloat(c.nullPct), 0) / cols.length;
    const uniqueScore = cols.reduce((s, c) => s + (c.uniqueCount > 1 ? 100 : 0), 0) / cols.length;
    const typeScore = cols.reduce((s, c) => s + (c.type !== 'unknown' ? 100 : 0), 0) / cols.length;
    return { overall: round((nullScore + uniqueScore + typeScore) / 3, 1), completeness: round(nullScore, 1), diversity: round(uniqueScore, 1), consistency: round(typeScore, 1) };
}

export default {
    dataProfile,
    dataClean,
    dataVisualize,
    featureEngineer,
    modelCompare,
    dataSample,
    outlierDetect,
    dataCorrelate,
};
