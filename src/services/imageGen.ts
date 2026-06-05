import type { GeneratedImageSlot, PosterProject } from "../domain/poster";
import { getOpenAIClient } from "./openai";

/**
 * In-browser image generation for poster slots.
 *
 * Mirrors the browser-side text-generation pattern (see `getOpenAIClient`): by
 * default it calls OpenAI directly so the edit canvas can preview generated
 * artwork live. If `VITE_IMAGEGEN_URL` is set, requests are POSTed to that
 * endpoint instead (e.g. a self-hosted image-gen service) so the API key can
 * live server-side without any code change.
 *
 * The offline CLI (`scripts/generate-image-asset.mjs`) remains the path that
 * bakes generated images to files + sidecars for export/production; this module
 * is for the interactive design loop and returns a data URL the canvas renders
 * immediately via `slot.url`.
 */

const IMAGE_MODEL: string = (import.meta.env.VITE_OPENAI_IMAGE_MODEL as string | undefined) ?? "gpt-image-2";
const IMAGEGEN_URL = import.meta.env.VITE_IMAGEGEN_URL as string | undefined;

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ImageFormat = "png" | "webp";

export interface SlotGenerationResult {
  /** A `data:` URL ready to assign to `slot.url` for instant preview. */
  dataUrl: string;
  outputFormat: ImageFormat;
}

export function imageGenBackend(): "openai" | "service" {
  return IMAGEGEN_URL ? "service" : "openai";
}

function inferSize(slot: GeneratedImageSlot): ImageSize {
  const width = slot.width_px ?? 0;
  const height = slot.height_px ?? 0;
  if (width > height) return "1536x1024";
  if (height > width) return "1024x1536";
  return "1024x1024";
}

function backgroundForRole(role: GeneratedImageSlot["role"]): "opaque" | "transparent" {
  // Background fills the whole poster; foreground art composites over it.
  return role === "background" ? "opaque" : "transparent";
}

function mimeFor(format: ImageFormat): string {
  return format === "png" ? "image/png" : "image/webp";
}

export function buildSlotPrompt(slot: GeneratedImageSlot, poster: PosterProject): string {
  const basePrompt = slot.prompt?.trim() || `Abstract ${String(slot.role).replace(/_/g, " ")} artwork`;
  const roleText = String(slot.role).replace(/_/g, " ");
  const theme = typeof poster.theme === "string" ? poster.theme : undefined;
  const palette = typeof poster.palette === "string" ? poster.palette : undefined;

  return [
    basePrompt,
    `Use this only as non-factual ${roleText} for an academic/data science poster.`,
    "Do not render exact text, numbers, code, equations, labels, charts, tables, logos, or factual evidence.",
    "Avoid misleading data-like marks; keep factual content for deterministic renderers.",
    theme ? `Theme: ${theme}.` : "",
    palette ? `Palette: ${palette}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateImageForSlot(
  slot: GeneratedImageSlot,
  poster: PosterProject,
  options: { exact?: boolean } = {},
): Promise<SlotGenerationResult> {
  const outputFormat: ImageFormat = slot.outputFormat ?? "webp";
  const size = inferSize(slot);
  const background = backgroundForRole(slot.role);
  let prompt = buildSlotPrompt(slot, poster);
  // "Exact" regeneration nudges the model to stay close to the prior result.
  if (options.exact) {
    prompt = `${prompt} Keep the same composition, palette, and overall look as the previous version.`;
  }

  const b64 = IMAGEGEN_URL
    ? await generateViaService(IMAGEGEN_URL, { prompt, size, outputFormat, background })
    : await generateViaOpenAI({ prompt, size, outputFormat, background });

  return { dataUrl: `data:${mimeFor(outputFormat)};base64,${b64}`, outputFormat };
}

interface GenerateParams {
  prompt: string;
  size: ImageSize;
  outputFormat: ImageFormat;
  background: "opaque" | "transparent";
}

async function generateViaOpenAI(params: GenerateParams): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.images.generate({
    model: IMAGE_MODEL,
    prompt: params.prompt,
    size: params.size,
    n: 1,
    output_format: params.outputFormat,
    background: params.background,
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation returned no image data.");
  }
  return b64;
}

async function generateViaService(url: string, params: GenerateParams): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: params.prompt,
      size: params.size,
      output_format: params.outputFormat,
      background: params.background,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Image service responded ${response.status}${detail ? `: ${detail}` : ""}.`);
  }

  const payload = await response.json();
  // Accept either a bare { b64_json } or an OpenAI-style { data: [{ b64_json }] }.
  const b64 = payload.b64_json ?? payload.data?.[0]?.b64_json;
  if (typeof b64 !== "string") {
    throw new Error("Image service response did not include b64_json.");
  }
  return b64;
}
