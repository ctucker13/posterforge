import type { PosterProject } from "./poster";
import { migratePosterProject } from "./migration";

export interface PosterValidationIssue {
  path: string;
  message: string;
}

export type PosterValidationResult =
  | { valid: true; project: PosterProject; issues: [] }
  | { valid: false; issues: PosterValidationIssue[] };

const formatSizes = ["A0", "A1", "A2", "custom"] as const;
const orientations = ["portrait", "landscape"] as const;
const sourceTypes = ["mock", "local_file", "web", "research_paper", "confluence", "gitlab", "github"] as const;
const trustLevels = ["low", "medium", "high"] as const;
const evidenceKinds = ["claim", "method", "metric", "figure", "code_summary", "reference"] as const;
const layoutIds = [
  "three-column-academic",
  "results-first",
  "timeline-process",
  "dashboard-poster",
  "comic-strip-narrative",
  "case-study-poster",
] as const;
const sectionTypes = ["hero", "background", "methods", "results", "key_findings", "discussion", "timeline", "references", "custom"] as const;
const sectionEmphasis = ["normal", "featured", "hero"] as const;
const assetTypes = ["ai_image", "generated_background", "generated_panel", "uploaded_image"] as const;
const assetRoles = ["atmosphere", "section_art", "background", "comic_panel", "reference"] as const;
const traceStatuses = ["queued", "running", "complete"] as const;
const artifactKinds = [
  "poster_spec",
  "source_index",
  "source_document",
  "evidence_map",
  "claim_map",
  "layout_plan",
  "visual_plan",
  "image_prompt",
  "render",
  "qa_report",
  "export",
] as const;
const qaSeverities = ["high", "medium", "low"] as const;
const qaFixIds = ["create_references"] as const;
const outputIntents = ["print", "virtual", "both"] as const;

export function validatePosterProject(value: unknown): PosterValidationResult {
  const issues: PosterValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: "poster", message: "Poster JSON must be an object." }],
    };
  }

  validateRoot(value, issues);
  const sourceIds = collectIds(value.sources, "sources", issues);
  const claimIds = collectIds(value.claims, "claims", issues);
  const sectionIds = collectIds(value.sections, "sections", issues);
  const visualIds = collectIds(value.visuals, "visuals", issues);
  const evidenceIds = collectIds(value.evidence, "evidence", issues);

  validateCrossReferences(value, issues, {
    sourceIds,
    claimIds,
    sectionIds,
    visualIds,
    evidenceIds,
  });

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return { valid: true, project: value as unknown as PosterProject, issues: [] };
}

export function parsePosterProjectJson(json: string): PosterProject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Invalid JSON: ${detail}`);
  }

  const migrated = migratePosterProject(parsed);
  const validation = validatePosterProject(migrated.poster);
  if (!validation.valid) {
    throw new Error(formatPosterValidationIssues(validation.issues));
  }

  return validation.project;
}

export function formatPosterValidationIssues(issues: PosterValidationIssue[], limit = 6): string {
  const visibleIssues = issues.slice(0, limit).map((issue) => `${issue.path}: ${issue.message}`);
  const remainingCount = Math.max(issues.length - visibleIssues.length, 0);
  const suffix = remainingCount > 0 ? `, and ${remainingCount} more` : "";

  return `Poster JSON failed validation: ${visibleIssues.join("; ")}${suffix}.`;
}

function validateRoot(poster: Record<string, unknown>, issues: PosterValidationIssue[]) {
  requireString(poster, "id", "id", issues);
  requireString(poster, "title", "title", issues);
  optionalRecord(poster.metadata, "metadata", issues, (metadata) => {
    optionalString(metadata.prompt, "metadata.prompt", issues);
    optionalString(metadata.created_at, "metadata.created_at", issues);
    optionalString(metadata.updated_at, "metadata.updated_at", issues);
    optionalString(metadata.generator, "metadata.generator", issues);
  });
  optionalString(poster.subtitle, "subtitle", issues);
  validateFormat(poster.format, issues);
  optionalEnum(poster.outputIntent, "outputIntent", outputIntents, issues);
  requireString(poster, "theme", "theme", issues);
  optionalString(poster.palette, "palette", issues);
  requireEnum(poster.layout, "layout", layoutIds, issues);
  optionalString(poster.audience, "audience", issues);
  validateArray(poster.sources, "sources", issues, validateSource);
  optionalArray(poster.sourceDocuments, "sourceDocuments", issues, validateSourceDocument);
  optionalArray(poster.sourceSummaries, "sourceSummaries", issues, validateSourceSummary);
  optionalArray(poster.evidence, "evidence", issues, validateEvidenceItem);
  optionalRecord(poster.claimMap, "claimMap", issues, (claimMap) => validateClaimMap(claimMap, "claimMap", issues));
  validateArray(poster.claims, "claims", issues, validateClaim);
  validateArray(poster.sections, "sections", issues, validateSection);
  validateArray(poster.visuals, "visuals", issues, validateVisual);
  optionalArray(poster.assets, "assets", issues, validateAsset);
  optionalArray(poster.references, "references", issues, validateReference);
  optionalArray(poster.traces, "traces", issues, validateTrace);
  optionalArray(poster.qaResults, "qaResults", issues, validateQaIssue);
}

function validateFormat(value: unknown, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, "format", "must be an object with size and orientation.");
    return;
  }

  requireEnum(value.size, "format.size", formatSizes, issues);
  requireEnum(value.orientation, "format.orientation", orientations, issues);
}

function validateSource(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a source object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireEnum(value.type, `${path}.type`, sourceTypes, issues);
  requireString(value, "title", `${path}.title`, issues);
  optionalString(value.url, `${path}.url`, issues);
  optionalString(value.accessed_at, `${path}.accessed_at`, issues);
  optionalEnum(value.trust_level, `${path}.trust_level`, trustLevels, issues);
}

function validateSourceDocument(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a source document object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  validateSource(value.source, `${path}.source`, issues);
  requireString(value, "title", `${path}.title`, issues);
  requireString(value, "body", `${path}.body`, issues, { allowEmpty: true });
  optionalRecord(value.metadata, `${path}.metadata`, issues);
}

function validateSourceSummary(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a source summary object.");
    return;
  }

  requireString(value, "source_id", `${path}.source_id`, issues);
  requireString(value, "summary", `${path}.summary`, issues);
  optionalStringArray(value.methods, `${path}.methods`, issues);
  optionalStringArray(value.metrics, `${path}.metrics`, issues);
  optionalStringArray(value.figures, `${path}.figures`, issues);
}

function validateEvidenceItem(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an evidence item object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireString(value, "source_id", `${path}.source_id`, issues);
  requireEnum(value.kind, `${path}.kind`, evidenceKinds, issues);
  requireString(value, "text", `${path}.text`, issues);
  optionalString(value.location, `${path}.location`, issues);
  optionalEnum(value.confidence, `${path}.confidence`, trustLevels, issues);
}

function validateClaimMap(value: Record<string, unknown>, path: string, issues: PosterValidationIssue[]) {
  validateArray(value.entries, `${path}.entries`, issues, validateClaimMapEntry);
}

function validateClaimMapEntry(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a claim map entry object.");
    return;
  }

  requireString(value, "claim_id", `${path}.claim_id`, issues);
  requireString(value, "claim_text", `${path}.claim_text`, issues);
  validateStringArray(value.source_ids, `${path}.source_ids`, issues);
  validateStringArray(value.evidence_ids, `${path}.evidence_ids`, issues);
  validateStringArray(value.section_ids, `${path}.section_ids`, issues);
  optionalEnum(value.confidence, `${path}.confidence`, trustLevels, issues);
}

function validateClaim(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a claim object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireString(value, "text", `${path}.text`, issues);
  validateStringArray(value.source_ids, `${path}.source_ids`, issues);
  optionalEnum(value.confidence, `${path}.confidence`, trustLevels, issues);
}

function validateSection(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a section object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireEnum(value.type, `${path}.type`, sectionTypes, issues);
  requireString(value, "title", `${path}.title`, issues);
  optionalRecord(value.layout, `${path}.layout`, issues, (layout) => {
    optionalNumber(layout.order, `${path}.layout.order`, issues);
    optionalNumberEnum(layout.columnSpan, `${path}.layout.columnSpan`, [1, 2, 3, 4] as const, issues);
    optionalNumberEnum(layout.rowSpan, `${path}.layout.rowSpan`, [1, 2] as const, issues);
    optionalEnum(layout.emphasis, `${path}.layout.emphasis`, sectionEmphasis, issues);
    optionalBoolean(layout.hidden, `${path}.layout.hidden`, issues);
  });
  validateArray(value.blocks, `${path}.blocks`, issues, validateBlock);
}

function validateBlock(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a poster block object.");
    return;
  }

  if (value.type === "text") {
    requireString(value, "text", `${path}.text`, issues, { allowEmpty: true });
    optionalStringArray(value.claim_ids, `${path}.claim_ids`, issues);
    return;
  }

  if (value.type === "visual_ref") {
    requireString(value, "visual_id", `${path}.visual_id`, issues);
    optionalString(value.caption, `${path}.caption`, issues);
    return;
  }

  if (value.type === "generated_image") {
    requireString(value, "slot_id", `${path}.slot_id`, issues);
    optionalString(value.objectPosition, `${path}.objectPosition`, issues);
    return;
  }

  addIssue(issues, `${path}.type`, "must be either 'text', 'visual_ref', or 'generated_image'.");
}

function validateVisual(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a visual object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireString(value, "type", `${path}.type`, issues);
  requireString(value, "title", `${path}.title`, issues);
  optionalStringArray(value.source_ids, `${path}.source_ids`, issues);
  optionalRecord(value.data, `${path}.data`, issues);
  optionalRecord(value.options, `${path}.options`, issues);
  optionalRecord(value.asset, `${path}.asset`, issues, (asset) => validateAsset(asset, `${path}.asset`, issues));
}

function validateAsset(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an asset object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireEnum(value.type, `${path}.type`, assetTypes, issues);
  requireEnum(value.role, `${path}.role`, assetRoles, issues);
  optionalString(value.title, `${path}.title`, issues);
  optionalString(value.prompt, `${path}.prompt`, issues);
  optionalString(value.model, `${path}.model`, issues);
  optionalString(value.theme, `${path}.theme`, issues);
  optionalString(value.palette, `${path}.palette`, issues);
  optionalStringArray(value.source_ids, `${path}.source_ids`, issues);
  optionalString(value.url, `${path}.url`, issues);
  optionalNumber(value.width_px, `${path}.width_px`, issues);
  optionalNumber(value.height_px, `${path}.height_px`, issues);
  optionalRecord(value.metadata, `${path}.metadata`, issues);
}

function validateReference(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a reference object.");
  }
}

function validateTrace(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a trace event object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireString(value, "label", `${path}.label`, issues);
  requireString(value, "detail", `${path}.detail`, issues);
  requireEnum(value.status, `${path}.status`, traceStatuses, issues);
  optionalString(value.timestamp, `${path}.timestamp`, issues);
  optionalArray(value.artifactRefs, `${path}.artifactRefs`, issues, validateTraceArtifactRef);
}

function validateTraceArtifactRef(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a trace artifact reference object.");
    return;
  }

  requireEnum(value.kind, `${path}.kind`, artifactKinds, issues);
  requireString(value, "label", `${path}.label`, issues);
}

function validateQaIssue(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a QA issue object.");
    return;
  }

  requireString(value, "id", `${path}.id`, issues);
  requireEnum(value.severity, `${path}.severity`, qaSeverities, issues);
  requireString(value, "location", `${path}.location`, issues);
  requireString(value, "message", `${path}.message`, issues);
  optionalString(value.suggestedFix, `${path}.suggestedFix`, issues);
  optionalBoolean(value.autoFixable, `${path}.autoFixable`, issues);
  optionalEnum(value.fixId, `${path}.fixId`, qaFixIds, issues);
}

function validateCrossReferences(
  poster: Record<string, unknown>,
  issues: PosterValidationIssue[],
  refs: {
    sourceIds: Set<string>;
    claimIds: Set<string>;
    sectionIds: Set<string>;
    visualIds: Set<string>;
    evidenceIds: Set<string>;
  },
) {
  checkSourceDocumentRefs(poster.sourceDocuments, refs.sourceIds, issues);
  checkSourceSummaryRefs(poster.sourceSummaries, refs.sourceIds, issues);
  checkEvidenceRefs(poster.evidence, refs.sourceIds, issues);
  checkClaimRefs(poster.claims, refs.sourceIds, issues);
  checkSectionRefs(poster.sections, refs.claimIds, refs.visualIds, issues);
  checkVisualRefs(poster.visuals, refs.sourceIds, issues);
  checkAssetRefs(poster.assets, "assets", refs.sourceIds, issues);
  checkClaimMapRefs(poster.claimMap, refs, issues);
}

function checkSourceDocumentRefs(value: unknown, sourceIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((document, index) => {
    if (!isRecord(document) || !isRecord(document.source) || typeof document.source.id !== "string") {
      return;
    }

    checkKnownRef(document.source.id, `sourceDocuments[${index}].source.id`, sourceIds, "source", issues);
  });
}

function checkSourceSummaryRefs(value: unknown, sourceIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((summary, index) => {
    if (isRecord(summary) && typeof summary.source_id === "string") {
      checkKnownRef(summary.source_id, `sourceSummaries[${index}].source_id`, sourceIds, "source", issues);
    }
  });
}

function checkEvidenceRefs(value: unknown, sourceIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((evidence, index) => {
    if (isRecord(evidence) && typeof evidence.source_id === "string") {
      checkKnownRef(evidence.source_id, `evidence[${index}].source_id`, sourceIds, "source", issues);
    }
  });
}

function checkClaimRefs(value: unknown, sourceIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((claim, index) => {
    if (!isRecord(claim) || !Array.isArray(claim.source_ids)) {
      return;
    }

    claim.source_ids.forEach((sourceId, sourceIndex) => {
      if (typeof sourceId === "string") {
        checkKnownRef(sourceId, `claims[${index}].source_ids[${sourceIndex}]`, sourceIds, "source", issues);
      }
    });
  });
}

function checkSectionRefs(value: unknown, claimIds: Set<string>, visualIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((section, sectionIndex) => {
    if (!isRecord(section) || !Array.isArray(section.blocks)) {
      return;
    }

    section.blocks.forEach((block, blockIndex) => {
      if (!isRecord(block)) {
        return;
      }

      if (block.type === "visual_ref" && typeof block.visual_id === "string") {
        checkKnownRef(block.visual_id, `sections[${sectionIndex}].blocks[${blockIndex}].visual_id`, visualIds, "visual", issues);
      }

      if (block.type === "text" && Array.isArray(block.claim_ids)) {
        block.claim_ids.forEach((claimId, claimIndex) => {
          if (typeof claimId === "string") {
            checkKnownRef(claimId, `sections[${sectionIndex}].blocks[${blockIndex}].claim_ids[${claimIndex}]`, claimIds, "claim", issues);
          }
        });
      }
    });
  });
}

function checkVisualRefs(value: unknown, sourceIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((visual, index) => {
    if (!isRecord(visual)) {
      return;
    }

    if (Array.isArray(visual.source_ids)) {
      visual.source_ids.forEach((sourceId, sourceIndex) => {
        if (typeof sourceId === "string") {
          checkKnownRef(sourceId, `visuals[${index}].source_ids[${sourceIndex}]`, sourceIds, "source", issues);
        }
      });
    }

    if (isRecord(visual.asset)) {
      checkAssetRefs([visual.asset], `visuals[${index}].asset`, sourceIds, issues);
    }
  });
}

function checkAssetRefs(value: unknown, path: string, sourceIds: Set<string>, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((asset, index) => {
    if (!isRecord(asset) || !Array.isArray(asset.source_ids)) {
      return;
    }

    const sourcePath = path.endsWith(".asset") ? path : `${path}[${index}]`;
    asset.source_ids.forEach((sourceId, sourceIndex) => {
      if (typeof sourceId === "string") {
        checkKnownRef(sourceId, `${sourcePath}.source_ids[${sourceIndex}]`, sourceIds, "source", issues);
      }
    });
  });
}

function checkClaimMapRefs(
  value: unknown,
  refs: {
    sourceIds: Set<string>;
    claimIds: Set<string>;
    sectionIds: Set<string>;
    evidenceIds: Set<string>;
  },
  issues: PosterValidationIssue[],
) {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    return;
  }

  value.entries.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }

    if (typeof entry.claim_id === "string") {
      checkKnownRef(entry.claim_id, `claimMap.entries[${index}].claim_id`, refs.claimIds, "claim", issues);
    }

    checkRefArray(entry.source_ids, `claimMap.entries[${index}].source_ids`, refs.sourceIds, "source", issues);
    checkRefArray(entry.evidence_ids, `claimMap.entries[${index}].evidence_ids`, refs.evidenceIds, "evidence", issues);
    checkRefArray(entry.section_ids, `claimMap.entries[${index}].section_ids`, refs.sectionIds, "section", issues);
  });
}

function checkRefArray(value: unknown, path: string, knownIds: Set<string>, label: string, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((id, index) => {
    if (typeof id === "string") {
      checkKnownRef(id, `${path}[${index}]`, knownIds, label, issues);
    }
  });
}

function checkKnownRef(id: string, path: string, knownIds: Set<string>, label: string, issues: PosterValidationIssue[]) {
  if (!knownIds.has(id)) {
    addIssue(issues, path, `references unknown ${label} '${id}'.`);
  }
}

function collectIds(value: unknown, path: string, issues: PosterValidationIssue[]): Set<string> {
  const ids = new Set<string>();

  if (!Array.isArray(value)) {
    return ids;
  }

  value.forEach((item, index) => {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.trim().length === 0) {
      return;
    }

    if (ids.has(item.id)) {
      addIssue(issues, `${path}[${index}].id`, `duplicates id '${item.id}'.`);
    }

    ids.add(item.id);
  });

  return ids;
}

function validateArray(
  value: unknown,
  path: string,
  issues: PosterValidationIssue[],
  validateItem: (value: unknown, path: string, issues: PosterValidationIssue[]) => void,
) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array.");
    return;
  }

  value.forEach((item, index) => validateItem(item, `${path}[${index}]`, issues));
}

function optionalArray(
  value: unknown,
  path: string,
  issues: PosterValidationIssue[],
  validateItem: (value: unknown, path: string, issues: PosterValidationIssue[]) => void,
) {
  if (value === undefined) {
    return;
  }

  validateArray(value, path, issues, validateItem);
}

function validateStringArray(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array of strings.");
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string") {
      addIssue(issues, `${path}[${index}]`, "must be a string.");
    }
  });
}

function optionalStringArray(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  validateStringArray(value, path, issues);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: PosterValidationIssue[],
  options: { allowEmpty?: boolean } = {},
) {
  const value = record[key];
  if (typeof value !== "string") {
    addIssue(issues, path, "must be a string.");
    return;
  }

  if (!options.allowEmpty && value.trim().length === 0) {
    addIssue(issues, path, "must not be empty.");
  }
}

function optionalString(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (value !== undefined && typeof value !== "string") {
    addIssue(issues, path, "must be a string.");
  }
}

function requireEnum(value: unknown, path: string, allowedValues: readonly string[], issues: PosterValidationIssue[]) {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    addIssue(issues, path, `must be one of: ${allowedValues.join(", ")}.`);
  }
}

function optionalEnum(value: unknown, path: string, allowedValues: readonly string[], issues: PosterValidationIssue[]) {
  if (value !== undefined) {
    requireEnum(value, path, allowedValues, issues);
  }
}

function optionalNumberEnum(value: unknown, path: string, allowedValues: readonly number[], issues: PosterValidationIssue[]) {
  if (value !== undefined && (typeof value !== "number" || !allowedValues.includes(value))) {
    addIssue(issues, path, `must be one of: ${allowedValues.join(", ")}.`);
  }
}

function optionalNumber(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (value !== undefined && typeof value !== "number") {
    addIssue(issues, path, "must be a number.");
  }
}

function optionalBoolean(value: unknown, path: string, issues: PosterValidationIssue[]) {
  if (value !== undefined && typeof value !== "boolean") {
    addIssue(issues, path, "must be a boolean.");
  }
}

function optionalRecord(
  value: unknown,
  path: string,
  issues: PosterValidationIssue[],
  validate?: (record: Record<string, unknown>) => void,
) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object.");
    return;
  }

  validate?.(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(issues: PosterValidationIssue[], path: string, message: string) {
  issues.push({ path, message });
}
