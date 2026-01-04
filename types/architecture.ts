/**
 * Export style for React components.
 */
export type ExportStyle = "default" | "named";

/**
 * Architecture preset for organizing website components.
 */
export type ArchitecturePreset = "landing" | "ecommerce" | "marketplace";

/**
 * Architecture strategy for component organization.
 */
export type ArchitectureStrategy = {
  importPath: (component: string) => string;
  folder: string;
};

/**
 * Architecture strategy configuration mapping.
 */
export type ArchitectureStrategyConfig = Record<
  ArchitecturePreset,
  ArchitectureStrategy
>;
