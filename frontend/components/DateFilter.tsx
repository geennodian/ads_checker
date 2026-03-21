"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getDefaultDates } from "@/lib/api";

export default function DateFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaults = getDefaultDates();

  const [start, setStart] = useState(searchParams.get("start") || defaults.start);
  const [end, setEnd] = useState(searchParams.get("end") || defaults.end);

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", start);
    params.set("end", end);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="date-filter">
      <label>期間:</label>
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      <span>〜</span>
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      <button onClick={apply}>適用</button>
    </div>
  );
}
