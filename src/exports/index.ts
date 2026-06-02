export type ExportTarget = "poster_json" | "pptx" | "pdf" | "png" | "project_bundle";

export interface ExportCapability {
  id: ExportTarget;
  label: string;
  status: "available" | "planned";
}

export const exportCapabilities: ExportCapability[] = [
  { id: "poster_json", label: "Export poster JSON", status: "available" },
  { id: "pptx", label: "Export editable PPTX", status: "planned" },
  { id: "pdf", label: "Export print PDF", status: "planned" },
  { id: "png", label: "Export preview PNG", status: "planned" },
  { id: "project_bundle", label: "Export project bundle", status: "planned" },
];
