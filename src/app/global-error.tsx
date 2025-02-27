'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { handleError } from '@/lib/error-handler';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error using our error handler and capture in Sentry
    Sentry.captureException(error);
    handleError(error, {
      component: 'GlobalError',
      digest: error.digest,
      location: 'client-side',
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="error-container">
          <h2>Something went wrong!</h2>
          <p>We&apos;ve logged this error and will work on fixing it.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
} 