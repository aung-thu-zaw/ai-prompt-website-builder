import { ArchitectureStrategyConfig } from "@/types/architecture";

/**
 * Architecture strategies for component organization.
 *
 * This configuration maps each architecture preset to its component organization strategy,
 * defining both the import paths (used in generated code) and file system folder names
 * (where components are physically located).
 */
export const ARCHITECTURE_STRATEGIES: ArchitectureStrategyConfig = {
  landing: {
    importPath: (component) => `@/components/sections/${component}`,
    folder: "sections",
  },
  ecommerce: {
    importPath: (component) => `@/components/home/${component}`,
    folder: "home",
  },
  marketplace: {
    importPath: (component) => `@/components/layout/${component}`,
    folder: "layout",
  },
} as const;
