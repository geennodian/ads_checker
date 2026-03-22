"use client";

interface MetricOption {
  key: string;
  label: string;
  color: string;
}

interface MetricToggleProps {
  metrics: MetricOption[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}

export default function MetricToggle({ metrics, visible, onToggle }: MetricToggleProps) {
  return (
    <div className="metric-toggle">
      {metrics.map((m) => (
        <label key={m.key} className="metric-toggle-item">
          <input
            type="checkbox"
            checked={visible.has(m.key)}
            onChange={() => onToggle(m.key)}
          />
          <span className="metric-chip" style={{
            backgroundColor: visible.has(m.key) ? m.color : "transparent",
            color: visible.has(m.key) ? "#fff" : m.color,
            borderColor: m.color,
          }}>
            {m.label}
          </span>
        </label>
      ))}
    </div>
  );
}
