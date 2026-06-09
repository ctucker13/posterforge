import { describe, expect, it } from "vitest";
import type { PosterProject } from "../domain/poster";
import {
  POSTER_HISTORY_COALESCE_WINDOW_MS,
  POSTER_HISTORY_LIMIT,
  createPosterHistory,
  pushPosterChange,
  redoPosterChange,
  undoPosterChange,
} from "./posterHistory";

function makePoster(title: string): PosterProject {
  return {
    id: "poster_test",
    title,
    format: { size: "A0", orientation: "landscape" },
    theme: "clean-academic",
    layout: "three-column-academic",
    sources: [],
    claims: [],
    sections: [],
    visuals: [],
  };
}

describe("posterHistory", () => {
  it("pushes changes and undoes/redoes through them", () => {
    const a = makePoster("a");
    const b = makePoster("b");
    const c = makePoster("c");

    let state = createPosterHistory(a);
    state = pushPosterChange(state, b);
    state = pushPosterChange(state, c);

    expect(state.present).toBe(c);
    expect(state.past).toEqual([a, b]);

    state = undoPosterChange(state)!;
    expect(state.present).toBe(b);
    expect(state.future).toEqual([c]);

    state = undoPosterChange(state)!;
    expect(state.present).toBe(a);

    expect(undoPosterChange(state)).toBeNull();

    state = redoPosterChange(state)!;
    state = redoPosterChange(state)!;
    expect(state.present).toBe(c);
    expect(redoPosterChange(state)).toBeNull();
  });

  it("ignores identical present references", () => {
    const a = makePoster("a");
    const state = createPosterHistory(a);
    expect(pushPosterChange(state, a)).toBe(state);
  });

  it("clears the redo stack on a new change", () => {
    const a = makePoster("a");
    const b = makePoster("b");
    const c = makePoster("c");

    let state = createPosterHistory(a);
    state = pushPosterChange(state, b);
    state = undoPosterChange(state)!;
    state = pushPosterChange(state, c);

    expect(state.future).toEqual([]);
    expect(state.past).toEqual([a]);
    expect(state.present).toBe(c);
  });

  it("coalesces same-key changes within the window into one undo step", () => {
    const a = makePoster("a");
    let state = createPosterHistory(a);

    state = pushPosterChange(state, makePoster("ab"), { coalesce: "title" }, 1000);
    state = pushPosterChange(state, makePoster("abc"), { coalesce: "title" }, 1200);
    state = pushPosterChange(state, makePoster("abcd"), { coalesce: "title" }, 1400);

    expect(state.present.title).toBe("abcd");
    expect(state.past).toEqual([a]);

    state = undoPosterChange(state)!;
    expect(state.present).toBe(a);
  });

  it("starts a new undo step when the coalesce window lapses", () => {
    const a = makePoster("a");
    let state = createPosterHistory(a);

    state = pushPosterChange(state, makePoster("ab"), { coalesce: "title" }, 1000);
    state = pushPosterChange(state, makePoster("abc"), { coalesce: "title" }, 1000 + POSTER_HISTORY_COALESCE_WINDOW_MS + 1);

    expect(state.past).toHaveLength(2);
  });

  it("does not coalesce across different keys", () => {
    const a = makePoster("a");
    let state = createPosterHistory(a);

    state = pushPosterChange(state, makePoster("b"), { coalesce: "title" }, 1000);
    state = pushPosterChange(state, makePoster("c"), { coalesce: "subtitle" }, 1100);

    expect(state.past).toHaveLength(2);
  });

  it("ends the active gesture on undo so the next same-key change is a new step", () => {
    const a = makePoster("a");
    let state = createPosterHistory(a);

    state = pushPosterChange(state, makePoster("ab"), { coalesce: "title" }, 1000);
    state = undoPosterChange(state)!;
    state = pushPosterChange(state, makePoster("ax"), { coalesce: "title" }, 1100);

    expect(state.past).toEqual([a]);
    expect(state.present.title).toBe("ax");
  });

  it("skipHistory updates present without recording an undo step", () => {
    const a = makePoster("a");
    const b = makePoster("b");
    let state = createPosterHistory(a);
    state = pushPosterChange(state, b);

    const derived = { ...state.present, qaResults: [] };
    state = pushPosterChange(state, derived, { skipHistory: true });

    expect(state.present).toBe(derived);
    expect(state.past).toEqual([a]);
    expect(undoPosterChange(state)!.present).toBe(a);
  });

  it("skipHistory mid-gesture preserves coalescing of the surrounding burst", () => {
    const a = makePoster("a");
    let state = createPosterHistory(a);

    state = pushPosterChange(state, makePoster("ab"), { coalesce: "title" }, 1000);
    state = pushPosterChange(state, { ...state.present, qaResults: [] }, { skipHistory: true }, 1100);
    state = pushPosterChange(state, makePoster("abc"), { coalesce: "title" }, 1200);

    expect(state.past).toEqual([a]);
  });

  it("caps the undo stack at the history limit", () => {
    let state = createPosterHistory(makePoster("p0"));
    for (let i = 1; i <= POSTER_HISTORY_LIMIT + 10; i += 1) {
      state = pushPosterChange(state, makePoster(`p${i}`));
    }

    expect(state.past).toHaveLength(POSTER_HISTORY_LIMIT);
    expect(state.past[0]!.title).toBe(`p${10}`);
  });
});
