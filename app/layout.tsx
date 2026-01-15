import type { Metadata } from 'next';
import { Geist, Geist_Mono, Fira_Code } from 'next/font/google';
import './globals.css';

// Load Geist Sans and Mono and expose CSS variables
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
const firaCode = Fira_Code({
  variable: '--font-fira-code',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Replin Inspect',
  description: 'Client‑side troubleshooting tool for network and auth analysis',
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
        className={`${geistSans.variable} ${geistMono.variable} ${firaCode.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
