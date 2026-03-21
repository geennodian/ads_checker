"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fetchApi, getDefaultDates, formatNumber, formatCurrency, formatPercent } from "@/lib/api";
import Navigation from "@/components/Navigation";
import DateFilter from "@/components/DateFilter";

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

function CreativeContent() {
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;
  const campaignId = searchParams.get("campaign_id") || "";

  const [data, setData] = useState<CreativeData | null>(null);
  const [error, setError] = useState("");
  const [filterCampaign, setFilterCampaign] = useState(campaignId);

  useEffect(() => {
    const params: Record<string, string> = { start, end };
    if (filterCampaign) params.campaign_id = filterCampaign;
    fetchApi<CreativeData>("/api/creatives", params)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [start, end, filterCampaign]);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  // Unique campaigns for filter
  const campaigns = Array.from(
    new Map(data.data.map((r) => [r.campaign_id, r.campaign_name])).entries()
  );

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

      <div className="table-card">
        <h3>Creative 別パフォーマンス</h3>
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
      <h1 className="page-title">Creative Dashboard</h1>
      <p className="page-subtitle">クリエイティブ別のパフォーマンス比較</p>
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Navigation />
        <DateFilter basePath="/dashboard/creative" />
        <CreativeContent />
      </Suspense>
    </div>
  );
}
