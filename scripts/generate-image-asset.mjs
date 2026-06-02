#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const generatedVisualTypes = new Set(["ai_image", "generated_background", "generated_comic_panel"]);
const generatedAssetTypes = new Set(["ai_image", "generated_background", "generated_panel"]);

const args = parseArgs(process.argv.slice(2));
const posterPath = String(args.poster ?? "spec/example-poster.json");
const outDir = String(args["out-dir"] ?? "public/generated-assets");
const dryRun = Boolean(args["dry-run"]) || !process.env.OPENAI_API_KEY;

const poster = JSON.parse(await readFile(posterPath, "utf8"));
const candidate = selectCandidate(poster, args);
const request = toImageAssetRequest(candidate, outDir, args);

await mkdir(outDir, { recursive: true });

if (dryRun) {
  const metadata = buildMetadata(request, {
    status: "dry_run",
    note: process.env.OPENAI_API_KEY ? "Dry run requested. No OpenAI API call was made." : "OPENAI_API_KEY is not set. No OpenAI API call was made.",
  });
  await writeJson(request.metadataPath, metadata);
  printPlan(request, metadata);
  process.exit(0);
}

try {
  const image = await generateImage(request, process.env.OPENAI_API_KEY);
  await writeFile(request.outputPath, image.bytes);

  const metadata = buildMetadata(request, {
    status: "complete",
    revisedPrompt: image.revisedPrompt,
  });
  await writeJson(request.metadataPath, metadata);

  const updatedPoster = attachGeneratedAsset(poster, candidate, metadata);
  const posterOutputPath = path.join(outDir, `${poster.id ?? "poster"}.generated.json`);
  await writeJson(posterOutputPath, updatedPoster);

  console.log(`Generated ${request.title}`);
  console.log(`Image: ${request.outputPath}`);
  console.log(`Metadata: ${request.metadataPath}`);
  console.log(`Updated poster JSON: ${posterOutputPath}`);
} catch (error) {
  const metadata = buildMetadata(request, {
    status: "failed",
    note: formatGenerationError(error),
    error: normalizeGenerationError(error),
  });
  await writeJson(request.metadataPath, metadata);
  printFailure(request, metadata);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function selectCandidate(project, options) {
  const candidates = listCandidates(project);

  if (options.visual) {
    const match = candidates.find((candidate) => candidate.visual?.id === options.visual);
    if (!match) {
      throw new Error(`No generated visual found for --visual ${options.visual}`);
    }
    return match;
  }

  if (options.asset) {
    const match = candidates.find((candidate) => candidate.asset.id === options.asset);
    if (!match) {
      throw new Error(`No generated asset found for --asset ${options.asset}`);
    }
    return match;
  }

  const first = candidates[0];
  if (!first) {
    throw new Error("No generated visual or project asset found in poster JSON.");
  }

  return first;
}

function listCandidates(project) {
  const visualCandidates = (project.visuals ?? []).flatMap((visual) => {
    if (!generatedVisualTypes.has(visual.type) || !visual.asset) {
      return [];
    }

    return [{ source: "visual", visual, asset: visual.asset }];
  });

  const projectAssetCandidates = (project.assets ?? [])
    .filter((asset) => generatedAssetTypes.has(asset.type))
    .map((asset) => ({ source: "asset", asset }));

  return [...visualCandidates, ...projectAssetCandidates];
}

function toImageAssetRequest(candidate, outputDirectory, options) {
  const asset = candidate.asset;
  const outputPath = path.join(outputDirectory, `${asset.id}.png`);
  const metadataPath = path.join(outputDirectory, `${asset.id}.json`);
  const publicUrl = outputPath.startsWith(`public${path.sep}`) ? `/${path.relative("public", outputPath).replaceAll(path.sep, "/")}` : outputPath;
  const model = String(options.model ?? asset.model ?? "gpt-image-1.5");

  return {
    id: asset.id,
    visualId: candidate.visual?.id,
    title: asset.title ?? candidate.visual?.title ?? asset.id,
    role: asset.role,
    prompt: buildImagePrompt(asset, candidate.visual),
    model,
    size: String(options.size ?? inferImageSize(asset)),
    outputPath,
    metadataPath,
    publicUrl,
    theme: asset.theme,
    palette: asset.palette,
    sourceIds: asset.source_ids ?? [],
  };
}

function buildImagePrompt(asset, visual) {
  const basePrompt = asset.prompt?.trim() || String(visual?.data?.prompt ?? "").trim();
  const roleText = String(asset.role ?? "atmosphere").replace(/_/g, " ");
  const themeText = asset.theme ? `Theme: ${asset.theme}.` : "";
  const paletteText = asset.palette ? `Palette: ${asset.palette}.` : "";

  return [
    basePrompt,
    `Use this only as non-factual ${roleText} for an academic/data science poster.`,
    "Do not render exact text, numbers, code, equations, labels, charts, tables, logos, or factual evidence.",
    "Avoid misleading data-like marks; keep factual content for deterministic renderers.",
    themeText,
    paletteText,
  ]
    .filter(Boolean)
    .join(" ");
}

function inferImageSize(asset) {
  const width = asset.width_px ?? 0;
  const height = asset.height_px ?? 0;

  if (width > height) {
    return "1536x1024";
  }

  if (height > width) {
    return "1024x1536";
  }

  return "1024x1024";
}

async function generateImage(request, apiKey) {
  const body = {
    model: request.model,
    prompt: request.prompt,
    size: request.size,
    n: 1,
  };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new OpenAiImageError(response.status, errorText);
  }

  const payload = await response.json();
  const image = payload.data?.[0];
  if (!image) {
    throw new Error("OpenAI image generation returned no image data.");
  }

  if (image.b64_json) {
    return {
      bytes: Buffer.from(image.b64_json, "base64"),
      revisedPrompt: image.revised_prompt,
    };
  }

  if (image.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error(`Could not download generated image (${imageResponse.status}).`);
    }

    return {
      bytes: Buffer.from(await imageResponse.arrayBuffer()),
      revisedPrompt: image.revised_prompt,
    };
  }

  throw new Error("OpenAI image generation response did not include b64_json or url.");
}

function buildMetadata(request, options) {
  return {
    id: request.id,
    visualId: request.visualId,
    title: request.title,
    role: request.role,
    provider: "openai",
    model: request.model,
    size: request.size,
    prompt: request.prompt,
    theme: request.theme,
    palette: request.palette,
    source_ids: request.sourceIds,
    outputPath: request.outputPath,
    publicUrl: request.publicUrl,
    status: options.status,
    note: options.note,
    error: options.error,
    generatedAt: new Date().toISOString(),
    revisedPrompt: options.revisedPrompt,
  };
}

function attachGeneratedAsset(project, candidate, metadata) {
  const next = JSON.parse(JSON.stringify(project));

  if (candidate.visual?.id) {
    const visual = next.visuals?.find((item) => item.id === candidate.visual.id);
    if (visual?.asset) {
      visual.asset.url = metadata.publicUrl;
      visual.asset.metadata = {
        ...(visual.asset.metadata ?? {}),
        provider: metadata.provider,
        generated_at: metadata.generatedAt,
        metadata_path: metadata.outputPath.replace(/\.png$/, ".json"),
      };
    }
  } else {
    const asset = next.assets?.find((item) => item.id === candidate.asset.id);
    if (asset) {
      asset.url = metadata.publicUrl;
      asset.metadata = {
        ...(asset.metadata ?? {}),
        provider: metadata.provider,
        generated_at: metadata.generatedAt,
        metadata_path: metadata.outputPath.replace(/\.png$/, ".json"),
      };
    }
  }

  next.metadata = {
    ...(next.metadata ?? {}),
    updated_at: metadata.generatedAt,
  };

  return next;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function printPlan(request, metadata) {
  console.log(`Planned generated image asset: ${request.title}`);
  console.log(`Model: ${request.model}`);
  console.log(`Size: ${request.size}`);
  console.log(`Output: ${request.outputPath}`);
  console.log(`Metadata: ${request.metadataPath}`);
  console.log(`Status: ${metadata.status}`);
  console.log("");
  console.log(request.prompt);
  console.log("");
  console.log("Run with OPENAI_API_KEY set to generate the PNG.");
}

class OpenAiImageError extends Error {
  constructor(status, bodyText) {
    const parsed = parseErrorBody(bodyText);
    const message = parsed?.error?.message ?? bodyText;
    super(`OpenAI image generation failed (${status}): ${message}`);
    this.name = "OpenAiImageError";
    this.status = status;
    this.body = parsed ?? bodyText;
  }
}

function parseErrorBody(bodyText) {
  try {
    return JSON.parse(bodyText);
  } catch {
    return undefined;
  }
}

function normalizeGenerationError(error) {
  if (error instanceof OpenAiImageError) {
    return {
      provider: "openai",
      status: error.status,
      type: error.body?.error?.type,
      code: error.body?.error?.code,
      message: error.body?.error?.message ?? error.message,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
  };
}

function formatGenerationError(error) {
  const normalized = normalizeGenerationError(error);
  if (normalized.code === "billing_hard_limit_reached" || normalized.type === "billing_limit_user_error") {
    return "OpenAI rejected the request because the account billing hard limit has been reached. Increase or reset the project/account billing limit, then rerun the same command.";
  }

  if (normalized.status === 401) {
    return "OpenAI rejected the request because the API key is missing, invalid, or not authorized for this project.";
  }

  if (normalized.status === 429) {
    return "OpenAI rate limits were reached. Wait and rerun the command, or lower request volume.";
  }

  if (normalized.status === 400 && normalized.message?.includes("model")) {
    return "OpenAI rejected the request parameters. Check the model name and size, or pass a supported model with --model.";
  }

  return normalized.message ?? "Image generation failed.";
}

function printFailure(request, metadata) {
  console.error(`Image generation failed for ${request.title}`);
  console.error(`Status: ${metadata.status}`);
  console.error(`Reason: ${metadata.note}`);
  console.error(`Metadata: ${request.metadataPath}`);
}
