import { WebsiteSpec } from "@/types/website-spec";
import path from "path";
import { copyDir } from "@/lib/utils/file-system";
import { zipDirectory } from "@/lib/utils/zip";
import { generate as generatePage } from "@/engine/generators/page-generator";
import { generate as generateTheme } from "@/engine/generators/theme-generator";

export const generate = async (spec: WebsiteSpec): Promise<void> => {
  const project = spec.project;

  if (!project) {
    throw new Error("A valid project configuration is required to proceed.");
  }

  if (!project.slug) {
    if (!project.name) {
      throw new Error(
        "A project slug or project name must be provided for professional output."
      );
    }

    project.slug = project.name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const sourceFolder = path.join(process.cwd(), "templates/next-js");
  const destinationFolder = path.join(process.cwd(), "output", project.slug);
  const zipPath = path.join(process.cwd(), "output", `${project.slug}.zip`);

  // Copy template scaffold to output directory
  copyDir(sourceFolder, destinationFolder);

  // Generate files in the output directory
  generatePage(spec, destinationFolder);
  generateTheme(spec, destinationFolder);

  // Create zip archive
  await zipDirectory(destinationFolder, zipPath);
};
