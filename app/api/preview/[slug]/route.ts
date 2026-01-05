import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Renders a React component's JSX to HTML by reading the component file
 * and replacing props with actual values.
 */
const renderComponentToHtml = (
  componentName: string,
  props: Record<string, unknown>,
  componentsDir: string
): string => {
  const componentPath = path.join(componentsDir, `${componentName}.tsx`);

  if (!fs.existsSync(componentPath)) {
    return `<div>Component ${componentName} not found</div>`;
  }

  try {
    const componentContent = fs.readFileSync(componentPath, "utf-8");

    // Extract JSX from component (look for return statement)
    const returnMatch = componentContent.match(
      /return\s*\(\s*([\s\S]*?)\s*\)\s*;/
    );
    if (!returnMatch) {
      return `<div>Could not parse component ${componentName}</div>`;
    }

    let jsx = returnMatch[1].trim();

    // Remove JSX fragments wrapper
    jsx = jsx.replace(/^<>\s*/, "").replace(/\s*<\/>$/, "");

    // Replace props in JSX
    Object.entries(props).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // For arrays like items.map((item) => ...), generate the mapped content
        if (key === "items" || key === "plans") {
          // First, try to find the <ul> or <ol> element that contains the map
          const listMatch = jsx.match(/<(ul|ol)[^>]*>[\s\S]*?<\/(ul|ol)>/);
          if (listMatch) {
            // Extract the template from inside the list (the <li> structure)
            const templateMatch = listMatch[0].match(/<li[^>]*>[\s\S]*?<\/li>/);
            if (templateMatch) {
              let template = templateMatch[0];
              // Remove key attributes
              template = template
                .replace(/\s*key="[^"]*"/g, "")
                .replace(/\s*key=\{[^}]+\}/g, "");

              // Generate list items
              const listItems = value
                .map((item) => {
                  return template
                    .replace(/\{item\}/g, item)
                    .replace(/\{plan\}/g, item)
                    .replace(/\{[^}]+\}/g, item); // Replace any remaining {variable} with item
                })
                .join("\n              ");

              // Replace the entire list content (including the map expression) with generated items
              const listTag = listMatch[1];
              jsx = jsx.replace(
                /<(ul|ol)[^>]*>[\s\S]*?<\/(ul|ol)>/,
                `<${listTag}>${listItems}</${listTag}>`
              );
            } else {
              // No template found, generate simple list items
              const listTag = listMatch[1];
              const listItems = value
                .map(
                  (item) =>
                    `<li><p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">${item}</p></li>`
                )
                .join("\n              ");
              jsx = jsx.replace(
                /<(ul|ol)[^>]*>[\s\S]*?<\/(ul|ol)>/,
                `<${listTag}>${listItems}</${listTag}>`
              );
            }
          } else {
            // No list found, try to match map expression directly
            const mapPattern = new RegExp(
              `\\{\\s*${key}\\.map\\([\\s\\S]*?\\)\\s*=>\\s*\\([\\s\\S]*?\\)\\s*\\}`,
              "g"
            );
            const listItems = value
              .map(
                (item) =>
                  `<li><p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">${item}</p></li>`
              )
              .join("\n              ");
            jsx = jsx.replace(mapPattern, listItems);
          }
        }
      } else {
        // Replace simple prop references like {title}, {subtitle}
        const propPattern = new RegExp(`\\{${key}\\}`, "g");
        jsx = jsx.replace(propPattern, String(value));
      }
    });

    // Remove any remaining map expressions that weren't replaced (fallback cleanup)
    jsx = jsx.replace(/\{[^}]*\.map\([^}]*\)[^}]*\}/g, "");

    // Convert JSX to HTML
    jsx = jsx.replace(/className=/g, "class=").replace(/\s*key="[^"]*"/g, ""); // Remove React key attributes

    return jsx;
  } catch (error) {
    console.error(`Error rendering component ${componentName}:`, error);
    return `<div>Error rendering ${componentName}</div>`;
  }
};

/**
 * API route that serves a preview of a generated project.
 *
 * This endpoint reads the generated project files and serves them as HTML
 * for preview in an iframe. It handles:
 * 1. Reading the generated page.tsx file
 * 2. Extracting component usage and rendering them to HTML
 * 3. Processing CSS and including Tailwind via CDN
 * 4. Returning a complete HTML page for iframe preview
 *
 * @param {Request} request - The incoming HTTP request.
 * @param {Object} params - Route parameters containing the project slug.
 * @returns {Promise<NextResponse>} An HTML response for preview or an error.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json(
      { error: "Project slug is required" },
      { status: 400 }
    );
  }

  const projectDir = path.join(process.cwd(), "output", slug);

  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const pagePath = path.join(projectDir, "app", "page.tsx");
  const globalsCssPath = path.join(projectDir, "app", "globals.css");
  const layoutPath = path.join(projectDir, "app", "layout.tsx");

  if (!fs.existsSync(pagePath)) {
    return NextResponse.json(
      { error: "Generated page not found" },
      { status: 404 }
    );
  }

  try {
    // Read the generated files
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    const globalsCss = fs.existsSync(globalsCssPath)
      ? fs.readFileSync(globalsCssPath, "utf-8")
      : "";
    const layoutContent = fs.existsSync(layoutPath)
      ? fs.readFileSync(layoutPath, "utf-8")
      : "";

    // Extract font variable from layout.tsx if present
    let fontVariable = "";
    const fontVarMatch = layoutContent.match(/className=\{`([^`]+)`\}/);
    if (fontVarMatch) {
      fontVariable = fontVarMatch[1];
    }

    // Extract component usage from page.tsx
    // The generated page has: <ComponentName prop1="value" prop2={["a","b"]} />
    const mainMatch = pageContent.match(/<main>([\s\S]*?)<\/main>/);
    let jsxContent = "";

    if (mainMatch) {
      const mainContent = mainMatch[1].trim();

      // Find all component usages: <ComponentName ... />
      const componentRegex = /<(\w+)([^>]*?)\s*\/>/g;

      // Try to find components directory (check common locations)
      let componentsDir = path.join(projectDir, "components", "sections");
      if (!fs.existsSync(componentsDir)) {
        componentsDir = path.join(projectDir, "components", "home");
        if (!fs.existsSync(componentsDir)) {
          componentsDir = path.join(projectDir, "components", "layout");
        }
      }

      let match;

      while ((match = componentRegex.exec(mainContent)) !== null) {
        const componentName = match[1];
        const propsString = match[2];

        // Parse props from the component usage
        const props: Record<string, unknown> = {};

        // Extract string props: title="value"
        const stringProps = propsString.match(/(\w+)="([^"]*)"/g) || [];
        stringProps.forEach((prop) => {
          const [, key, value] = prop.match(/(\w+)="([^"]*)"/) || [];
          if (key && value) props[key] = value;
        });

        // Extract array props: items={["a","b"]}
        const arrayProps = propsString.match(/(\w+)=\{([^}]+)\}/g) || [];
        arrayProps.forEach((prop) => {
          const match = prop.match(/(\w+)=\{([^}]+)\}/);
          if (match) {
            const [, key, value] = match;
            try {
              // Try to parse as JSON array
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                props[key] = parsed;
              }
            } catch {
              // If not valid JSON, treat as string
              props[key] = value;
            }
          }
        });

        // Render component to HTML
        const componentHtml = renderComponentToHtml(
          componentName,
          props,
          componentsDir
        );
        jsxContent += componentHtml + "\n";
      }
    }

    // Process CSS: extract CSS variables and custom properties from globals.css
    // Since we can't process Tailwind imports, we'll use Tailwind CDN for preview
    const cssVariables = globalsCss.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
    const darkVariables = globalsCss.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";
    const baseLayer = globalsCss.match(/@layer base\s*\{([^}]+)\}/)?.[1] || "";

    // Generate HTML with Tailwind CDN and processed CSS
    const html = `<!DOCTYPE html>
<html lang="en"${fontVariable ? ` class="${fontVariable}"` : ""}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${slug}</title>
  <!-- Tailwind CSS CDN for preview -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      ${cssVariables}
    }
    .dark {
      ${darkVariables}
    }
    ${baseLayer ? `@layer base { ${baseLayer} }` : ""}
    /* Additional base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    }
  </style>
</head>
<body class="${fontVariable || ""}">
  <main>
    ${jsxContent}
  </main>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json(
      {
        error: "Failed to generate preview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
