"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PreviewPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = slug ? `/api/preview/${slug}` : null;

  useEffect(() => {
    if (!previewUrl || !isLoading) return;

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [previewUrl, isLoading]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Preview</h1>
              <p className="text-sm text-muted-foreground">
                {slug || "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative bg-muted/30">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4 max-w-md px-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-destructive"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Failed to load preview
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
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
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Loading preview...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
