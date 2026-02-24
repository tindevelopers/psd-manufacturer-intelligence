"use client";

import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color: "blue" | "green" | "purple" | "amber" | "rose";
  loading?: boolean;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-white/20",
  },
  green: {
    bg: "bg-emerald-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-white/20",
  },
  purple: {
    bg: "bg-purple-500",
    lightBg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-white/20",
  },
  amber: {
    bg: "bg-amber-500",
    lightBg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-white/20",
  },
  rose: {
    bg: "bg-rose-500",
    lightBg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-white/20",
  },
};

export function StatsCard({ title, value, icon, trend, color, loading }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors.iconBg} p-3 rounded-xl`}>
          {icon}
        </div>
        <div className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold">
          {loading ? (
            <span className="inline-block w-20 h-8 bg-white/20 animate-pulse rounded"></span>
          ) : (
            typeof value === "number" ? value.toLocaleString() : value
          )}
        </p>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend.isPositive ? 'bg-white/20' : 'bg-red-400/30'}`}>
            {trend.isPositive ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {trend.value}%
          </span>
          <span className="text-white/70">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
