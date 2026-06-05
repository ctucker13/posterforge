import { getVisual, type FieldDefinition } from "../visuals/visualRegistry";
import type { PosterVisual } from "../domain/poster";

interface VisualDataEditorProps {
  visual: PosterVisual;
  onChange: (updated: PosterVisual) => void;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    const idx = parseInt(key, 10);
    if (!isNaN(idx) && Array.isArray(acc)) return acc[idx];
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function setNestedValue(obj: unknown, path: string, value: unknown): unknown {
  const clone = (v: unknown): unknown => (Array.isArray(v) ? [...v] : typeof v === "object" && v ? { ...(v as object) } : v);
  const result = clone(obj);
  const keys = path.split(".");
  let cur = result as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i] ?? "";
    const idx = parseInt(key, 10);
    if (!isNaN(idx)) {
      const arr = cur as unknown as unknown[];
      arr[idx] = clone(arr[idx]);
      cur = arr[idx] as Record<string, unknown>;
    } else {
      cur[key] = clone(cur[key]);
      cur = cur[key] as Record<string, unknown>;
    }
  }
  const lastKey = keys[keys.length - 1] ?? "";
  const lastIdx = parseInt(lastKey, 10);
  if (!isNaN(lastIdx)) {
    (cur as unknown as unknown[])[lastIdx] = value;
  } else {
    cur[lastKey] = value;
  }
  return result;
}

export function VisualDataEditor({ visual, onChange }: VisualDataEditorProps) {
  const definition = getVisual(visual.type);
  if (!definition) return null;

  function update(key: string, value: unknown) {
    onChange({ ...visual, data: setNestedValue(visual.data, key, value) as Record<string, unknown> });
  }

  return (
    <div style={{ padding: 16, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "#374151" }}>
        {definition.icon} {definition.name} — Edit Data
      </div>
      {definition.editableFields.map((field: FieldDefinition) => {
        const value = getNestedValue(visual.data, field.key);
        return (
          <div key={field.key} style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              {field.label}
            </label>

            {field.type === "textarea" && (
              <textarea
                value={(value as string) ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
                style={{
                  width: "100%", minHeight: 80, fontFamily: "monospace", fontSize: 12,
                  border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 8px", resize: "vertical", boxSizing: "border-box",
                }}
              />
            )}

            {field.type === "text" && (
              <input
                type="text"
                value={(value as string) ?? ""}
                onChange={(e) => update(field.key, e.target.value)}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 8px", fontSize: 13, boxSizing: "border-box" }}
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={(value as number) ?? 0}
                onChange={(e) => update(field.key, Number(e.target.value))}
                style={{ width: 100, border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 8px", fontSize: 13 }}
              />
            )}

            {field.type === "boolean" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!!(value as boolean)} onChange={(e) => update(field.key, e.target.checked)} />
                {field.label}
              </label>
            )}

            {field.type === "array-of-strings" && (
              <ArrayEditor
                values={(value as string[]) ?? []}
                onChange={(vals) => update(field.key, vals)}
                inputType="text"
              />
            )}

            {field.type === "array-of-numbers" && (
              <ArrayEditor
                values={(value as number[]) ?? []}
                onChange={(vals) => update(field.key, vals)}
                inputType="number"
              />
            )}
          </div>
        );
      })}

      {definition.editableFields.length === 0 && (
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
          Edit this visual's data directly in the JSON editor.
        </p>
      )}
    </div>
  );
}

function ArrayEditor({
  values,
  onChange,
  inputType,
}: {
  values: (string | number)[];
  onChange: (v: (string | number)[]) => void;
  inputType: "text" | "number";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 4 }}>
          <input
            type={inputType}
            value={v}
            onChange={(e) => {
              const next = [...values];
              next[i] = inputType === "number" ? Number(e.target.value) : e.target.value;
              onChange(next);
            }}
            style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 6px", fontSize: 13 }}
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, lineHeight: 1, padding: "0 4px" }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, inputType === "number" ? 0 : ""])}
        style={{
          alignSelf: "flex-start", border: "1px dashed #d1d5db", background: "none",
          borderRadius: 4, padding: "3px 10px", fontSize: 12, cursor: "pointer", color: "#6b7280",
        }}
      >
        + Add
      </button>
    </div>
  );
}
