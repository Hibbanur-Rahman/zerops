'use client';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <h2>Something went wrong</h2>
        <p>Please try again. If the problem persists, contact support.</p>
        {error.digest && <p style={{ color: '#888' }}>Reference: {error.digest}</p>}
        <button onClick={() => retry()}>Try again</button>
      </body>
    </html>
  );
}
