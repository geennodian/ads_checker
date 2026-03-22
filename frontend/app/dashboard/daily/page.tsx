"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
import MetricToggle from "@/components/MetricToggle";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Area,
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

interface DailyData {
  data: DailyRow[];
  start: string;
  end: string;
}

const METRICS = [
  { key: "impressions", label: "Impressions", color: "#4361ee", format: "number" },
  { key: "clicks", label: "Clicks", color: "#2ec4b6", format: "number" },
  { key: "ctr", label: "CTR", color: "#ff9f1c", format: "percent" },
  { key: "cpc", label: "CPC", color: "#e71d36", format: "currency" },
  { key: "cost", label: "Cost", color: "#7209b7", format: "currency" },
  { key: "conversions", label: "CVs", color: "#06d6a0", format: "number" },
  { key: "cvr", label: "CVR", color: "#118ab2", format: "percent" },
  { key: "cpa", label: "CPA", color: "#ef476f", format: "currency" },
];

const formatValue = (value: number, format: string) => {
  switch (format) {
    case "currency": return formatCurrency(value);
    case "percent": return formatPercent(value);
    default: return formatNumber(value);
  }
};

const formatAxis = (v: number, format: string) => {
  if (format === "percent") return `${(v * 100).toFixed(1)}%`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v.toString();
};

function DailyContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<DailyData | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState<Set<string>>(
    new Set(["cost", "cpa", "conversions", "cvr"])
  );

  useEffect(() => {
    fetchApi<DailyData>("/api/daily", { start, end })
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

  const visibleMetrics = METRICS.filter((m) => visible.has(m.key));

  // マーケター向け: 効率指標(CPA/CVR)と量指標(Cost/CVs)を複合チャートで
  const efficiencyVisible = visibleMetrics.filter(m => ["cost", "cpa", "cpc", "ctr"].includes(m.key));
  const volumeVisible = visibleMetrics.filter(m => ["impressions", "clicks", "conversions", "cvr"].includes(m.key));

  return (
    <>
      <MetricToggle metrics={METRICS} visible={visible} onToggle={toggleMetric} />

      {/* コスト効率チャート: Cost × CPA or CPC × CTR */}
      {efficiencyVisible.length > 0 && (
        <div className="chart-card">
          <h3>💰 コスト効率の推移</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              {efficiencyVisible.map((m, i) => (
                <YAxis key={m.key} yAxisId={m.key} orientation={i % 2 === 0 ? "left" : "right"} hide={i >= 2}
                  tick={{ fontSize: 10 }} tickFormatter={(v) => formatAxis(v, m.format)} />
              ))}
              <Tooltip formatter={(v: number, name: string) => {
                const m = METRICS.find(m => m.key === name || m.label === name);
                return m ? formatValue(v, m.format) : v;
              }} />
              <Legend />
              {efficiencyVisible.map((m) => 
                m.key === "cost" 
                  ? <Bar key={m.key} yAxisId={m.key} dataKey={m.key} fill={m.color} name={m.label} opacity={0.7} />
                  : <Line key={m.key} yAxisId={m.key} type="monotone" dataKey={m.key} stroke={m.color} name={m.label} strokeWidth={2} dot={{ r: 2 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ボリュームチャート: Impressions × Clicks × CVs × CVR */}
      {volumeVisible.length > 0 && (
        <div className="chart-card">
          <h3>📊 ボリュームの推移</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              {volumeVisible.map((m, i) => (
                <YAxis key={m.key} yAxisId={m.key} orientation={i % 2 === 0 ? "left" : "right"} hide={i >= 2}
                  tick={{ fontSize: 10 }} tickFormatter={(v) => formatAxis(v, m.format)} />
              ))}
              <Tooltip formatter={(v: number, name: string) => {
                const m = METRICS.find(m => m.key === name || m.label === name);
                return m ? formatValue(v, m.format) : v;
              }} />
              <Legend />
              {volumeVisible.map((m) => 
                ["impressions"].includes(m.key)
                  ? <Area key={m.key} yAxisId={m.key} type="monotone" dataKey={m.key} fill={m.color} stroke={m.color} name={m.label} fillOpacity={0.12} />
                  : m.format === "percent"
                    ? <Line key={m.key} yAxisId={m.key} type="monotone" dataKey={m.key} stroke={m.color} name={m.label} strokeWidth={2} dot={{ r: 2 }} />
                    : <Bar key={m.key} yAxisId={m.key} dataKey={m.key} fill={m.color} name={m.label} opacity={0.7} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {visibleMetrics.length === 0 && (
        <div className="empty-state">表示する指標を選択してください</div>
      )}

      <div className="table-card">
        <h3>日別データ一覧</h3>
        <table>
          <thead>
            <tr>
              <th>日付</th>
              {visibleMetrics.map((m) => <th key={m.key}>{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.data.map((row) => (
              <tr key={row.date}>
                <td>{row.date.slice(5)}</td>
                {visibleMetrics.map((m) => (
                  <td key={m.key}>{formatValue(row[m.key as keyof DailyRow] as number, m.format)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function DailyPage() {
  return (
    <div className="container">
      <h1 className="page-title">📈 Daily Trend</h1>
      <p className="page-subtitle">コスト効率とボリュームを日別で追跡</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/daily" />
        <DailyContent />
      </Suspense>
    </div>
  );
}
