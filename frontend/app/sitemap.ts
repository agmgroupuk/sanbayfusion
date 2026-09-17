import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://sanbayfusion.com';
    const agentsBase = 'https://sanbayfusion.com';
    const now = new Date().toISOString();

    // Priority levels:
    // 1.0 = homepage
    // 0.9 = main sections (agents, tools, lab, solutions, etc.)
    // 0.8 = important subpages (individual agents, tools, docs)
    // 0.7 = secondary pages (support, resources, community)
    // 0.6 = legal, auth, misc pages
    // 0.5 = dashboard (behind auth, but still indexable)

    const routes: MetadataRoute.Sitemap = [
        // ===== HOMEPAGE =====
        { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },

        // ===== ABOUT =====
        { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/about/overview`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/about/partnerships`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/about/team`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== AGENTS (High Priority - Core Product) =====
        { url: `${agentsBase}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${agentsBase}/agents/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${agentsBase}/agents/ben-sega`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/bishop-burger`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/chef-biew`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/chess-player`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/comedy-king`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/drama-queen`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/einstein`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/emma-emotional`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/fitness-guru`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/julie-girlfriend`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/knight-logic`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/lazy-pawn`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/mrs-boss`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/nid-gaming`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/professor-astrology`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/rook-jokey`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/tech-wizard`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${agentsBase}/agents/travel-buddy`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

        // ===== AUTH (Public-facing) =====
        { url: `${baseUrl}/auth/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/auth/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== COMMUNITY =====
        { url: `${baseUrl}/community`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/community/contributing`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/community/discord`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/community/overview`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/community/roadmap`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/community/suggestions`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },

        // ===== CONTACT =====
        { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== DEMO =====
        { url: `${baseUrl}/demo`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== DOCS (Important for SEO) =====
        { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/docs/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/docs/agents/agents-type`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/agents/api-reference`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/docs/agents/best-practices`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/agents/configuration`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/agents/getting-started`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/docs/agents/troubleshooting`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/api`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/docs/canvas`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/data-generator`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/integrations`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/sdks`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/tutorials`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },

        // ===== INDUSTRIES =====
        { url: `${baseUrl}/industries`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/industries/education`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/industries/finance-banking`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/industries/healthcare`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/industries/manufacturing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/industries/overview`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/industries/retail-ecommerce`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/industries/technology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== LAB (AI Experiments) =====
        { url: `${baseUrl}/lab`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/lab/analytics`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
        { url: `${baseUrl}/lab/battle-arena`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/lab/debate-arena`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/lab/dream-interpreter`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/lab/emotion-visualizer`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/lab/future-predictor`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/lab/image-playground`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/lab/music-generator`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/lab/neural-art`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/lab/personality-mirror`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/lab/story-weaver`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/lab/voice-cloning`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },

        // ===== LEGAL (Important for compliance & Google verification) =====
        { url: `${baseUrl}/legal`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/legal/cookie-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
        { url: `${baseUrl}/legal/payments-refunds`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
        { url: `${baseUrl}/legal/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
        { url: `${baseUrl}/legal/reports`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
        { url: `${baseUrl}/legal/terms-of-service`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },

        // ===== OVERVIEW & PRICING =====
        { url: `${baseUrl}/overview`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/overview/per-agent`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/overview/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/overview/spaces`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },

        // ===== RESOURCES =====
        { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/resources/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/resources/careers`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/resources/case-studies`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/resources/documentation`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/resources/news`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
        { url: `${baseUrl}/resources/tutorials`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/resources/webinars`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

        // ===== SECURITY =====
        { url: `${baseUrl}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== SOLUTIONS =====
        { url: `${baseUrl}/solutions`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/solutions/ai-security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/solutions/enterprise-ai`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/solutions/overview`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/solutions/process-automation`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/solutions/smart-analytics`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ===== STATUS =====
        { url: `${baseUrl}/status`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
        { url: `${baseUrl}/status/api-status`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },

        // ===== STUDIO (Canvas IDE) =====
        { url: 'https://demo.sanbayfusion.com', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },

        // ===== SUPPORT =====
        { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/support/book-consultation`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/support/contact-us`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/support/faqs`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/support/help-center`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/support/live-support`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

        // ===== TOOLS (Developer Tools - High SEO Value) =====
        { url: `${baseUrl}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/tools/api-tester`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/base64`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/color-picker`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/data-generator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/dns-lookup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/dns-lookup-advanced`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/domain-availability`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/domain-reputation`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/domain-research`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/hash-generator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/ip-geolocation`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/ip-info`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ip-netblocks`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/json-formatter`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/mac-lookup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ping-test`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/port-scanner`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/regex-tester`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/speed-test`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/ssl-checker`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/threat-intelligence`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/timestamp-converter`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/traceroute`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/url-parser`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/uuid-generator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/website-categorization`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/tools/whois-lookup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ];

    return routes;
}
