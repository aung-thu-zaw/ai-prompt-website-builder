import { ArchitecturePreset } from "@/types/architecture";

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
 * This is the root type for the JSON specification file for the website code generator.
 */
export interface WebsiteSpec {
  architecture?: ArchitecturePreset;
  theme?: ThemeConfig;
  pages: PageConfig[];
}
