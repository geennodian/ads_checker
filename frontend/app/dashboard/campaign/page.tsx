"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";

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

function CampaignContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;

  const [data, setData] = useState<CampaignData | null>(null);
  const [error, setError] = useState("");
  const [sortCol, setSortCol] = useState("cost");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchApi<CampaignData>("/api/campaigns", { start, end, sort: sortCol, order: sortOrder })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end, sortCol, sortOrder]);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortCol(col);
      setSortOrder("desc");
    }
  };

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortOrder === "desc" ? " ▼" : " ▲") : "";

  return (
    <div className="table-card">
      <h3>Campaign 別パフォーマンス</h3>
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th onClick={() => toggleSort("impressions")} style={{ cursor: "pointer" }}>
              Imp{sortIndicator("impressions")}
            </th>
            <th onClick={() => toggleSort("clicks")} style={{ cursor: "pointer" }}>
              Clicks{sortIndicator("clicks")}
            </th>
            <th onClick={() => toggleSort("ctr")} style={{ cursor: "pointer" }}>
              CTR{sortIndicator("ctr")}
            </th>
            <th onClick={() => toggleSort("cpc")} style={{ cursor: "pointer" }}>
              CPC{sortIndicator("cpc")}
            </th>
            <th onClick={() => toggleSort("cost")} style={{ cursor: "pointer" }}>
              Cost{sortIndicator("cost")}
            </th>
            <th onClick={() => toggleSort("conversions")} style={{ cursor: "pointer" }}>
              CV{sortIndicator("conversions")}
            </th>
            <th onClick={() => toggleSort("cvr")} style={{ cursor: "pointer" }}>
              CVR{sortIndicator("cvr")}
            </th>
            <th onClick={() => toggleSort("cpa")} style={{ cursor: "pointer" }}>
              CPA{sortIndicator("cpa")}
            </th>
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
  );
}

export default function CampaignPage() {
  return (
    <div className="container">
      <h1 className="page-title">Campaign Dashboard</h1>
      <p className="page-subtitle">キャンペーン別のパフォーマンス比較</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/campaign" />
        <CampaignContent />
      </Suspense>
    </div>
  );
}
