import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generate } from "@/engine/generators/project-generator";
import { WebsiteSpec } from "@/types/website-spec";

function mockPromptToSpec(prompt: string) {
  return {
    project: {
      name: "Generated Website",
      slug: "ai-website-builder",
    },
    architecture: "landing",
    theme: {
      primaryColor: "#6366f1",
      font: "Inter",
    },
    pages: [
      {
        id: "page_home",
        route: "/",
        sections: [
          {
            id: "hero",
            kind: "hero",
            variant: "split",
            content: {
              title: prompt || "AI Generated Website",
              subtitle: "Generated from your prompt",
              ctaLabel: "Get Started",
            },
          },
        ],
      },
    ],
  };
}

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const spec = mockPromptToSpec(prompt);

  await generate(spec as WebsiteSpec);

  const zipPath = path.join(
    process.cwd(),
    "output",
    `${spec.project.slug}.zip`
  );

  if (!fs.existsSync(zipPath)) {
    return NextResponse.json(
      { error: "Failed to generate zip file" },
      { status: 500 }
    );
  }

  const fileBuffer = fs.readFileSync(zipPath);
  const fileName = `${spec.project.slug}.zip`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
