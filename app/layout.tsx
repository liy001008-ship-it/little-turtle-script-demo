import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '小乌龟｜第一章',
  description: '小乌龟第一章：录取通知、入学报到与第一节课前。',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
