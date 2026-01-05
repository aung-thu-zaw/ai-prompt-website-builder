"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/**
 * Preview page that displays a generated project in an iframe.
 *
 * This page loads the generated project preview via an iframe,
 * allowing users to see the generated website without downloading it.
 */
export default function PreviewPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = slug ? `/api/preview/${slug}` : null;

  // Fallback timeout to hide loading after a reasonable time
  // This ensures loading doesn't stay forever if onLoad doesn't fire
  useEffect(() => {
    if (!previewUrl || !isLoading) return;

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Hide loading after 2 seconds max as safety net

    return () => clearTimeout(timeout);
  }, [previewUrl, isLoading]);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Preview: {slug || "Loading..."}
          </h1>
          <a
            href={`/api/preview/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Open in new tab
          </a>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
              <Link
                href="/"
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={previewUrl || undefined}
            className="w-full h-full border-0"
            title={`Preview of ${slug}`}
            suppressHydrationWarning
            onLoad={() => {
              // Hide loading when iframe content loads
              setIsLoading(false);
            }}
            onError={() => {
              setIsLoading(false);
              setError("Failed to load preview");
            }}
          />
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/80 dark:bg-black/80">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300 mx-auto" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading preview...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
