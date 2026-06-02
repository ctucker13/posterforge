import type { PosterProject } from "../domain/poster";
import { buildMockSourcePackage, createReferencesFromSources } from "../sources/mockConnectors";

const mockSourcePackage = buildMockSourcePackage("mock");

export const examplePoster: PosterProject = {
  id: "poster_demo_fraud_model",
  metadata: {
    prompt: "Create a results-first poster about fraud model monitoring.",
    created_at: "2026-06-01T00:00:00.000Z",
    generator: "posterforge-sample",
  },
  title: "Source-Grounded Fraud Model Monitoring",
  subtitle: "A demonstration poster generated from mock project evidence",
  format: {
    size: "A0",
    orientation: "landscape",
  },
  theme: "natwest-group",
  palette: "natwest-group",
  layout: "results-first",
  audience: "internal data science poster session",
  sources: mockSourcePackage.sources,
  sourceDocuments: mockSourcePackage.sourceDocuments,
  sourceSummaries: mockSourcePackage.sourceSummaries,
  evidence: mockSourcePackage.evidence,
  claims: [
    {
      id: "claim_001",
      text: "The monitoring workflow separates model performance, calibration, explainability, and operational impact.",
      source_ids: ["src_confluence_001"],
      confidence: "high",
    },
    {
      id: "claim_002",
      text: "The prototype prioritises deterministic visuals for factual charts and generated images for atmosphere.",
      source_ids: ["src_gitlab_001"],
      confidence: "high",
    },
    {
      id: "claim_003",
      text: "Calibration monitoring is treated as a separate evidence stream from raw classification performance.",
      source_ids: ["src_paper_001", "src_gitlab_001"],
      confidence: "medium",
    },
  ],
  claimMap: {
    entries: [
      {
        claim_id: "claim_001",
        claim_text: "The monitoring workflow separates model performance, calibration, explainability, and operational impact.",
        source_ids: ["src_confluence_001"],
        evidence_ids: ["ev_confluence_001_1", "ev_confluence_001_2"],
        section_ids: ["hero"],
        confidence: "high",
      },
      {
        claim_id: "claim_002",
        claim_text: "The prototype prioritises deterministic visuals for factual charts and generated images for atmosphere.",
        source_ids: ["src_gitlab_001"],
        evidence_ids: ["ev_gitlab_001_1", "ev_gitlab_001_2"],
        section_ids: ["hero"],
        confidence: "high",
      },
      {
        claim_id: "claim_003",
        claim_text: "Calibration monitoring is treated as a separate evidence stream from raw classification performance.",
        source_ids: ["src_paper_001", "src_gitlab_001"],
        evidence_ids: ["ev_paper_001_1", "ev_paper_001_2", "ev_gitlab_001_1", "ev_gitlab_001_2"],
        section_ids: ["technical_note"],
        confidence: "medium",
      },
    ],
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      title: "The poster tells the evidence trail, not just the result",
      blocks: [
        {
          type: "text",
          claim_ids: ["claim_001", "claim_002"],
          text: "A source-grounded workflow turns project notes, code evidence, papers, and metrics into a print-ready academic poster with traceable claims.",
        },
      ],
    },
    {
      id: "methods",
      type: "methods",
      title: "Generation workflow",
      blocks: [{ type: "visual_ref", visual_id: "vis_mermaid_workflow" }],
    },
    {
      id: "results",
      type: "results",
      title: "Model monitoring visuals",
      blocks: [
        { type: "visual_ref", visual_id: "vis_confusion_matrix" },
        { type: "visual_ref", visual_id: "vis_sankey" },
      ],
    },
    {
      id: "qa",
      type: "discussion",
      title: "Built-in quality control",
      blocks: [
        {
          type: "text",
          text: "The QA loop checks source links, poster readability, visual integrity, and export readiness before final handoff.",
        },
      ],
    },
    {
      id: "evidence_summary",
      type: "results",
      title: "Evidence summary",
      blocks: [
        { type: "visual_ref", visual_id: "vis_metric_card" },
        { type: "visual_ref", visual_id: "vis_metrics_table" },
      ],
    },
    {
      id: "delivery_plan",
      type: "timeline",
      title: "Monitoring delivery path",
      blocks: [
        { type: "visual_ref", visual_id: "vis_monitoring_timeline" },
        { type: "visual_ref", visual_id: "vis_delivery_gantt" },
      ],
    },
    {
      id: "technical_note",
      type: "methods",
      title: "Technical trace",
      blocks: [
        { type: "visual_ref", visual_id: "vis_calibration_formula" },
        { type: "visual_ref", visual_id: "vis_code_block" },
        { type: "visual_ref", visual_id: "vis_generated_panel" },
      ],
    },
  ],
  visuals: [
    {
      id: "vis_mermaid_workflow",
      type: "mermaid_flow",
      title: "Poster generation workflow",
      source_ids: ["src_confluence_001"],
      data: {
        source:
          "flowchart LR\nA[Prompt] --> B[Sources]\nB --> C[Evidence map]\nC --> D[Poster spec]\nD --> E[Render]\nE --> F[QA]\nF --> G[Exports]",
      },
    },
    {
      id: "vis_confusion_matrix",
      type: "confusion_matrix",
      title: "Example confusion matrix",
      source_ids: ["src_gitlab_001"],
      data: {
        labels: ["Legitimate", "Fraud"],
        matrix: [
          [9412, 188],
          [73, 327],
        ],
      },
      options: {
        show_counts: true,
        show_percentages: true,
        highlight_errors: true,
      },
    },
    {
      id: "vis_metric_card",
      type: "metric_card",
      title: "Review capture rate",
      source_ids: ["src_gitlab_001"],
      data: {
        label: "Fraud captured in review queue",
        value: "81.8%",
        note: "Based on sample monitoring confusion matrix.",
      },
    },
    {
      id: "vis_metrics_table",
      type: "table",
      title: "Monitoring checks",
      source_ids: ["src_gitlab_001", "src_paper_001"],
      data: {
        columns: ["Check", "Current demo value", "Evidence"],
        rows: [
          { Check: "False positives", "Current demo value": 188, Evidence: "Model evaluation README" },
          { Check: "False negatives", "Current demo value": 73, Evidence: "Model evaluation README" },
          { Check: "Calibration", "Current demo value": "tracked separately", Evidence: "Research paper summary" },
        ],
      },
    },
    {
      id: "vis_sankey",
      type: "sankey",
      title: "Decision flow",
      source_ids: ["src_gitlab_001"],
      data: {
        nodes: ["Applications", "Low risk", "Manual review", "Declined", "Approved"],
        links: [
          { source: "Applications", target: "Low risk", value: 8200 },
          { source: "Applications", target: "Manual review", value: 1100 },
          { source: "Manual review", target: "Declined", value: 260 },
          { source: "Manual review", target: "Approved", value: 840 },
        ],
      },
    },
    {
      id: "vis_monitoring_timeline",
      type: "timeline",
      title: "Monitoring rollout timeline",
      source_ids: ["src_confluence_001"],
      data: {
        events: [
          { date: "Week 1", label: "Source review", detail: "Collect project notes, model README, and paper context." },
          { date: "Week 2", label: "Evidence map", detail: "Separate claims, metrics, methods, and references." },
          { date: "Week 3", label: "Poster QA", detail: "Check source links, visual roles, and export readiness." },
        ],
      },
      options: {
        labelStrategy: "short milestone labels with detail text below",
      },
    },
    {
      id: "vis_delivery_gantt",
      type: "gantt",
      title: "PosterForge implementation slice",
      source_ids: ["src_confluence_001"],
      data: {
        tasks: [
          { label: "Project spec", start: "2026-06-01", end: "2026-06-04", status: "in progress" },
          { label: "Visual renderers", start: "2026-06-03", end: "2026-06-07", status: "next" },
          { label: "Export planning", start: "2026-06-06", end: "2026-06-10", status: "planned" },
        ],
      },
      options: {
        labelStrategy: "task labels outside bars",
      },
    },
    {
      id: "vis_calibration_formula",
      type: "math",
      title: "Calibration error placeholder",
      source_ids: ["src_paper_001"],
      data: {
        source: "ECE = \\sum_m \\frac{|B_m|}{n}|acc(B_m)-conf(B_m)|",
      },
    },
    {
      id: "vis_code_block",
      type: "code_block",
      title: "Metric extraction placeholder",
      source_ids: ["src_gitlab_001"],
      data: {
        language: "typescript",
        code: "const unsupportedClaims = claims.filter((claim) => claim.source_ids.length === 0);",
      },
    },
    {
      id: "vis_generated_panel",
      type: "generated_comic_panel",
      title: "Generated section art slot",
      asset: {
        id: "asset_generated_panel",
        type: "generated_panel",
        role: "section_art",
        title: "Monitoring workflow comic panel",
        prompt: "Editorial comic panel about reviewing model monitoring evidence, no text, no numbers, no charts",
        model: "gpt-image-2",
        theme: "comic-strip",
        palette: "comic-ink",
        width_px: 1800,
        height_px: 1200,
      },
    },
  ],
  assets: [
    {
      id: "asset_hero_atmosphere",
      type: "generated_background",
      role: "atmosphere",
      title: "Geometric monitoring backdrop",
      prompt:
        "Polished academic data science poster background with abstract monitoring workflow geometry, no text, no charts, no factual labels",
      model: "gpt-image-2",
      theme: "natwest-group",
      palette: "natwest-group",
      width_px: 2400,
      height_px: 1400,
    },
  ],
  traces: [
    {
      id: "sample_plan",
      label: "Planning poster",
      detail: "Created a results-first poster brief from the sample fraud monitoring prompt.",
      status: "complete",
      timestamp: "2026-06-01T00:00:00.000Z",
      artifactRefs: [{ kind: "poster_spec", label: "sample poster spec" }],
    },
    {
      id: "sample_evidence",
      label: "Creating claim map",
      detail: "Linked sample claims and factual visuals to mock project, code, and paper sources.",
      status: "complete",
      timestamp: "2026-06-01T00:00:01.000Z",
      artifactRefs: [{ kind: "claim_map", label: "sample claim map" }],
    },
    {
      id: "sample_qa",
      label: "Running QA",
      detail: "Checked traceability, text density, factual visual source links, and export readiness.",
      status: "complete",
      timestamp: "2026-06-01T00:00:02.000Z",
      artifactRefs: [{ kind: "qa_report", label: "sample QA summary" }],
    },
  ],
  qaResults: [],
  references: createReferencesFromSources(mockSourcePackage.sources),
};
