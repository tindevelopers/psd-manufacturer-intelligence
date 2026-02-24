"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/app-layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Tag,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    stockPercentage: number;
    totalInventory: number;
    avgInventory: number;
  };
  inventoryLevels: {
    outOfStock: number;
    lowStock: number;
    mediumStock: number;
    highStock: number;
  };
  pricing: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    priceRanges: { range: string; count: number }[];
  };
  discounts: {
    discountCount: number;
    discountPercentage: number;
    avgDiscount: number;
    topDiscounts: {
      id: string;
      discount: number;
      originalPrice: number;
      salePrice: number;
    }[];
  };
  categoryDistribution: { name: string; count: number }[];
  manufacturerDistribution: {
    name: string;
    productCount: number;
    inStockCount: number;
    totalValue: number;
    stockRate: number;
  }[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

const INVENTORY_COLORS = {
  outOfStock: "#ef4444",
  lowStock: "#f59e0b",
  mediumStock: "#3b82f6",
  highStock: "#10b981",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics");
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load analytics");
      }
    } catch (err) {
      setError("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p>{error || "No data available"}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const inventoryData = [
    { name: "Out of Stock", value: data.inventoryLevels.outOfStock, color: INVENTORY_COLORS.outOfStock },
    { name: "Low (1-5)", value: data.inventoryLevels.lowStock, color: INVENTORY_COLORS.lowStock },
    { name: "Medium (6-20)", value: data.inventoryLevels.mediumStock, color: INVENTORY_COLORS.mediumStock },
    { name: "High (20+)", value: data.inventoryLevels.highStock, color: INVENTORY_COLORS.highStock },
  ];

  const stockData = [
    { name: "In Stock", value: data.overview.inStockCount },
    { name: "Out of Stock", value: data.overview.outOfStockCount },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Product Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into inventory, pricing, and catalog distribution
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Products"
            value={data.overview.totalProducts.toLocaleString()}
            icon={<Package className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="In Stock"
            value={data.overview.inStockCount.toLocaleString()}
            subtitle={`${data.overview.stockPercentage}%`}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Out of Stock"
            value={data.overview.outOfStockCount.toLocaleString()}
            icon={<XCircle className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            title="Avg Price"
            value={`$${data.pricing.avgPrice.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title="On Sale"
            value={data.discounts.discountCount.toLocaleString()}
            subtitle={`${data.discounts.discountPercentage}%`}
            icon={<Tag className="h-5 w-5" />}
            color="amber"
          />
          <StatCard
            title="Avg Discount"
            value={`${data.discounts.avgDiscount}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="rose"
          />
        </div>

        {/* Charts Row 1: Stock & Inventory */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stock Status Pie */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              Stock Status
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Levels */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-600" />
              Inventory Levels
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Price Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Price Distribution
          </h3>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Min Price</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${data.pricing.minPrice.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Avg Price</p>
              <p className="text-xl font-bold text-purple-600">
                ${data.pricing.avgPrice.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Max Price</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${data.pricing.maxPrice.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Price Range</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${(data.pricing.maxPrice - data.pricing.minPrice).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pricing.priceRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 3: Category & Manufacturer Distribution */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name.slice(0, 15)}${name.length > 15 ? "..." : ""}` : ""
                    }
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {data.categoryDistribution.slice(0, 6).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-gray-600 dark:text-gray-400">
                    {cat.name} ({cat.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Manufacturer Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Top Manufacturers</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.manufacturerDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(name) => (name.length > 12 ? name.slice(0, 12) + "..." : name)}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "productCount") return [value, "Products"];
                      if (name === "inStockCount") return [value, "In Stock"];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="productCount" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Products" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Stock rate summary */}
            <div className="mt-4 space-y-2">
              {data.manufacturerDistribution.slice(0, 3).map((mfr) => (
                <div key={mfr.name} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{mfr.name}</span>
                  <span className="font-medium">
                    <span className={mfr.stockRate >= 80 ? "text-green-600" : mfr.stockRate >= 50 ? "text-amber-600" : "text-red-600"}>
                      {mfr.stockRate}% in stock
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discount Analysis */}
        {data.discounts.discountCount > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-amber-600" />
              Discount Analysis
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-700 dark:text-amber-400">Products on Sale</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data.discounts.discountCount}
                </p>
                <p className="text-sm text-gray-500">{data.discounts.discountPercentage}% of catalog</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-700 dark:text-amber-400">Average Discount</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data.discounts.avgDiscount}%
                </p>
                <p className="text-sm text-gray-500">off original price</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">Top Discounts</p>
                <div className="space-y-1">
                  {data.discounts.topDiscounts.slice(0, 3).map((d, i) => (
                    <div key={d.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">#{i + 1}</span>
                      <span className="font-bold text-green-600">{d.discount}% off</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "purple" | "amber" | "rose";
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-600",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
