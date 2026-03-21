"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
import KpiCards from "@/components/KpiCards";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar,
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

function SummaryContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<SummaryData>("/api/summary", { start, end })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end]);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  return (
    <>
      <KpiCards data={data.totals} />

      <div className="table-card">
        <h3>Meta 全体サマリー</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Impressions</td><td>{formatNumber(data.totals.impressions)}</td></tr>
            <tr><td>Clicks</td><td>{formatNumber(data.totals.clicks)}</td></tr>
            <tr><td>CTR</td><td>{formatPercent(data.totals.ctr)}</td></tr>
            <tr><td>CPC</td><td>{formatCurrency(data.totals.cpc)}</td></tr>
            <tr><td>Cost</td><td>{formatCurrency(data.totals.cost)}</td></tr>
            <tr><td>Conversions</td><td>{formatNumber(data.totals.conversions)}</td></tr>
            <tr><td>CVR</td><td>{formatPercent(data.totals.cvr)}</td></tr>
            <tr><td>CPA</td><td>{formatCurrency(data.totals.cpa)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="chart-card">
        <h3>CPA x Cost 日別推移</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data.daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="cost" orientation="left" />
            <YAxis yAxisId="cpa" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="cost" dataKey="cost" fill="#4361ee" name="Cost" />
            <Line yAxisId="cpa" type="monotone" dataKey="cpa" stroke="#e71d36" name="CPA" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>CVR x Conversions 日別推移</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data.daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="cv" orientation="left" />
            <YAxis yAxisId="cvr" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="cv" dataKey="conversions" fill="#2ec4b6" name="Conversions" />
            <Line yAxisId="cvr" type="monotone" dataKey="cvr" stroke="#ff9f1c" name="CVR" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default function SummaryPage() {
  return (
    <div className="container">
      <h1 className="page-title">Summary Dashboard</h1>
      <p className="page-subtitle">Meta広告全体のパフォーマンスサマリー</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/summary" />
        <SummaryContent />
      </Suspense>
    </div>
  );
}
