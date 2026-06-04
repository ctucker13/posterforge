import type { PosterProject } from "./poster";

export const CURRENT_SCHEMA_VERSION = "posterforge.poster.v1";

export interface MigrationResult {
  poster: PosterProject;
  migratedFrom: string | undefined;
  migratedTo: string;
  changes: string[];
}

export function migratePosterProject(raw: unknown): MigrationResult {
  const poster = raw as PosterProject;
  const from = poster.schemaVersion;
  const changes: string[] = [];

  let current = { ...poster };

  if (!current.schemaVersion) {
    current = {
      ...current,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      format: current.format ?? { size: "A0", orientation: "landscape" },
    };
    changes.push("Backfilled missing schemaVersion to v1");
    if (!poster.format) {
      changes.push("Backfilled missing format field");
    }
  }

  return {
    poster: current,
    migratedFrom: from,
    migratedTo: CURRENT_SCHEMA_VERSION,
    changes,
  };
}
