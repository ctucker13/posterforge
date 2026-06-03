import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import type { PosterProject } from "../src/domain/poster";
import { getA0PreviewFrame } from "../src/components/PosterCanvas";
import { renderPosterHtml } from "../src/exports/renderPosterHtml";

const args = parseArgs(process.argv.slice(2));
const posterPath = String(args.poster ?? "spec/example-poster.json");
const outDir = String(args["out-dir"] ?? "exports");
const baseName = String(args.name ?? path.basename(posterPath, path.extname(posterPath)));
const poster = normalizeAssetUrls(JSON.parse(await readFile(posterPath, "utf8")) as PosterProject);
const css = await readFile("src/styles/app.css", "utf8");
const frame = getA0PreviewFrame(poster.format.orientation);

await mkdir(outDir, { recursive: true });

const htmlPath = path.join(outDir, `${baseName}.pdf.html`);
const pdfPath = path.join(outDir, `${baseName}.pdf`);
const qaPath = path.join(outDir, `${baseName}.pdf-qa.json`);

await writeFile(htmlPath, renderPosterHtml(poster, { css, title: poster.title, mode: "export" }));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: poster.format.orientation === "portrait" ? 1131 : 1600, height: poster.format.orientation === "portrait" ? 1600 : 1132 },
  deviceScaleFactor: 1,
});

await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.locator(".a0-preview-canvas").waitFor();
await waitForImages(page);

const clippedElements = await page.$$eval("[data-poster-id], [data-visual-id], [data-block-id]", (elements) =>
  elements
    .map((element) => ({
      id: element.getAttribute("data-poster-id") ?? element.getAttribute("data-visual-id") ?? element.getAttribute("data-block-id") ?? "unknown",
      kind: element.getAttribute("data-poster-kind") ?? element.getAttribute("data-visual-type") ?? element.tagName.toLowerCase(),
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
    }))
    .filter((item) => item.clipped),
);

await page.pdf({
  path: pdfPath,
  width: `${frame.mmWidth}mm`,
  height: `${frame.mmHeight}mm`,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
});

await browser.close();

const report = {
  posterId: poster.id,
  outputPdfPath: pdfPath,
  htmlPath,
  orientation: frame.orientation,
  a0: {
    widthMm: frame.mmWidth,
    heightMm: frame.mmHeight,
  },
  clippedElements,
  createdAt: new Date().toISOString(),
};

await writeFile(qaPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`PDF export: ${pdfPath}`);
console.log(`HTML export document: ${htmlPath}`);
console.log(`PDF QA report: ${qaPath}`);
console.log(`A0 ${frame.orientation}: ${frame.mmWidth}mm x ${frame.mmHeight}mm`);
console.log(`Clipping warnings: ${clippedElements.length}`);

function parseArgs(argv: string[]) {
  const parsed: Record<string, string | boolean> = {};
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

function normalizeAssetUrls(poster: PosterProject): PosterProject {
  const next = JSON.parse(JSON.stringify(poster)) as PosterProject;

  for (const visual of next.visuals) {
    if (visual.asset?.url) {
      visual.asset.url = normalizeAssetUrl(visual.asset.url);
    }
  }

  for (const asset of next.assets ?? []) {
    if (asset.url) {
      asset.url = normalizeAssetUrl(asset.url);
    }
  }

  return next;
}

function normalizeAssetUrl(url: string) {
  if (!url.startsWith("/")) {
    return url;
  }

  return pathToFileURL(path.resolve("public", url.slice(1))).href;
}

async function waitForImages(page: Page) {
  await page.evaluate(async () => {
    const images = [...document.images];
    await Promise.all(
      images.map((image) => {
        if (image.complete) {
          return undefined;
        }

        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }),
    );
  });
}
