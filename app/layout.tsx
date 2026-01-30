import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Load Inter and JetBrains Mono and expose CSS variables
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

const siteTitle = 'Replin Inspect';
const siteDescription =
  'Replin Inspect is a local-first HAR analysis tool for support engineers. Inspect HAR files, troubleshoot API failures, and analyze network timing safely in the browser.';

export const metadata: Metadata = {
  metadataBase: new URL('https://inspect.replin.ai'),
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    'HAR analysis',
    'HAR file inspection',
    'HAR troubleshooting',
    'support engineering tools',
    'local diagnostics',
    'network analysis',
    'network troubleshooting',
    'technical support',
    'support tools',
    'safe HAR analysis',
    'local HAR analysis',
    'troubleshooting HAR files',
    'Replin Inspect',
    'Replin Tools',
    'Replin.ai',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: 'https://inspect.replin.ai',
    siteName: siteTitle,
    title: 'Replin Inspect — Local HAR Analysis & Troubleshooting',
    description: siteDescription,
    images: [
      {
        url: '/og.svg',
        width: 1200,
        height: 630,
        alt: 'Replin Inspect — Local HAR Analysis & Troubleshooting',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Replin Inspect — Local HAR Analysis & Troubleshooting',
    description: siteDescription,
    images: ['/og.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        // Apply font variables and common light‑mode styling here
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
