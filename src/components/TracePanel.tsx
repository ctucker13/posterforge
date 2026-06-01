import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { TraceEvent } from "../domain/poster";

interface TracePanelProps {
  events: TraceEvent[];
}

export function TracePanel({ events }: TracePanelProps) {
  return (
    <section className="trace-panel" aria-label="Generation trace">
      <div className="panel-header">
        <h2>Trace</h2>
        <span>{events.every((event) => event.status === "complete") ? "Complete" : "Ready"}</span>
      </div>
      <ol className="trace-list">
        {events.map((event) => (
          <li key={event.id} className={`trace-item ${event.status}`}>
            <div className="trace-icon" aria-hidden="true">
              {event.status === "complete" ? <CheckCircle2 size={18} /> : event.status === "running" ? <Loader2 size={18} /> : <Circle size={18} />}
            </div>
            <div>
              <strong>{event.label}</strong>
              <p>{event.detail}</p>
              <span>{event.status}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
