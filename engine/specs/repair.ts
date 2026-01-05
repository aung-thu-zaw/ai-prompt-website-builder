import { WebsiteSpec, PageConfig, SectionConfig } from "@/types/website-spec";

/**
 * Generates a URL-friendly slug from a name string.
 */
const generateSlug = (name: string): string => {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Generates a unique ID from a prefix and index.
 */
const generateId = (prefix: string, index: number): string => {
  return `${prefix}_${index + 1}`;
};

/**
 * Auto-repairs a WebsiteSpec by filling missing required fields with safe defaults.
 *
 * This function performs conservative auto-repair that:
 * - Fills missing IDs (for pages and sections)
 * - Ensures arrays exist (pages, sections)
 * - Generates slugs from names if missing
 * - Preserves all existing content
 *
 * It does NOT:
 * - Invent new sections or pages
 * - Guess section kinds
 * - Drop user-provided content
 * - Modify valid existing structure
 *
 * This is safe auto-repair that only fills gaps, never changes intent.
 *
 * @param {Partial<WebsiteSpec>} spec - The potentially incomplete spec to repair.
 * @returns {WebsiteSpec} A repaired spec guaranteed to be generator-safe.
 * @throws {Error} If the spec is too broken to repair (e.g., no pages at all).
 */
export const repair = (spec: Partial<WebsiteSpec>): WebsiteSpec => {
  // Must have at least a name or we can't proceed
  if (!spec.name || typeof spec.name !== "string") {
    throw new Error(
      "Cannot repair spec: missing required 'name' field. Auto-repair cannot invent a website name."
    );
  }

  const name = spec.name.trim();
  if (name.length === 0) {
    throw new Error(
      "Cannot repair spec: 'name' field is empty. Auto-repair cannot invent a website name."
    );
  }

  // Generate slug from name if missing
  let slug = spec.slug;
  if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
    slug = generateSlug(name);
  } else {
    slug = slug.trim();
  }

  // Ensure pages array exists
  let pages: PageConfig[] = [];
  if (spec.pages && Array.isArray(spec.pages) && spec.pages.length > 0) {
    pages = spec.pages.map((page: Partial<PageConfig>, index: number) => {
      // Ensure page has required fields
      let pageId = page.id;
      if (!pageId || typeof pageId !== "string" || pageId.trim().length === 0) {
        pageId = generateId("page", index);
      } else {
        pageId = pageId.trim();
      }

      let pageName = page.name;
      if (
        !pageName ||
        typeof pageName !== "string" ||
        pageName.trim().length === 0
      ) {
        // Generate name from id or use default
        pageName = pageId
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      } else {
        pageName = pageName.trim();
      }

      let route = page.route;
      if (!route || typeof route !== "string" || route.trim().length === 0) {
        // Default route for first page is "/", others use page id
        route = index === 0 ? "/" : `/${pageId}`;
      } else {
        route = route.trim();
      }

      // Ensure sections array exists
      let sections: SectionConfig[] = [];
      if (page.sections && Array.isArray(page.sections)) {
        sections = page.sections.map(
          (section: Partial<SectionConfig>, secIndex: number) => {
            // Ensure section has required fields
            let sectionId = section.id;
            if (
              !sectionId ||
              typeof sectionId !== "string" ||
              sectionId.trim().length === 0
            ) {
              sectionId = generateId(`sec_${pageId}`, secIndex);
            } else {
              sectionId = sectionId.trim();
            }

            // Section kind is required - if missing, we cannot guess it
            // This is a hard requirement that cannot be auto-repaired
            if (
              !section.kind ||
              typeof section.kind !== "string" ||
              section.kind.trim().length === 0
            ) {
              throw new Error(
                `Cannot repair spec: section at page index ${index}, section index ${secIndex} is missing 'kind'. Auto-repair cannot guess section types.`
              );
            }

            const kind = section.kind.trim();

            // Preserve variant if present
            const variant =
              section.variant && typeof section.variant === "string"
                ? section.variant.trim()
                : undefined;

            // Preserve content if present (must be object)
            const content =
              section.content &&
              typeof section.content === "object" &&
              section.content !== null &&
              !Array.isArray(section.content)
                ? (section.content as Record<string, unknown>)
                : undefined;

            return {
              id: sectionId,
              kind,
              ...(variant && { variant }),
              ...(content && { content }),
            };
          }
        );
      }

      return {
        id: pageId,
        name: pageName,
        route,
        sections,
      };
    });
  } else {
    // No pages at all - this is unrecoverable
    throw new Error(
      "Cannot repair spec: missing 'pages' array. Auto-repair cannot invent pages."
    );
  }

  // Build the repaired spec
  const repaired: WebsiteSpec = {
    name,
    slug,
    ...(spec.description &&
      typeof spec.description === "string" && {
        description: spec.description.trim(),
      }),
    ...(spec.architecture && { architecture: spec.architecture }),
    ...(spec.theme &&
      typeof spec.theme === "object" &&
      spec.theme !== null &&
      spec.theme.primaryColor &&
      typeof spec.theme.primaryColor === "string" &&
      spec.theme.font &&
      typeof spec.theme.font === "string" && {
        theme: {
          primaryColor: spec.theme.primaryColor.trim(),
          font: spec.theme.font.trim(),
        },
      }),
    pages,
  };

  return repaired;
};
