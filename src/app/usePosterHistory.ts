import { useCallback, useRef, useState } from "react";
import type { PosterProject } from "../domain/poster";
import {
  createPosterHistory,
  pushPosterChange,
  redoPosterChange,
  undoPosterChange,
  type PosterChangeOptions,
  type PosterHistoryState,
} from "./posterHistory";

export type { PosterChangeOptions } from "./posterHistory";

export interface UsePosterHistoryResult {
  poster: PosterProject;
  /** Apply a poster change. Records an undo step unless options say otherwise. */
  setPoster: (
    next: PosterProject | ((current: PosterProject) => PosterProject),
    options?: PosterChangeOptions,
  ) => void;
  /** Replace the entire history with a new initial state (e.g. when switching projects). */
  reset: (newInitial: PosterProject) => void;
  /** Undo the last change. Returns the restored poster, or null when at the oldest state. */
  undo: () => PosterProject | null;
  /** Redo the last undone change. Returns the restored poster, or null when at the newest state. */
  redo: () => PosterProject | null;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Owns the PosterProject and its undo/redo history. The authoritative state
 * lives in a ref so mutators always see the latest history (drag and typing
 * handlers fire faster than renders); React state mirrors it for rendering.
 */
export function usePosterHistory(initial: PosterProject): UsePosterHistoryResult {
  const historyRef = useRef<PosterHistoryState>(createPosterHistory(initial));
  const [poster, setPosterState] = useState(initial);
  const [stackDepths, setStackDepths] = useState({ past: 0, future: 0 });

  const sync = useCallback(() => {
    const history = historyRef.current;
    setPosterState(history.present);
    setStackDepths({ past: history.past.length, future: history.future.length });
  }, []);

  const setPoster = useCallback<UsePosterHistoryResult["setPoster"]>(
    (next, options) => {
      const history = historyRef.current;
      const nextPresent = typeof next === "function" ? next(history.present) : next;
      historyRef.current = pushPosterChange(history, nextPresent, options);
      sync();
    },
    [sync],
  );

  const undo = useCallback(() => {
    const nextHistory = undoPosterChange(historyRef.current);
    if (!nextHistory) return null;
    historyRef.current = nextHistory;
    sync();
    return nextHistory.present;
  }, [sync]);

  const redo = useCallback(() => {
    const nextHistory = redoPosterChange(historyRef.current);
    if (!nextHistory) return null;
    historyRef.current = nextHistory;
    sync();
    return nextHistory.present;
  }, [sync]);

  const reset = useCallback((newInitial: PosterProject) => {
    historyRef.current = createPosterHistory(newInitial);
    sync();
  }, [sync]);

  return {
    poster,
    setPoster,
    reset,
    undo,
    redo,
    canUndo: stackDepths.past > 0,
    canRedo: stackDepths.future > 0,
  };
}
