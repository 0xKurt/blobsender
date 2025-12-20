'use client';

import { CheckCircle2 } from 'lucide-react';

export function SuccessHeader() {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center mb-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      </div>
      <h2 className="text-3xl font-bold text-slate-100 mb-2">Blob Created!</h2>
      <p className="text-slate-400 text-sm">Your blob has been published to the blockchain</p>
    </div>
  );
}
