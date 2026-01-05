import { WebsiteSpec } from "@/types/website-spec";
import path from "path";
import { copyDir } from "@/lib/utils/file-system";
import { createZipArchiveFromDirectory } from "@/lib/utils/zip";
import { generate as generatePage } from "@/engine/generators/page-generator";
import { generate as generateTheme } from "@/engine/generators/theme-generator";

/**
 * Generates a complete Next.js project from a WebsiteSpec and packages it as a ZIP archive.
 *
 * This function orchestrates the entire project generation workflow:
 * 1. Validates and normalizes the project configuration (generates slug if missing)
 * 2. Copies the Next.js template scaffold to the output directory
 * 3. Generates page components based on the specification
 * 4. Applies theme configuration (colors and fonts)
 * 5. Creates a ZIP archive of the generated project
 *
 * The generated project is placed in `output/<project-slug>/` and archived as
 * `output/<project-slug>.zip`. The project slug is automatically generated from
 * the project name if not explicitly provided, following URL-friendly conventions
 * (lowercase, hyphen-separated, special characters removed).
 *
 * @param {WebsiteSpec} spec - The complete website specification containing project configuration,
 *                             architecture, theme, and pages.
 * @returns {Promise<void>} Resolves when the project has been generated and archived successfully.
 *
 * @throws {Error} If the project configuration is missing or invalid.
 * @throws {Error} If file system operations fail (copy, write, or archive creation).
 */
export const generate = async (spec: WebsiteSpec): Promise<void> => {
  const project = spec.project;

  if (!project) {
    throw new Error("A valid project configuration is required to proceed.");
  }

  // Generate project slug from name if not provided
  if (!project.slug) {
    if (!project.name) {
      throw new Error(
        "A project slug or project name must be provided for professional output."
      );
    }

    // Convert project name to URL-friendly slug: lowercase, hyphen-separated, special chars removed
    project.slug = project.name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const srcDir = path.join(process.cwd(), "templates/next-js");
  const destDir = path.join(process.cwd(), "output", project.slug);
  const zipFilePath = path.join(process.cwd(), "output", `${project.slug}.zip`);

  // Copy template scaffold to output directory (excludes node_modules, .git, etc.)
  copyDir(srcDir, destDir);

  // Generate project-specific files in the output directory
  generatePage(spec, destDir);
  generateTheme(spec, destDir);

  // Create ZIP archive of the generated project
  await createZipArchiveFromDirectory(destDir, zipFilePath);
};
