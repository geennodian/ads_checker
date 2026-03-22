"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
import MetricToggle from "@/components/MetricToggle";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line,
} from "recharts";

interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cvr: number;
  cpa: number;
}

interface CampaignData {
  data: CampaignRow[];
  start: string;
  end: string;
}

const COLORS = ["#4361ee", "#2ec4b6", "#e71d36", "#ff9f1c", "#7209b7", "#06d6a0"];

const CHART_METRICS = [
  { key: "cost", label: "Cost", color: "#4361ee", format: "currency" },
  { key: "conversions", label: "CVs", color: "#2ec4b6", format: "number" },
  { key: "cpa", label: "CPA", color: "#e71d36", format: "currency" },
  { key: "ctr", label: "CTR", color: "#ff9f1c", format: "percent" },
  { key: "cvr", label: "CVR", color: "#118ab2", format: "percent" },
  { key: "impressions", label: "Imp", color: "#7209b7", format: "number" },
];

const formatValue = (value: number, format: string) => {
  switch (format) {
    case "currency": return formatCurrency(value);
    case "percent": return formatPercent(value);
    default: return formatNumber(value);
  }
};

function CampaignContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<CampaignData | null>(null);
  const [error, setError] = useState("");
  const [sortCol, setSortCol] = useState("cost");
  const [sortOrder, setSortOrder] = useState("desc");
  const [chartVisible, setChartVisible] = useState<Set<string>>(
    new Set(["cost", "conversions", "cpa"])
  );

  useEffect(() => {
    fetchApi<CampaignData>("/api/campaigns", { start, end, sort: sortCol, order: sortOrder })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end, sortCol, sortOrder]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortOrder("desc"); }
  };

  const toggleChart = useCallback((key: string) => {
    setChartVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortOrder === "desc" ? " ▼" : " ▲") : "";

  const shortName = (name: string) => {
    if (name.length > 12) return name.slice(0, 12) + "…";
    return name;
  };

  const activeChartMetrics = CHART_METRICS.filter(m => chartVisible.has(m.key));
  
  // キャンペーン比較用の棒グラフデータ
  const barMetrics = activeChartMetrics.filter(m => !["ctr", "cvr"].includes(m.key));
  const lineMetrics = activeChartMetrics.filter(m => ["ctr", "cvr", "cpa"].includes(m.key));

  return (
    <>
      {/* キャンペーン比較チャート */}
      <div className="chart-card">
        <h3>🏆 キャンペーン比較</h3>
        <MetricToggle metrics={CHART_METRICS} visible={chartVisible} onToggle={toggleChart} />
        
        {activeChartMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="campaign_name" tick={{ fontSize: 10 }} tickFormatter={shortName} />
              {activeChartMetrics.map((m, i) => (
                <YAxis key={m.key} yAxisId={m.key} orientation={i % 2 === 0 ? "left" : "right"} hide={i >= 2}
                  tick={{ fontSize: 10 }} />
              ))}
              <Tooltip formatter={(v: number, name: string) => {
                const m = CHART_METRICS.find(m => m.label === name);
                return m ? formatValue(v, m.format) : v;
              }} />
              <Legend />
              {barMetrics.map((m) => (
                <Bar key={m.key} yAxisId={m.key} dataKey={m.key} fill={m.color} name={m.label} opacity={0.8} />
              ))}
              {lineMetrics.map((m) => (
                <Line key={m.key} yAxisId={m.key} type="monotone" dataKey={m.key} stroke={m.color} name={m.label} strokeWidth={2} dot={{ r: 4 }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">表示する指標を選択してください</div>
        )}
      </div>

      {/* コスト配分 */}
      <div className="chart-row">
        <div className="chart-card chart-half">
          <h3>💰 コスト配分</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="campaign_name" tick={{ fontSize: 10 }} width={100} tickFormatter={shortName} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="cost" name="Cost">
                {data.data.map((_, i) => (
                  <rect key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-half">
          <h3>🎯 CV配分</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="campaign_name" tick={{ fontSize: 10 }} width={100} tickFormatter={shortName} />
              <Tooltip formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="conversions" name="CVs">
                {data.data.map((_, i) => (
                  <rect key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* テーブル */}
      <div className="table-card">
        <h3>キャンペーン別パフォーマンス</h3>
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th onClick={() => toggleSort("impressions")} style={{ cursor: "pointer" }}>Imp{sortIndicator("impressions")}</th>
              <th onClick={() => toggleSort("clicks")} style={{ cursor: "pointer" }}>Clicks{sortIndicator("clicks")}</th>
              <th onClick={() => toggleSort("ctr")} style={{ cursor: "pointer" }}>CTR{sortIndicator("ctr")}</th>
              <th onClick={() => toggleSort("cpc")} style={{ cursor: "pointer" }}>CPC{sortIndicator("cpc")}</th>
              <th onClick={() => toggleSort("cost")} style={{ cursor: "pointer" }}>Cost{sortIndicator("cost")}</th>
              <th onClick={() => toggleSort("conversions")} style={{ cursor: "pointer" }}>CV{sortIndicator("conversions")}</th>
              <th onClick={() => toggleSort("cvr")} style={{ cursor: "pointer" }}>CVR{sortIndicator("cvr")}</th>
              <th onClick={() => toggleSort("cpa")} style={{ cursor: "pointer" }}>CPA{sortIndicator("cpa")}</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row) => (
              <tr key={row.campaign_id}>
                <td title={row.campaign_id}>{row.campaign_name || row.campaign_id}</td>
                <td>{formatNumber(row.impressions)}</td>
                <td>{formatNumber(row.clicks)}</td>
                <td>{formatPercent(row.ctr)}</td>
                <td>{formatCurrency(row.cpc)}</td>
                <td>{formatCurrency(row.cost)}</td>
                <td>{formatNumber(row.conversions)}</td>
                <td>{formatPercent(row.cvr)}</td>
                <td>{formatCurrency(row.cpa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function CampaignPage() {
  return (
    <div className="container">
      <h1 className="page-title">🏆 Campaign</h1>
      <p className="page-subtitle">キャンペーン別のコスト効率とCV獲得状況を比較</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/campaign" />
        <CampaignContent />
      </Suspense>
    </div>
  );
}
