"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ManufacturerChartProps {
  data: { name: string; productCount: number }[];
}

export function ManufacturerBarChart({ data }: ManufacturerChartProps) {
  const chartData = data.map(item => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
    fullName: item.name,
    products: item.productCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: 'none', 
            borderRadius: '8px',
            color: '#fff'
          }}
          labelFormatter={(label) => label}
        />
        <Bar 
          dataKey="products" 
          fill="#3b82f6" 
          radius={[8, 8, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StockDonutChartProps {
  inStock: number;
  outOfStock: number;
  percentage: number;
}

export function StockDonutChart({ inStock, outOfStock, percentage }: StockDonutChartProps) {
  const data = [
    { name: 'In Stock', value: inStock, color: '#10b981' },
    { name: 'Out of Stock', value: outOfStock, color: '#ef4444' },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{percentage}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">In Stock</p>
        </div>
      </div>
    </div>
  );
}

interface CategoryChartProps {
  data: { category: string; count: number }[];
}

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CategoryPieChart({ data }: CategoryChartProps) {
  const chartData = data.map((item, index) => ({
    name: item.category.length > 15 ? item.category.substring(0, 15) + '...' : item.category,
    fullName: item.category,
    value: item.count,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: 'none', 
                borderRadius: '8px',
                color: '#fff'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2">
        {chartData.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{item.name}</span>
            <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
