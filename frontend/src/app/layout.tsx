import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SignBridge | Real-time Sign Language Translator",
  description: "A full-stack real-time Sign Language to Text web application using ML, MediaPipe, and Next.js. Translate hand signs to text instantly via your webcam.",
  openGraph: {
    title: "SignBridge — Real-time Sign Language Translator",
    description: "Translate hand signs to text in real-time using your webcam, powered by MediaPipe and machine learning.",
    type: "website",
    locale: "en_US",
    siteName: "SignBridge",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignBridge — Real-time Sign Language Translator",
    description: "Translate hand signs to text in real-time using your webcam, powered by MediaPipe and machine learning.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
