"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const prompt = formData.get("prompt") as string;
    setIsLoading(true);
    setPreviewUrl(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ prompt }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        const errorMessage =
          errorData.details || errorData.error || "Failed to generate website";
        console.error("Generation error:", errorMessage);
        alert(`Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success && data.download) {
        // Convert base64 to blob and trigger download
        const binaryString = atob(data.download.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.download.contentType });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.download.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Set preview URL for navigation
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    if (previewUrl) {
      router.push(previewUrl);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            AI Prompt Website Builder
          </h1>
          <p className="text-muted-foreground text-md">
            Instantly turn your ideas into professional, production-ready
            Next.js sites powered by AI.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              id="prompt"
              name="prompt"
              placeholder="e.g., Create a modern SaaS landing page for task management app called 'Taskify'"
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Generating...</span>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </>
              ) : (
                "Generate Website"
              )}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                size="lg"
              >
                Preview
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
