import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generate } from "@/engine/generators/project-generator";
import { WebsiteSpec } from "@/types/website-spec";
import { promptToSpec } from "@/engine/runtime/ollama";

// Increase timeout for Ollama API calls (in seconds)
// Default is 10s, we need more for LLM generation
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  let spec: WebsiteSpec;
  try {
    spec = await promptToSpec(prompt);
  } catch (error) {
    console.error("Failed to generate spec from prompt:", error);
    return NextResponse.json(
      {
        error: "Failed to generate website specification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  // Validate that project exists (generate function will also check, but we need it for the filename)
  if (!spec.project) {
    return NextResponse.json(
      { error: "Generated specification is missing project configuration" },
      { status: 500 }
    );
  }

  try {
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

  const projectSlug = spec.project.slug || "generated-site";
  const zipPath = path.join(process.cwd(), "output", `${projectSlug}.zip`);

  if (!fs.existsSync(zipPath)) {
    return NextResponse.json(
      { error: "Failed to generate zip file" },
      { status: 500 }
    );
  }

  const fileBuffer = fs.readFileSync(zipPath);
  const fileName = `${projectSlug}.zip`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
