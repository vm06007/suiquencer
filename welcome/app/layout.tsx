import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suiquencer - Visual DeFi Flow Builder for Sui",
  description: "Design multi-step DeFi transaction flows on a canvas, connect your wallet, and execute them atomically on the Sui blockchain.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overscroll-none">
      <body className="antialiased font-sans bg-stone-50 text-stone-900 overscroll-none" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
