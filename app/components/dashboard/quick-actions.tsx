"use client";

import Link from "next/link";

export function QuickActions() {
  const actions = [
    {
      title: "Sync Shopify",
      description: "Pull latest products",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      href: "/scraper",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "View Products",
      description: "Browse catalog",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      href: "/products",
      color: "bg-emerald-500 hover:bg-emerald-600",
    },
    {
      title: "Manufacturers",
      description: "View all vendors",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: "/manufacturers",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Settings",
      description: "Configure API",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: "/settings",
      color: "bg-amber-500 hover:bg-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className={`${action.color} text-white p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
              {action.icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{action.title}</p>
              <p className="text-xs text-white/80">{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
