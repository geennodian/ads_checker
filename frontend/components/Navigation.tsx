"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/dashboard/summary", label: "Summary" },
  { href: "/dashboard/daily", label: "Daily Trend" },
  { href: "/dashboard/campaign", label: "Campaign" },
  { href: "/dashboard/creative", label: "Creative" },
];

export default function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  return (
    <nav className="nav">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={`${link.href}${qs ? `?${qs}` : ""}`}
          className={pathname === link.href ? "active" : ""}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
