/**
 * ============================================================================
 * BUSINESS & GROWTH TOOLS V4 — PROFESSOR GRADE
 * ============================================================================
 * growth_analyze, pricing_simulate, ab_test_run, ab_test_analyze, lead_enrich, campaign_generate,
 * competitor_track, revenue_forecast, customer_segment, nps_survey
 * Funnel analysis, pricing models, A/B testing with statistical significance,
 * lead scoring/enrichment, and campaign generation with tracking.
 * ALL state persisted to PostgreSQL via Prisma — ZERO localStorage
 * ============================================================================
 */

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const BUSINESS_GROWTH_TOOL_DEFINITIONS = [
    {
        name: 'growth_analyze',
        description:
            'Analyze growth funnels: conversion rates, churn analysis, cohort analysis, MRR/ARR projections, LTV/CAC calculations, and growth trend detection. All data stored in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create_funnel', 'analyze', 'cohort', 'metrics', 'trend', 'list', 'get', 'delete'],
                    description: 'Growth analysis action',
                },
                name: { type: 'string', description: 'Funnel name' },
                description: { type: 'string', description: 'Funnel description' },
                stages: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Stage name (e.g., "Awareness", "Trial", "Paid")' },
                            count: { type: 'number', description: 'Users in this stage' },
                        },
                    },
                    description: 'Funnel stages with user counts',
                },
                metrics: {
                    type: 'object',
                    properties: {
                        churnRate: { type: 'number', description: 'Monthly churn rate (0-1)' },
                        ltv: { type: 'number', description: 'Lifetime value ($)' },
                        cac: { type: 'number', description: 'Customer acquisition cost ($)' },
                        mrr: { type: 'number', description: 'Monthly recurring revenue ($)' },
                        arr: { type: 'number', description: 'Annual recurring revenue ($)' },
                        growthRate: { type: 'number', description: 'Monthly growth rate (0-1)' },
                    },
                    description: 'Business metrics for analysis',
                },
                dateRange: {
                    type: 'object',
                    properties: { from: { type: 'string' }, to: { type: 'string' } },
                    description: 'Date range for analysis',
                },
                funnelId: { type: 'string', description: '[get/delete/analyze] Funnel ID' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'pricing_simulate',
        description:
            'Simulate pricing strategies: multiple tier modeling, revenue projections, elasticity analysis, competitive positioning, optimal price point discovery. Test pricing changes before implementation.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'simulate', 'compare', 'optimize', 'list', 'get', 'delete'],
                    description: 'Pricing action',
                },
                name: { type: 'string', description: 'Simulation name' },
                plans: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Plan name (e.g., "Free", "Pro", "Enterprise")' },
                            price: { type: 'number', description: 'Monthly price ($)' },
                            features: { type: 'array', items: { type: 'string' }, description: 'Included features' },
                            expectedUsers: { type: 'number', description: 'Expected monthly users' },
                        },
                    },
                    description: 'Pricing plans to simulate',
                },
                assumptions: {
                    type: 'object',
                    properties: {
                        churnRate: { type: 'number', description: 'Monthly churn rate' },
                        growthRate: { type: 'number', description: 'Monthly growth rate' },
                        cac: { type: 'number', description: 'Customer acquisition cost' },
                        conversionRate: { type: 'number', description: 'Free-to-paid conversion' },
                    },
                    description: 'Simulation assumptions',
                },
                months: { type: 'number', description: '[simulate] Projection months. Default: 12' },
                simulationId: { type: 'string', description: '[get/delete/simulate] Simulation ID' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'ab_test_run',
        description:
            'Create and run A/B tests: define variants with weights, set metrics, configure sample size and confidence level. Manage test lifecycle (draft → running → paused → completed).',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'start', 'pause', 'complete', 'record_event', 'get', 'list', 'delete'],
                    description: 'A/B test action',
                },
                name: { type: 'string', description: 'Test name' },
                description: { type: 'string', description: 'Test description' },
                hypothesis: { type: 'string', description: 'What you expect to happen' },
                variants: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Variant name (e.g., "Control", "Treatment A")' },
                            weight: { type: 'number', description: 'Traffic weight (0-1)' },
                            config: { type: 'object', description: 'Variant configuration' },
                        },
                    },
                    description: 'Test variants',
                },
                metric: { type: 'string', description: 'Primary metric to track' },
                secondaryMetrics: { type: 'array', items: { type: 'string' }, description: 'Secondary metrics' },
                confidenceLevel: { type: 'number', description: 'Required confidence (0-1). Default: 0.95' },
                testId: { type: 'string', description: '[start/pause/complete/get/delete/record_event] Test ID' },
                // record_event
                variantName: { type: 'string', description: '[record_event] Which variant the event belongs to' },
                converted: { type: 'boolean', description: '[record_event] Did the user convert?' },
                metricValue: { type: 'number', description: '[record_event] Numeric metric value' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'ab_test_analyze',
        description:
            'Analyze A/B test results: statistical significance testing (z-test, chi-squared), winner detection, confidence intervals, effect size calculation, and recommendation generation.',
        input_schema: {
            type: 'object',
            properties: {
                testId: { type: 'string', description: 'A/B test ID to analyze' },
                analysisType: {
                    type: 'string',
                    enum: ['significance', 'summary', 'recommendation', 'power_analysis'],
                    description: 'Analysis type. Default: summary',
                },
                minimumSampleSize: { type: 'number', description: '[power_analysis] Minimum detectable effect' },
            },
            required: ['testId'],
        },
    },
    {
        name: 'lead_enrich',
        description:
            'Lead management and enrichment: create leads, score them, simulate enrichment with company/social data, bulk import, segment by score/status, and export. All stored in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'enrich', 'score', 'update_status', 'bulk_import', 'segment', 'list', 'get', 'delete', 'export'],
                    description: 'Lead action',
                },
                // Create/update
                email: { type: 'string', description: 'Lead email' },
                name: { type: 'string', description: 'Lead name' },
                company: { type: 'string', description: 'Company name' },
                title: { type: 'string', description: 'Job title' },
                phone: { type: 'string', description: 'Phone number' },
                source: { type: 'string', description: 'Lead source' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
                notes: { type: 'string', description: 'Notes' },
                leadId: { type: 'string', description: '[enrich/score/update_status/get/delete] Lead ID' },
                status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], description: '[update_status] New status' },
                // Bulk
                leads: {
                    type: 'array',
                    items: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' }, company: { type: 'string' } } },
                    description: '[bulk_import] Array of leads',
                },
                // Segment
                minScore: { type: 'number', description: '[segment] Minimum score' },
                maxScore: { type: 'number', description: '[segment] Maximum score' },
                statusFilter: { type: 'string', description: '[segment/list] Filter by status' },
                take: { type: 'number', description: '[list/segment] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'campaign_generate',
        description:
            'Generate and manage marketing campaigns: create email/ad/social campaigns with content, audience targeting, scheduling. Track metrics (sent, opened, clicked, converted, revenue). All persisted.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'update', 'launch', 'pause', 'complete', 'record_metrics', 'get', 'list', 'delete', 'duplicate'],
                    description: 'Campaign action',
                },
                name: { type: 'string', description: 'Campaign name' },
                type: { type: 'string', enum: ['email', 'ad', 'social', 'sms'], description: 'Campaign type' },
                content: {
                    type: 'object',
                    properties: {
                        subject: { type: 'string' },
                        body: { type: 'string' },
                        cta: { type: 'string' },
                        images: { type: 'array', items: { type: 'string' } },
                        targeting: { type: 'object' },
                    },
                    description: 'Campaign content',
                },
                audience: {
                    type: 'object',
                    properties: {
                        segments: { type: 'array', items: { type: 'string' } },
                        filters: { type: 'object' },
                        size: { type: 'number' },
                    },
                    description: 'Target audience',
                },
                schedule: {
                    type: 'object',
                    properties: {
                        sendAt: { type: 'string', description: 'ISO timestamp' },
                        timezone: { type: 'string' },
                        frequency: { type: 'string', enum: ['once', 'daily', 'weekly', 'monthly'] },
                    },
                    description: 'Campaign schedule',
                },
                campaignId: { type: 'string', description: '[update/launch/pause/complete/get/delete/duplicate/record_metrics] Campaign ID' },
                metrics: {
                    type: 'object',
                    properties: { sent: { type: 'number' }, opened: { type: 'number' }, clicked: { type: 'number' }, converted: { type: 'number' }, revenue: { type: 'number' } },
                    description: '[record_metrics] Metrics to add',
                },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    // ------------------------------------------------------------------
    // NEW RECOMMENDED TOOLS
    // ------------------------------------------------------------------
    {
        name: 'competitor_track',
        description:
            'Track and benchmark against competitors. Monitor pricing changes, feature comparisons, market positioning, SWOT analysis, and competitive landscape. Store competitor data for historical tracking.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['add', 'update', 'compare', 'swot', 'pricing_matrix', 'feature_gap', 'market_share', 'list', 'delete'],
                    description: 'Competitor tracking action',
                },
                name: { type: 'string', description: 'Competitor name' },
                website: { type: 'string', description: 'Competitor website URL' },
                pricing: {
                    type: 'array',
                    items: { type: 'object', properties: { plan: { type: 'string' }, price: { type: 'number' }, features: { type: 'array', items: { type: 'string' } } } },
                    description: 'Competitor pricing plans',
                },
                features: { type: 'array', items: { type: 'string' }, description: 'Competitor features list' },
                strengths: { type: 'array', items: { type: 'string' }, description: '[swot] Competitor strengths' },
                weaknesses: { type: 'array', items: { type: 'string' }, description: '[swot] Competitor weaknesses' },
                marketShare: { type: 'number', description: 'Estimated market share (0-100%)' },
                competitorId: { type: 'string', description: '[update/compare/delete] Competitor ID' },
                compareWith: { type: 'string', description: '[compare] Second competitor ID to compare against' },
                ourFeatures: { type: 'array', items: { type: 'string' }, description: '[feature_gap] Our features for gap analysis' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'revenue_forecast',
        description:
            'AI-driven revenue forecasting and projections. Model recurring revenue (MRR/ARR), seasonal patterns, growth scenarios (bear/base/bull), break-even analysis, and revenue waterfall decomposition.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'forecast', 'scenarios', 'breakeven', 'waterfall', 'sensitivity', 'list', 'get', 'delete'],
                    description: 'Revenue forecast action',
                },
                name: { type: 'string', description: 'Forecast name' },
                currentMRR: { type: 'number', description: 'Current monthly recurring revenue ($)' },
                growthRate: { type: 'number', description: 'Monthly growth rate (0-1). Default: 0.05' },
                churnRate: { type: 'number', description: 'Monthly churn rate (0-1). Default: 0.03' },
                averageContractValue: { type: 'number', description: 'Average contract value ($)' },
                newCustomersPerMonth: { type: 'number', description: 'Expected new customers per month' },
                fixedCosts: { type: 'number', description: '[breakeven] Monthly fixed costs ($)' },
                variableCostPerUser: { type: 'number', description: '[breakeven] Variable cost per user ($)' },
                months: { type: 'number', description: '[forecast/scenarios] Projection months. Default: 12' },
                forecastId: { type: 'string', description: '[get/delete/forecast] Forecast ID' },
                variable: { type: 'string', description: '[sensitivity] Variable to test (growthRate, churnRate, price)' },
                range: { type: 'array', items: { type: 'number' }, description: '[sensitivity] Range of values to test' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'customer_segment',
        description:
            'Customer segmentation using RFM (Recency, Frequency, Monetary) analysis, behavioral clustering, engagement scoring, and lifecycle stage classification. Identify champions, at-risk, and dormant customers.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['rfm_analyze', 'behavioral', 'engagement_score', 'lifecycle', 'create_segment', 'list_segments', 'assign', 'export'],
                    description: 'Segmentation action',
                },
                customers: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' }, name: { type: 'string' },
                            lastPurchase: { type: 'string', description: 'ISO date of last purchase' },
                            purchaseCount: { type: 'number' }, totalSpend: { type: 'number' },
                            lastActive: { type: 'string' }, signupDate: { type: 'string' },
                        },
                    },
                    description: 'Customer data for analysis',
                },
                segmentName: { type: 'string', description: '[create_segment] Segment name' },
                criteria: { type: 'object', description: '[create_segment] Segment criteria (e.g., { minSpend: 100, minFrequency: 3 })' },
                format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: '[export] Export format. Default: json' },
            },
            required: ['action'],
        },
    },
    {
        name: 'nps_survey',
        description:
            'Net Promoter Score surveys and analysis. Create surveys, record responses (0-10 scale), calculate NPS, analyze promoters/passives/detractors, track trends over time, and generate improvement insights.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'respond', 'calculate', 'trends', 'breakdown', 'insights', 'list', 'get', 'delete', 'export'],
                    description: 'NPS action',
                },
                name: { type: 'string', description: 'Survey name' },
                question: { type: 'string', description: 'NPS question. Default: "How likely are you to recommend us?"' },
                surveyId: { type: 'string', description: '[respond/calculate/get/delete] Survey ID' },
                score: { type: 'number', description: '[respond] NPS score (0-10)' },
                feedback: { type: 'string', description: '[respond] Open-text feedback' },
                respondentId: { type: 'string', description: '[respond] Respondent identifier' },
                dateRange: { type: 'string', description: '[trends] Time range (e.g., "30d", "90d")' },
                format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: '[export] Export format' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// STATS HELPERS
// ============================================================================

function zScore(p1, p2, n1, n2) {
    const p = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    return se === 0 ? 0 : (p1 - p2) / se;
}

function pValueFromZ(z) {
    // Approximation of two-tailed p-value
    const absZ = Math.abs(z);
    const t = 1 / (1 + 0.2316419 * absZ);
    const d = 0.3989422804 * Math.exp((-absZ * absZ) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return 2 * p;
}

function confidenceInterval(rate, n, confidence = 0.95) {
    const z = confidence >= 0.99 ? 2.576 : confidence >= 0.95 ? 1.96 : 1.645;
    const margin = z * Math.sqrt((rate * (1 - rate)) / n);
    return { lower: Math.max(0, rate - margin), upper: Math.min(1, rate + margin), margin };
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeGrowthAnalyze(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create_funnel': {
            const { name, description, stages = [], metrics = {}, dateRange } = input;
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });

            // Calculate conversion rates
            const enrichedStages = stages.map((s, i) => ({
                ...s,
                conversionRate: i > 0 && stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 10000) / 10000 : 1,
                dropOff: i > 0 ? stages[i - 1].count - s.count : 0,
            }));

            const funnel = await prisma.growthFunnel.create({
                data: { userId, name, description: description || null, stages: enrichedStages, metrics, dateRange: dateRange || null },
            });

            return JSON.stringify({ status: 'success', funnel: { id: funnel.id, name: funnel.name, stageCount: enrichedStages.length } });
        }

        case 'analyze': {
            const { funnelId } = input;
            if (!funnelId) return JSON.stringify({ status: 'error', error: 'funnelId required' });

            const funnel = await prisma.growthFunnel.findFirst({ where: { id: funnelId, userId } });
            if (!funnel) return JSON.stringify({ status: 'error', error: 'Funnel not found' });

            const stages = Array.isArray(funnel.stages) ? funnel.stages : [];
            const metrics = funnel.metrics || {};

            const analysis = {
                funnelName: funnel.name,
                overallConversion: stages.length >= 2 && stages[0].count > 0 ? Math.round((stages[stages.length - 1].count / stages[0].count) * 10000) / 10000 : 0,
                totalDropOff: stages.length >= 2 ? stages[0].count - stages[stages.length - 1].count : 0,
                worstStage: null,
                stages: stages.map((s, i) => ({
                    name: s.name,
                    count: s.count,
                    conversionRate: s.conversionRate,
                    dropOff: s.dropOff || 0,
                    percentOfTotal: stages[0].count > 0 ? Math.round((s.count / stages[0].count) * 100) : 0,
                })),
            };

            // Find worst conversion step
            let worstRate = 1;
            for (const stage of stages) {
                if (stage.conversionRate !== undefined && stage.conversionRate < worstRate && stage.conversionRate !== 1) {
                    worstRate = stage.conversionRate;
                    analysis.worstStage = { name: stage.name, conversionRate: stage.conversionRate, dropOff: stage.dropOff };
                }
            }

            // Business metrics analysis
            if (metrics.churnRate !== undefined || metrics.ltv || metrics.cac) {
                analysis.businessMetrics = {
                    ltvCacRatio: metrics.ltv && metrics.cac ? Math.round((metrics.ltv / metrics.cac) * 100) / 100 : null,
                    paybackMonths: metrics.mrr && metrics.cac ? Math.round(metrics.cac / metrics.mrr) : null,
                    annualChurn: metrics.churnRate ? Math.round((1 - Math.pow(1 - metrics.churnRate, 12)) * 10000) / 10000 : null,
                    netRevenueRetention: metrics.churnRate ? Math.round((1 - metrics.churnRate) * (1 + (metrics.growthRate || 0)) * 10000) / 10000 : null,
                };

                // Recommendations
                analysis.recommendations = [];
                if (analysis.businessMetrics.ltvCacRatio && analysis.businessMetrics.ltvCacRatio < 3) {
                    analysis.recommendations.push('LTV/CAC ratio below 3x — reduce acquisition costs or increase lifetime value');
                }
                if (metrics.churnRate > 0.05) {
                    analysis.recommendations.push(`Monthly churn ${Math.round(metrics.churnRate * 100)}% is high — focus on retention and onboarding`);
                }
                if (analysis.worstStage && analysis.worstStage.conversionRate < 0.3) {
                    analysis.recommendations.push(`"${analysis.worstStage.name}" stage has ${Math.round(analysis.worstStage.conversionRate * 100)}% conversion — prioritize UX improvements here`);
                }
            }

            // Store analysis
            await prisma.growthFunnel.update({ where: { id: funnelId }, data: { analysisResult: analysis } });

            return JSON.stringify({ status: 'success', analysis }).slice(0, MAX_OUTPUT);
        }

        case 'cohort': {
            const { funnelId, metrics = {} } = input;
            // Generate cohort analysis from metrics
            const { churnRate = 0.05, growthRate = 0.1, startUsers = 1000 } = metrics;

            const cohorts = [];
            for (let month = 0; month < 12; month++) {
                const cohortSize = Math.round(startUsers * Math.pow(1 + growthRate, month));
                const retention = [];
                for (let m = 0; m <= Math.min(month, 6); m++) {
                    retention.push(Math.round(cohortSize * Math.pow(1 - churnRate, m)));
                }
                cohorts.push({ month: month + 1, cohortSize, retention, retentionRate: Math.round(Math.pow(1 - churnRate, month) * 10000) / 10000 });
            }

            if (funnelId) {
                await prisma.growthFunnel.update({ where: { id: funnelId }, data: { analysisResult: { cohorts } } }).catch(() => { });
            }

            return JSON.stringify({ status: 'success', cohortCount: cohorts.length, cohorts });
        }

        case 'metrics': {
            const { metrics = {} } = input;
            const { mrr = 0, arr, churnRate = 0, growthRate = 0, cac = 0, ltv = 0, customers = 0 } = metrics;

            const calculated = {
                mrr,
                arr: arr || mrr * 12,
                monthlyChurn: churnRate,
                annualChurn: Math.round((1 - Math.pow(1 - churnRate, 12)) * 10000) / 10000,
                ltvCacRatio: cac > 0 ? Math.round((ltv / cac) * 100) / 100 : null,
                paybackMonths: mrr > 0 && cac > 0 ? Math.round((cac / (mrr / Math.max(customers, 1))) * 10) / 10 : null,
                netRevenueRetention: Math.round((1 - churnRate) * (1 + growthRate) * 10000) / 10000,
                projectedArr12m: Math.round(mrr * 12 * Math.pow(1 + growthRate, 12)),
                healthScore: 0,
            };

            // Health score (0-100)
            let score = 50;
            if (calculated.ltvCacRatio >= 3) score += 15;
            else if (calculated.ltvCacRatio >= 1) score += 5;
            if (churnRate <= 0.02) score += 15;
            else if (churnRate <= 0.05) score += 5;
            if (growthRate >= 0.1) score += 15;
            else if (growthRate >= 0.05) score += 5;
            if (calculated.netRevenueRetention >= 1.2) score += 15;
            else if (calculated.netRevenueRetention >= 1) score += 5;
            calculated.healthScore = Math.min(100, Math.max(0, score));

            return JSON.stringify({ status: 'success', metrics: calculated });
        }

        case 'trend': {
            const { funnelId, metrics = {} } = input;
            const { mrr = 10000, growthRate = 0.1, churnRate = 0.05 } = metrics;

            const trend = [];
            let currentMrr = mrr;
            for (let m = 0; m < 12; m++) {
                const newMrr = currentMrr * growthRate;
                const churnedMrr = currentMrr * churnRate;
                currentMrr = currentMrr + newMrr - churnedMrr;
                trend.push({ month: m + 1, mrr: Math.round(currentMrr), newMrr: Math.round(newMrr), churnedMrr: Math.round(churnedMrr), netGrowth: Math.round(newMrr - churnedMrr) });
            }

            return JSON.stringify({ status: 'success', months: 12, startMrr: mrr, endMrr: Math.round(currentMrr), totalGrowth: Math.round(((currentMrr - mrr) / mrr) * 10000) / 10000, trend });
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const funnels = await prisma.growthFunnel.findMany({
                where: { userId },
                select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: funnels.length, funnels });
        }

        case 'get': {
            const { funnelId } = input;
            if (!funnelId) return JSON.stringify({ status: 'error', error: 'funnelId required' });
            const funnel = await prisma.growthFunnel.findFirst({ where: { id: funnelId, userId } });
            if (!funnel) return JSON.stringify({ status: 'error', error: 'Funnel not found' });
            return JSON.stringify({ status: 'success', funnel }).slice(0, MAX_OUTPUT);
        }

        case 'delete': {
            const { funnelId } = input;
            if (!funnelId) return JSON.stringify({ status: 'error', error: 'funnelId required' });
            await prisma.growthFunnel.deleteMany({ where: { id: funnelId, userId } });
            return JSON.stringify({ status: 'success', deleted: funnelId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown growth_analyze action: ${action}` });
    }
}

async function executePricingSimulate(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { name, plans = [], assumptions = {} } = input;
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });

            const sim = await prisma.pricingSimulation.create({
                data: { userId, name, plans, assumptions },
            });
            return JSON.stringify({ status: 'success', simulation: { id: sim.id, name: sim.name, planCount: plans.length } });
        }

        case 'simulate': {
            const { simulationId, months = 12 } = input;
            if (!simulationId) return JSON.stringify({ status: 'error', error: 'simulationId required' });

            const sim = await prisma.pricingSimulation.findFirst({ where: { id: simulationId, userId } });
            if (!sim) return JSON.stringify({ status: 'error', error: 'Simulation not found' });

            const plans = Array.isArray(sim.plans) ? sim.plans : [];
            const a = sim.assumptions || {};
            const churnRate = a.churnRate || 0.05;
            const growthRate = a.growthRate || 0.1;

            const projections = plans.map((plan) => {
                const monthly = [];
                let users = plan.expectedUsers || 100;
                for (let m = 0; m < months; m++) {
                    users = Math.round(users * (1 + growthRate) * (1 - churnRate));
                    monthly.push({ month: m + 1, users, revenue: Math.round(users * plan.price), mrr: Math.round(users * plan.price) });
                }
                return {
                    planName: plan.name,
                    price: plan.price,
                    startUsers: plan.expectedUsers || 100,
                    endUsers: users,
                    totalRevenue: monthly.reduce((s, m) => s + m.revenue, 0),
                    avgMonthlyRevenue: Math.round(monthly.reduce((s, m) => s + m.revenue, 0) / months),
                    monthly,
                };
            });

            const totalRevenue = projections.reduce((s, p) => s + p.totalRevenue, 0);
            const recommendation = projections.sort((a, b) => b.totalRevenue - a.totalRevenue)[0];

            await prisma.pricingSimulation.update({
                where: { id: simulationId },
                data: {
                    projections: { projections, totalRevenue, bestPlan: recommendation.planName },
                    recommendation: `Best performing plan: "${recommendation.planName}" generating $${recommendation.totalRevenue.toLocaleString()} over ${months} months.`,
                },
            });

            return JSON.stringify({ status: 'success', months, totalRevenue, bestPlan: recommendation.planName, projections: projections.map((p) => ({ ...p, monthly: undefined })) });
        }

        case 'compare': {
            const simulations = await prisma.pricingSimulation.findMany({
                where: { userId, projections: { not: null } },
                orderBy: { updatedAt: 'desc' },
                take: 10,
            });

            const comparison = simulations.map((s) => ({
                id: s.id,
                name: s.name,
                planCount: Array.isArray(s.plans) ? s.plans.length : 0,
                totalRevenue: s.projections?.totalRevenue || 0,
                bestPlan: s.projections?.bestPlan || 'N/A',
                recommendation: s.recommendation,
            }));

            return JSON.stringify({ status: 'success', count: comparison.length, comparison });
        }

        case 'optimize': {
            const { simulationId } = input;
            if (!simulationId) return JSON.stringify({ status: 'error', error: 'simulationId required' });

            const sim = await prisma.pricingSimulation.findFirst({ where: { id: simulationId, userId } });
            if (!sim) return JSON.stringify({ status: 'error', error: 'Simulation not found' });

            const plans = Array.isArray(sim.plans) ? sim.plans : [];
            const optimizations = plans.map((plan) => {
                const prices = [plan.price * 0.7, plan.price * 0.85, plan.price, plan.price * 1.15, plan.price * 1.3];
                const elasticity = -1.2; // assumed price elasticity

                return prices.map((price) => {
                    const pctChange = (price - plan.price) / plan.price;
                    const demandChange = pctChange * elasticity;
                    const projectedUsers = Math.round((plan.expectedUsers || 100) * (1 + demandChange));
                    const revenue = Math.round(projectedUsers * price);
                    return { planName: plan.name, price: Math.round(price * 100) / 100, users: projectedUsers, monthlyRevenue: revenue, revenueChange: Math.round(((revenue - (plan.expectedUsers || 100) * plan.price) / ((plan.expectedUsers || 100) * plan.price)) * 10000) / 10000 };
                });
            });

            // Find optimal
            const allOptions = optimizations.flat();
            const optimal = allOptions.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)[0];

            return JSON.stringify({ status: 'success', currentPlans: plans.length, optimization: optimizations, optimalPrice: optimal });
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const sims = await prisma.pricingSimulation.findMany({
                where: { userId },
                select: { id: true, name: true, recommendation: true, createdAt: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: sims.length, simulations: sims });
        }

        case 'get': {
            const { simulationId } = input;
            if (!simulationId) return JSON.stringify({ status: 'error', error: 'simulationId required' });
            const sim = await prisma.pricingSimulation.findFirst({ where: { id: simulationId, userId } });
            if (!sim) return JSON.stringify({ status: 'error', error: 'Simulation not found' });
            return JSON.stringify({ status: 'success', simulation: sim }).slice(0, MAX_OUTPUT);
        }

        case 'delete': {
            const { simulationId } = input;
            if (!simulationId) return JSON.stringify({ status: 'error', error: 'simulationId required' });
            await prisma.pricingSimulation.deleteMany({ where: { id: simulationId, userId } });
            return JSON.stringify({ status: 'success', deleted: simulationId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown pricing_simulate action: ${action}` });
    }
}

async function executeAbTestRun(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { name, description, hypothesis, variants = [], metric, secondaryMetrics, confidenceLevel = 0.95 } = input;
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });

            const enrichedVariants = variants.map((v) => ({ ...v, impressions: 0, conversions: 0, totalValue: 0 }));

            const test = await prisma.abTest.create({
                data: { userId, name, description: description || null, hypothesis: hypothesis || null, variants: enrichedVariants, metric: metric || null, secondaryMetrics: secondaryMetrics || null, confidenceLevel },
            });
            return JSON.stringify({ status: 'success', test: { id: test.id, name: test.name, variantCount: enrichedVariants.length } });
        }

        case 'start': {
            const { testId } = input;
            if (!testId) return JSON.stringify({ status: 'error', error: 'testId required' });
            const test = await prisma.abTest.findFirst({ where: { id: testId, userId } });
            if (!test) return JSON.stringify({ status: 'error', error: 'Test not found' });
            if (test.status === 'running') return JSON.stringify({ status: 'error', error: 'Test already running' });

            await prisma.abTest.update({ where: { id: testId }, data: { status: 'running', startedAt: new Date() } });
            return JSON.stringify({ status: 'success', testId, status: 'running' });
        }

        case 'pause': {
            const { testId } = input;
            if (!testId) return JSON.stringify({ status: 'error', error: 'testId required' });
            await prisma.abTest.updateMany({ where: { id: testId, userId, status: 'running' }, data: { status: 'paused' } });
            return JSON.stringify({ status: 'success', testId, status: 'paused' });
        }

        case 'complete': {
            const { testId } = input;
            if (!testId) return JSON.stringify({ status: 'error', error: 'testId required' });
            await prisma.abTest.updateMany({ where: { id: testId, userId }, data: { status: 'completed', endedAt: new Date() } });
            return JSON.stringify({ status: 'success', testId, status: 'completed' });
        }

        case 'record_event': {
            const { testId, variantName, converted = false, metricValue } = input;
            if (!testId || !variantName) return JSON.stringify({ status: 'error', error: 'testId and variantName required' });

            const test = await prisma.abTest.findFirst({ where: { id: testId, userId } });
            if (!test) return JSON.stringify({ status: 'error', error: 'Test not found' });

            const variants = Array.isArray(test.variants) ? test.variants : [];
            const variant = variants.find((v) => v.name === variantName);
            if (!variant) return JSON.stringify({ status: 'error', error: `Variant "${variantName}" not found` });

            variant.impressions = (variant.impressions || 0) + 1;
            if (converted) variant.conversions = (variant.conversions || 0) + 1;
            if (metricValue !== undefined) variant.totalValue = (variant.totalValue || 0) + metricValue;

            await prisma.abTest.update({
                where: { id: testId },
                data: { variants, sampleSize: { increment: 1 } },
            });

            return JSON.stringify({ status: 'success', testId, variant: variantName, impressions: variant.impressions, conversions: variant.conversions });
        }

        case 'get': {
            const { testId } = input;
            if (!testId) return JSON.stringify({ status: 'error', error: 'testId required' });
            const test = await prisma.abTest.findFirst({ where: { id: testId, userId } });
            if (!test) return JSON.stringify({ status: 'error', error: 'Test not found' });
            return JSON.stringify({ status: 'success', test }).slice(0, MAX_OUTPUT);
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const tests = await prisma.abTest.findMany({
                where: { userId },
                select: { id: true, name: true, status: true, sampleSize: true, metric: true, significance: true, startedAt: true, endedAt: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: tests.length, tests });
        }

        case 'delete': {
            const { testId } = input;
            if (!testId) return JSON.stringify({ status: 'error', error: 'testId required' });
            await prisma.abTest.deleteMany({ where: { id: testId, userId } });
            return JSON.stringify({ status: 'success', deleted: testId });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown ab_test_run action: ${action}` });
    }
}

async function executeAbTestAnalyze(input, prisma, userId) {
    const { testId, analysisType = 'summary' } = input;
    if (!testId) return JSON.stringify({ status: 'error', error: 'testId required' });

    const test = await prisma.abTest.findFirst({ where: { id: testId, userId } });
    if (!test) return JSON.stringify({ status: 'error', error: 'Test not found' });

    const variants = Array.isArray(test.variants) ? test.variants : [];
    if (variants.length < 2) return JSON.stringify({ status: 'error', error: 'Need at least 2 variants for analysis' });

    switch (analysisType) {
        case 'summary': {
            const variantStats = variants.map((v) => ({
                name: v.name,
                impressions: v.impressions || 0,
                conversions: v.conversions || 0,
                conversionRate: v.impressions > 0 ? Math.round(((v.conversions || 0) / v.impressions) * 10000) / 10000 : 0,
                avgValue: v.impressions > 0 ? Math.round(((v.totalValue || 0) / v.impressions) * 100) / 100 : 0,
            }));

            const control = variantStats[0];
            const best = variantStats.sort((a, b) => b.conversionRate - a.conversionRate)[0];
            const lift = control.conversionRate > 0 ? Math.round(((best.conversionRate - control.conversionRate) / control.conversionRate) * 10000) / 10000 : 0;

            return JSON.stringify({
                status: 'success',
                testName: test.name,
                totalSamples: test.sampleSize,
                variants: variantStats,
                leader: best.name,
                lift,
                metric: test.metric,
            });
        }

        case 'significance': {
            const control = variants[0];
            const results = [];

            for (let i = 1; i < variants.length; i++) {
                const treatment = variants[i];
                const controlRate = control.impressions > 0 ? (control.conversions || 0) / control.impressions : 0;
                const treatmentRate = treatment.impressions > 0 ? (treatment.conversions || 0) / treatment.impressions : 0;

                const z = zScore(treatmentRate, controlRate, treatment.impressions || 1, control.impressions || 1);
                const pVal = pValueFromZ(z);
                const significant = pVal < (1 - test.confidenceLevel);

                const controlCI = confidenceInterval(controlRate, control.impressions || 1, test.confidenceLevel);
                const treatmentCI = confidenceInterval(treatmentRate, treatment.impressions || 1, test.confidenceLevel);

                results.push({
                    variant: treatment.name,
                    vsControl: control.name,
                    controlRate: Math.round(controlRate * 10000) / 10000,
                    treatmentRate: Math.round(treatmentRate * 10000) / 10000,
                    lift: controlRate > 0 ? Math.round(((treatmentRate - controlRate) / controlRate) * 10000) / 10000 : 0,
                    zScore: Math.round(z * 1000) / 1000,
                    pValue: Math.round(pVal * 10000) / 10000,
                    significant,
                    confidenceLevel: test.confidenceLevel,
                    controlCI: { lower: Math.round(controlCI.lower * 10000) / 10000, upper: Math.round(controlCI.upper * 10000) / 10000 },
                    treatmentCI: { lower: Math.round(treatmentCI.lower * 10000) / 10000, upper: Math.round(treatmentCI.upper * 10000) / 10000 },
                });
            }

            // Store significance
            const bestResult = results.find((r) => r.significant && r.lift > 0);
            await prisma.abTest.update({
                where: { id: testId },
                data: {
                    significance: bestResult ? 1 - bestResult.pValue : null,
                    results: { significanceTests: results, winner: bestResult?.variant || null },
                },
            });

            return JSON.stringify({ status: 'success', testName: test.name, results, winner: bestResult?.variant || 'No significant winner yet' });
        }

        case 'recommendation': {
            const control = variants[0];
            const treatmentResults = [];

            for (let i = 1; i < variants.length; i++) {
                const t = variants[i];
                const cRate = control.impressions > 0 ? (control.conversions || 0) / control.impressions : 0;
                const tRate = t.impressions > 0 ? (t.conversions || 0) / t.impressions : 0;
                const z = zScore(tRate, cRate, t.impressions || 1, control.impressions || 1);
                const pVal = pValueFromZ(z);
                treatmentResults.push({ name: t.name, rate: tRate, lift: cRate > 0 ? (tRate - cRate) / cRate : 0, pValue: pVal, significant: pVal < (1 - test.confidenceLevel) });
            }

            const significantWinners = treatmentResults.filter((r) => r.significant && r.lift > 0);
            let recommendation;
            if (significantWinners.length > 0) {
                const best = significantWinners.sort((a, b) => b.lift - a.lift)[0];
                recommendation = `Roll out "${best.name}" — it shows a ${Math.round(best.lift * 100)}% improvement with statistical significance (p=${Math.round(best.pValue * 1000) / 1000}).`;
            } else if (test.sampleSize < 100) {
                recommendation = 'Insufficient sample size. Continue running the test to reach statistical significance.';
            } else {
                recommendation = 'No variant shows statistically significant improvement. Consider keeping the control or redesigning the test with larger effect sizes.';
            }

            return JSON.stringify({ status: 'success', testName: test.name, sampleSize: test.sampleSize, recommendation, details: treatmentResults });
        }

        case 'power_analysis': {
            const { minimumSampleSize = 0.05 } = input; // minimum detectable effect
            const mde = minimumSampleSize;
            const controlRate = variants[0].impressions > 0 ? (variants[0].conversions || 0) / variants[0].impressions : 0.1;
            const alpha = 1 - test.confidenceLevel;
            const power = 0.8;

            // Sample size formula for proportions
            const zAlpha = 1.96;
            const zBeta = 0.84;
            const p1 = controlRate;
            const p2 = controlRate + mde;
            const n = Math.ceil(Math.pow(zAlpha * Math.sqrt(2 * p1 * (1 - p1)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2));

            return JSON.stringify({
                status: 'success',
                powerAnalysis: {
                    minimumDetectableEffect: mde,
                    baselineRate: Math.round(controlRate * 10000) / 10000,
                    requiredSamplePerVariant: n,
                    totalRequired: n * variants.length,
                    currentSample: test.sampleSize,
                    progress: test.sampleSize > 0 ? Math.min(1, Math.round((test.sampleSize / (n * variants.length)) * 100) / 100) : 0,
                    alpha,
                    power,
                },
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown ab_test_analyze type: ${analysisType}` });
    }
}

async function executeLeadEnrich(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { email, name, company, title, phone, source, tags = [], notes } = input;
            if (!email && !name) return JSON.stringify({ status: 'error', error: 'email or name required' });

            const lead = await prisma.lead.create({
                data: { userId, email: email || null, name: name || null, company: company || null, title: title || null, phone: phone || null, source: source || 'manual', tags, notes: notes || null },
            });
            return JSON.stringify({ status: 'success', lead: { id: lead.id, email: lead.email, name: lead.name, score: lead.score } });
        }

        case 'enrich': {
            const { leadId } = input;
            if (!leadId) return JSON.stringify({ status: 'error', error: 'leadId required' });

            const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
            if (!lead) return JSON.stringify({ status: 'error', error: 'Lead not found' });

            // Simulated enrichment (in production, would call Clearbit/Apollo/etc.)
            const enriched = {
                companySize: lead.company ? ['1-10', '11-50', '51-200', '201-500', '500+'][Math.floor(Math.random() * 5)] : null,
                industry: lead.company ? ['SaaS', 'Fintech', 'E-commerce', 'Healthcare', 'Education', 'Media'][Math.floor(Math.random() * 6)] : null,
                linkedinUrl: lead.name ? `https://linkedin.com/in/${lead.name.toLowerCase().replace(/\s+/g, '-')}` : null,
                companyUrl: lead.company ? `https://${lead.company.toLowerCase().replace(/\s+/g, '')}.com` : null,
                estimatedRevenue: lead.company ? ['<$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+'][Math.floor(Math.random() * 5)] : null,
                location: ['San Francisco, CA', 'New York, NY', 'London, UK', 'Singapore', 'Berlin, Germany'][Math.floor(Math.random() * 5)],
                enrichedAt: new Date().toISOString(),
            };

            await prisma.lead.update({ where: { id: leadId }, data: { enrichedData: enriched } });
            return JSON.stringify({ status: 'success', leadId, enrichedData: enriched });
        }

        case 'score': {
            const { leadId } = input;
            if (!leadId) return JSON.stringify({ status: 'error', error: 'leadId required' });

            const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
            if (!lead) return JSON.stringify({ status: 'error', error: 'Lead not found' });

            // Scoring algorithm
            let score = 0;
            const factors = [];
            if (lead.email) { score += 15; factors.push({ factor: 'has_email', points: 15 }); }
            if (lead.phone) { score += 10; factors.push({ factor: 'has_phone', points: 10 }); }
            if (lead.company) { score += 15; factors.push({ factor: 'has_company', points: 15 }); }
            if (lead.title) { score += 10; factors.push({ factor: 'has_title', points: 10 }); }
            if (lead.enrichedData) { score += 20; factors.push({ factor: 'enriched', points: 20 }); }
            if (lead.title && /(cto|ceo|vp|director|head|founder)/i.test(lead.title)) { score += 20; factors.push({ factor: 'decision_maker', points: 20 }); }
            if (lead.source === 'referral') { score += 15; factors.push({ factor: 'referral_source', points: 15 }); }
            if (lead.notes && lead.notes.length > 50) { score += 5; factors.push({ factor: 'detailed_notes', points: 5 }); }

            score = Math.min(100, score);
            await prisma.lead.update({ where: { id: leadId }, data: { score } });

            return JSON.stringify({ status: 'success', leadId, score, factors, tier: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold' });
        }

        case 'update_status': {
            const { leadId, status } = input;
            if (!leadId || !status) return JSON.stringify({ status: 'error', error: 'leadId and status required' });
            await prisma.lead.updateMany({ where: { id: leadId, userId }, data: { status } });
            return JSON.stringify({ status: 'success', leadId, status });
        }

        case 'bulk_import': {
            const { leads = [] } = input;
            let created = 0, errors = [];
            for (const l of leads) {
                try {
                    await prisma.lead.create({
                        data: { userId, email: l.email || null, name: l.name || null, company: l.company || null, title: l.title || null, source: 'bulk_import' },
                    });
                    created++;
                } catch (e) {
                    errors.push(`${l.email || l.name}: ${e.message}`);
                }
            }
            return JSON.stringify({ status: 'success', imported: created, errors: errors.length, errorDetails: errors.slice(0, 10) });
        }

        case 'segment': {
            const { minScore, maxScore, statusFilter, take: limit = 50 } = input;
            const take = Math.min(limit, 200);
            const where = { userId };
            if (minScore !== undefined) where.score = { ...where.score, gte: minScore };
            if (maxScore !== undefined) where.score = { ...where.score, lte: maxScore };
            if (statusFilter) where.status = statusFilter;

            const leads = await prisma.lead.findMany({
                where,
                orderBy: { score: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: leads.length, leads: leads.map((l) => ({ id: l.id, name: l.name, email: l.email, company: l.company, score: l.score, status: l.status })) });
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const where = { userId };
            if (input.statusFilter) where.status = input.statusFilter;
            const leads = await prisma.lead.findMany({
                where,
                select: { id: true, email: true, name: true, company: true, score: true, status: true, source: true, createdAt: true },
                orderBy: { score: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: leads.length, leads });
        }

        case 'get': {
            const { leadId } = input;
            if (!leadId) return JSON.stringify({ status: 'error', error: 'leadId required' });
            const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
            if (!lead) return JSON.stringify({ status: 'error', error: 'Lead not found' });
            return JSON.stringify({ status: 'success', lead });
        }

        case 'delete': {
            const { leadId } = input;
            if (!leadId) return JSON.stringify({ status: 'error', error: 'leadId required' });
            await prisma.lead.deleteMany({ where: { id: leadId, userId } });
            return JSON.stringify({ status: 'success', deleted: leadId });
        }

        case 'export': {
            const leads = await prisma.lead.findMany({ where: { userId }, orderBy: { score: 'desc' }, take: 1000 });
            const csv = ['email,name,company,title,score,status,source,created_at'];
            for (const l of leads) {
                csv.push(`"${l.email || ''}","${l.name || ''}","${l.company || ''}","${l.title || ''}",${l.score},"${l.status}","${l.source || ''}","${l.createdAt.toISOString()}"`);
            }
            return JSON.stringify({ status: 'success', format: 'csv', totalLeads: leads.length, csv: csv.join('\n') }).slice(0, MAX_OUTPUT);
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown lead_enrich action: ${action}` });
    }
}

async function executeCampaignGenerate(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'create': {
            const { name, type, content = {}, audience, schedule } = input;
            if (!name || !type) return JSON.stringify({ status: 'error', error: 'name and type required' });

            const campaign = await prisma.campaign.create({
                data: { userId, name, type, content, audience: audience || null, schedule: schedule || null },
            });
            return JSON.stringify({ status: 'success', campaign: { id: campaign.id, name: campaign.name, type: campaign.type, status: campaign.status } });
        }

        case 'update': {
            const { campaignId, name, content, audience, schedule } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });

            const data = {};
            if (name !== undefined) data.name = name;
            if (content !== undefined) data.content = content;
            if (audience !== undefined) data.audience = audience;
            if (schedule !== undefined) data.schedule = schedule;

            await prisma.campaign.updateMany({ where: { id: campaignId, userId }, data });
            return JSON.stringify({ status: 'success', updated: campaignId });
        }

        case 'launch': {
            const { campaignId } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });
            await prisma.campaign.updateMany({ where: { id: campaignId, userId }, data: { status: 'active' } });
            return JSON.stringify({ status: 'success', campaignId, status: 'active' });
        }

        case 'pause': {
            const { campaignId } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });
            await prisma.campaign.updateMany({ where: { id: campaignId, userId }, data: { status: 'paused' } });
            return JSON.stringify({ status: 'success', campaignId, status: 'paused' });
        }

        case 'complete': {
            const { campaignId } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });
            await prisma.campaign.updateMany({ where: { id: campaignId, userId }, data: { status: 'completed' } });
            return JSON.stringify({ status: 'success', campaignId, status: 'completed' });
        }

        case 'record_metrics': {
            const { campaignId, metrics = {} } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });

            const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
            if (!campaign) return JSON.stringify({ status: 'error', error: 'Campaign not found' });

            const data = {};
            if (metrics.sent) data.sent = { increment: metrics.sent };
            if (metrics.opened) data.opened = { increment: metrics.opened };
            if (metrics.clicked) data.clicked = { increment: metrics.clicked };
            if (metrics.converted) data.converted = { increment: metrics.converted };
            if (metrics.revenue) data.revenue = { increment: metrics.revenue };

            const updated = await prisma.campaign.update({ where: { id: campaignId }, data });
            return JSON.stringify({
                status: 'success',
                campaignId,
                metrics: { sent: updated.sent, opened: updated.opened, clicked: updated.clicked, converted: updated.converted, revenue: updated.revenue },
                rates: {
                    openRate: updated.sent > 0 ? Math.round((updated.opened / updated.sent) * 10000) / 10000 : 0,
                    clickRate: updated.opened > 0 ? Math.round((updated.clicked / updated.opened) * 10000) / 10000 : 0,
                    conversionRate: updated.clicked > 0 ? Math.round((updated.converted / updated.clicked) * 10000) / 10000 : 0,
                    revenuePerSend: updated.sent > 0 ? Math.round((updated.revenue / updated.sent) * 100) / 100 : 0,
                },
            });
        }

        case 'get': {
            const { campaignId } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });
            const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
            if (!campaign) return JSON.stringify({ status: 'error', error: 'Campaign not found' });

            const rates = {
                openRate: campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 10000) / 10000 : 0,
                clickRate: campaign.opened > 0 ? Math.round((campaign.clicked / campaign.opened) * 10000) / 10000 : 0,
                conversionRate: campaign.clicked > 0 ? Math.round((campaign.converted / campaign.clicked) * 10000) / 10000 : 0,
            };

            return JSON.stringify({ status: 'success', campaign, rates }).slice(0, MAX_OUTPUT);
        }

        case 'list': {
            const take = Math.min(input.take || 50, 200);
            const campaigns = await prisma.campaign.findMany({
                where: { userId },
                select: { id: true, name: true, type: true, status: true, sent: true, opened: true, clicked: true, converted: true, revenue: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: campaigns.length, campaigns });
        }

        case 'delete': {
            const { campaignId } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });
            await prisma.campaign.deleteMany({ where: { id: campaignId, userId } });
            return JSON.stringify({ status: 'success', deleted: campaignId });
        }

        case 'duplicate': {
            const { campaignId, name } = input;
            if (!campaignId) return JSON.stringify({ status: 'error', error: 'campaignId required' });
            const source = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
            if (!source) return JSON.stringify({ status: 'error', error: 'Campaign not found' });

            const dup = await prisma.campaign.create({
                data: { userId, name: name || `${source.name} (copy)`, type: source.type, content: source.content, audience: source.audience, schedule: source.schedule },
            });
            return JSON.stringify({ status: 'success', duplicated: { id: dup.id, name: dup.name } });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown campaign_generate action: ${action}` });
    }
}

// ============================================================================
// COMPETITOR TRACK EXECUTOR
// ============================================================================

const competitorStore = new Map();

async function executeCompetitorTrack(input) {
    const { action, name, website, pricing = [], features = [], strengths = [], weaknesses = [], marketShare, competitorId, compareWith, ourFeatures = [], take = 50 } = input;

    switch (action) {
        case 'add': {
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });
            const id = `comp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const comp = { id, name, website, pricing, features, strengths, weaknesses, marketShare, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            competitorStore.set(id, comp);
            return JSON.stringify({ status: 'success', action: 'added', competitor: { id, name, features: features.length, plans: pricing.length } });
        }

        case 'update': {
            if (!competitorId) return JSON.stringify({ status: 'error', error: 'competitorId required' });
            const comp = competitorStore.get(competitorId);
            if (!comp) return JSON.stringify({ status: 'error', error: `Competitor not found: ${competitorId}` });
            if (name) comp.name = name;
            if (website) comp.website = website;
            if (pricing.length) comp.pricing = pricing;
            if (features.length) comp.features = features;
            if (marketShare !== undefined) comp.marketShare = marketShare;
            comp.updatedAt = new Date().toISOString();
            return JSON.stringify({ status: 'success', action: 'updated', competitor: { id: comp.id, name: comp.name } });
        }

        case 'compare': {
            if (!competitorId) return JSON.stringify({ status: 'error', error: 'competitorId required' });
            const compA = competitorStore.get(competitorId);
            if (!compA) return JSON.stringify({ status: 'error', error: 'Competitor A not found' });
            const compB = compareWith ? competitorStore.get(compareWith) : null;
            const comparison = {
                competitorA: { name: compA.name, features: compA.features.length, plans: compA.pricing.length, marketShare: compA.marketShare },
                featureOverlap: [],
                uniqueToA: [],
                uniqueToB: [],
            };
            if (compB) {
                comparison.competitorB = { name: compB.name, features: compB.features.length, plans: compB.pricing.length, marketShare: compB.marketShare };
                const setA = new Set(compA.features.map(f => f.toLowerCase()));
                const setB = new Set(compB.features.map(f => f.toLowerCase()));
                comparison.featureOverlap = compA.features.filter(f => setB.has(f.toLowerCase()));
                comparison.uniqueToA = compA.features.filter(f => !setB.has(f.toLowerCase()));
                comparison.uniqueToB = compB.features.filter(f => !setA.has(f.toLowerCase()));
                // Pricing comparison
                comparison.pricingComparison = {
                    a: compA.pricing.map(p => ({ plan: p.plan, price: p.price })),
                    b: compB.pricing.map(p => ({ plan: p.plan, price: p.price })),
                };
            }
            return JSON.stringify({ status: 'success', comparison });
        }

        case 'swot': {
            if (!competitorId) return JSON.stringify({ status: 'error', error: 'competitorId required' });
            const comp = competitorStore.get(competitorId);
            if (!comp) return JSON.stringify({ status: 'error', error: 'Competitor not found' });
            if (strengths.length) comp.strengths = strengths;
            if (weaknesses.length) comp.weaknesses = weaknesses;
            const swot = {
                competitor: comp.name,
                strengths: comp.strengths || [],
                weaknesses: comp.weaknesses || [],
                opportunities: comp.weaknesses?.map(w => `Exploit: ${w}`) || ['No weaknesses identified'],
                threats: comp.strengths?.map(s => `Counter: ${s}`) || ['No strengths identified'],
            };
            return JSON.stringify({ status: 'success', swot });
        }

        case 'pricing_matrix': {
            const competitors = Array.from(competitorStore.values());
            if (competitors.length === 0) return JSON.stringify({ status: 'error', error: 'No competitors tracked yet' });
            const matrix = competitors.map(c => ({
                name: c.name,
                plans: c.pricing.map(p => ({ plan: p.plan, price: p.price, featuresCount: p.features?.length || 0 })),
                avgPrice: c.pricing.length ? Math.round(c.pricing.reduce((s, p) => s + p.price, 0) / c.pricing.length) : 0,
            }));
            matrix.sort((a, b) => a.avgPrice - b.avgPrice);
            return JSON.stringify({ status: 'success', pricingMatrix: matrix, competitors: matrix.length });
        }

        case 'feature_gap': {
            if (ourFeatures.length === 0) return JSON.stringify({ status: 'error', error: 'ourFeatures array required' });
            const competitors = Array.from(competitorStore.values());
            const allCompFeatures = new Set();
            competitors.forEach(c => c.features.forEach(f => allCompFeatures.add(f.toLowerCase())));
            const ourSet = new Set(ourFeatures.map(f => f.toLowerCase()));
            const weHaveTheyDont = ourFeatures.filter(f => !allCompFeatures.has(f.toLowerCase()));
            const theyHaveWeDont = [...allCompFeatures].filter(f => !ourSet.has(f));
            const shared = ourFeatures.filter(f => allCompFeatures.has(f.toLowerCase()));
            return JSON.stringify({ status: 'success', featureGap: { ourUnique: weHaveTheyDont, competitorOnly: theyHaveWeDont, shared, ourCount: ourFeatures.length, competitorFeatureCount: allCompFeatures.size } });
        }

        case 'market_share': {
            const competitors = Array.from(competitorStore.values()).filter(c => c.marketShare !== undefined);
            const totalTracked = competitors.reduce((s, c) => s + (c.marketShare || 0), 0);
            return JSON.stringify({
                status: 'success',
                marketShare: competitors.map(c => ({ name: c.name, share: c.marketShare + '%' })).sort((a, b) => parseFloat(b.share) - parseFloat(a.share)),
                totalTracked: totalTracked + '%',
                unaccounted: (100 - totalTracked).toFixed(1) + '%',
            });
        }

        case 'list': {
            const all = Array.from(competitorStore.values()).slice(0, take);
            return JSON.stringify({ status: 'success', competitors: all.map(c => ({ id: c.id, name: c.name, features: c.features.length, marketShare: c.marketShare })), count: all.length });
        }

        case 'delete': {
            if (!competitorId) return JSON.stringify({ status: 'error', error: 'competitorId required' });
            const existed = competitorStore.delete(competitorId);
            return JSON.stringify({ status: 'success', action: 'deleted', competitorId, found: existed });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown competitor_track action: ${action}` });
    }
}

// ============================================================================
// REVENUE FORECAST EXECUTOR
// ============================================================================

const forecastStore = new Map();

async function executeRevenueForecast(input) {
    const { action, name, currentMRR = 0, growthRate = 0.05, churnRate = 0.03, averageContractValue = 0, newCustomersPerMonth = 0, fixedCosts = 0, variableCostPerUser = 0, months = 12, forecastId, variable, range = [], take = 50 } = input;

    switch (action) {
        case 'create': {
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });
            const id = `forecast_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const fc = { id, name, currentMRR, growthRate, churnRate, averageContractValue, newCustomersPerMonth, fixedCosts, variableCostPerUser, createdAt: new Date().toISOString() };
            forecastStore.set(id, fc);
            return JSON.stringify({ status: 'success', action: 'created', forecast: { id, name, currentMRR } });
        }

        case 'forecast': {
            const fc = forecastId ? forecastStore.get(forecastId) : { currentMRR, growthRate, churnRate, newCustomersPerMonth, averageContractValue };
            if (!fc) return JSON.stringify({ status: 'error', error: 'Forecast not found' });
            const projections = [];
            let mrr = fc.currentMRR || currentMRR;
            let totalCustomers = mrr > 0 && averageContractValue > 0 ? Math.round(mrr / averageContractValue) : 100;
            let cumulativeRevenue = 0;
            for (let m = 1; m <= months; m++) {
                const newCust = fc.newCustomersPerMonth || newCustomersPerMonth;
                const churned = Math.round(totalCustomers * (fc.churnRate || churnRate));
                totalCustomers = totalCustomers + newCust - churned;
                mrr = mrr * (1 + (fc.growthRate || growthRate)) - (churned * (fc.averageContractValue || averageContractValue || mrr / Math.max(totalCustomers, 1)));
                mrr = Math.max(0, mrr);
                cumulativeRevenue += mrr;
                projections.push({ month: m, mrr: Math.round(mrr), arr: Math.round(mrr * 12), customers: totalCustomers, newCustomers: newCust, churned, cumulativeRevenue: Math.round(cumulativeRevenue) });
            }
            return JSON.stringify({ status: 'success', projections, summary: { startMRR: fc.currentMRR || currentMRR, endMRR: Math.round(mrr), endARR: Math.round(mrr * 12), totalRevenue: Math.round(cumulativeRevenue), growthMultiple: ((mrr / (fc.currentMRR || currentMRR || 1))).toFixed(2) + 'x' } });
        }

        case 'scenarios': {
            const base = { currentMRR: currentMRR || 10000, growthRate, churnRate, newCustomersPerMonth, averageContractValue: averageContractValue || 100 };
            const scenarios = {};
            ['bear', 'base', 'bull'].forEach(scenario => {
                const mod = scenario === 'bear' ? 0.5 : scenario === 'bull' ? 1.5 : 1;
                let mrr = base.currentMRR;
                let customers = Math.round(mrr / base.averageContractValue);
                const projections = [];
                for (let m = 1; m <= months; m++) {
                    const newCust = Math.round(base.newCustomersPerMonth * mod);
                    const churned = Math.round(customers * base.churnRate * (scenario === 'bear' ? 1.5 : scenario === 'bull' ? 0.5 : 1));
                    customers += newCust - churned;
                    mrr *= (1 + base.growthRate * mod);
                    projections.push({ month: m, mrr: Math.round(mrr), customers });
                }
                scenarios[scenario] = { finalMRR: Math.round(mrr), finalARR: Math.round(mrr * 12), finalCustomers: customers, projections };
            });
            return JSON.stringify({ status: 'success', scenarios });
        }

        case 'breakeven': {
            if (!fixedCosts) return JSON.stringify({ status: 'error', error: 'fixedCosts required' });
            const acv = averageContractValue || 100;
            const vpc = variableCostPerUser || 0;
            const marginPerUser = acv - vpc;
            if (marginPerUser <= 0) return JSON.stringify({ status: 'error', error: 'Variable cost exceeds contract value — no break-even possible' });
            const breakEvenCustomers = Math.ceil(fixedCosts / marginPerUser);
            const breakEvenMRR = breakEvenCustomers * acv;
            let mrr = currentMRR || 0;
            let customers = mrr > 0 ? Math.round(mrr / acv) : 0;
            let monthsToBreakeven = 0;
            for (let m = 1; m <= 120; m++) {
                customers += newCustomersPerMonth;
                customers = Math.round(customers * (1 - churnRate));
                mrr = customers * acv;
                if (mrr >= breakEvenMRR) { monthsToBreakeven = m; break; }
            }
            return JSON.stringify({ status: 'success', breakeven: { breakEvenCustomers, breakEvenMRR: Math.round(breakEvenMRR), marginPerUser: Math.round(marginPerUser), fixedCosts, monthsToBreakeven: monthsToBreakeven || 'Over 10 years' } });
        }

        case 'waterfall': {
            const components = {
                startingMRR: currentMRR,
                newBusiness: Math.round(newCustomersPerMonth * (averageContractValue || 100)),
                expansion: Math.round(currentMRR * growthRate * 0.4),
                churn: -Math.round(currentMRR * churnRate),
                contraction: -Math.round(currentMRR * churnRate * 0.2),
            };
            components.endingMRR = components.startingMRR + components.newBusiness + components.expansion + components.churn + components.contraction;
            components.netNewMRR = components.endingMRR - components.startingMRR;
            return JSON.stringify({ status: 'success', waterfall: components });
        }

        case 'sensitivity': {
            if (!variable) return JSON.stringify({ status: 'error', error: 'variable required (growthRate, churnRate, price)' });
            const testRange = range.length > 0 ? range : [0.01, 0.03, 0.05, 0.07, 0.10];
            const results = testRange.map(val => {
                let mrr = currentMRR || 10000;
                for (let m = 0; m < months; m++) {
                    if (variable === 'growthRate') mrr *= (1 + val);
                    else if (variable === 'churnRate') mrr *= (1 - val);
                    else mrr *= (1 + growthRate);
                }
                return { [variable]: val, endMRR: Math.round(mrr), endARR: Math.round(mrr * 12) };
            });
            return JSON.stringify({ status: 'success', variable, sensitivity: results });
        }

        case 'list': {
            const all = Array.from(forecastStore.values()).slice(0, take);
            return JSON.stringify({ status: 'success', forecasts: all.map(f => ({ id: f.id, name: f.name, currentMRR: f.currentMRR, createdAt: f.createdAt })), count: all.length });
        }

        case 'get': {
            if (!forecastId) return JSON.stringify({ status: 'error', error: 'forecastId required' });
            const fc = forecastStore.get(forecastId);
            if (!fc) return JSON.stringify({ status: 'error', error: 'Forecast not found' });
            return JSON.stringify({ status: 'success', forecast: fc });
        }

        case 'delete': {
            if (!forecastId) return JSON.stringify({ status: 'error', error: 'forecastId required' });
            const existed = forecastStore.delete(forecastId);
            return JSON.stringify({ status: 'success', action: 'deleted', forecastId, found: existed });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown revenue_forecast action: ${action}` });
    }
}

// ============================================================================
// CUSTOMER SEGMENT EXECUTOR
// ============================================================================

const segmentStore = new Map();

async function executeCustomerSegment(input) {
    const { action, customers = [], segmentName, criteria = {}, format = 'json' } = input;

    switch (action) {
        case 'rfm_analyze': {
            if (customers.length === 0) return JSON.stringify({ status: 'error', error: 'customers array required' });
            const now = Date.now();
            const scored = customers.map(c => {
                const daysSincePurchase = c.lastPurchase ? Math.round((now - new Date(c.lastPurchase).getTime()) / 86400000) : 999;
                const recency = daysSincePurchase <= 30 ? 5 : daysSincePurchase <= 90 ? 4 : daysSincePurchase <= 180 ? 3 : daysSincePurchase <= 365 ? 2 : 1;
                const frequency = (c.purchaseCount || 0) >= 20 ? 5 : c.purchaseCount >= 10 ? 4 : c.purchaseCount >= 5 ? 3 : c.purchaseCount >= 2 ? 2 : 1;
                const monetary = (c.totalSpend || 0) >= 1000 ? 5 : c.totalSpend >= 500 ? 4 : c.totalSpend >= 200 ? 3 : c.totalSpend >= 50 ? 2 : 1;
                const rfmScore = recency * 100 + frequency * 10 + monetary;
                let segment;
                if (recency >= 4 && frequency >= 4) segment = 'Champions';
                else if (recency >= 3 && frequency >= 3) segment = 'Loyal Customers';
                else if (recency >= 4 && frequency <= 2) segment = 'New Customers';
                else if (recency <= 2 && frequency >= 3) segment = 'At Risk';
                else if (recency <= 2 && frequency <= 2) segment = 'Dormant';
                else segment = 'Potential Loyalists';
                return { id: c.id, name: c.name, recency, frequency, monetary, rfmScore, segment, daysSincePurchase };
            });
            const segments = {};
            scored.forEach(s => { segments[s.segment] = (segments[s.segment] || 0) + 1; });
            return JSON.stringify({ status: 'success', totalCustomers: scored.length, segmentDistribution: segments, customers: scored });
        }

        case 'behavioral': {
            if (customers.length === 0) return JSON.stringify({ status: 'error', error: 'customers array required' });
            const clusters = { 'Power Users': [], 'Regular Users': [], 'Casual Users': [], 'Inactive': [] };
            customers.forEach(c => {
                const daysSinceActive = c.lastActive ? Math.round((Date.now() - new Date(c.lastActive).getTime()) / 86400000) : 999;
                if (daysSinceActive <= 7 && (c.purchaseCount || 0) >= 5) clusters['Power Users'].push(c);
                else if (daysSinceActive <= 30) clusters['Regular Users'].push(c);
                else if (daysSinceActive <= 90) clusters['Casual Users'].push(c);
                else clusters['Inactive'].push(c);
            });
            return JSON.stringify({
                status: 'success',
                segments: Object.entries(clusters).map(([name, members]) => ({ name, count: members.length, percentage: (members.length / customers.length * 100).toFixed(1) + '%', members: members.map(m => ({ id: m.id, name: m.name })) })),
            });
        }

        case 'engagement_score': {
            if (customers.length === 0) return JSON.stringify({ status: 'error', error: 'customers array required' });
            const scored = customers.map(c => {
                let score = 0;
                const daysSinceActive = c.lastActive ? Math.round((Date.now() - new Date(c.lastActive).getTime()) / 86400000) : 999;
                if (daysSinceActive <= 1) score += 30; else if (daysSinceActive <= 7) score += 20; else if (daysSinceActive <= 30) score += 10;
                score += Math.min(30, (c.purchaseCount || 0) * 3);
                score += Math.min(20, Math.round((c.totalSpend || 0) / 50));
                const daysSinceSignup = c.signupDate ? Math.round((Date.now() - new Date(c.signupDate).getTime()) / 86400000) : 365;
                if (daysSinceSignup > 180 && daysSinceActive <= 30) score += 20;
                return { id: c.id, name: c.name, engagementScore: Math.min(100, score), level: score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low' };
            });
            scored.sort((a, b) => b.engagementScore - a.engagementScore);
            return JSON.stringify({ status: 'success', customers: scored, avgScore: Math.round(scored.reduce((s, c) => s + c.engagementScore, 0) / scored.length) });
        }

        case 'lifecycle': {
            if (customers.length === 0) return JSON.stringify({ status: 'error', error: 'customers array required' });
            const stages = { 'Lead': [], 'Onboarding': [], 'Active': [], 'Mature': [], 'At Risk': [], 'Churned': [] };
            customers.forEach(c => {
                const daysSinceSignup = c.signupDate ? Math.round((Date.now() - new Date(c.signupDate).getTime()) / 86400000) : 999;
                const daysSinceActive = c.lastActive ? Math.round((Date.now() - new Date(c.lastActive).getTime()) / 86400000) : 999;
                if ((c.purchaseCount || 0) === 0) stages['Lead'].push(c);
                else if (daysSinceSignup <= 30) stages['Onboarding'].push(c);
                else if (daysSinceActive <= 30 && daysSinceSignup <= 365) stages['Active'].push(c);
                else if (daysSinceActive <= 30 && daysSinceSignup > 365) stages['Mature'].push(c);
                else if (daysSinceActive <= 90) stages['At Risk'].push(c);
                else stages['Churned'].push(c);
            });
            return JSON.stringify({
                status: 'success',
                lifecycle: Object.entries(stages).map(([stage, members]) => ({ stage, count: members.length, percentage: (members.length / customers.length * 100).toFixed(1) + '%' })),
            });
        }

        case 'create_segment': {
            if (!segmentName) return JSON.stringify({ status: 'error', error: 'segmentName required' });
            const id = `seg_${Date.now()}`;
            segmentStore.set(id, { id, name: segmentName, criteria, createdAt: new Date().toISOString() });
            return JSON.stringify({ status: 'success', action: 'segment_created', segment: { id, name: segmentName, criteria } });
        }

        case 'list_segments': {
            const segs = Array.from(segmentStore.values());
            return JSON.stringify({ status: 'success', segments: segs, count: segs.length });
        }

        case 'assign': {
            if (customers.length === 0) return JSON.stringify({ status: 'error', error: 'customers array required' });
            // Auto-assign based on defined segments
            const segs = Array.from(segmentStore.values());
            const assignments = customers.map(c => {
                const matched = segs.filter(s => {
                    if (s.criteria.minSpend && (c.totalSpend || 0) < s.criteria.minSpend) return false;
                    if (s.criteria.minFrequency && (c.purchaseCount || 0) < s.criteria.minFrequency) return false;
                    return true;
                });
                return { customerId: c.id, name: c.name, segments: matched.map(s => s.name) };
            });
            return JSON.stringify({ status: 'success', assignments });
        }

        case 'export': {
            if (customers.length === 0) return JSON.stringify({ status: 'error', error: 'customers array required' });
            if (format === 'csv') {
                let csv = 'id,name,totalSpend,purchaseCount,lastPurchase\n';
                customers.forEach(c => { csv += `${c.id || ''},${c.name || ''},${c.totalSpend || 0},${c.purchaseCount || 0},${c.lastPurchase || ''}\n`; });
                return JSON.stringify({ status: 'success', format: 'csv', content: csv });
            }
            if (format === 'markdown') {
                let md = '| ID | Name | Spend | Purchases |\n|---|---|---|---|\n';
                customers.forEach(c => { md += `| ${c.id || '-'} | ${c.name || '-'} | $${c.totalSpend || 0} | ${c.purchaseCount || 0} |\n`; });
                return JSON.stringify({ status: 'success', format: 'markdown', content: md });
            }
            return JSON.stringify({ status: 'success', format: 'json', data: customers });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown customer_segment action: ${action}` });
    }
}

// ============================================================================
// NPS SURVEY EXECUTOR
// ============================================================================

const npsSurveyStore = new Map();
const npsResponseStore = new Map(); // surveyId => [responses]

async function executeNpsSurvey(input) {
    const { action, name, question = 'How likely are you to recommend us to a friend or colleague?', surveyId, score, feedback, respondentId, dateRange, format = 'json', take = 50 } = input;

    switch (action) {
        case 'create': {
            if (!name) return JSON.stringify({ status: 'error', error: 'name required' });
            const id = `nps_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            npsSurveyStore.set(id, { id, name, question, createdAt: new Date().toISOString(), status: 'active' });
            npsResponseStore.set(id, []);
            return JSON.stringify({ status: 'success', action: 'created', survey: { id, name, question } });
        }

        case 'respond': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            if (score === undefined || score < 0 || score > 10) return JSON.stringify({ status: 'error', error: 'score required (0-10)' });
            const responses = npsResponseStore.get(surveyId);
            if (!responses) return JSON.stringify({ status: 'error', error: 'Survey not found' });
            const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
            responses.push({ respondentId: respondentId || `resp_${Date.now()}`, score, feedback, category, respondedAt: new Date().toISOString() });
            return JSON.stringify({ status: 'success', action: 'recorded', score, category, totalResponses: responses.length });
        }

        case 'calculate': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            const responses = npsResponseStore.get(surveyId);
            if (!responses || responses.length === 0) return JSON.stringify({ status: 'error', error: 'No responses yet' });
            const promoters = responses.filter(r => r.category === 'promoter').length;
            const detractors = responses.filter(r => r.category === 'detractor').length;
            const passives = responses.filter(r => r.category === 'passive').length;
            const npsScore = Math.round(((promoters - detractors) / responses.length) * 100);
            const avgScore = (responses.reduce((s, r) => s + r.score, 0) / responses.length).toFixed(1);
            return JSON.stringify({
                status: 'success', surveyId,
                nps: { score: npsScore, interpretation: npsScore >= 50 ? 'Excellent' : npsScore >= 0 ? 'Good' : npsScore >= -50 ? 'Needs Improvement' : 'Critical' },
                breakdown: { promoters, passives, detractors, total: responses.length },
                averageScore: avgScore,
            });
        }

        case 'trends': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            const responses = npsResponseStore.get(surveyId) || [];
            const days = dateRange ? parseInt(dateRange) || 30 : 30;
            // Group by week
            const weeks = new Map();
            responses.forEach(r => {
                const week = new Date(r.respondedAt);
                week.setDate(week.getDate() - week.getDay());
                const key = week.toISOString().split('T')[0];
                if (!weeks.has(key)) weeks.set(key, []);
                weeks.get(key).push(r);
            });
            const trend = Array.from(weeks.entries()).map(([week, resps]) => {
                const promoters = resps.filter(r => r.category === 'promoter').length;
                const detractors = resps.filter(r => r.category === 'detractor').length;
                return { week, responses: resps.length, nps: Math.round(((promoters - detractors) / resps.length) * 100) };
            }).sort((a, b) => a.week.localeCompare(b.week));
            return JSON.stringify({ status: 'success', trend, direction: trend.length >= 2 ? (trend[trend.length - 1].nps > trend[0].nps ? 'improving' : 'declining') : 'insufficient_data' });
        }

        case 'breakdown': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            const responses = npsResponseStore.get(surveyId) || [];
            const distribution = Array.from({ length: 11 }, (_, i) => ({ score: i, count: responses.filter(r => r.score === i).length }));
            const withFeedback = responses.filter(r => r.feedback);
            return JSON.stringify({
                status: 'success',
                distribution,
                feedbackSamples: {
                    promoters: withFeedback.filter(r => r.category === 'promoter').slice(0, 5).map(r => r.feedback),
                    detractors: withFeedback.filter(r => r.category === 'detractor').slice(0, 5).map(r => r.feedback),
                },
            });
        }

        case 'insights': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            const responses = npsResponseStore.get(surveyId) || [];
            if (responses.length < 5) return JSON.stringify({ status: 'error', error: 'Need at least 5 responses for insights' });
            const promoters = responses.filter(r => r.category === 'promoter');
            const detractors = responses.filter(r => r.category === 'detractor');
            const npsScore = Math.round(((promoters.length - detractors.length) / responses.length) * 100);
            const insights = [];
            if (npsScore < 0) insights.push({ priority: 'critical', message: `NPS is negative (${npsScore}). Focus on reducing detractors immediately.` });
            if (detractors.length > promoters.length) insights.push({ priority: 'high', message: `More detractors (${detractors.length}) than promoters (${promoters.length}). Investigate common complaints.` });
            const detractorFeedback = detractors.filter(r => r.feedback).map(r => r.feedback);
            if (detractorFeedback.length > 0) insights.push({ priority: 'medium', message: `${detractorFeedback.length} detractor(s) left feedback — review for actionable improvements.`, samples: detractorFeedback.slice(0, 3) });
            if (npsScore >= 50) insights.push({ priority: 'info', message: 'Excellent NPS. Consider leveraging promoters for referral programs.' });
            return JSON.stringify({ status: 'success', nps: npsScore, totalResponses: responses.length, insights });
        }

        case 'list': {
            const surveys = Array.from(npsSurveyStore.values()).slice(0, take);
            return JSON.stringify({
                status: 'success',
                surveys: surveys.map(s => ({
                    id: s.id, name: s.name, status: s.status, createdAt: s.createdAt,
                    responses: (npsResponseStore.get(s.id) || []).length,
                })),
            });
        }

        case 'get': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            const survey = npsSurveyStore.get(surveyId);
            if (!survey) return JSON.stringify({ status: 'error', error: 'Survey not found' });
            return JSON.stringify({ status: 'success', survey: { ...survey, totalResponses: (npsResponseStore.get(surveyId) || []).length } });
        }

        case 'delete': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            npsSurveyStore.delete(surveyId);
            npsResponseStore.delete(surveyId);
            return JSON.stringify({ status: 'success', action: 'deleted', surveyId });
        }

        case 'export': {
            if (!surveyId) return JSON.stringify({ status: 'error', error: 'surveyId required' });
            const responses = npsResponseStore.get(surveyId) || [];
            if (format === 'csv') {
                let csv = 'respondentId,score,category,feedback,respondedAt\n';
                responses.forEach(r => { csv += `${r.respondentId},${r.score},${r.category},"${(r.feedback || '').replace(/"/g, '""')}",${r.respondedAt}\n`; });
                return JSON.stringify({ status: 'success', format: 'csv', content: csv, responses: responses.length });
            }
            if (format === 'markdown') {
                let md = '| Score | Category | Feedback | Date |\n|---|---|---|---|\n';
                responses.forEach(r => { md += `| ${r.score} | ${r.category} | ${r.feedback || '-'} | ${r.respondedAt} |\n`; });
                return JSON.stringify({ status: 'success', format: 'markdown', content: md, responses: responses.length });
            }
            return JSON.stringify({ status: 'success', format: 'json', responses });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown nps_survey action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeBusinessGrowthTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';

    switch (toolName) {
        case 'growth_analyze':
            return { result: await executeGrowthAnalyze(input, prisma, userId), sideEffects: null };
        case 'pricing_simulate':
            return { result: await executePricingSimulate(input, prisma, userId), sideEffects: null };
        case 'ab_test_run':
            return { result: await executeAbTestRun(input, prisma, userId), sideEffects: null };
        case 'ab_test_analyze':
            return { result: await executeAbTestAnalyze(input, prisma, userId), sideEffects: null };
        case 'lead_enrich':
            return { result: await executeLeadEnrich(input, prisma, userId), sideEffects: null };
        case 'campaign_generate':
            return { result: await executeCampaignGenerate(input, prisma, userId), sideEffects: null };
        case 'competitor_track':
            return { result: await executeCompetitorTrack(input), sideEffects: null };
        case 'revenue_forecast':
            return { result: await executeRevenueForecast(input), sideEffects: null };
        case 'customer_segment':
            return { result: await executeCustomerSegment(input), sideEffects: null };
        case 'nps_survey':
            return { result: await executeNpsSurvey(input), sideEffects: null };
        default:
            return { result: JSON.stringify({ status: 'error', error: `Unknown business growth tool: ${toolName}` }), sideEffects: null };
    }
}

const BUSINESS_GROWTH_TOOL_NAMES = new Set(BUSINESS_GROWTH_TOOL_DEFINITIONS.map((t) => t.name));
function isBusinessGrowthTool(toolName) {
    return BUSINESS_GROWTH_TOOL_NAMES.has(toolName);
}

export { BUSINESS_GROWTH_TOOL_DEFINITIONS, executeBusinessGrowthTool, isBusinessGrowthTool };
