import type { PosterProject } from "../domain/poster";

/** Maximum number of undo steps retained. */
export const POSTER_HISTORY_LIMIT = 100;

/** Changes sharing a coalesce key within this window merge into one undo step. */
export const POSTER_HISTORY_COALESCE_WINDOW_MS = 1000;

export interface PosterChangeOptions {
  /**
   * Gesture identity for this change. Consecutive changes carrying the same
   * key within the coalesce window collapse into a single undo step — used
   * for typing bursts and pointer drags that emit many intermediate states.
   */
  coalesce?: string | undefined;
  /**
   * Update the poster without recording an undo step. For derived or hydrated
   * data (QA results, sidecar metadata) that is not a user edit.
   */
  skipHistory?: boolean | undefined;
}

export interface PosterHistoryState {
  past: PosterProject[];
  present: PosterProject;
  future: PosterProject[];
  gesture: { key: string; at: number } | null;
}

export function createPosterHistory(present: PosterProject): PosterHistoryState {
  return { past: [], present, future: [], gesture: null };
}

export function pushPosterChange(
  state: PosterHistoryState,
  next: PosterProject,
  options?: PosterChangeOptions,
  now: number = Date.now(),
): PosterHistoryState {
  if (next === state.present) {
    return state;
  }

  if (options?.skipHistory) {
    return { ...state, present: next };
  }

  const coalesceKey = options?.coalesce;
  const continuesGesture =
    coalesceKey != null &&
    state.gesture != null &&
    state.gesture.key === coalesceKey &&
    now - state.gesture.at <= POSTER_HISTORY_COALESCE_WINDOW_MS;

  return {
    past: continuesGesture ? state.past : [...state.past, state.present].slice(-POSTER_HISTORY_LIMIT),
    present: next,
    future: [],
    gesture: coalesceKey != null ? { key: coalesceKey, at: now } : null,
  };
}

export function undoPosterChange(state: PosterHistoryState): PosterHistoryState | null {
  const previous = state.past[state.past.length - 1];
  if (!previous) {
    return null;
  }

  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
    gesture: null,
  };
}

export function redoPosterChange(state: PosterHistoryState): PosterHistoryState | null {
  const next = state.future[0];
  if (!next) {
    return null;
  }

  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
    gesture: null,
  };
}
