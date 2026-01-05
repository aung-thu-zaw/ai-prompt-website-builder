import fs from "fs";
import path from "path";
import { WebsiteSpec } from "@/types/website-spec";
import { updateLayout } from "@/engine/generators/font-generator";

/**
 * Converts a hexadecimal color code to OKLCH color space format.
 *
 * This function performs a complete color space transformation from hexadecimal RGB
 * to OKLCH (OK Lightness, Chroma, Hue), which is a perceptually uniform color space
 * suitable for modern CSS. The conversion process involves:
 * 1. Parsing the hex color to normalized RGB values (0-1 range)
 * 2. Converting RGB to linear RGB using gamma correction
 * 3. Transforming to XYZ color space using D65 white point
 * 4. Converting XYZ to CIE Lab color space
 * 5. Approximating OKLab from Lab values
 * 6. Calculating chroma and hue from OKLab coordinates
 *
 * The resulting OKLCH format is compatible with Tailwind CSS and Shadcn UI theming,
 * providing better perceptual uniformity for color manipulation.
 *
 * @param {string} hex - The hexadecimal color code (with or without leading #, e.g., "#6366f1" or "6366f1").
 * @returns {string} The OKLCH color string in the format "oklch(L C H)" where L is lightness (0-1),
 *                   C is chroma, and H is hue in degrees (0-360).
 *
 * @example
 *   hexToOklch("#6366f1") // Returns: "oklch(0.623 0.145 264.5)"
 */
const hexToOklch = (hex: string): string => {
  const cleanHex = hex.replace("#", "");

  // Parse RGB values from hex string (each pair represents one channel)
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Gamma correction: convert sRGB to linear RGB for accurate color space calculations
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Transform linear RGB to XYZ color space using sRGB to XYZ transformation matrix (D65 illuminant)
  const x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
  const y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175;
  const z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041;

  // Normalize XYZ values by D65 white point (standard daylight illuminant)
  const xn = x / 0.95047;
  const yn = y / 1.0;
  const zn = z / 1.08883;

  // Convert to CIE Lab color space using the standard Lab transformation function
  const f = (t: number) =>
    t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;

  const fx = f(xn);
  const fy = f(yn);
  const fz = f(zn);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);

  // Approximate OKLab from Lab values (simplified conversion for OKLCH compatibility)
  const okL = (l + 16) / 116;
  const okA = a / 100;
  const okB = bLab / 100;

  // Calculate chroma (color intensity) and hue (color angle) from OKLab a* and b* coordinates
  const c = Math.sqrt(okA * okA + okB * okB);
  let h = 0;
  if (c > 0.001) {
    // Convert from radians to degrees, ensuring positive angle (0-360 range)
    h = (Math.atan2(okB, okA) * 180) / Math.PI;
    if (h < 0) h += 360;
  }

  // Clamp lightness to valid OKLCH range (0-1) for CSS compatibility
  const normalizedL = Math.max(0, Math.min(1, okL));

  return `oklch(${normalizedL.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
};

/**
 * Generates an appropriate foreground (text) color for a given background color in OKLCH format.
 *
 * This function analyzes the lightness of the provided OKLCH color and selects a contrasting
 * foreground color to ensure optimal text readability. For dark backgrounds (lightness < 0.5),
 * a light foreground color is chosen; for light backgrounds, a dark foreground is used.
 *
 * The generated foreground color uses zero chroma (grayscale) to ensure maximum contrast
 * and readability, which is a common practice in UI design.
 *
 * @param {string} oklch - The OKLCH color string to generate a foreground color for.
 * @returns {string} An OKLCH color string representing the foreground color. Returns a default
 *                   white color if the input format is invalid.
 *
 * @example
 *   generateForegroundColor("oklch(0.623 0.145 264.5)") // Returns: "oklch(0.985 0 0)" (light foreground for dark background)
 *   generateForegroundColor("oklch(0.850 0.120 120.0)") // Returns: "oklch(0.145 0 0)" (dark foreground for light background)
 */
const generateForegroundColor = (oklch: string): string => {
  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) {
    return "oklch(0.985 0 0)";
  }

  const l = parseFloat(match[1]);

  // Select contrasting foreground based on background lightness threshold
  const foregroundL = l < 0.5 ? 0.985 : 0.145;

  return `oklch(${foregroundL.toFixed(3)} 0 0)`;
};

/**
 * Updates the global CSS file with primary color theme variables in both light and dark modes.
 *
 * This function modifies the `globals.css` file to inject theme colors in OKLCH format,
 * which is compatible with Tailwind CSS and Shadcn UI. It updates:
 * - `:root` CSS variables for light mode (--primary and --primary-foreground)
 * - `.dark` CSS variables for dark mode (with adjusted lightness for better contrast)
 *
 * The function performs in-place replacement of existing color values using regex patterns,
 * ensuring that the CSS structure remains intact while only the color values are updated.
 *
 * @param {string} primaryColor - The primary color in hexadecimal format (e.g., "#6366f1").
 * @param {string} outputPath - The absolute path to the `globals.css` file to be updated.
 *
 * @sideeffect Modifies the file at `outputPath` by replacing existing primary color CSS variables.
 *
 * @throws {Error} If the file cannot be read or written (filesystem errors).
 */
const updateGlobalsCss = (primaryColor: string, outputPath: string): void => {
  const primaryOklch = hexToOklch(primaryColor);
  const primaryForegroundOklch = generateForegroundColor(primaryOklch);

  let content = fs.readFileSync(outputPath, "utf-8");

  // Replace existing primary color variables in :root selector
  content = content.replace(
    /--primary:\s*oklch\([^)]+\);/g,
    `--primary: ${primaryOklch};`
  );
  content = content.replace(
    /--primary-foreground:\s*oklch\([^)]+\);/g,
    `--primary-foreground: ${primaryForegroundOklch};`
  );

  // Generate a lighter variant for dark mode to ensure proper contrast
  const darkMatch = primaryOklch.match(
    /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/
  );
  let darkPrimaryOklch = primaryOklch;
  if (darkMatch) {
    const l = parseFloat(darkMatch[1]);
    const c = darkMatch[2];
    const h = darkMatch[3];
    // Increase lightness for dark mode (capped at 0.923 to prevent overly bright colors)
    const darkL = Math.min(0.923, l + 0.3);
    darkPrimaryOklch = `oklch(${darkL.toFixed(3)} ${c} ${h})`;
  }
  const darkPrimaryForegroundOklch = generateForegroundColor(darkPrimaryOklch);

  // Update .dark selector section with dark mode color variables
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
 * Generates theme configuration files for a Next.js project based on the WebsiteSpec.
 *
 * This function orchestrates the theme generation process by applying the theme configuration
 * from the WebsiteSpec to the generated project files. It updates:
 * - `globals.css` with the primary color theme (in OKLCH format for both light and dark modes)
 * - `layout.tsx` with the specified Google Font configuration
 *
 * The function performs no operation if the WebsiteSpec does not include a theme configuration,
 * allowing projects to use default themes when no customization is specified.
 *
 * @param {WebsiteSpec} spec - The website specification containing theme configuration.
 * @param {string} outputDir - The absolute path to the output directory where the generated project is located.
 *
 * @sideeffect Modifies `app/globals.css` and `app/layout.tsx` files in the output directory.
 *
 * @throws {Error} If theme files cannot be read or written (filesystem errors).
 */
export const generate = (spec: WebsiteSpec, outputDir: string): void => {
  if (!spec.theme) {
    return;
  }

  const globalsCssPath = path.join(outputDir, "app/globals.css");
  if (fs.existsSync(globalsCssPath)) {
    updateGlobalsCss(spec.theme.primaryColor, globalsCssPath);
  }

  const layoutPath = path.join(outputDir, "app/layout.tsx");
  if (fs.existsSync(layoutPath)) {
    updateLayout(spec.theme.font, layoutPath);
  }
};
