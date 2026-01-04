import fs from "fs";
import path from "path";
import { WebsiteSpec } from "@/types/website-spec";

/**
 * Converts a hex color to oklch format using a simplified approximation.
 * For production, consider using a proper color conversion library like 'culori'.
 *
 * @param {string} hex - Hex color string (e.g., "#6366f1").
 * @returns {string} oklch color string (e.g., "oklch(0.5 0.2 250)").
 */
const hexToOklch = (hex: string): string => {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Convert RGB to linear RGB
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Convert to XYZ (D65)
  const x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
  const y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175;
  const z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041;

  // Normalize by D65 white point
  const xn = x / 0.95047;
  const yn = y / 1.0;
  const zn = z / 1.08883;

  // Convert to Lab
  const f = (t: number) =>
    t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;

  const fx = f(xn);
  const fy = f(yn);
  const fz = f(zn);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);

  // Convert Lab to OKLab (approximation)
  // Using simplified OKLab conversion
  const okL = (l + 16) / 116;
  const okA = a / 100;
  const okB = bLab / 100;

  // Calculate chroma and hue
  const c = Math.sqrt(okA * okA + okB * okB);
  let h = 0;
  if (c > 0.001) {
    h = (Math.atan2(okB, okA) * 180) / Math.PI;
    if (h < 0) h += 360;
  }

  // Normalize lightness to 0-1 range (approximation)
  const normalizedL = Math.max(0, Math.min(1, okL));

  return `oklch(${normalizedL.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
};

/**
 * Generates a contrasting foreground color for the primary color.
 * Uses white for dark colors and dark for light colors.
 *
 * @param {string} oklch - oklch color string.
 * @returns {string} Contrasting oklch color for foreground.
 */
const generateForegroundColor = (oklch: string): string => {
  // Extract lightness
  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) {
    return "oklch(0.985 0 0)"; // Default white
  }

  const l = parseFloat(match[1]);

  // If color is dark (lightness < 0.5), use light foreground; otherwise use dark
  const foregroundL = l < 0.5 ? 0.985 : 0.145;

  return `oklch(${foregroundL.toFixed(3)} 0 0)`;
};

/**
 * Updates globals.css with the theme primary color.
 *
 * @param {string} primaryColor - Hex color string for primary color.
 * @param {string} outputPath - Path to the globals.css file.
 */
const updateGlobalsCss = (primaryColor: string, outputPath: string): void => {
  const primaryOklch = hexToOklch(primaryColor);
  const primaryForegroundOklch = generateForegroundColor(primaryOklch);

  // Read existing file
  let content = fs.readFileSync(outputPath, "utf-8");

  // Update :root primary colors
  content = content.replace(
    /--primary:\s*oklch\([^)]+\);/g,
    `--primary: ${primaryOklch};`
  );
  content = content.replace(
    /--primary-foreground:\s*oklch\([^)]+\);/g,
    `--primary-foreground: ${primaryForegroundOklch};`
  );

  // Update .dark primary colors (use lighter version for dark mode)
  const darkMatch = primaryOklch.match(
    /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/
  );
  let darkPrimaryOklch = primaryOklch;
  if (darkMatch) {
    const l = parseFloat(darkMatch[1]);
    const c = darkMatch[2];
    const h = darkMatch[3];
    // For dark mode, use lighter version (but not too light)
    const darkL = Math.min(0.923, l + 0.3);
    darkPrimaryOklch = `oklch(${darkL.toFixed(3)} ${c} ${h})`;
  }
  const darkPrimaryForegroundOklch = generateForegroundColor(darkPrimaryOklch);

  // Update .dark section
  const darkSectionRegex = /\.dark\s*\{([^}]+)\}/s;
  const darkSectionMatch = content.match(darkSectionRegex);
  if (darkSectionMatch) {
    let darkSection = darkSectionMatch[1];
    darkSection = darkSection.replace(
      /--primary:\s*oklch\([^)]+\);/g,
      `--primary: ${darkPrimaryOklch};`
    );
    darkSection = darkSection.replace(
      /--primary-foreground:\s*oklch\([^)]+\);/g,
      `--primary-foreground: ${darkPrimaryForegroundOklch};`
    );
    content = content.replace(darkSectionRegex, `.dark {${darkSection}}`);
  }

  fs.writeFileSync(outputPath, content, "utf-8");
};

/**
 * Updates layout.tsx with the specified font.
 *
 * @param {string} fontName - Font name (e.g., "Inter", "Roboto").
 * @param {string} outputPath - Path to the layout.tsx file.
 */
const updateLayout = (fontName: string, outputPath: string): void => {
  let content = fs.readFileSync(outputPath, "utf-8");

  // Font identifier for import (keep original name for Next.js font exports like Geist_Mono)
  const fontImportName = fontName;

  // Normalize font name for CSS variable (kebab-case: Geist_Mono -> geist-mono)
  const fontVariable = fontName
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();

  // Convert to camelCase for JavaScript variable name (Geist_Mono -> geistMono)
  const fontVarName = fontName
    .split(/[_\s]+/)
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  // Remove existing font imports from next/font/google
  content = content.replace(
    /import\s+\{[^}]+\}\s+from\s+["']next\/font\/google["'];?\n/g,
    ""
  );

  // Remove ALL existing font variable declarations (any font name)
  // Match multi-line font declarations - match any const variable = FontName({...});
  content = content.replace(
    /const\s+\w+\s*=\s*\w+\([\s\S]*?\)\s*;\s*\n/g,
    (match) => {
      // Only remove if it looks like a font declaration (has variable, subsets, display)
      if (
        match.includes("variable:") &&
        (match.includes("subsets:") || match.includes("display:"))
      ) {
        return "";
      }
      return match;
    }
  );

  // Clean up any duplicate empty lines
  content = content.replace(/\n{3,}/g, "\n\n");

  // Add new font import
  const fontImport = `import { ${fontImportName} } from "next/font/google";\n`;

  // Insert font import after type imports, before other imports
  const typeImportMatch = content.match(/(import\s+type[^;]+;[\s\n]*)/);
  if (typeImportMatch) {
    content = content.replace(
      /(import\s+type[^;]+;[\s\n]*)/,
      `$1${fontImport}`
    );
  } else {
    // Insert at the beginning after any existing imports
    const firstImportMatch = content.match(/(import[^;]+;[\s\n]*)/);
    if (firstImportMatch) {
      content = content.replace(/(import[^;]+;[\s\n]*)/, `$1${fontImport}`);
    } else {
      content = `${fontImport}${content}`;
    }
  }

  // Add font variable declaration
  // Some fonts (like Anton) require weight property
  const fontVarDeclaration = `const ${fontVarName} = ${fontImportName}({
  weight: "400",
  variable: "--font-${fontVariable}",
  subsets: ["latin"],
  display: "swap",
});

`;

  // Insert after imports, before metadata
  const metadataMatch = content.match(/(export\s+const\s+metadata)/);
  if (metadataMatch) {
    content = content.replace(
      /(export\s+const\s+metadata)/,
      `${fontVarDeclaration}$1`
    );
  } else {
    // Insert before RootLayout
    content = content.replace(
      /(export\s+default\s+function\s+RootLayout)/,
      `${fontVarDeclaration}$1`
    );
  }

  // Update body className to use new font
  // Remove ALL font variable references and font-sans, then add the new one
  content = content.replace(
    /className=\{`([^`]*)`\}/,
    (match, classNameContent) => {
      // Remove ALL font variable references (any ${variableName.variable})
      let cleaned = classNameContent.replace(/\$\{[^}]+\}\s*/g, "");

      // Remove font-sans class
      cleaned = cleaned.replace(/\s*font-sans\s*/g, " ");

      // Remove duplicate antialiased
      cleaned = cleaned.replace(/\s*antialiased\s*/g, " ");

      // Clean up whitespace
      cleaned = cleaned.replace(/\s+/g, " ").trim();

      // Build the final className with proper order
      const parts = [
        `\${${fontVarName}.variable}`,
        "font-sans",
        cleaned,
        "antialiased",
      ].filter(Boolean);

      return `className={\`${parts.join(" ")}\`}`;
    }
  );

  // Update font reference in globals.css
  const globalsCssPath = path.join(path.dirname(outputPath), "globals.css");
  if (fs.existsSync(globalsCssPath)) {
    let cssContent = fs.readFileSync(globalsCssPath, "utf-8");
    // Update both @theme inline and any other references
    cssContent = cssContent.replace(
      /--font-sans:\s*var\(--font-[^)]+\);/g,
      `--font-sans: var(--font-${fontVariable});`
    );
    fs.writeFileSync(globalsCssPath, cssContent, "utf-8");
  }

  fs.writeFileSync(outputPath, content, "utf-8");
};

/**
 * Generates theme configuration by updating globals.css and layout.tsx.
 *
 * @param {WebsiteSpec} spec - The website specification containing theme config.
 */
export const generate = (spec: WebsiteSpec): void => {
  const templatesPath = path.join(process.cwd(), "templates/next-js");

  // Update globals.css with primary color
  const globalsCssPath = path.join(templatesPath, "app/globals.css");
  if (fs.existsSync(globalsCssPath)) {
    updateGlobalsCss(spec.theme.primaryColor, globalsCssPath);
  }

  // Update layout.tsx with font
  const layoutPath = path.join(templatesPath, "app/layout.tsx");
  if (fs.existsSync(layoutPath)) {
    updateLayout(spec.theme.font, layoutPath);
  }
};
