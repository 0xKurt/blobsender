'use client';

import { X, AlertCircle } from 'lucide-react';

interface ErrorModalProps {
  error: string | null;
  onClose: () => void;
}

export function ErrorModal({ error, onClose }: ErrorModalProps) {
  if (!error) return null;

  // Extract a cleaner error message (remove verbose details)
  const getCleanErrorMessage = (err: string): string => {
    // If it's a user rejection, show a friendly message
    if (err.includes('User rejected') || err.includes('rejected the request')) {
      return 'Transaction was cancelled. No changes were made.';
    }
    
    // If it's a network switch rejection
    if (err.includes('Network switch was rejected')) {
      return err;
    }
    
    // For other errors, try to extract the main message
    const lines = err.split('\n');
    const firstLine = lines[0] || err;
    
    // Remove "Error: " prefix if present
    return firstLine.replace(/^Error:\s*/i, '').trim();
  };

  const cleanError = getCleanErrorMessage(error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-red-500/50 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-slate-100 mb-2">Error</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{cleanError}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg font-semibold text-white transition-all shadow-lg"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

