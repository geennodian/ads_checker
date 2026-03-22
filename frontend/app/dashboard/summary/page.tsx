"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
import KpiCards from "@/components/KpiCards";
import MetricToggle from "@/components/MetricToggle";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, Area,
} from "recharts";

interface DailyRow {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cvr: number;
  cpa: number;
}

interface SummaryData {
  totals: DailyRow;
  daily: DailyRow[];
  start: string;
  end: string;
}

const CHART_METRICS = [
  { key: "cost", label: "Cost", color: "#4361ee", type: "bar" },
  { key: "cpa", label: "CPA", color: "#e71d36", type: "line" },
  { key: "conversions", label: "CVs", color: "#2ec4b6", type: "bar" },
  { key: "cvr", label: "CVR", color: "#ff9f1c", type: "line" },
  { key: "impressions", label: "Imp", color: "#7209b7", type: "area" },
  { key: "clicks", label: "Clicks", color: "#06d6a0", type: "bar" },
  { key: "ctr", label: "CTR", color: "#118ab2", type: "line" },
  { key: "cpc", label: "CPC", color: "#ef476f", type: "line" },
];

function SummaryContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState<Set<string>>(
    new Set(["cost", "cpa", "conversions", "cvr"])
  );

  useEffect(() => {
    fetchApi<SummaryData>("/api/summary", { start, end })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end]);

  const toggleMetric = useCallback((key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  const activeMetrics = CHART_METRICS.filter((m) => visible.has(m.key));

  return (
    <>
      <KpiCards data={data.totals} />

      <div className="chart-card">
        <h3>日別推移（複合チャート）</h3>
        <MetricToggle metrics={CHART_METRICS} visible={visible} onToggle={toggleMetric} />

        {activeMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              {activeMetrics.map((m, i) => (
                <YAxis
                  key={m.key}
                  yAxisId={m.key}
                  orientation={i % 2 === 0 ? "left" : "right"}
                  hide={i >= 2}
                  tick={{ fontSize: 10 }}
                />
              ))}
              <Tooltip />
              <Legend />
              {activeMetrics.map((m) => {
                if (m.type === "bar") {
                  return <Bar key={m.key} yAxisId={m.key} dataKey={m.key} fill={m.color} name={m.label} opacity={0.8} />;
                }
                if (m.type === "area") {
                  return <Area key={m.key} yAxisId={m.key} type="monotone" dataKey={m.key} fill={m.color} stroke={m.color} name={m.label} fillOpacity={0.15} />;
                }
                return <Line key={m.key} yAxisId={m.key} type="monotone" dataKey={m.key} stroke={m.color} name={m.label} strokeWidth={2} dot={{ r: 2 }} />;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">表示する指標を選択してください</div>
        )}
      </div>

      <div className="table-card">
        <h3>サマリー</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Impressions</span>
            <span className="summary-value">{formatNumber(data.totals.impressions)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Clicks</span>
            <span className="summary-value">{formatNumber(data.totals.clicks)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">CTR</span>
            <span className="summary-value">{formatPercent(data.totals.ctr)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">CPC</span>
            <span className="summary-value">{formatCurrency(data.totals.cpc)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Cost</span>
            <span className="summary-value highlight">{formatCurrency(data.totals.cost)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Conversions</span>
            <span className="summary-value">{formatNumber(data.totals.conversions)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">CVR</span>
            <span className="summary-value">{formatPercent(data.totals.cvr)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">CPA</span>
            <span className="summary-value highlight">{formatCurrency(data.totals.cpa)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SummaryPage() {
  return (
    <div className="container">
      <h1 className="page-title">📊 Summary Dashboard</h1>
      <p className="page-subtitle">Meta広告全体のパフォーマンスサマリー</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/summary" />
        <SummaryContent />
      </Suspense>
    </div>
  );
}
