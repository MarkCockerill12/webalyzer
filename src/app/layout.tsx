import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Webalyzer Pro - OSINT Tech Stack & Endpoint Scanner',
  description: 'Deep OSINT web reconnaissance tool: tech stack detection, SharePoint/API endpoint mining, Wayback Machine history, security & SSL audits.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#008080]">
        {children}
      </body>
    </html>
  );
}
