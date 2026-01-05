import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generate } from "@/engine/generators/project-generator";
import { WebsiteSpec } from "@/types/website-spec";
import { promptToSpec } from "@/engine/runtime/ollama";

/**
 * API route that generates a Next.js project ZIP from a natural language prompt.
 *
 * This endpoint:
 * 1. Validates the incoming prompt payload
 * 2. Uses Ollama to generate a `WebsiteSpec` from the prompt
 * 3. Runs the project generator to scaffold a Next.js project
 * 4. Returns the generated project as a ZIP file download
 *
 * Errors are returned as JSON with appropriate HTTP status codes, never thrown to the client.
 *
 * @param {Request} request - The incoming HTTP request containing a JSON body with a `prompt` field.
 * @returns {Promise<NextResponse>} A response streaming either a ZIP file or a JSON error object.
 */
export async function POST(request: Request) {
  const { prompt } = await request.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  let spec: WebsiteSpec;

  try {
    // Convert natural language prompt into a structured WebsiteSpec using Ollama
    spec = await promptToSpec(prompt);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate website specification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  // Ensure the generated spec contains the required website metadata
  if (!spec.name || !spec.slug) {
    return NextResponse.json(
      { error: "Generated specification is missing website name or slug" },
      { status: 500 }
    );
  }

  try {
    // Generate the Next.js project (files + ZIP archive) from the WebsiteSpec
    await generate(spec);
  } catch (error) {
    console.error("Failed to generate project:", error);
    return NextResponse.json(
      {
        error: "Failed to generate website project",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  // Resolve project slug (fallback is mainly for defensive safety)
  const projectSlug = spec.slug || "generated-site";
  const zipPath = path.join(process.cwd(), "output", `${projectSlug}.zip`);

  if (!fs.existsSync(zipPath)) {
    return NextResponse.json(
      { error: "Failed to generate zip file" },
      { status: 500 }
    );
  }

  // Read the generated ZIP into memory
  const fileBuffer = fs.readFileSync(zipPath);
  const fileName = `${projectSlug}.zip`;

  // Return JSON response with download data and preview URL
  // Frontend will handle both download and preview navigation
  return NextResponse.json({
    success: true,
    projectSlug,
    fileName,
    previewUrl: `/preview/${projectSlug}`,
    download: {
      // Convert buffer to base64 for JSON response
      data: fileBuffer.toString("base64"),
      fileName,
      contentType: "application/zip",
    },
  });
}
