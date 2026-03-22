"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
import MetricToggle from "@/components/MetricToggle";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line, Cell,
} from "recharts";

interface CreativeRow {
  creative_id: string;
  creative_name: string;
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

interface CreativeData {
  data: CreativeRow[];
  start: string;
  end: string;
}

const COLORS = ["#4361ee", "#2ec4b6", "#e71d36", "#ff9f1c", "#7209b7", "#06d6a0", "#118ab2", "#ef476f"];

const CHART_METRICS = [
  { key: "cost", label: "Cost", color: "#4361ee", format: "currency" },
  { key: "conversions", label: "CVs", color: "#2ec4b6", format: "number" },
  { key: "cpa", label: "CPA", color: "#e71d36", format: "currency" },
  { key: "ctr", label: "CTR", color: "#ff9f1c", format: "percent" },
  { key: "cvr", label: "CVR", color: "#118ab2", format: "percent" },
  { key: "clicks", label: "Clicks", color: "#06d6a0", format: "number" },
];

const formatValue = (value: number, format: string) => {
  switch (format) {
    case "currency": return formatCurrency(value);
    case "percent": return formatPercent(value);
    default: return formatNumber(value);
  }
};

function CreativeContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;
  const campaignId = searchParams.get("campaign_id") || "";

  const [data, setData] = useState<CreativeData | null>(null);
  const [error, setError] = useState("");
  const [filterCampaign, setFilterCampaign] = useState(campaignId);
  const [chartVisible, setChartVisible] = useState<Set<string>>(
    new Set(["cost", "conversions", "cpa"])
  );

  useEffect(() => {
    const params: Record<string, string> = { start, end };
    if (filterCampaign) params.campaign_id = filterCampaign;
    fetchApi<CreativeData>("/api/creatives", params)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end, filterCampaign]);

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

  const campaigns = Array.from(
    new Map(data.data.map((r) => [r.campaign_id, r.campaign_name])).entries()
  );

  const shortName = (name: string) => name.length > 10 ? name.slice(0, 10) + "…" : name;

  const activeMetrics = CHART_METRICS.filter(m => chartVisible.has(m.key));
  const barMetrics = activeMetrics.filter(m => !["ctr", "cvr", "cpa"].includes(m.key));
  const lineMetrics = activeMetrics.filter(m => ["ctr", "cvr", "cpa"].includes(m.key));

  // CPA vs CVR 散布図用データ
  const scatterData = data.data.map(r => ({
    ...r,
    name: r.creative_name || r.creative_id,
  }));

  return (
    <>
      <div className="filter-row">
        <label>Campaign:</label>
        <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}>
          <option value="">All Campaigns</option>
          {campaigns.map(([id, name]) => (
            <option key={id} value={id}>{name || id}</option>
          ))}
        </select>
      </div>

      {/* クリエイティブ比較チャート */}
      <div className="chart-card">
        <h3>🎨 クリエイティブ比較</h3>
        <MetricToggle metrics={CHART_METRICS} visible={chartVisible} onToggle={toggleChart} />

        {activeMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="creative_name" tick={{ fontSize: 10 }} tickFormatter={shortName} />
              {activeMetrics.map((m, i) => (
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

      {/* CPA vs CVR 散布図: どのクリエイティブが効率的か */}
      <div className="chart-card">
        <h3>🎯 CPA × CVR マトリクス（左上が優秀）</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" dataKey="cpa" name="CPA" tick={{ fontSize: 11 }}
              label={{ value: "CPA (低い方が良い →)", position: "bottom", fontSize: 11 }} />
            <YAxis type="number" dataKey="cvr" name="CVR" tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
              label={{ value: "CVR (高い方が良い)", angle: -90, position: "left", fontSize: 11 }} />
            <ZAxis type="number" dataKey="cost" range={[80, 400]} name="Cost" />
            <Tooltip
              formatter={(v: number, name: string) => {
                if (name === "CPA") return formatCurrency(v);
                if (name === "CVR") return formatPercent(v);
                if (name === "Cost") return formatCurrency(v);
                return v;
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  const d = payload[0].payload;
                  return `${d.creative_name} (${d.campaign_name})`;
                }
                return "";
              }}
            />
            <Scatter data={scatterData} name="Creatives">
              {scatterData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* テーブル */}
      <div className="table-card">
        <h3>クリエイティブ別パフォーマンス</h3>
        <table>
          <thead>
            <tr>
              <th>Creative</th>
              <th>Campaign</th>
              <th>Imp</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>CPC</th>
              <th>Cost</th>
              <th>CV</th>
              <th>CVR</th>
              <th>CPA</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row) => (
              <tr key={`${row.creative_id}-${row.campaign_id}`}>
                <td title={row.creative_id}>{row.creative_name || row.creative_id}</td>
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

export default function CreativePage() {
  return (
    <div className="container">
      <h1 className="page-title">🎨 Creative</h1>
      <p className="page-subtitle">クリエイティブの効率と成果を可視化</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/creative" />
        <CreativeContent />
      </Suspense>
    </div>
  );
}
