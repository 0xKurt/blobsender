'use client';

import { useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { getChainConfigInstance } from '../lib/config';

export function WalletConnection() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  
  // Get expected chain ID from config
  const expectedChainId = typeof window !== 'undefined' 
    ? (() => {
        try {
          return getChainConfigInstance().chainId;
        } catch {
          return null;
        }
      })()
    : null;
  
  // Auto-switch to correct chain if connected but on wrong chain
  useEffect(() => {
    if (isConnected && chainId && expectedChainId && chainId !== expectedChainId) {
      switchChain({ chainId: expectedChainId });
    }
  }, [isConnected, chainId, expectedChainId, switchChain]);

  return (
    <div className="text-center mb-12">
      <div className="inline-flex flex-col items-center gap-3">
        <ConnectKitButton.Custom>
          {({ isConnected: ckConnected, show, address: ckAddress, ensName }) => {
            return (
              <button
                onClick={show}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full font-bold text-base text-white shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
              >
                {ckConnected ? (
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span>
                      {ensName || `${ckAddress?.slice(0, 6)}...${ckAddress?.slice(-4)}`}
                    </span>
                    {balance && (
                      <span className="text-sm opacity-90">
                        {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
                      </span>
                    )}
                  </div>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            );
          }}
        </ConnectKitButton.Custom>
        {isConnected && chainId !== expectedChainId && expectedChainId && (
          <div className="text-amber-400 text-sm flex items-center gap-2">
            <span>⚠️ Please switch to the correct network</span>
          </div>
        )}
      </div>
    </div>
  );
}

