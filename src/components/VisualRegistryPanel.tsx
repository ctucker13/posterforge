import { Bot, CheckCircle2, Shapes } from "lucide-react";
import type { PosterProject } from "../domain/poster";
import { visualPurposeGroups, visualRegistry } from "../visuals/registry";

interface VisualRegistryPanelProps {
  poster: PosterProject;
}

export function VisualRegistryPanel({ poster }: VisualRegistryPanelProps) {
  const activeVisualTypes = new Set(poster.visuals.map((visual) => visual.type));

  return (
    <section className="visual-registry-panel tool-panel" aria-label="Visual registry">
      <div className="panel-header">
        <h2>Visual Registry</h2>
        <span>{poster.visuals.length} in spec</span>
      </div>

      <div className="registry-groups">
        {visualPurposeGroups.map((group) => {
          const visuals = visualRegistry.filter((visual) => visual.purpose === group.id);

          return (
            <section className="registry-group" key={group.id}>
              <div className="registry-group-header">
                <h3>{group.label}</h3>
                <span>{visuals.length}</span>
              </div>
              <p>{group.description}</p>

              <div className="registry-grid">
                {visuals.map((visual) => {
                  const active = activeVisualTypes.has(visual.id);
                  const generated = !visual.factual;

                  return (
                    <article className={active ? "registry-item active" : "registry-item"} key={visual.id}>
                      <div className="registry-icon">
                        {generated ? <Bot size={17} /> : active ? <CheckCircle2 size={17} /> : <Shapes size={17} />}
                      </div>
                      <div>
                        <strong>{visual.id.replace(/_/g, " ")}</strong>
                        <p>{visual.description}</p>
                        <span>{generated ? "generated asset" : `deterministic ${visual.preferredRender[0]}`}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
