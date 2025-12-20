'use client';

import { useState, useEffect } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { MAX_TEXT_LENGTH } from '../lib/constants';

interface BlobFormProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  blobPrice: number | null;
  disabled: boolean;
  loadingMessage?: string;
  isConnected?: boolean;
}

export function BlobForm({
  onSubmit,
  loading,
  blobPrice,
  disabled,
  loadingMessage,
  isConnected = true,
}: BlobFormProps) {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Defer state update to avoid hydration mismatch
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
      setError(`Text must be between 1 and ${MAX_TEXT_LENGTH} characters`);
      return;
    }

    onSubmit(text);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
      {mounted && !isConnected && (
          <div className="mb-4 p-2.5 bg-amber-900/30 border border-amber-600/50 rounded-lg">
            <p className="text-amber-400 text-xs text-center flex items-center justify-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Please connect your wallet to create blobs
            </p>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          maxLength={MAX_TEXT_LENGTH}
          placeholder={
            !mounted || !isConnected
              ? 'Connect your wallet to start creating blobs...'
              : `Type your message here (max ${MAX_TEXT_LENGTH} characters)...`
          }
          className="w-full h-48 bg-slate-900/70 text-slate-100 rounded-lg p-5 rainbow-border resize-none focus:ring-0 focus:border-transparent transition-shadow duration-300 shadow-inner-lg text-sm"
          disabled={loading || disabled}
        />
        {mounted && (
          <div className="text-right text-xs text-slate-400 mt-2.5">
            {text.length}/{MAX_TEXT_LENGTH}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={loading || disabled || text.length === 0}
          className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-medium text-xs text-white shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {loadingMessage || 'Creating your blob...'}
            </span>
          ) : (
            'Create Blob'
          )}
        </button>
      </div>

      {/* Price Display - Below button */}
      <div className="text-center">
        {blobPrice !== null && blobPrice !== undefined && typeof blobPrice === 'number' ? (
          <p className="text-slate-400 text-xs">
            Price to create a blob: <span className="text-slate-300 font-medium">{blobPrice.toFixed(6)} ETH</span>
          </p>
        ) : (
          <p className="text-slate-500 text-xs">Loading blob price...</p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-600 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </form>
  );
}

