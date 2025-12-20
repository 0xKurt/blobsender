'use client';

import { useState } from 'react';
import { Info, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export function EIP4844Link() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        Learn more about EIP-4844: Proto-Danksharding
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      
      {isOpen && (
        <div className="mt-3 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg max-w-xl mx-auto">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-xs mb-2">
                <strong className="text-indigo-300">EIP-4844 (Proto-Danksharding)</strong> introduces blob transactions to Ethereum. 
                Blobs are 128 KB data chunks stored temporarily (~2 weeks) in beacon nodes, not in the execution layer. 
                This enables scalable data availability for rollups and is forward-compatible with full Danksharding.
              </p>
              <a
                href="https://www.eip4844.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
              >
                Learn more about EIP-4844
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
