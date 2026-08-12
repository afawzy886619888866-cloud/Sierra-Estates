'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-red-400">Something went wrong</h2>
          <p className="text-slate-400 text-sm">{error.message || 'An unexpected application error occurred.'}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
