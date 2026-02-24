"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/app-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ManufacturerBarChart, StockDonutChart, CategoryPieChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TopManufacturers } from "@/components/dashboard/top-manufacturers";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalManufacturers: number;
  verifiedManufacturers: number;
  totalProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  stockPercentage: number;
  completedSyncJobs: number;
  topManufacturers: { id: string; name: string; productCount: number; verified: boolean }[];
  productsByCategory: { category: string; count: number }[];
  recentProducts: {
    id: string;
    name: string;
    price: number | null;
    inStock: boolean;
    manufacturer: string;
    imageUrl: string | null;
    updatedAt: string;
  }[];
  lastSync: { completedAt: string; productsScraped: number } | null;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back! Here&apos;s your store overview.
            </p>
          </div>
          {stats?.lastSync && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                Last sync: {formatDistanceToNow(new Date(stats.lastSync.completedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Manufacturers"
            value={stats?.totalManufacturers || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="blue"
            loading={loading}
            trend={{ value: 100, isPositive: true, label: "from Shopify" }}
          />
          <StatsCard
            title="Total Products"
            value={stats?.totalProducts || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="purple"
            loading={loading}
            trend={{ value: stats?.completedSyncJobs || 0, isPositive: true, label: "syncs completed" }}
          />
          <StatsCard
            title="In Stock"
            value={stats?.inStockProducts || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            loading={loading}
            trend={{ value: stats?.stockPercentage || 0, isPositive: true, label: "availability" }}
          />
          <StatsCard
            title="Out of Stock"
            value={stats?.outOfStockProducts || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="rose"
            loading={loading}
            trend={{ value: 100 - (stats?.stockPercentage || 0), isPositive: false, label: "need restock" }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manufacturer Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Products by Manufacturer
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top vendors by product count</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Products</span>
              </div>
            </div>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : stats?.topManufacturers && stats.topManufacturers.length > 0 ? (
              <ManufacturerBarChart data={stats.topManufacturers} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available. Sync with Shopify to see analytics.
              </div>
            )}
          </div>

          {/* Stock Donut Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Inventory Status
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stock availability breakdown</p>
            </div>
            {loading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <StockDonutChart 
                  inStock={stats?.inStockProducts || 0} 
                  outOfStock={stats?.outOfStockProducts || 0}
                  percentage={stats?.stockPercentage || 0}
                />
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">In Stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Second Row: Quick Actions, Top Manufacturers, Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <QuickActions />
          </div>

          {/* Top Manufacturers */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Manufacturers
              </h3>
              <a href="/manufacturers" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                View All →
              </a>
            </div>
            <TopManufacturers 
              manufacturers={stats?.topManufacturers || []} 
              loading={loading}
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Products
              </h3>
              <a href="/products" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                View All →
              </a>
            </div>
            <RecentActivity 
              products={stats?.recentProducts || []} 
              loading={loading}
            />
          </div>
        </div>

        {/* Category Distribution */}
        {stats?.productsByCategory && stats.productsByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Products by Category
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Distribution across product types</p>
              </div>
            </div>
            <CategoryPieChart data={stats.productsByCategory} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
