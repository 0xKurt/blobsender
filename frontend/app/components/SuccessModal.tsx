'use client';

import { X } from 'lucide-react';
import type { BlobSuccess } from '../types';
import { LoadingState } from './LoadingState';
import { SuccessHeader } from './SuccessHeader';
import { BlobLinks } from './BlobLinks';
import { ShareSection } from './ShareSection';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadingMessage = 'Creating your blob...', // Not used, we use random messages instead
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
            <LoadingState />
          ) : success ? (
            <>
              <SuccessHeader />
              <BlobLinks
                blobscanLink={success.blobscanLink}
                etherscanLink={success.etherscanLink}
              />
              <ShareSection
                onShareTwitter={onShareTwitter}
                onShareFarcaster={onShareFarcaster}
              />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

