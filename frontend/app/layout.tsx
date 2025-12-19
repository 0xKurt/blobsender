import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BlobSender - Create and Share Blobs on Ethereum",
    template: "%s | BlobSender",
  },
  description: "Create and share blobs on Ethereum using EIP-4844. Post messages, greetings, or anything you want - on-chain.",
  keywords: [
    "ethereum",
    "blob",
    "EIP-4844",
    "blockchain",
    "data storage",
    "ethereum blob",
    "blob transaction",
    "blobscan",
    "decentralized storage",
    "ethereum L2",
  ],
  authors: [{ name: "BlobSender" }],
  creator: "BlobSender",
  publisher: "BlobSender",
  metadataBase: new URL("https://blobsender.xyz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://blobsender.xyz",
    siteName: "BlobSender",
    title: "BlobSender - Create and Share Blobs on Ethereum",
    description: "Create and share blobs on Ethereum using EIP-4844. Post messages, greetings, or anything you want - on-chain.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BlobSender - Create and Share Blobs on Ethereum",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BlobSender - Create and Share Blobs on Ethereum",
    description: "Create and share blobs on Ethereum using EIP-4844. Post messages, greetings, or anything you want - on-chain.",
    images: ["/og-image.png"],
    creator: "@blobsender",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'BlobSender',
              description: 'Create and share blobs on Ethereum using EIP-4844. Post messages, greetings, or anything you want - on-chain.',
              url: 'https://blobsender.xyz',
              applicationCategory: 'BlockchainApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'ETH',
              },
              creator: {
                '@type': 'Organization',
                name: 'BlobSender',
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
