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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
