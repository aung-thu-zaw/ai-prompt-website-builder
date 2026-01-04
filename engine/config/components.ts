/**
 * Mapping of section kinds to their available variants and corresponding component names.
 *
 * This configuration maps section types (e.g., "hero", "features") to their variants
 * (e.g., "default", "split", etc...) and the React component names that should be used.
 */
export const SECTION_COMPONENTS: Record<string, Record<string, string>> = {
  hero: {
    default: "HeroDefault",
    split: "HeroSplit",
  },
  features: {
    default: "Features",
  },
  pricing: {
    default: "Pricing",
  },
  footer: {
    default: "Footer",
  },
} as const;
