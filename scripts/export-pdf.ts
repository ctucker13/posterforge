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
const checkOnly = Boolean(args["check-only"]);
const strict = Boolean(args.strict);
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

await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: "domcontentloaded" });
await page.emulateMedia({ media: "print" });
await page.locator(".a0-preview-canvas").waitFor({ timeout: 15_000 });
await waitForImages(page);

const layoutIssues = await collectLayoutIssues(page);

if (!checkOnly) {
  await page.pdf({
    path: pdfPath,
    width: `${frame.mmWidth}mm`,
    height: `${frame.mmHeight}mm`,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });
}

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
  status: layoutIssues.length === 0 ? "passed" : "warning",
  layoutIssues,
  clippedElements: layoutIssues.filter((issue) => issue.type === "content_clipped"),
  createdAt: new Date().toISOString(),
};

await writeFile(qaPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(checkOnly ? "PDF export skipped: check-only mode" : `PDF export: ${pdfPath}`);
console.log(`HTML export document: ${htmlPath}`);
console.log(`PDF QA report: ${qaPath}`);
console.log(`A0 ${frame.orientation}: ${frame.mmWidth}mm x ${frame.mmHeight}mm`);
console.log(`Layout warnings: ${layoutIssues.length}`);

if (layoutIssues.length > 0) {
  for (const issue of layoutIssues.slice(0, 8)) {
    console.log(`- [${issue.severity}] ${issue.id}: ${issue.message}`);
  }
}

if (strict && layoutIssues.length > 0) {
  process.exitCode = 1;
}

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

interface LayoutIssue {
  id: string;
  type: "content_clipped" | "outside_canvas" | "grid_overlap" | "image_missing" | "zero_size";
  severity: "high" | "medium" | "low";
  message: string;
  metrics?: Record<string, number | string>;
}

async function collectLayoutIssues(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const tolerance = 2;
    const issues: LayoutIssue[] = [];
    const canvas = document.querySelector<HTMLElement>(".a0-preview-canvas");

    if (!canvas) {
      return [
        {
          id: "canvas",
          type: "zero_size",
          severity: "high",
          message: "A0 poster canvas was not found.",
        },
      ];
    }

    const canvasRect = rectOf(canvas);
    const measuredElements = [...document.querySelectorAll<HTMLElement>("[data-poster-id], [data-visual-id], [data-block-id]")].filter(isMeasurableElement);

    for (const element of measuredElements) {
      const id = getElementId(element);
      const rect = rectOf(element);
      const clippedX = element.scrollWidth > element.clientWidth + tolerance;
      const clippedY = element.scrollHeight > element.clientHeight + tolerance;

      if (rect.width <= tolerance || rect.height <= tolerance) {
        issues.push({
          id,
          type: "zero_size",
          severity: "high",
          message: "Element rendered with zero or near-zero size.",
          metrics: { width: rect.width, height: rect.height },
        });
      }

      if (clippedX || clippedY) {
        issues.push({
          id,
          type: "content_clipped",
          severity: "high",
          message: "Element content is clipped inside its assigned poster region.",
          metrics: {
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
          },
        });
      }

      if (
        rect.left < canvasRect.left - tolerance ||
        rect.top < canvasRect.top - tolerance ||
        rect.right > canvasRect.right + tolerance ||
        rect.bottom > canvasRect.bottom + tolerance
      ) {
        issues.push({
          id,
          type: "outside_canvas",
          severity: "high",
          message: "Element extends outside the A0 poster canvas.",
          metrics: rect,
        });
      }
    }

    const gridItems = [...document.querySelectorAll<HTMLElement>(".poster-grid > .poster-card")]
      .filter(isMeasurableElement)
      .map((element) => ({
        id: getElementId(element),
        rect: rectOf(element),
      }));

    for (let firstIndex = 0; firstIndex < gridItems.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < gridItems.length; secondIndex += 1) {
        const first = gridItems[firstIndex];
        const second = gridItems[secondIndex];
        const overlap = getOverlap(first.rect, second.rect);

        if (overlap.width > tolerance && overlap.height > tolerance) {
          issues.push({
            id: `${first.id}:${second.id}`,
            type: "grid_overlap",
            severity: "high",
            message: "Poster grid sections overlap each other.",
            metrics: { overlapWidth: overlap.width, overlapHeight: overlap.height },
          });
        }
      }
    }

    for (const image of [...document.images]) {
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        issues.push({
          id: image.getAttribute("data-asset-id") ?? image.alt ?? image.currentSrc ?? "image",
          type: "image_missing",
          severity: "medium",
          message: "Image asset did not load before export.",
          metrics: { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight },
        });
      }
    }

    return issues;

    function getElementId(element: HTMLElement) {
      return element.getAttribute("data-poster-id") ?? element.getAttribute("data-visual-id") ?? element.getAttribute("data-block-id") ?? element.tagName.toLowerCase();
    }

    function isMeasurableElement(element: HTMLElement) {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
    }

    function rectOf(element: Element) {
      const rect = element.getBoundingClientRect();
      return {
        left: round(rect.left),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        width: round(rect.width),
        height: round(rect.height),
      };
    }

    function getOverlap(first: ReturnType<typeof rectOf>, second: ReturnType<typeof rectOf>) {
      const left = Math.max(first.left, second.left);
      const right = Math.min(first.right, second.right);
      const top = Math.max(first.top, second.top);
      const bottom = Math.min(first.bottom, second.bottom);
      return {
        width: Math.max(0, round(right - left)),
        height: Math.max(0, round(bottom - top)),
      };
    }

    function round(value: number) {
      return Math.round(value * 100) / 100;
    }
  });
}
