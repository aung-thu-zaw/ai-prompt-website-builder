/**
 * Type definitions for the website specification schema.
 * Defines the structure of the input JSON specification used to generate websites.
 */

export type ExportStyle = "default" | "named";

/**
 * Theme configuration for the website.
 */
export interface ThemeConfig {
  primaryColor: string;
  font: string;
}

/**
 * Section configuration within a page.
 */
export interface SectionConfig {
  id: string;
  kind: string;
  variant?: string;
  content?: Record<string, unknown>;
}

/**
 * Page configuration within the website.
 */
export interface PageConfig {
  id: string;
  route: string;
  sections: SectionConfig[];
}

/**
 * Complete website specification schema.
 * This is the root type for the JSON specification file.
 */
export interface WebsiteSpec {
  theme: ThemeConfig;
  pages: PageConfig[];
}
