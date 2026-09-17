import type { Metadata } from 'next';
import Header from '@/components/Header';
import ConditionalFooter from '@/components/ConditionalFooter';
import RSCErrorBoundary from '@/components/RSCErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LoadingProvider } from '@/lib/loading-context';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import SplashScreenWrapper from '@/components/SplashScreenWrapper';
import CookieBanner from '@/components/CookieBanner';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import Script from 'next/script';
import PerformanceInitializer from './components/PerformanceInitializer';
import '@/styles/globals.css';

// Metadata for SEO and browser tabs
export const metadata: Metadata = {
  title: 'Maula AI - Your AI Dream Team',
  description:
    "Transform your workflow with 18 specialized AI personalities. From Einstein's genius to Shakespeare's creativity - unlock the power of history's greatest minds.",
  keywords: [
    'AI',
    'artificial intelligence',
    'AI agents',
    'chatbot',
    'Einstein AI',
    'AI personalities',
    'machine learning',
  ],
  authors: [{ name: 'Maula AI' }],
  creator: 'Maula AI',
  publisher: 'Maula AI',
  metadataBase: new URL('https://sanbayfusion.com'),
  alternates: {
    canonical: 'https://sanbayfusion.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sanbayfusion.com',
    title: 'Maula AI - Your AI Dream Team',
    description:
      "Transform your workflow with 18 specialized AI personalities. From Einstein's genius to Shakespeare's creativity.",
    siteName: 'Maula AI',
    images: [
      {
        url: '/images/logos/company-logo.png',
        width: 1200,
        height: 630,
        alt: 'Maula AI - AI Dream Team',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maula AI - Your AI Dream Team',
    description:
      'Transform your workflow with 18 specialized AI personalities.',
    images: ['/images/logos/company-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcut: [{ url: '/icons/favicon-32x32.png' }],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Maula AI',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

// Fix #1: Root Layout with proper structure and spacing
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth overflow-x-hidden">
      <head>
        {/* PWA Theme Color */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />
        {/* Google Tag Manager */}
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KMXF562L');`}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KMXF562L"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* Console Error Filter - DISABLED for debugging */}
        <PerformanceInitializer />
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[SW] Registered, scope:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[SW] Registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
        <LoadingProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AnalyticsProvider>
                <RSCErrorBoundary>
                  {/* Global Splash Screen - Temporarily disabled */}
                  {/* <SplashScreenWrapper /> */}

                  {/* Global Navigation - Fix #2: Consistent Navigation */}
                  <Header />

                  {/* Main Content Area - Fix #1: Proper Layout System */}
                  <main className="flex-1">{children}</main>

                  {/* Conditional Footer - Hidden on agent pages */}
                  <ConditionalFooter />

                  {/* Cookie Consent Banner - GDPR/CCPA compliant */}
                  <CookieBanner />

                  {/* PWA Install Banner */}
                  <PWAInstallBanner />
                </RSCErrorBoundary>
              </AnalyticsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
