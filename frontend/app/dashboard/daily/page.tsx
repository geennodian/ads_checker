"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fetchApi, getDefaultDates } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";
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

const CHARTS: { key: keyof DailyRow; label: string; color: string }[] = [
  { key: "impressions", label: "Impressions", color: "#4361ee" },
  { key: "clicks", label: "Clicks", color: "#2ec4b6" },
  { key: "ctr", label: "CTR", color: "#ff9f1c" },
  { key: "cpc", label: "CPC", color: "#e71d36" },
  { key: "cost", label: "Cost", color: "#7209b7" },
  { key: "conversions", label: "Conversions", color: "#06d6a0" },
  { key: "cvr", label: "CVR", color: "#118ab2" },
  { key: "cpa", label: "CPA", color: "#ef476f" },
];

function DailyContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<DailyData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<DailyData>("/api/daily", { start, end })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end]);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  return (
    <>
      {CHARTS.map((chart) => (
        <div key={chart.key} className="chart-card">
          <h3>{chart.label} 日別推移</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={chart.key} stroke={chart.color} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </>
  );
}

export default function DailyPage() {
  return (
    <div className="container">
      <h1 className="page-title">Daily Trend Dashboard</h1>
      <p className="page-subtitle">各指標の日別推移を詳しく確認</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/daily" />
        <DailyContent />
      </Suspense>
    </div>
  );
}
