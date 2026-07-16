"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinancialYear } from "@/lib/dart";

type Props = { financials: FinancialYear[] };

export function FinancialChart({ financials }: Props) {
  if (financials.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">재무 데이터가 없습니다.</p>
    );
  }

  const data = financials.map((f) => ({
    year: `${f.year}`,
    "매출액(억원)": f.revenue,
    "영업이익(억원)": f.operatingProfit,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="year" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="매출액(억원)" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="영업이익(억원)" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
