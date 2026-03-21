import { formatNumber, formatCurrency, formatPercent } from "@/lib/api";

interface Totals {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cvr: number;
  cpa: number;
}

export default function KpiCards({ data }: { data: Totals }) {
  const cards = [
    { label: "Impressions", value: formatNumber(data.impressions) },
    { label: "Clicks", value: formatNumber(data.clicks) },
    { label: "CTR", value: formatPercent(data.ctr) },
    { label: "CPC", value: formatCurrency(data.cpc) },
    { label: "Cost", value: formatCurrency(data.cost) },
    { label: "Conversions", value: formatNumber(data.conversions) },
    { label: "CVR", value: formatPercent(data.cvr) },
    { label: "CPA", value: formatCurrency(data.cpa) },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div key={c.label} className="kpi-card">
          <div className="label">{c.label}</div>
          <div className="value">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
