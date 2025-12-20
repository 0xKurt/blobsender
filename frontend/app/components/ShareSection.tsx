'use client';

interface ShareSectionProps {
  onShareTwitter: () => void;
  onShareFarcaster: () => void;
}

export function ShareSection({ onShareTwitter, onShareFarcaster }: ShareSectionProps) {
  return (
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
  );
}
