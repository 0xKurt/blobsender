'use client';

interface ErrorDisplayProps {
  error: string;
  type?: 'error' | 'warning';
}

export function ErrorDisplay({ error, type = 'error' }: ErrorDisplayProps) {
  const bgColor = type === 'error' ? 'bg-red-900/30 border-red-600' : 'bg-yellow-900/30 border-yellow-600';
  const textColor = type === 'error' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className={`mt-8 p-6 ${bgColor} border rounded-xl shadow-inner-lg`}>
      <p className={`${textColor} font-medium text-lg`}>
        {type === 'error' ? 'Error' : 'Warning'}: {error}
      </p>
    </div>
  );
}

