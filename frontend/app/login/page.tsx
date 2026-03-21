"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, setToken, checkAuthRequired } from "@/lib/api";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuthRequired().then((required) => {
      if (!required) router.replace("/dashboard/summary");
    }).catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await login(password);
      setToken(token);
      router.push("/dashboard/summary");
    } catch {
      setError("パスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f6fa",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#fff",
        padding: "2.5rem",
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        width: "100%",
        maxWidth: "380px",
      }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Ads Checker</h1>
        <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          ダッシュボードにアクセスするにはパスワードを入力してください
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          autoFocus
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "1rem",
            marginBottom: "1rem",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p style={{ color: "#e53e3e", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
