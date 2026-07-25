import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ME/CFS Community Gallery — prototype',
  description:
    'A calm, dreamlike virtual exhibition of art made by the ME/CFS community. Phase 0 prototype.',
};

export const viewport: Viewport = {
  themeColor: '#cfd9e5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Runs before first paint to apply the saved theme (default dark) with no flash.
const themeInit = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
