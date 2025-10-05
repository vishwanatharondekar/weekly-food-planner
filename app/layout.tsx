import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Analytics from '@/components/Analytics'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'खाना क्या बनाऊं - Weekly Meal Planning',
  description: 'Plan your weekly meals with AI-powered suggestions and smart shopping lists',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'खाना क्या बनाऊं',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourdomain.com',
    siteName: 'खाना क्या बनाऊं',
    title: 'खाना क्या बनाऊं - Weekly Meal Planning',
    description: 'Plan your weekly meals with AI-powered suggestions and smart shopping lists. Perfect for households and cooking enthusiasts!',
    images: [
      {
        url: '/images/logos/logo-pack-fe229c/icon-transparent.png',
        width: 1200,
        height: 630,
        alt: 'खाना क्या बनाऊं - Weekly Meal Planning',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'खाना क्या बनाऊं - Weekly Meal Planning',
    description: 'Plan your weekly meals with AI-powered suggestions and smart shopping lists',
    images: ['/images/logos/logo-pack-fe229c/icon-transparent.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAnalyticsEnabled = process.env.ANALYTICS_ENABLED === 'true';

  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager - Only load if analytics is enabled */}
        {isAnalyticsEnabled && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WK99H3WX');`
            }}
          />
        )}
        {/* End Google Tag Manager */}
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) - Only load if analytics is enabled */}
        {isAnalyticsEnabled && (
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-WK99H3WX"
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {/* End Google Tag Manager (noscript) */}

        <Analytics 
          gaMeasurementId={process.env.GA_MEASUREMENT_ID || ''} 
          mixpanelToken={process.env.MIXPANEL_TOKEN || ''} 
        />
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
} 