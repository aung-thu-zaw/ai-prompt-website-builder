import fs from "fs";
import path from "path";

/**
 * Updates the Next.js layout file to use a specified Google Font.
 *
 * This function performs comprehensive modifications to the `layout.tsx` file to integrate
 * a new Google Font from `next/font/google`. The process includes:
 * 1. Removing existing font imports and variable declarations
 * 2. Adding the new font import statement
 * 3. Creating a font variable declaration with proper configuration
 * 4. Updating the body className to reference the new font
 * 5. Synchronizing the font CSS variable in `globals.css`
 *
 * The function handles font name normalization for different contexts:
 * - Original name for Next.js import (e.g., "Geist_Mono")
 * - Kebab-case for CSS variables (e.g., "geist-mono")
 * - CamelCase for JavaScript variables (e.g., "geistMono")
 *
 * @param {string} fontName - The name of the Google Font to use (must match Next.js font export name).
 * @param {string} outputPath - The absolute path to the `layout.tsx` file to be updated.
 *
 * @sideeffect Modifies both `layout.tsx` and `globals.css` files, replacing font configurations.
 *
 * @throws {Error} If the file cannot be read or written (filesystem errors).
 */
export const updateLayout = (fontName: string, outputPath: string): void => {
  let content = fs.readFileSync(outputPath, "utf-8");

  // Preserve original font name for Next.js import (handles underscores like Geist_Mono)
  const fontImportName = fontName;

  // Convert to kebab-case for CSS variable naming (Geist_Mono -> geist-mono)
  const fontVariable = fontName
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();

  // Convert to camelCase for JavaScript variable naming (Geist_Mono -> geistMono)
  const fontVarName = fontName
    .split(/[_\s]+/)
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  // Remove all existing Google Font imports to prevent duplicates
  content = content.replace(
    /import\s+\{[^}]+\}\s+from\s+["']next\/font\/google["'];?\n/g,
    ""
  );

  // Remove existing font variable declarations by matching font configuration patterns
  content = content.replace(
    /const\s+\w+\s*=\s*\w+\([\s\S]*?\)\s*;\s*\n/g,
    (match) => {
      // Identify font declarations by characteristic properties (variable, subsets, display)
      if (
        match.includes("variable:") &&
        (match.includes("subsets:") || match.includes("display:"))
      ) {
        return "";
      }
      return match;
    }
  );

  // Normalize excessive line breaks to maintain clean formatting
  content = content.replace(/\n{3,}/g, "\n\n");

  // Construct the new font import statement
  const fontImport = `import { ${fontImportName} } from "next/font/google";\n`;

  // Insert font import in appropriate location (prefer after type imports)
  const typeImportMatch = content.match(/(import\s+type[^;]+;[\s\n]*)/);
  if (typeImportMatch) {
    content = content.replace(
      /(import\s+type[^;]+;[\s\n]*)/,
      `$1${fontImport}`
    );
  } else {
    // Fallback: insert after first import or at file start
    const firstImportMatch = content.match(/(import[^;]+;[\s\n]*)/);
    if (firstImportMatch) {
      content = content.replace(/(import[^;]+;[\s\n]*)/, `$1${fontImport}`);
    } else {
      content = `${fontImport}${content}`;
    }
  }

  // Generate font variable declaration with required configuration
  // Note: weight "400" is required for fonts like Anton that don't support variable weights
  const fontVarDeclaration = `const ${fontVarName} = ${fontImportName}({
  weight: "400",
  variable: "--font-${fontVariable}",
  subsets: ["latin"],
  display: "swap",
});

`;

  // Insert font variable declaration before metadata or RootLayout function
  const metadataMatch = content.match(/(export\s+const\s+metadata)/);
  if (metadataMatch) {
    content = content.replace(
      /(export\s+const\s+metadata)/,
      `${fontVarDeclaration}$1`
    );
  } else {
    content = content.replace(
      /(export\s+default\s+function\s+RootLayout)/,
      `${fontVarDeclaration}$1`
    );
  }

  // Update body className: remove old font references and inject new font variable
  content = content.replace(
    /className=\{`([^`]*)`\}/,
    (match, classNameContent) => {
      // Strip all existing font variable template expressions
      let cleaned = classNameContent.replace(/\$\{[^}]+\}\s*/g, "");

      // Remove font-sans class to prevent conflicts
      cleaned = cleaned.replace(/\s*font-sans\s*/g, " ");

      // Remove duplicate antialiased class
      cleaned = cleaned.replace(/\s*antialiased\s*/g, " ");

      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, " ").trim();

      // Reconstruct className with new font variable, font-sans, existing classes, and antialiased
      const parts = [
        `\${${fontVarName}.variable}`,
        "font-sans",
        cleaned,
        "antialiased",
      ].filter(Boolean);

      return `className={\`${parts.join(" ")}\`}`;
    }
  );

  // Synchronize font CSS variable in globals.css to match layout.tsx
  const globalsCssPath = path.join(path.dirname(outputPath), "globals.css");
  if (fs.existsSync(globalsCssPath)) {
    let cssContent = fs.readFileSync(globalsCssPath, "utf-8");
    // Update --font-sans CSS variable to reference the new font
    cssContent = cssContent.replace(
      /--font-sans:\s*var\(--font-[^)]+\);/g,
      `--font-sans: var(--font-${fontVariable});`
    );
    fs.writeFileSync(globalsCssPath, cssContent, "utf-8");
  }

  fs.writeFileSync(outputPath, content, "utf-8");
};
