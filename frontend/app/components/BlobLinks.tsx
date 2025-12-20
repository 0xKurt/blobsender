'use client';

import { ExternalLink } from 'lucide-react';
import type { BlobSuccess } from '../types';

interface BlobLinksProps {
  blobscanLink: string;
  etherscanLink: string;
}

export function BlobLinks({ blobscanLink, etherscanLink }: BlobLinksProps) {
  return (
    <div className="space-y-3 mb-6">
      <a
        href={blobscanLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-200 group"
      >
        <span className="text-slate-200 font-medium">View on Blobscan</span>
        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
      </a>
      <a
        href={etherscanLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-200 group"
      >
        <span className="text-slate-200 font-medium">View on Etherscan</span>
        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
      </a>
    </div>
  );
}
