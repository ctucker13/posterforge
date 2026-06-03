#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import pptxgen from "pptxgenjs";
import type { PosterProject } from "../src/domain/poster.js";
import { renderPosterHtml } from "../src/exports/renderPosterHtml.js";

const args = parseArgs(process.argv.slice(2));
const posterPath = String(args.poster ?? "spec/example-poster.json");
const outDir = String(args["out-dir"] ?? "exports");
const baseName = String(args.name ?? path.basename(posterPath, path.extname(posterPath)));
const poster: PosterProject = JSON.parse(await readFile(posterPath, "utf8"));
const css = await readFile("src/styles/app.css", "utf8");
const a0 = getA0Canvas(poster.format?.orientation ?? "landscape");

await mkdir(outDir, { recursive: true });

const htmlPath = path.join(outDir, `${baseName}.html`);
const pngPath = path.join(outDir, `${baseName}.png`);
const pptxPath = path.join(outDir, `${baseName}.html-render.pptx`);
const measurementPath = path.join(outDir, `${baseName}.measurements.json`);

// Use the canonical React renderer — no duplicate rendering stack.
// Replace root-relative asset paths with absolute file:// URLs so they
// resolve correctly when Playwright opens the HTML as a local file.
const publicBase = pathToFileURL(path.resolve("public")).href + "/";
const rawHtml = renderPosterHtml(poster, { css, title: poster.title, mode: "export" });
const html = rawHtml.replace(/\bsrc="\/([^"]+)"/g, (_, p) => `src="${publicBase}${p}"`);

await writeFile(htmlPath, html);

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: a0.pixelWidth, height: a0.pixelHeight }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: "domcontentloaded" });
  await page.locator(".a0-preview-canvas").waitFor({ timeout: 15_000 });

  const measurements = await page.locator(".a0-preview-canvas").evaluate((canvasElement: HTMLElement) => {
    const posterElement = canvasElement.querySelector<HTMLElement>(".poster");
    if (!posterElement) {
      throw new Error("Could not find rendered poster inside A0 canvas.");
    }

    const canvasRect = canvasElement.getBoundingClientRect();
    const posterRect = posterElement.getBoundingClientRect();
    const items = [...posterElement.querySelectorAll("[data-poster-id], [data-visual-id], [data-block-id]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.getAttribute("data-poster-id") ?? element.getAttribute("data-visual-id") ?? element.getAttribute("data-block-id"),
        kind: element.getAttribute("data-poster-kind") ?? element.getAttribute("data-visual-type") ?? element.tagName.toLowerCase(),
        x: rect.left - canvasRect.left,
        y: rect.top - canvasRect.top,
        width: rect.width,
        height: rect.height,
      };
    });

    return {
      width: canvasRect.width,
      height: canvasRect.height,
      orientation: canvasElement.getAttribute("data-orientation"),
      aspectRatio: canvasRect.width / canvasRect.height,
      posterScale: 1,
      fittedPoster: {
        x: posterRect.left - canvasRect.left,
        y: posterRect.top - canvasRect.top,
        width: posterRect.width,
        height: posterRect.height,
      },
      items,
    };
  });

  await page.locator(".a0-preview-canvas").screenshot({ path: pngPath, animations: "disabled" });
  await writeFile(measurementPath, `${JSON.stringify({ posterId: poster.id, htmlPath, pngPath, pptxPath, a0, ...measurements }, null, 2)}\n`);
} catch (err) {
  console.error("Export failed:", err);
  process.exitCode = 1;
} finally {
  await browser?.close();
}

const slideWidth = a0.slideWidth;
const slideHeight = a0.slideHeight;
const pptx = new pptxgen();
pptx.defineLayout({ name: "POSTERFORGE_HTML", width: slideWidth, height: slideHeight });
pptx.layout = "POSTERFORGE_HTML";
pptx.author = "PosterForge";
pptx.subject = `High-fidelity HTML poster render, A0 ${a0.orientation}`;
pptx.title = poster.title;
const slide = pptx.addSlide();
slide.background = { color: "FFFFFF" };
slide.addImage({ path: pngPath, x: 0, y: 0, w: slideWidth, h: slideHeight });
slide.addNotes(`PosterForge high-fidelity HTML render export.\nPoster ID: ${poster.id}\nFormat: A0 ${a0.orientation} (${a0.mmWidth}mm x ${a0.mmHeight}mm)\nSource JSON: ${posterPath}\nMeasurements: ${measurementPath}`);
await pptx.writeFile({ fileName: pptxPath });

console.log(`HTML render: ${htmlPath}`);
console.log(`PNG capture: ${pngPath}`);
console.log(`PPTX export: ${pptxPath}`);
console.log(`Measurements: ${measurementPath}`);
console.log(`A0 ${a0.orientation}: ${a0.mmWidth}mm x ${a0.mmHeight}mm, slide ${slideWidth.toFixed(3)}in x ${slideHeight.toFixed(3)}in`);

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
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

function getA0Canvas(orientation: string) {
  const isPortrait = orientation === "portrait";
  const mmWidth = isPortrait ? 841 : 1189;
  const mmHeight = isPortrait ? 1189 : 841;
  const pixelWidth = isPortrait ? 1131 : 1600;
  const pixelHeight = Math.round((pixelWidth * mmHeight) / mmWidth);
  const slideWidth = mmWidth / 25.4;
  const slideHeight = mmHeight / 25.4;
  return { orientation: isPortrait ? "portrait" : "landscape", mmWidth, mmHeight, pixelWidth, pixelHeight, slideWidth, slideHeight, aspectRatio: mmWidth / mmHeight };
}
