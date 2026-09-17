import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                    '/admin/',
                    '/config/',
                    '/auth/reset-password/',
                    '/auth/verify-2fa/',
                    '/payment/success/',
                    '/payment/cancel/',
                    '/subscription-success/',
                    '/account-locked/',
                    '/forbidden/',
                    '/maintenance/',
                    '/dark-theme/',
                    '/dashboard-advanced/',
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                    '/admin/',
                    '/config/',
                ],
            },
        ],
        sitemap: 'https://maula.ai/sitemap.xml',
    };
}
