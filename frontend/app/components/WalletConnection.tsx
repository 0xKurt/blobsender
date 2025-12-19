'use client';

import { useState, useEffect } from 'react';
import { useConnect, useDisconnect } from 'wagmi';
import { shortenAddress } from '../lib/utils';
import type { Address } from 'viem';

interface WalletConnectionProps {
  isConnected: boolean;
  address: Address | undefined;
}

export function WalletConnection({ isConnected, address }: WalletConnectionProps) {
  // Initialize to false, set to true after mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    // Defer state update to avoid hydration mismatch
    // This ensures server and client render the same initial content
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center px-6 py-3 bg-slate-700 rounded-full font-semibold text-slate-200 shadow-md">
        Loading...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const connector = connectors.find((c) => c.id === 'injected' || c.type === 'injected') || connectors[0];
            if (connector) {
              connect({ connector });
            }
          }}
          disabled={isConnecting || connectors.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full font-bold text-base text-white shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {connectError && (
          <p className="text-red-400 text-sm mt-2">Connection failed: {connectError.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 bg-slate-800/50 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-slate-700">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      <span className="text-slate-300 font-medium">Connected: {address ? shortenAddress(address) : ''}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          disconnect();
        }}
        className="px-4 py-2 bg-slate-700 rounded-full text-slate-200 hover:bg-slate-600 transition-all duration-200 font-medium"
      >
        Disconnect
      </button>
    </div>
  );
}

