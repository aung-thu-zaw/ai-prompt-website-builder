import { OllamaConfig } from "@/types/ollama";

/**
 * Default Ollama configuration.
 */
export const DEFAULT_OLLAMA_CONFIG: Required<OllamaConfig> = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "qwen2.5:latest",
};

/**
 * Default timeout for Ollama API requests (in milliseconds).
 */
export const DEFAULT_OLLAMA_TIMEOUT = parseInt(
  process.env.OLLAMA_TIMEOUT || "120000",
  10
);
