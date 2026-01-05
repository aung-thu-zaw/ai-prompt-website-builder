"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const prompt = formData.get("prompt") as string;
    setIsLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ prompt }),
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

      const blob = await response.blob();

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = "generated-site.zip";
      if (contentDisposition) {
        // Match filename="..." or filename=...
        const match = contentDisposition.match(/filename[^;=\n]*=([^;]+)/);
        if (match && match[1]) {
          // Remove surrounding quotes if present
          fileName = match[1].trim().replace(/^["']|["']$/g, "");
        }
      }

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        <Textarea placeholder="Enter your prompt here" name="prompt" />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate"}
        </Button>
      </form>
    </div>
  );
}
