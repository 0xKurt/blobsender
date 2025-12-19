import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BlobSender - Create and Share Blobs on Ethereum',
    short_name: 'BlobSender',
    description: 'Create and share blobs on Ethereum using EIP-4844. Post messages, greetings, or anything you want - on-chain.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

