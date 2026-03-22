"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
import MetricToggle from "@/components/MetricToggle";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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

function DailyContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<DailyData | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState<Set<string>>(
    new Set(["impressions", "clicks", "cost", "conversions"])
  );

  useEffect(() => {
    fetchApi<DailyData>("/api/daily", { start, end })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end]);

  const toggleMetric = useCallback((key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  const visibleMetrics = METRICS.filter((m) => visible.has(m.key));

  return (
    <>
      <MetricToggle metrics={METRICS} visible={visible} onToggle={toggleMetric} />

      {visibleMetrics.map((metric) => (
        <div key={metric.key} className="chart-card">
          <h3>{metric.label} 日別推移</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => {
                if (metric.format === "percent") return `${(v * 100).toFixed(1)}%`;
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return v.toString();
              }} />
              <Tooltip formatter={(v: number) => formatValue(v, metric.format)} />
              <Line
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

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
                <td>{row.date}</td>
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
      <p className="page-subtitle">表示したい指標をチェックして切り替え</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/daily" />
        <DailyContent />
      </Suspense>
    </div>
  );
}
