import { WebsiteSpec, PageConfig, SectionConfig } from "@/types/website-spec";
import { ArchitecturePreset } from "@/types/architecture";

/**
 * Validation result containing validation status and error details.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a WebsiteSpec against the expected schema structure.
 *
 * This function performs structural validation to ensure the spec conforms
 * to the WebsiteSpec interface. It checks:
 * - Required fields (name, slug, pages)
 * - Array types and non-empty constraints
 * - Page structure (id, name, route, sections)
 * - Section structure (id, kind)
 * - Architecture preset validity
 *
 * Validation is strict and does not attempt to repair issues - that's the
 * responsibility of the repair function. This function only identifies problems.
 *
 * @param {unknown} spec - The candidate spec to validate (may be any type).
 * @returns {ValidationResult} Object containing validation status and error messages.
 */
export const validate = (spec: unknown): ValidationResult => {
  const errors: string[] = [];

  // Must be an object
  if (!spec || typeof spec !== "object") {
    return {
      valid: false,
      errors: ["Spec must be a valid object"],
    };
  }

  const s = spec as Partial<WebsiteSpec>;

  // Required: name
  if (!s.name || typeof s.name !== "string" || s.name.trim().length === 0) {
    errors.push("Missing or invalid 'name' field (must be a non-empty string)");
  }

  // Required: slug
  if (!s.slug || typeof s.slug !== "string" || s.slug.trim().length === 0) {
    errors.push("Missing or invalid 'slug' field (must be a non-empty string)");
  }

  // Optional: description (if present, must be string)
  if (s.description !== undefined && typeof s.description !== "string") {
    errors.push("'description' must be a string if provided");
  }

  // Optional: architecture (if present, must be valid preset)
  if (s.architecture !== undefined) {
    const validArchitectures: ArchitecturePreset[] = [
      "landing",
      "ecommerce",
      "marketplace",
    ];
    if (!validArchitectures.includes(s.architecture)) {
      errors.push(
        `Invalid 'architecture' value. Must be one of: ${validArchitectures.join(
          ", "
        )}`
      );
    }
  }

  // Optional: theme (if present, must have required fields)
  if (s.theme !== undefined) {
    if (typeof s.theme !== "object" || s.theme === null) {
      errors.push("'theme' must be an object if provided");
    } else {
      if (!s.theme.primaryColor || typeof s.theme.primaryColor !== "string") {
        errors.push("'theme.primaryColor' is required and must be a string");
      }
      if (!s.theme.font || typeof s.theme.font !== "string") {
        errors.push("'theme.font' is required and must be a string");
      }
    }
  }

  // Required: pages (must be non-empty array)
  if (!s.pages) {
    errors.push("Missing required 'pages' field");
  } else if (!Array.isArray(s.pages)) {
    errors.push("'pages' must be an array");
  } else if (s.pages.length === 0) {
    errors.push("'pages' array must not be empty");
  } else {
    // Validate each page
    s.pages.forEach((page: unknown, index: number) => {
      if (!page || typeof page !== "object") {
        errors.push(`Page at index ${index} must be an object`);
        return;
      }

      const p = page as Partial<PageConfig>;

      // Required: page.id
      if (!p.id || typeof p.id !== "string" || p.id.trim().length === 0) {
        errors.push(`Page at index ${index} is missing or has invalid 'id'`);
      }

      // Required: page.name
      if (!p.name || typeof p.name !== "string" || p.name.trim().length === 0) {
        errors.push(`Page at index ${index} is missing or has invalid 'name'`);
      }

      // Required: page.route
      if (
        !p.route ||
        typeof p.route !== "string" ||
        p.route.trim().length === 0
      ) {
        errors.push(`Page at index ${index} is missing or has invalid 'route'`);
      }

      // Required: page.sections (must be array)
      if (!p.sections) {
        errors.push(`Page at index ${index} is missing 'sections' field`);
      } else if (!Array.isArray(p.sections)) {
        errors.push(`Page at index ${index} 'sections' must be an array`);
      } else {
        // Validate each section
        p.sections.forEach((section: unknown, secIndex: number) => {
          if (!section || typeof section !== "object") {
            errors.push(
              `Page at index ${index}, section at index ${secIndex} must be an object`
            );
            return;
          }

          const sec = section as Partial<SectionConfig>;

          // Required: section.id
          if (
            !sec.id ||
            typeof sec.id !== "string" ||
            sec.id.trim().length === 0
          ) {
            errors.push(
              `Page at index ${index}, section at index ${secIndex} is missing or has invalid 'id'`
            );
          }

          // Required: section.kind
          if (
            !sec.kind ||
            typeof sec.kind !== "string" ||
            sec.kind.trim().length === 0
          ) {
            errors.push(
              `Page at index ${index}, section at index ${secIndex} is missing or has invalid 'kind'`
            );
          }

          // Optional: section.variant (if present, must be string)
          if (sec.variant !== undefined && typeof sec.variant !== "string") {
            errors.push(
              `Page at index ${index}, section at index ${secIndex} 'variant' must be a string if provided`
            );
          }

          // Optional: section.content (if present, must be object)
          if (sec.content !== undefined && typeof sec.content !== "object") {
            errors.push(
              `Page at index ${index}, section at index ${secIndex} 'content' must be an object if provided`
            );
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
