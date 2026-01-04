import fs from "fs";
import path from "path";
import { WebsiteSpec } from "@/types/website-spec";
import { ExportStyle, ArchitecturePreset } from "@/types/architecture";
import { SECTION_COMPONENTS } from "@/engine/config/components";
import { ARCHITECTURE_STRATEGIES } from "@/engine/config/architectures";

/**
 * Determines the export style of a given component file by inspecting its content.
 *
 * This function analyzes the specified component file for recognizable export patterns
 * to distinguish between a default export and a named export. If the file contains
 * standard default export statements (e.g., `export default ...`), it returns "default".
 * If named export statements are detected (such as `export const`, `export function`,
 * `export class`, or `export { ComponentName }`), it returns "named".
 * If the export style cannot be determined (e.g., due to ambiguous syntax or unrecognized patterns),
 * or if the file cannot be read, "named" is returned by default.
 *
 * @param {string} componentPath - The absolute path to the component file to be analyzed.
 * @returns {ExportStyle} Returns "default" if a default export is detected, otherwise "named".
 */
const detectComponentExportStyle = (componentPath: string): ExportStyle => {
  try {
    const content = fs.readFileSync(componentPath, "utf-8");

    const hasExportDefault =
      /export\s+default\s+/.test(content) || // matches: export default ...
      /export\s+default\s+function\s+/.test(content) || // matches: export default function ...
      /export\s+default\s+\(/.test(content); // matches: export default (anonymous function/expr)

    if (hasExportDefault) {
      return "default";
    }

    const hasNamedExport =
      /export\s+\{[^}]+\}/.test(content) || // matches: export { Something }
      /export\s+(const|function|class)\s+\w+/.test(content); // matches: export const Foo, export function Bar, export class Baz

    if (hasNamedExport) {
      return "named";
    }

    return "named";
  } catch {
    return "named";
  }
};

/**
 * Generates the appropriate import statement for a React component based on its export style.
 *
 * This function returns a properly formatted ES module import statement, taking into account
 * whether the target component is exported as a default export or as a named export.
 * The import path is normalized to use forward slashes, ensuring compatibility across platforms.
 * This helps automate the code generation step when dynamic section component imports are required.
 *
 * @param {string} componentName - The name of the component to import (i.e., identifier to use in code).
 * @param {string} componentPath - The import path to the component file, typically an alias path.
 * @param {ExportStyle} exportStyle - Enum ("default" or "named") reflecting how the component is exported.
 * @returns {string} The full ES module import statement for the component.
 */
const generateComponentImportStatement = (
  componentName: string,
  componentPath: string,
  exportStyle: ExportStyle
): string => {
  const importPath = componentPath.replace(/\\/g, "/");

  if (exportStyle === "default") {
    return `import ${componentName} from "${importPath}";`;
  } else {
    return `import { ${componentName} } from "${importPath}";`;
  }
};

/**
 * Gets the component name for a given section component kind and specific variant.
 *
 * Looks up the component name from SECTION_COMPONENTS based on the section component's
 * kind and specific variant. If no specific variant is specified, defaults to "default".
 * Throws an error if the kind or specific variant doesn't exist in the SECTION_COMPONENTS configuration.
 *
 * @param {string} kind - The section component kind (e.g., "hero", "features").
 * @param {string | undefined} variant - The section component specific variant (e.g., "default", "split", etc...).
 * @returns {string} The component name for the given section component kind and specific variant.
 */
const getSectionComponentName = (kind: string, variant?: string): string => {
  const component = SECTION_COMPONENTS[kind];

  if (!component) {
    throw new Error(
      `Encountered unsupported section component kind: "${kind}". ` +
        `Please ensure that "${kind}" is registered in SECTION_COMPONENTS configuration.`
    );
  }

  const variantKey = variant || "default";

  const componentName = component[variantKey];

  if (!componentName) {
    throw new Error(
      `The variant "${variantKey}" specified for section kind "${kind}" is not recognized. Please ensure you are using one of the supported variants: ${Object.keys(
        component
      ).join(", ")}.`
    );
  }

  return componentName;
};

/**
 * Serializes a value to a JSX prop string representation.
 *
 * Handles different JavaScript types and converts them to valid JSX prop syntax:
 * - Strings: wrapped in quotes with escaped special characters
 * - Numbers, booleans: passed as-is in curly braces
 * - Arrays: serialized as JSX array expression
 * - Objects: serialized as JSX object expression
 * - null/undefined: returns empty string (prop is omitted)
 *
 * @param {unknown} value - The value to serialize.
 * @returns {string} The JSX prop value representation.
 */
const serializeJsxPropValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `{${String(value)}}`;
  }

  if (Array.isArray(value)) {
    return `{${JSON.stringify(value)}}`;
  }

  if (typeof value === "object") {
    return `{${JSON.stringify(value)}}`;
  }

  return `"${String(value)}"`;
};

/**
 * Converts a content object to a JSX props string representation.
 *
 * Takes a record of key-value pairs and generates a space-separated string
 * of JSX prop strings in the format `key={value}` or `key="value"`.
 *
 * @param {Record<string, unknown>} content - The content object to convert.
 * @returns {string} A string of JSX props, e.g., `title="Hello" items={["a", "b"]}`.
 */
const contentToJsxProps = (content: Record<string, unknown>): string => {
  return Object.entries(content)
    .map(([key, value]) => {
      const serialized = serializeJsxPropValue(value);

      if (!serialized) {
        return "";
      }

      return `${key}=${serialized}`;
    })
    .filter(Boolean)
    .join(" ");
};

/**
 * Generates a Next.js (App Router) page source file from a given WebsiteSpec object.
 *
 * This function processes the provided `WebsiteSpec`, extracting the first page definition,
 * collecting unique React component imports for each section, serializing content to JSX props,
 * composing the page's main content, and writing a fully-formed `.tsx` file for use in a Next.js (App Router) project.
 *
 * The resulting file includes:
 *   - Proper, deduplicated component imports based on each section's kind and variant,
 *   - JSX code for each section, with serialized props,
 *   - A complete `Page` React component ready to be consumed by Next.js (App Router).
 *
 * Export styles of components are auto-detected (default or named), ensuring valid import statements.
 *
 * @param {WebsiteSpec} spec - The website specification describing pages and their sections.
 * @param {string} outputDir - The output directory where the generated project is located.
 *
 * @throws {Error} If a section's kind or variant is unsupported or missing from SECTION_COMPONENTS configuration.
 * @sideeffect Writes (overwrites) `app/page.tsx` in the output directory with the generated content.
 */
export const generate = (spec: WebsiteSpec, outputDir: string): void => {
  const page = spec.pages[0]; // v1: single page only

  // Get architecture preset (default to "landing" if not specified)
  const architecture: ArchitecturePreset = spec.architecture || "landing";
  const architectureStrategy = ARCHITECTURE_STRATEGIES[architecture];

  /**
   * Collect a map of unique component import statements,
   * keyed by component name, to avoid duplicate imports.
   */
  const importsMap = new Map<string, string>();

  page.sections.forEach((section) => {
    const componentName = getSectionComponentName(
      section.kind,
      section.variant
    );

    // Skip if already processed (avoid duplicate imports)
    if (importsMap.has(componentName)) {
      return;
    }

    // Read component from template to detect export style
    const templateComponentPath = path.join(
      process.cwd(),
      "templates/next-js/components",
      architectureStrategy.folder,
      `${componentName}.tsx`
    );
    const componentPath = templateComponentPath;
    const exportStyle = detectComponentExportStyle(componentPath);
    const importPath = architectureStrategy.importPath(componentName);

    // Generate and register import statement
    importsMap.set(
      componentName,
      generateComponentImportStatement(componentName, importPath, exportStyle)
    );
  });

  /**
   * Sort imports in a deterministic order (by component name)
   * for a stable and clear generated output.
   */
  const imports = Array.from(importsMap.values())
    .sort((a, b) => {
      // Extract component name from import statement for sorting
      const nameA = a.match(/import\s+(?:\{?\s*)?(\w+)/)?.[1] || "";
      const nameB = b.match(/import\s+(?:\{?\s*)?(\w+)/)?.[1] || "";
      return nameA.localeCompare(nameB);
    })
    .join("\n");

  /**
   * Generate the main body JSX by mapping each section
   * to its corresponding component with serialized props.
   */
  const body = page.sections
    .map((section) => {
      const componentName = getSectionComponentName(
        section.kind,
        section.variant
      );
      const props = section.content ? contentToJsxProps(section.content) : "";
      return props ? `<${componentName} ${props} />` : `<${componentName} />`;
    })
    .join("\n      ");

  /**
   * Compose the full TypeScript/JSX source for the page,
   * including imports and the default exported Page component.
   */
  const pageSource = `// AUTO-GENERATED FILE — DO NOT EDIT
// Generated from WebsiteSpec

${imports}

export default function Page() {
  return (
    <main>
      ${body}
    </main>
  );
}
`;

  // Determine output .tsx path in the output directory
  const outputPath = path.join(outputDir, "app/page.tsx");

  // Write the generated file to disk, overwriting if necessary
  fs.writeFileSync(outputPath, pageSource, "utf-8");
};
