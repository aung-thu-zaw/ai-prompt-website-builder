import { WebsiteSpec } from "@/types/website-spec";

/**
 * Configuration for Ollama API client.
 */
interface OllamaConfig {
  baseUrl?: string;
  model?: string;
}

/**
 * Default Ollama configuration.
 */
const DEFAULT_CONFIG: Required<OllamaConfig> = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "qwen2.5:latest",
};

/**
 * Default timeout for Ollama API requests (in milliseconds).
 */
const DEFAULT_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || "120000", 10); // 120 seconds default

/**
 * System prompt that instructs the LLM to generate a WebsiteSpec JSON.
 */
const SYSTEM_PROMPT = `You are a website specification generator. Your task is to convert a user's prompt into a structured JSON specification for a website.

The specification must follow this exact structure:
{
  "project": {
    "name": "string (website name)",
    "slug": "string (URL-friendly identifier, lowercase with hyphens)"
  },
  "architecture": "landing" | "ecommerce" | "marketplace",
  "theme": {
    "primaryColor": "string (hex color code, e.g., #6366f1)",
    "font": "string (Google Font name, e.g., Inter, Anton, Geist_Mono)"
  },
  "pages": [
    {
      "id": "string (unique page identifier)",
      "route": "string (URL route, e.g., /)",
      "sections": [
        {
          "id": "string (unique section identifier)",
          "kind": "hero" | "features" | "pricing" | "footer",
          "variant": "string (optional, e.g., default, split)",
          "content": {
            // Section-specific content based on kind
            // For hero: title, subtitle, ctaLabel, etc.
            // For features: items (array of strings)
            // For pricing: plans (array of strings)
            // For footer: copyright, links, etc.
          }
        }
      ]
    }
  ]
}

Important rules:
- Always return valid JSON only, no markdown code blocks or extra text
- Generate a slug from the project name if not explicitly provided
- Choose appropriate architecture based on the prompt (landing for simple sites, ecommerce for shops, marketplace for multi-vendor)
- Select a primary color that matches the theme/industry
- Choose a Google Font that fits the design style
- Generate meaningful section content based on the user's prompt
- Ensure all IDs are unique and follow a consistent pattern`;

/**
 * Generates a WebsiteSpec from a user prompt using Ollama.
 *
 * @param prompt - The user's natural language prompt describing the website
 * @param config - Optional Ollama configuration (baseUrl, model)
 * @returns A Promise that resolves to a WebsiteSpec
 * @throws Error if the Ollama API call fails or the response is invalid
 */
export async function promptToSpec(
  prompt: string,
  config: OllamaConfig = {}
): Promise<WebsiteSpec> {
  const { baseUrl, model } = { ...DEFAULT_CONFIG, ...config };

  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser prompt: ${prompt}\n\nGenerate the WebsiteSpec JSON:`;

  try {
    console.log(`[Ollama] Connecting to ${baseUrl} with model: ${model}`);

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[Ollama] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    const data = await response.json();

    // Ollama returns { response: "...", done: true } format
    let jsonText: string;
    if (typeof data === "string") {
      jsonText = data;
    } else if (data.response && typeof data.response === "string") {
      jsonText = data.response;
    } else if (typeof data === "object" && !data.response) {
      // If the response is already a parsed object, use it directly
      const spec = data as WebsiteSpec;
      if (spec.pages && Array.isArray(spec.pages)) {
        // Ensure project slug is generated if missing
        if (spec.project && !spec.project.slug && spec.project.name) {
          spec.project.slug = spec.project.name
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[\s\W-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        }
        return spec;
      }
      throw new Error(
        "Invalid response format: expected WebsiteSpec structure"
      );
    } else {
      throw new Error("Unexpected response format from Ollama API");
    }

    // Extract JSON from response (handle cases where LLM wraps it in markdown)
    let jsonString = jsonText.trim();

    // Remove markdown code blocks if present
    jsonString = jsonString
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const spec = JSON.parse(jsonString) as WebsiteSpec;

    // Validate required fields
    if (!spec.pages || !Array.isArray(spec.pages) || spec.pages.length === 0) {
      throw new Error(
        "Invalid spec: pages array is required and must not be empty"
      );
    }

    // Ensure project slug is generated if missing
    if (spec.project && !spec.project.slug && spec.project.name) {
      spec.project.slug = spec.project.name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    console.log("🚀 ~ spec:", spec);

    return spec;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse Ollama response as JSON: ${error.message}`
      );
    }
    if (error instanceof Error) {
      console.error(`[Ollama] Error: ${error.name} - ${error.message}`);

      // Handle fetch errors (network, timeout, etc.)
      if (error.name === "AbortError") {
        throw new Error(
          `Ollama API request timed out after ${
            DEFAULT_TIMEOUT / 1000
          } seconds. The model "${model}" might be slow or Ollama might not be responding. Check: 1) Ollama is running (ollama serve), 2) Model is available (ollama list), 3) Try a smaller/faster model.`
        );
      }
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ECONNRESET")
      ) {
        throw new Error(
          `Cannot connect to Ollama at ${baseUrl}. Make sure: 1) Ollama is running (ollama serve), 2) The base URL is correct, 3) No firewall is blocking the connection.`
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred while calling Ollama API");
  }
}
