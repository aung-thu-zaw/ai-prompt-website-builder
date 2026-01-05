import { WebsiteSpec } from "@/types/website-spec";
import { OllamaConfig } from "@/types/ollama";
import {
  DEFAULT_OLLAMA_CONFIG,
  DEFAULT_OLLAMA_TIMEOUT,
} from "@/engine/config/ollama";
import { WEBSITE_SPEC_SYSTEM_PROMPT } from "@/engine/prompts/website-spec";

/**
 * Converts a natural language prompt into a typed `WebsiteSpec` using the Ollama API.
 *
 * This function:
 * 1. Merges the provided config with defaults (base URL, model, timeout)
 * 2. Builds a system-primed prompt for generating a WebsiteSpec JSON payload
 * 3. Calls Ollama's `/api/generate` endpoint and normalizes different response shapes
 * 4. Cleans up Markdown code fences / extra text and parses the JSON into a `WebsiteSpec`
 * 5. Validates the resulting spec and backfills the `slug` if missing
 *
 * It throws rich, human-readable errors for API failures, timeouts, connectivity issues,
 * invalid JSON, or structurally invalid specs so that callers can surface actionable messages.
 *
 * @param {string} prompt - The user's natural language description of the website to generate.
 * @param {OllamaConfig} [config] - Optional overrides for Ollama base URL, model, and timeout.
 * @returns {Promise<WebsiteSpec>} A validated WebsiteSpec ready to be used by generators.
 *
 * @throws {Error} If the Ollama API call fails, times out, or returns an invalid/unsupported format.
 */
export const promptToSpec = async (
  prompt: string,
  config: OllamaConfig = {}
): Promise<WebsiteSpec> => {
  // Merge caller config with defaults (e.g., base URL, model)
  const { baseUrl, model } = { ...DEFAULT_OLLAMA_CONFIG, ...config };

  // Compose the full system prompt used to instruct Ollama to produce a WebsiteSpec JSON payload
  const fullPrompt = `${WEBSITE_SPEC_SYSTEM_PROMPT}\n\nUser prompt: ${prompt}\n\nGenerate the WebsiteSpec JSON:`;

  try {
    const controller = new AbortController();

    // Enforce a hard timeout; aborts the fetch if Ollama takes too long
    const timeoutId = setTimeout(
      () => controller.abort(),
      DEFAULT_OLLAMA_TIMEOUT
    );

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

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    // Ollama responses can be either raw strings, an object with a `response` field,
    // or directly a JSON object compatible with WebsiteSpec. Normalize all shapes.
    const data = await response.json();

    console.log("🚀 ~ data:", data);

    let jsonText: string;
    if (typeof data === "string") {
      jsonText = data;
    } else if (data.response && typeof data.response === "string") {
      jsonText = data.response;
    } else if (typeof data === "object" && !data.response) {
      const spec = data as WebsiteSpec;
      if (spec.pages && Array.isArray(spec.pages)) {
        // Backfill slug from name if missing
        if (!spec.slug && spec.name) {
          spec.slug = spec.name
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

    // Trim and strip common Markdown code fences often present in LLM responses
    let jsonString = jsonText.trim();

    jsonString = jsonString
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    // Try to isolate the first JSON object in case there is leading/trailing commentary
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const spec = JSON.parse(jsonString) as WebsiteSpec;

    // Basic structural validation of the generated spec (pages are mandatory)
    if (!spec.pages || !Array.isArray(spec.pages) || spec.pages.length === 0) {
      throw new Error(
        "Invalid spec: pages array is required and must not be empty"
      );
    }

    // Backfill a URL-friendly slug if the model omitted it
    if (!spec.slug && spec.name) {
      spec.slug = spec.name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    // Log the parsed spec for debugging/troubleshooting purposes
    console.log("🚀 ~ spec:", spec);

    return spec;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse Ollama response as JSON: ${error.message}`
      );
    }
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          `Ollama API request timed out after ${
            DEFAULT_OLLAMA_TIMEOUT / 1000
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
};
