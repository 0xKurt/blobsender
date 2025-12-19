'use client';

import { CheckCircle2, ExternalLink, X, Loader2 } from 'lucide-react';
import type { BlobSuccess } from '../types';

interface SuccessModalProps {
  success: BlobSuccess | null;
  loading?: boolean;
  loadingMessage?: string;
  onClose: () => void;
  onShareTwitter: () => void;
  onShareFarcaster: () => void;
}

export function SuccessModal({
  success,
  loading = false,
  loadingMessage = 'Creating your blob...',
  onClose,
  onShareTwitter,
  onShareFarcaster,
}: SuccessModalProps) {
  // Don't show modal if neither loading nor success
  if (!loading && !success) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={loading ? undefined : onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-700 relative">
          {/* Close button - only show when not loading */}
          {!loading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {loading ? (
            /* Loading State */
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <Loader2 className="w-16 h-16 text-violet-500 animate-spin" />
              </div>
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Creating Blob...</h2>
              <p className="text-slate-400 text-sm">{loadingMessage}</p>
              <div className="mt-6 space-y-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-slate-500">This may take a moment...</p>
              </div>
            </div>
          ) : success ? (
            <>
              {/* Success Icon */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">Blob Created!</h2>
                <p className="text-slate-400 text-sm">Your blob has been published to the blockchain</p>
              </div>

              {/* Links */}
              <div className="space-y-3 mb-6">
                <a
                  href={success.blobscanLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-200 group"
                >
                  <span className="text-slate-200 font-medium">View on Blobscan</span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                </a>
                <a
                  href={success.etherscanLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-200 group"
                >
                  <span className="text-slate-200 font-medium">View on Etherscan</span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                </a>
              </div>

              {/* Share Section */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-slate-300 text-center font-medium mb-2">
                    🚀 Share your blob creation!
                  </p>
                  <p className="text-slate-400 text-xs text-center">
                    Let others know you created a blob on Ethereum using blobsender.xyz
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onShareTwitter}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-sm"
                  >
                    Share on Twitter
                  </button>
                  <button
                    onClick={onShareFarcaster}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-sm"
                  >
                    Share on Farcaster
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

