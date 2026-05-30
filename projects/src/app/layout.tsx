import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: '哄哄模拟器',
  description: 'AI女友生气模拟，锻炼你哄人的能力',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-pink-50 to-white font-sans antialiased">
        <Inspector />
        {children}
      </body>
    </html>
  );
}