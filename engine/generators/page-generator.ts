import fs from "fs";
import path from "path";

type Section = {
  id: string;
  kind: string;
};

type Page = {
  id: string;
  route: string;
  sections: Section[];
};

type WebsiteSpec = {
  pages: Page[];
};

const SECTION_COMPONENT_MAP: Record<string, string> = {
  hero: "Hero",
  features: "Features",
  pricing: "Pricing",
  footer: "Footer",
};

type ExportStyle = "default" | "named";

/**
 * Detects the export style of a component file
 * Returns "default" for default exports, "named" for named exports
 */
function detectExportStyle(componentPath: string): ExportStyle {
  try {
    const content = fs.readFileSync(componentPath, "utf-8");

    // Check for default export patterns
    // export default ComponentName;
    // export default function ComponentName
    // export default () => ...
    if (
      /export\s+default\s+/.test(content) ||
      /export\s+default\s+function\s+/.test(content) ||
      /export\s+default\s+\(/.test(content)
    ) {
      return "default";
    }

    // Check for named export patterns
    // export { ComponentName };
    // export const ComponentName = ...
    // export function ComponentName
    if (
      /export\s+\{\s*[^}]+\s*\}/.test(content) ||
      /export\s+(const|function|class)\s+/.test(content)
    ) {
      return "named";
    }

    // Default to named export if unclear
    return "named";
  } catch {
    // If file doesn't exist or can't be read, default to named
    return "named";
  }
}

/**
 * Generates the appropriate import statement based on export style
 */
function generateImport(
  componentName: string,
  componentPath: string,
  exportStyle: ExportStyle
): string {
  const importPath = componentPath.replace(/\\/g, "/");

  if (exportStyle === "default") {
    return `import ${componentName} from "${importPath}";`;
  } else {
    return `import { ${componentName} } from "${importPath}";`;
  }
}

export function generate(spec: WebsiteSpec) {
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
    .map((section) => `<${SECTION_COMPONENT_MAP[section.kind]} />`)
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
}
