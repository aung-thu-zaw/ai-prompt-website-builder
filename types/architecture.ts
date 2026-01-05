/**
 * Export style for React components.
 */
export type ExportStyle = "default" | "named";

/**
 * Architecture preset for organizing generated website components.
 */
export type ArchitecturePreset = "landing" | "ecommerce" | "marketplace";

/**
 * Architecture strategy for generated website component organization.
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
