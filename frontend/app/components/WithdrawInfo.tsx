'use client';

import { ExternalLink } from 'lucide-react';
import type { WithdrawInfo as WithdrawInfoType } from '../types';
import { getChainConfigInstance } from '../lib/config';

interface WithdrawInfoProps {
  withdrawInfo: WithdrawInfoType;
  error?: string;
}

export function WithdrawInfo({ withdrawInfo, error }: WithdrawInfoProps) {
  // Get config lazily - only when component is rendered on client
  let contractLink = withdrawInfo.contractLink;
  if (!contractLink && typeof window !== 'undefined') {
    try {
      const config = getChainConfigInstance();
      contractLink = `${config.etherscanUrl}/address/${config.escrowAddress}#writeContract`;
    } catch {
      // Fallback if config not available
      contractLink = '#';
    }
  }

  return (
    <div className="mt-8 p-8 bg-yellow-900/30 border border-yellow-600 rounded-xl shadow-inner-lg">
      <p className="text-yellow-400 font-bold text-xl mb-3">
        {error || 'Transaction Partially Failed'}
      </p>
      {withdrawInfo.details && (
        <p className="text-slate-300 mb-3 text-base">{withdrawInfo.details}</p>
      )}
      {withdrawInfo.expectedValue && withdrawInfo.actualValue && (
        <div className="mb-4 text-base space-y-1">
          <p className="text-slate-400">
            Expected: <span className="text-green-400 font-medium">{withdrawInfo.expectedValue} wei</span>
          </p>
          <p className="text-slate-400">
            Actual: <span className="text-red-400 font-medium">{withdrawInfo.actualValue} wei</span>
          </p>
        </div>
      )}
      <p className="text-slate-300 mb-5 text-base">
        Your escrow was created but there was an issue. You can withdraw your funds after{' '}
        <span className="font-bold">{withdrawInfo.withdrawDelay} minutes</span>.
      </p>
      <div className="space-y-3 text-base">
        <p className="text-slate-400">
          Escrow ID: <code className="bg-slate-900/70 px-3 py-1 rounded-md break-all text-slate-200">{withdrawInfo.escrowId}</code>
        </p>
        {withdrawInfo.etherscanLink && (
          <p className="text-slate-400">
            <a
              href={withdrawInfo.etherscanLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline transition-colors duration-200 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Escrow Transaction
            </a>
          </p>
        )}
        <p className="text-slate-400 mt-4">
          To withdraw: Go to{' '}
          <a
            href={contractLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline transition-colors duration-200"
          >
            Etherscan Contract
          </a>
          {' '}and call the <code className="bg-slate-900/70 px-2 py-1 rounded-md text-slate-200">withdraw</code> function with your Escrow ID.
        </p>
      </div>
    </div>
  );
}

