import fs from "fs";
import path from "path";

type ExportStyle = "default" | "named";

type WebsiteSpec = {
  pages: {
    id: string;
    route: string;
    sections: {
      id: string;
      kind: string;
      content: Record<string, unknown>;
    }[];
  }[];
};

const SECTION_COMPONENT_MAP: Record<string, string> = {
  hero: "Hero",
  features: "Features",
  pricing: "Pricing",
  footer: "Footer",
};

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
const detectExportStyle = (componentPath: string): ExportStyle => {
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
const generateImport = (
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
const serializePropValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    // Escape quotes and backslashes for JSX string props
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `{${String(value)}}`;
  }

  if (Array.isArray(value)) {
    // Use JSON.stringify for proper escaping, then wrap in JSX expression
    return `{${JSON.stringify(value)}}`;
  }

  if (typeof value === "object") {
    // Use JSON.stringify for proper escaping, then wrap in JSX expression
    return `{${JSON.stringify(value)}}`;
  }

  // Fallback: convert to string
  return `"${String(value)}"`;
};

/**
 * Converts a content object to JSX props string.
 *
 * Takes a record of key-value pairs and generates a space-separated string
 * of JSX props in the format `key={value}` or `key="value"`.
 *
 * @param {Record<string, unknown>} content - The content object to convert.
 * @returns {string} A string of JSX props, e.g., `title="Hello" items={["a", "b"]}`.
 */
const contentToProps = (content: Record<string, unknown>): string => {
  return Object.entries(content)
    .map(([key, value]) => {
      const serialized = serializePropValue(value);
      if (!serialized) {
        return "";
      }
      return `${key}=${serialized}`;
    })
    .filter(Boolean)
    .join(" ");
};

export const generate = (spec: WebsiteSpec): void => {
  const page = spec.pages[0]; // v1: single page only

  // Collect unique imports using a Map keyed by component name
  const importsMap = new Map<string, string>();

  page.sections.forEach((section) => {
    const componentName = SECTION_COMPONENT_MAP[section.kind];

    // Skip if already processed (deduplication)
    if (importsMap.has(componentName)) {
      return;
    }

    const componentPath = path.join(
      process.cwd(),
      "templates/next-js/components/sections",
      `${componentName}.tsx`
    );
    const exportStyle = detectExportStyle(componentPath);
    const importPath = `@/components/sections/${componentName}`;

    importsMap.set(
      componentName,
      generateImport(componentName, importPath, exportStyle)
    );
  });

  // Sort imports deterministically by component name
  const imports = Array.from(importsMap.values())
    .sort((a, b) => {
      // Extract component name from import statement for sorting
      const nameA = a.match(/import\s+(?:\{?\s*)?(\w+)/)?.[1] || "";
      const nameB = b.match(/import\s+(?:\{?\s*)?(\w+)/)?.[1] || "";
      return nameA.localeCompare(nameB);
    })
    .join("\n");

  const body = page.sections
    .map((section) => {
      const componentName = SECTION_COMPONENT_MAP[section.kind];
      const props = section.content ? contentToProps(section.content) : "";
      return props ? `<${componentName} ${props} />` : `<${componentName} />`;
    })
    .join("\n      ");

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

  const outputPath = path.join(process.cwd(), "templates/next-js/app/page.tsx");

  fs.writeFileSync(outputPath, pageSource, "utf-8");
};
