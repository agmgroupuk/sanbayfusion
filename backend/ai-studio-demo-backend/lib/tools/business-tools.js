/**
 * BUSINESS & GROWTH TOOLS (6 tools)
 * growth_analyze, pricing_simulate, ab_test_run, ab_test_analyze, lead_enrich, campaign_generate
 *
 * Monetization intelligence: funnel analysis, churn detection, revenue modeling,
 * A/B experimentation, lead enrichment, campaign generation.
 * ALL state persisted in PostgreSQL via Prisma — NO localStorage.
 */

import { prisma } from '../prisma.js';
import crypto from 'crypto';

// ── growth_analyze ──────────────────────────────────────────────
async function growthAnalyze(params) {
    const { action = 'funnel', userId, ...opts } = params;

    try {
        switch (action) {
            case 'funnel': {
                if (!opts.stages) return { success: false, error: 'stages array required (e.g., ["visit","signup","activate","purchase"])' };
                const stages = opts.stages;
                const timeRange = opts.days || 30;
                const since = new Date(Date.now() - timeRange * 86400000);

                // Query analytics events for each stage
                const funnelData = [];
                let prevCount = null;
                for (const stage of stages) {
                    const count = await prisma.analyticsEvent.count({
                        where: { eventName: stage, timestamp: { gte: since }, ...(userId ? { userId } : {}) },
                    });
                    const dropoff = prevCount !== null ? ((prevCount - count) / prevCount * 100).toFixed(1) : '0';
                    const conversion = prevCount !== null ? (count / prevCount * 100).toFixed(1) : '100';
                    funnelData.push({ stage, count, conversionRate: `${conversion}%`, dropoffRate: `${dropoff}%` });
                    prevCount = count || 1;
                }

                const overallConversion = funnelData.length > 1 ? (funnelData[funnelData.length - 1].count / Math.max(funnelData[0].count, 1) * 100).toFixed(2) : '100';
                return { success: true, funnel: funnelData, overallConversion: `${overallConversion}%`, period: `${timeRange} days` };
            }

            case 'cohort': {
                const timeRange = opts.days || 90;
                const since = new Date(Date.now() - timeRange * 86400000);
                const granularity = opts.granularity || 'week'; // day, week, month

                const events = await prisma.analyticsEvent.findMany({
                    where: { timestamp: { gte: since }, eventName: opts.event || 'visit' },
                    select: { visitorId: true, timestamp: true },
                    orderBy: { timestamp: 'asc' },
                });

                // Group by cohort period
                const cohorts = {};
                for (const e of events) {
                    const cohortKey = getCohortKey(e.timestamp, granularity);
                    if (!cohorts[cohortKey]) cohorts[cohortKey] = new Set();
                    cohorts[cohortKey].add(e.visitorId);
                }

                // Calculate retention per cohort
                const cohortKeys = Object.keys(cohorts).sort();
                const retention = [];
                for (const key of cohortKeys) {
                    const users = cohorts[key];
                    const periods = [];
                    for (let i = 0; i < Math.min(cohortKeys.length - cohortKeys.indexOf(key), 8); i++) {
                        const nextKey = cohortKeys[cohortKeys.indexOf(key) + i];
                        if (!nextKey || !cohorts[nextKey]) break;
                        const retained = [...users].filter(u => cohorts[nextKey].has(u)).length;
                        periods.push({ period: i, retained, rate: (retained / users.size * 100).toFixed(1) + '%' });
                    }
                    retention.push({ cohort: key, size: users.size, retention: periods });
                }

                return { success: true, cohorts: retention, granularity, totalCohorts: retention.length };
            }

            case 'churn': {
                const inactiveDays = opts.inactiveDays || 30;
                const since = new Date(Date.now() - inactiveDays * 86400000);
                const activeBefore = new Date(Date.now() - inactiveDays * 2 * 86400000);

                // Users active in prior period but NOT in recent period
                const previouslyActive = await prisma.analyticsEvent.findMany({
                    where: { timestamp: { gte: activeBefore, lt: since } },
                    distinct: ['visitorId'],
                    select: { visitorId: true },
                });
                const recentlyActive = await prisma.analyticsEvent.findMany({
                    where: { timestamp: { gte: since } },
                    distinct: ['visitorId'],
                    select: { visitorId: true },
                });

                const recentSet = new Set(recentlyActive.map(e => e.visitorId));
                const churned = previouslyActive.filter(e => !recentSet.has(e.visitorId));
                const churnRate = previouslyActive.length > 0 ? (churned.length / previouslyActive.length * 100).toFixed(2) : '0';

                return {
                    success: true,
                    period: `${inactiveDays} days`,
                    previouslyActive: previouslyActive.length,
                    currentlyActive: recentlyActive.length,
                    churned: churned.length,
                    churnRate: `${churnRate}%`,
                    retentionRate: `${(100 - parseFloat(churnRate)).toFixed(2)}%`,
                };
            }

            case 'metrics': {
                const days = opts.days || 30;
                const since = new Date(Date.now() - days * 86400000);
                const [totalEvents, uniqueVisitors, uniqueSessions] = await Promise.all([
                    prisma.analyticsEvent.count({ where: { timestamp: { gte: since } } }),
                    prisma.analyticsEvent.findMany({ where: { timestamp: { gte: since } }, distinct: ['visitorId'], select: { visitorId: true } }),
                    prisma.analyticsEvent.findMany({ where: { timestamp: { gte: since } }, distinct: ['sessionId'], select: { sessionId: true } }),
                ]);

                return {
                    success: true,
                    period: `${days} days`,
                    totalEvents,
                    uniqueVisitors: uniqueVisitors.length,
                    uniqueSessions: uniqueSessions.length,
                    eventsPerVisitor: uniqueVisitors.length ? (totalEvents / uniqueVisitors.length).toFixed(1) : 0,
                    sessionsPerVisitor: uniqueVisitors.length ? (uniqueSessions.length / uniqueVisitors.length).toFixed(1) : 0,
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use funnel, cohort, churn, metrics.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── pricing_simulate ────────────────────────────────────────────
async function pricingSimulate(params) {
    const { action = 'model', ...opts } = params;

    try {
        switch (action) {
            case 'model': {
                if (!opts.plans) return { success: false, error: 'plans array required (e.g., [{ name, price, features }])' };
                const plans = opts.plans;
                const users = opts.totalUsers || 1000;
                const distribution = opts.distribution || null; // e.g., [0.6, 0.3, 0.1]

                const results = plans.map((plan, i) => {
                    const share = distribution ? distribution[i] : (1 / plans.length);
                    const subscribers = Math.round(users * share);
                    const mrr = subscribers * plan.price;
                    const arr = mrr * 12;
                    return {
                        plan: plan.name,
                        price: plan.price,
                        subscribers,
                        share: `${(share * 100).toFixed(0)}%`,
                        mrr: `$${mrr.toLocaleString()}`,
                        arr: `$${arr.toLocaleString()}`,
                        features: plan.features || [],
                    };
                });

                const totalMRR = results.reduce((s, r) => s + parseFloat(r.mrr.replace(/[$,]/g, '')), 0);
                const arpu = totalMRR / users;

                return {
                    success: true,
                    plans: results,
                    summary: {
                        totalUsers: users,
                        totalMRR: `$${totalMRR.toLocaleString()}`,
                        totalARR: `$${(totalMRR * 12).toLocaleString()}`,
                        arpu: `$${arpu.toFixed(2)}`,
                    },
                };
            }

            case 'elasticity': {
                if (!opts.basePrice || !opts.baseConversions) return { success: false, error: 'basePrice and baseConversions required' };
                const elasticity = opts.elasticity || -1.5; // price elasticity of demand
                const priceRange = opts.range || [0.5, 2.0]; // 50% to 200% of base price
                const steps = opts.steps || 10;

                const results = [];
                const step = (priceRange[1] - priceRange[0]) / steps;
                for (let mult = priceRange[0]; mult <= priceRange[1]; mult += step) {
                    const price = opts.basePrice * mult;
                    const priceChange = (mult - 1) * 100;
                    const demandChange = priceChange * elasticity / 100;
                    const conversions = Math.round(opts.baseConversions * (1 + demandChange));
                    const revenue = price * Math.max(conversions, 0);
                    results.push({
                        price: Math.round(price * 100) / 100,
                        priceChange: `${priceChange.toFixed(0)}%`,
                        conversions: Math.max(conversions, 0),
                        revenue: Math.round(revenue * 100) / 100,
                    });
                }

                const optimal = results.reduce((best, r) => r.revenue > best.revenue ? r : best, results[0]);
                return { success: true, analysis: results, optimalPrice: optimal.price, maxRevenue: optimal.revenue, elasticity };
            }

            case 'ltv': {
                const arpu = opts.arpu || opts.monthlyRevenue || 50;
                const churnRate = opts.churnRate || 0.05; // 5% monthly
                const margin = opts.margin || 0.7; // 70% gross margin
                const discount = opts.discountRate || 0.1; // 10% annual discount rate
                const months = opts.months || 36;

                let ltv = 0;
                let retained = 1;
                const monthlyDiscount = discount / 12;
                const projection = [];

                for (let m = 1; m <= months; m++) {
                    retained *= (1 - churnRate);
                    const revenue = arpu * retained * margin;
                    const discounted = revenue / Math.pow(1 + monthlyDiscount, m);
                    ltv += discounted;
                    if (m <= 12 || m % 6 === 0) {
                        projection.push({ month: m, retained: `${(retained * 100).toFixed(1)}%`, revenue: Math.round(revenue), cumulativeLTV: Math.round(ltv) });
                    }
                }

                return {
                    success: true,
                    ltv: Math.round(ltv),
                    inputs: { arpu, churnRate: `${(churnRate * 100).toFixed(1)}%`, margin: `${(margin * 100).toFixed(0)}%` },
                    projection,
                    paybackMonths: Math.ceil(ltv / arpu / margin),
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use model, elasticity, ltv.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── ab_test_run ─────────────────────────────────────────────────
async function abTestRun(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.name || !opts.variants) return { success: false, error: 'name and variants required' };
                const variants = opts.variants.map((v, i) => ({
                    id: v.id || `variant_${i}`,
                    name: v.name || (i === 0 ? 'Control' : `Variant ${String.fromCharCode(65 + i)}`),
                    weight: v.weight || (1 / opts.variants.length),
                    config: v.config || {},
                }));

                const test = await prisma.aBTest.create({
                    data: {
                        userId: userId || 'system',
                        name: opts.name,
                        description: opts.description || null,
                        hypothesis: opts.hypothesis || null,
                        metric: opts.metric || 'conversion_rate',
                        variants,
                        results: Object.fromEntries(variants.map(v => [v.id, { impressions: 0, conversions: 0, revenue: 0 }])),
                        status: 'draft',
                    },
                });
                return { success: true, test: { id: test.id, name: test.name, variants: variants.map(v => v.name), status: 'draft' } };
            }

            case 'start': {
                if (!opts.id) return { success: false, error: 'test id required' };
                const test = await prisma.aBTest.update({ where: { id: opts.id }, data: { status: 'running', startedAt: new Date() } });
                return { success: true, testId: test.id, status: 'running', startedAt: test.startedAt };
            }

            case 'record': {
                if (!opts.id || !opts.variantId) return { success: false, error: 'test id and variantId required' };
                const test = await prisma.aBTest.findUnique({ where: { id: opts.id } });
                if (!test) return { success: false, error: 'Test not found' };

                const results = test.results || {};
                const variant = results[opts.variantId] || { impressions: 0, conversions: 0, revenue: 0 };
                variant.impressions += opts.impressions || 1;
                if (opts.converted) variant.conversions += 1;
                if (opts.revenue) variant.revenue += opts.revenue;
                results[opts.variantId] = variant;

                const totalSamples = Object.values(results).reduce((s, v) => s + v.impressions, 0);
                await prisma.aBTest.update({ where: { id: opts.id }, data: { results, sampleSize: totalSamples } });
                return { success: true, recorded: true, variant: opts.variantId, totalSamples };
            }

            case 'assign': {
                // Assign visitor to variant using weighted random
                if (!opts.id) return { success: false, error: 'test id required' };
                const test = await prisma.aBTest.findUnique({ where: { id: opts.id } });
                if (!test) return { success: false, error: 'Test not found' };

                const variants = Array.isArray(test.variants) ? test.variants : [];
                const visitorId = opts.visitorId || crypto.randomUUID();

                // Deterministic assignment using hash
                const hash = crypto.createHash('md5').update(`${test.id}:${visitorId}`).digest('hex');
                const hashNum = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

                let cumWeight = 0;
                let assigned = variants[variants.length - 1];
                for (const v of variants) {
                    cumWeight += v.weight;
                    if (hashNum <= cumWeight) { assigned = v; break; }
                }

                return { success: true, visitorId, variant: assigned.id, variantName: assigned.name, config: assigned.config };
            }

            case 'stop': {
                if (!opts.id) return { success: false, error: 'test id required' };
                const test = await prisma.aBTest.update({ where: { id: opts.id }, data: { status: 'completed', endedAt: new Date() } });
                return { success: true, testId: test.id, status: 'completed' };
            }

            case 'list': {
                const tests = await prisma.aBTest.findMany({
                    where: { userId: userId || 'system', ...(opts.status ? { status: opts.status } : {}) },
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 20,
                    select: { id: true, name: true, status: true, metric: true, sampleSize: true, winner: true, createdAt: true },
                });
                return { success: true, tests, count: tests.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, start, record, assign, stop, list.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── ab_test_analyze ─────────────────────────────────────────────
async function abTestAnalyze(params) {
    const { action = 'results', ...opts } = params;

    try {
        switch (action) {
            case 'results': {
                if (!opts.id) return { success: false, error: 'test id required' };
                const test = await prisma.aBTest.findUnique({ where: { id: opts.id } });
                if (!test) return { success: false, error: 'Test not found' };

                const variants = Array.isArray(test.variants) ? test.variants : [];
                const results = test.results || {};

                const analysis = variants.map(v => {
                    const data = results[v.id] || { impressions: 0, conversions: 0, revenue: 0 };
                    const cr = data.impressions > 0 ? data.conversions / data.impressions : 0;
                    const rpi = data.impressions > 0 ? data.revenue / data.impressions : 0;
                    return {
                        variant: v.name,
                        variantId: v.id,
                        impressions: data.impressions,
                        conversions: data.conversions,
                        revenue: data.revenue,
                        conversionRate: `${(cr * 100).toFixed(2)}%`,
                        revenuePerImpression: `$${rpi.toFixed(4)}`,
                    };
                });

                // Statistical significance (Z-test for proportions)
                let significance = null;
                if (analysis.length >= 2) {
                    const control = results[variants[0].id] || { impressions: 0, conversions: 0 };
                    const treatment = results[variants[1].id] || { impressions: 0, conversions: 0 };
                    significance = calculateSignificance(control, treatment);
                }

                // Determine winner
                const best = analysis.reduce((a, b) => parseFloat(a.conversionRate) > parseFloat(b.conversionRate) ? a : b);

                // Update test if significant
                if (significance?.significant) {
                    await prisma.aBTest.update({
                        where: { id: opts.id },
                        data: { confidence: significance.confidence, winner: best.variantId },
                    });
                }

                return {
                    success: true,
                    test: test.name,
                    metric: test.metric,
                    totalSamples: test.sampleSize,
                    variants: analysis,
                    significance,
                    winner: significance?.significant ? best.variant : 'Insufficient data',
                    recommendation: significance?.significant
                        ? `${best.variant} is the winner with ${significance.confidence.toFixed(1)}% confidence`
                        : `Need more data. Current confidence: ${significance?.confidence?.toFixed(1) || 0}%`,
                };
            }

            case 'power': {
                // Sample size calculator
                const baseline = opts.baselineRate || 0.1; // 10% conversion
                const mde = opts.minimumDetectableEffect || 0.02; // 2% absolute change
                const alpha = opts.alpha || 0.05;
                const power = opts.power || 0.8;

                const zAlpha = 1.96; // ~95% confidence
                const zBeta = 0.84; // ~80% power
                const p1 = baseline;
                const p2 = baseline + mde;
                const pBar = (p1 + p2) / 2;

                const n = Math.ceil(
                    Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(mde, 2)
                );

                const daysNeeded = opts.dailyTraffic ? Math.ceil(n * 2 / opts.dailyTraffic) : null;

                return {
                    success: true,
                    sampleSizePerVariant: n,
                    totalSampleSize: n * 2,
                    baselineRate: `${(baseline * 100).toFixed(1)}%`,
                    minimumDetectableEffect: `${(mde * 100).toFixed(1)}%`,
                    confidenceLevel: `${((1 - alpha) * 100).toFixed(0)}%`,
                    statisticalPower: `${(power * 100).toFixed(0)}%`,
                    ...(daysNeeded ? { estimatedDays: daysNeeded } : {}),
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use results, power.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── lead_enrich ─────────────────────────────────────────────────
async function leadEnrich(params) {
    const { action = 'enrich', ...opts } = params;

    try {
        switch (action) {
            case 'enrich': {
                if (!opts.email && !opts.domain && !opts.company) return { success: false, error: 'email, domain, or company required' };

                const enriched = {};

                // Domain extraction from email
                if (opts.email) {
                    const domain = opts.email.split('@')[1];
                    enriched.email = opts.email;
                    enriched.domain = domain;
                    enriched.personalEmail = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain);
                    enriched.username = opts.email.split('@')[0];
                }

                const domain = opts.domain || enriched.domain;
                if (domain && !enriched.personalEmail) {
                    // DNS-based enrichment
                    try {
                        const dns = await import('dns');
                        const { promises: dnsP } = dns;
                        const [mxRecords, txtRecords] = await Promise.allSettled([
                            dnsP.resolveMx(domain),
                            dnsP.resolveTxt(domain),
                        ]);
                        enriched.mx = mxRecords.status === 'fulfilled' ? mxRecords.value.map(r => r.exchange) : [];
                        enriched.emailProvider = enriched.mx?.[0]?.includes('google') ? 'Google Workspace' : enriched.mx?.[0]?.includes('outlook') ? 'Microsoft 365' : enriched.mx?.[0] || 'Unknown';
                        enriched.hasSPF = txtRecords.status === 'fulfilled' ? txtRecords.value.flat().some(t => t.includes('spf')) : false;
                        enriched.hasDMARC = false;
                        try {
                            const dmarc = await dnsP.resolveTxt(`_dmarc.${domain}`);
                            enriched.hasDMARC = dmarc.flat().some(t => t.includes('dmarc'));
                        } catch { /* no DMARC */ }
                    } catch { /* DNS failed */ }

                    // Website check
                    try {
                        const fetch = (await import('node-fetch')).default;
                        const res = await fetch(`https://${domain}`, { method: 'HEAD', timeout: 5000, redirect: 'follow' });
                        enriched.websiteStatus = res.status;
                        enriched.websiteActive = res.ok;
                        enriched.server = res.headers.get('server') || null;
                        enriched.poweredBy = res.headers.get('x-powered-by') || null;
                    } catch {
                        enriched.websiteActive = false;
                    }
                }

                // Company name normalization
                if (opts.company) {
                    enriched.company = opts.company;
                    enriched.companySlug = opts.company.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                }

                enriched.enrichedAt = new Date().toISOString();
                return { success: true, lead: enriched };
            }

            case 'score': {
                if (!opts.lead) return { success: false, error: 'lead object required' };
                const lead = opts.lead;
                let score = 50; // base score
                const factors = [];

                // Scoring criteria
                if (lead.email && !lead.personalEmail) { score += 15; factors.push('+15: Business email'); }
                if (lead.personalEmail) { score -= 10; factors.push('-10: Personal email'); }
                if (lead.websiteActive) { score += 10; factors.push('+10: Active website'); }
                if (lead.company) { score += 5; factors.push('+5: Company known'); }
                if (lead.emailProvider === 'Google Workspace' || lead.emailProvider === 'Microsoft 365') { score += 5; factors.push('+5: Professional email service'); }
                if (lead.hasSPF && lead.hasDMARC) { score += 5; factors.push('+5: Email security (SPF+DMARC)'); }
                if (lead.title?.match(/ceo|cto|vp|director|manager|head/i)) { score += 15; factors.push('+15: Decision maker title'); }
                if (lead.employees > 50) { score += 10; factors.push('+10: Mid-size+ company'); }

                score = Math.max(0, Math.min(100, score));
                const tier = score >= 80 ? 'hot' : score >= 60 ? 'warm' : score >= 40 ? 'cool' : 'cold';

                return { success: true, score, tier, factors, maxScore: 100 };
            }

            case 'batch': {
                if (!opts.leads || !Array.isArray(opts.leads)) return { success: false, error: 'leads array required' };
                const results = [];
                for (const lead of opts.leads.slice(0, 50)) { // max 50
                    const result = await leadEnrich({ action: 'enrich', ...lead });
                    results.push(result.success ? result.lead : { error: result.error, input: lead });
                }
                return { success: true, enriched: results, count: results.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use enrich, score, batch.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── campaign_generate ───────────────────────────────────────────
async function campaignGenerate(params) {
    const { action = 'create', userId, ...opts } = params;

    try {
        switch (action) {
            case 'create': {
                if (!opts.name || !opts.type) return { success: false, error: 'name and type required (email, ad, social, sms, push)' };

                const templates = {
                    email: {
                        subject: opts.subject || `${opts.name} — Special Offer`,
                        body: generateEmailTemplate(opts),
                        cta: opts.cta || 'Get Started',
                    },
                    ad: {
                        headline: opts.headline || opts.name,
                        description: opts.description || `Discover ${opts.product || 'our solution'}`,
                        cta: opts.cta || 'Learn More',
                        platforms: opts.platforms || ['google', 'facebook'],
                    },
                    social: {
                        post: generateSocialPost(opts),
                        hashtags: opts.hashtags || generateHashtags(opts),
                        platforms: opts.platforms || ['twitter', 'linkedin'],
                    },
                    sms: {
                        message: opts.message || `${opts.name}: ${opts.description || 'Check out our latest offer!'} Reply STOP to unsubscribe.`,
                    },
                    push: {
                        title: opts.title || opts.name,
                        body: opts.body || opts.description || 'You have a new notification',
                        icon: opts.icon || null,
                        action: opts.actionUrl || null,
                    },
                };

                const content = templates[opts.type] || templates.email;

                const campaign = await prisma.campaign.create({
                    data: {
                        userId: userId || 'system',
                        name: opts.name,
                        type: opts.type,
                        content,
                        audience: opts.audience || {},
                        schedule: opts.schedule || null,
                        budget: opts.budget || null,
                        status: 'draft',
                    },
                });

                return { success: true, campaign: { id: campaign.id, name: campaign.name, type: campaign.type, status: 'draft', content } };
            }

            case 'generate_variants': {
                const campId = opts.campaignId || opts.id;
                if (!campId && !opts.content) return { success: false, error: 'campaignId or content required' };
                let baseContent;
                if (campId) {
                    const camp = await prisma.campaign.findUnique({ where: { id: campId } });
                    if (!camp) return { success: false, error: 'Campaign not found' };
                    baseContent = camp.content;
                } else {
                    baseContent = opts.content;
                }

                const variantCount = opts.count || 3;
                const variants = [];
                const tones = ['professional', 'casual', 'urgent', 'friendly', 'bold'];
                for (let i = 0; i < variantCount; i++) {
                    const tone = tones[i % tones.length];
                    variants.push({
                        id: `variant_${i + 1}`,
                        tone,
                        content: transformContentTone(baseContent, tone),
                    });
                }
                return { success: true, variants, count: variants.length };
            }

            case 'list': {
                const campaigns = await prisma.campaign.findMany({
                    where: { userId: userId || 'system', ...(opts.status ? { status: opts.status } : {}), ...(opts.type ? { type: opts.type } : {}) },
                    orderBy: { createdAt: 'desc' },
                    take: opts.limit || 20,
                    select: { id: true, name: true, type: true, status: true, metrics: true, createdAt: true },
                });
                return { success: true, campaigns, count: campaigns.length };
            }

            case 'update': {
                if (!opts.id) return { success: false, error: 'campaign id required' };
                const updates = {};
                if (opts.content) updates.content = opts.content;
                if (opts.audience) updates.audience = opts.audience;
                if (opts.schedule) updates.schedule = opts.schedule;
                if (opts.status) updates.status = opts.status;
                if (opts.budget) updates.budget = opts.budget;
                const updated = await prisma.campaign.update({ where: { id: opts.id }, data: updates });
                return { success: true, campaign: { id: updated.id, name: updated.name, status: updated.status } };
            }

            case 'metrics': {
                if (!opts.id) return { success: false, error: 'campaign id required' };
                const campaign = await prisma.campaign.findUnique({ where: { id: opts.id } });
                if (!campaign) return { success: false, error: 'Campaign not found' };
                const metrics = campaign.metrics || {};
                const sent = metrics.sent || 0;
                return {
                    success: true,
                    campaign: campaign.name,
                    metrics: {
                        ...metrics,
                        openRate: sent > 0 ? `${((metrics.opened || 0) / sent * 100).toFixed(1)}%` : '0%',
                        clickRate: sent > 0 ? `${((metrics.clicked || 0) / sent * 100).toFixed(1)}%` : '0%',
                        conversionRate: sent > 0 ? `${((metrics.converted || 0) / sent * 100).toFixed(1)}%` : '0%',
                        roi: campaign.spent > 0 ? `${(((metrics.revenue || 0) - campaign.spent) / campaign.spent * 100).toFixed(1)}%` : 'N/A',
                    },
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use create, generate_variants, list, update, metrics.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getCohortKey(date, granularity) {
    const d = new Date(date);
    if (granularity === 'day') return d.toISOString().split('T')[0];
    if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // week
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    return startOfWeek.toISOString().split('T')[0];
}

function calculateSignificance(control, treatment) {
    const n1 = control.impressions || 1;
    const n2 = treatment.impressions || 1;
    const p1 = control.conversions / n1;
    const p2 = treatment.conversions / n2;
    const pPool = (control.conversions + treatment.conversions) / (n1 + n2);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
    const z = se > 0 ? Math.abs(p2 - p1) / se : 0;

    // Z-score to p-value approximation
    const pValue = z > 0 ? 2 * (1 - normalCDF(z)) : 1;
    const confidence = (1 - pValue) * 100;

    return {
        zScore: Math.round(z * 1000) / 1000,
        pValue: Math.round(pValue * 10000) / 10000,
        confidence: Math.round(confidence * 10) / 10,
        significant: pValue < 0.05,
        lift: `${((p2 - p1) / Math.max(p1, 0.001) * 100).toFixed(1)}%`,
    };
}

function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
}

function generateEmailTemplate(opts) {
    return `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h1 style="color:#333;">${opts.headline || opts.name}</h1>
<p style="font-size:16px;color:#666;line-height:1.6;">${opts.description || `We're excited to share ${opts.product || 'something special'} with you.`}</p>
${opts.features ? `<ul>${opts.features.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
<a href="${opts.url || '#'}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">${opts.cta || 'Get Started'}</a>
<p style="font-size:12px;color:#999;margin-top:32px;">You're receiving this because you signed up at ${opts.sender || 'our service'}.</p>
</body></html>`;
}

function generateSocialPost(opts) {
    const hooks = [
        `🚀 ${opts.headline || opts.name} is here!`,
        `💡 ${opts.description || `Discover ${opts.product || 'something amazing'}`}`,
        `🔥 Don't miss out on ${opts.name}!`,
    ];
    return hooks[Math.floor(Math.random() * hooks.length)] + (opts.url ? `\n\n${opts.url}` : '');
}

function generateHashtags(opts) {
    const base = ['#launch', '#startup', '#innovation', '#tech'];
    if (opts.product) base.push(`#${opts.product.toLowerCase().replace(/\s+/g, '')}`);
    if (opts.industry) base.push(`#${opts.industry.toLowerCase()}`);
    return base.slice(0, 5);
}

function transformContentTone(content, tone) {
    // Deep clone content
    const variant = JSON.parse(JSON.stringify(content));
    const prefix = { professional: '📊', casual: '👋', urgent: '⚡', friendly: '💛', bold: '🔥' };
    if (variant.subject) variant.subject = `${prefix[tone] || ''} ${variant.subject}`;
    if (variant.headline) variant.headline = `${prefix[tone] || ''} ${variant.headline}`;
    if (variant.post) variant.post = `${prefix[tone] || ''} ${variant.post}`;
    variant.tone = tone;
    return variant;
}

export default {
    growthAnalyze,
    pricingSimulate,
    abTestRun,
    abTestAnalyze,
    leadEnrich,
    campaignGenerate,
};
