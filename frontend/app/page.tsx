"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkAuthRequired } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    checkAuthRequired().then((required) => {
      if (required) {
        const token = localStorage.getItem("ads_checker_token");
        if (!token) {
          router.replace("/login");
          return;
        }
      }
      router.replace("/dashboard/summary");
    }).catch(() => {
      router.replace("/dashboard/summary");
    });
  }, [router]);

  return null;
}
