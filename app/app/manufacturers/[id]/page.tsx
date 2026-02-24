"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AppLayout from "@/components/layout/app-layout";
import { formatDistanceToNow } from "date-fns";

interface Product {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
  inStock: boolean;
  sku: string | null;
  category: string | null;
}

interface Knowledge {
  id: string;
  companyOverview: string | null;
  foundedYear: string | null;
  headquarters: string | null;
  employeeCount: string | null;
  annualRevenue: string | null;
  salesEmail: string | null;
  salesPhone: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  wholesaleContact: string | null;
  distributionInfo: string | null;
  certifications: string[];
  manufacturingLocations: string[];
  productCategories: string[];
  totalProductCount: number | null;
  brandNames: string[];
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  } | null;
  scrapedAt: string;
  scrapingStatus: string;
}

interface ScrapeJob {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  pagesScraped: number;
  productsFound?: number;
  error: string | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  modelNumber: string | null;
  productUrl: string | null;
  manualUrl: string | null;
  specSheetUrl: string | null;
  quickStartUrl: string | null;
  documents: Array<{ name: string; url: string; type: string }> | null;
  matchedProductId: string | null;
  matchConfidence: number | null;
  matchMethod: string | null;
}

interface Manufacturer {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  verified: boolean;
  logoUrl: string | null;
  lastScraped: string | null;
  products: Product[];
  knowledge: Knowledge | null;
  catalogProducts: CatalogProduct[];
  scrapeJobs: ScrapeJob[];
  _count: {
    products: number;
    catalogProducts: number;
  };
}

type Tab = "overview" | "catalog" | "documents";

export default function ManufacturerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [scraping, setScraping] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scrapeMessage, setScrapeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchManufacturer();
    }
  }, [id]);

  const fetchManufacturer = async () => {
    try {
      const response = await fetch(`/api/manufacturers/${id}`);
      const result = await response.json();
      if (result.success) {
        setManufacturer(result.data);
        setWebsiteUrl(result.data.website || "");
      }
    } catch (error) {
      console.error("Failed to fetch manufacturer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!websiteUrl) {
      setScrapeMessage({ type: "error", text: "Please enter a website URL" });
      return;
    }

    setScraping(true);
    setScrapeMessage(null);

    try {
      const response = await fetch(`/api/manufacturers/${id}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
      });

      const result = await response.json();

      if (result.success) {
        setScrapeMessage({ type: "success", text: `Successfully scraped ${result.data.pagesScraped} pages!` });
        await fetchManufacturer();
        // Stay on overview tab to see the scraped data
      } else {
        setScrapeMessage({ type: "error", text: result.error || "Scraping failed" });
      }
    } catch (error) {
      setScrapeMessage({ type: "error", text: "Failed to scrape website" });
    } finally {
      setScraping(false);
    }
  };

  const handleDiscoverWebsite = async () => {
    if (!manufacturer) return;
    
    setDiscovering(true);
    setScrapeMessage(null);

    try {
      const response = await fetch("/api/manufacturers/discover-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manufacturerId: manufacturer.id }),
      });

      const result = await response.json();

      if (result.success && result.data.validatedUrl) {
        setWebsiteUrl(result.data.validatedUrl);
        setScrapeMessage({ 
          type: "success", 
          text: `Found website: ${result.data.validatedUrl} (${result.data.confidence} confidence)` 
        });
        await fetchManufacturer();
      } else if (result.success && result.data.discoveredUrl) {
        setScrapeMessage({ 
          type: "error", 
          text: `Found ${result.data.discoveredUrl} but validation failed: ${result.data.validationStatus}` 
        });
      } else {
        setScrapeMessage({ 
          type: "error", 
          text: result.data?.reasoning || "Could not discover website for this brand" 
        });
      }
    } catch (error) {
      setScrapeMessage({ type: "error", text: "Failed to discover website" });
    } finally {
      setDiscovering(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  if (!manufacturer) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manufacturer not found</h2>
          <button
            onClick={() => router.push("/manufacturers")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Manufacturers
          </button>
        </div>
      </AppLayout>
    );
  }

  // Count documents/PDFs
  const documentCount = manufacturer.catalogProducts?.filter(cp => 
    cp.manualUrl || cp.specSheetUrl || cp.quickStartUrl || (cp.documents && cp.documents.length > 0)
  ).length || 0;

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: "📊", badge: manufacturer.knowledge?.scrapingStatus === "completed" },
    { id: "catalog" as Tab, label: "Full Catalog", icon: "📦", count: manufacturer._count.products },
    { id: "documents" as Tab, label: "Documents & Manuals", icon: "📄", count: documentCount },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <button
            onClick={() => router.push("/manufacturers")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Manufacturers
          </button>
        </div>

        {/* Manufacturer Header Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {manufacturer.name.substring(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {manufacturer.name}
                </h1>
                {manufacturer.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {manufacturer.description || "No description available"}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {manufacturer.website && !manufacturer.website.includes('myshopify.com') && !manufacturer.website.includes('petstoredirect') ? (
                  <a
                    href={manufacturer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Website not discovered
                  </span>
                )}
                {manufacturer.email && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {manufacturer.email}
                  </span>
                )}
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {manufacturer._count.products} products in your store
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{manufacturer._count.products}</p>
                <p className="text-xs text-gray-500">Products</p>
              </div>
              {manufacturer.knowledge?.scrapingStatus === "completed" && (
                <div className="text-center px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">✓</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Scraped</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex gap-1 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.badge && (
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">{tab.count}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab - Company Info & Scraping */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Scrape Website Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    🔍 Scrape Manufacturer Website
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter the manufacturer's website URL to extract company information, contacts, certifications, and more.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://www.manufacturer-website.com"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleDiscoverWebsite}
                        disabled={discovering || scraping}
                        title="Use AI to find the official website"
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        {discovering ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Discovering...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span>AI Discover</span>
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={handleScrape}
                      disabled={scraping || !websiteUrl || discovering}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {scraping ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Scraping...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Scrape Website
                        </>
                      )}
                    </button>
                  </div>
                  {scrapeMessage && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
                      scrapeMessage.type === "success"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}>
                      {scrapeMessage.text}
                    </div>
                  )}
                  {manufacturer.lastScraped && (
                    <p className="mt-3 text-xs text-gray-500">
                      Last scraped: {formatDistanceToNow(new Date(manufacturer.lastScraped), { addSuffix: true })}
                    </p>
                  )}
                </div>

                {/* Company Information (Knowledge Base) */}
                {manufacturer.knowledge?.scrapingStatus === "completed" ? (
                  <KnowledgeBaseView knowledge={manufacturer.knowledge} />
                ) : manufacturer.knowledge?.scrapingStatus === "in_progress" ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Scraping in progress...</p>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Company Data Yet</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Use the scraping tool above to extract company information, contacts, and certifications.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Full Catalog Tab - Shopify Products */}
            {activeTab === "catalog" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Products in Your Store ({manufacturer._count.products})
                </h3>
                {manufacturer.products.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {manufacturer.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer block"
                      >
                        <div className="aspect-square relative mb-2 bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 50vw, 20vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {product.price ? `$${product.price.toFixed(2)}` : "N/A"}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            product.inStock
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {product.inStock ? "In Stock" : "Out"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No products found from this manufacturer in your Shopify store.</p>
                  </div>
                )}
              </div>
            )}

            {/* Documents & Manuals Tab */}
            {activeTab === "documents" && (
              <DocumentsView 
                catalogProducts={manufacturer.catalogProducts || []} 
                shopifyProducts={manufacturer.products || []}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function KnowledgeBaseView({ knowledge }: { knowledge: Knowledge }) {
  return (
    <div className="space-y-6">
      {/* Company Overview */}
      {knowledge.companyOverview && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-xl">🏢</span> Company Overview
          </h4>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{knowledge.companyOverview}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Company Details */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📋</span> Company Details
          </h4>
          <div className="space-y-3">
            {knowledge.foundedYear && (
              <div className="flex justify-between">
                <span className="text-gray-500">Founded</span>
                <span className="font-medium text-gray-900 dark:text-white">{knowledge.foundedYear}</span>
              </div>
            )}
            {knowledge.headquarters && (
              <div className="flex justify-between">
                <span className="text-gray-500">Headquarters</span>
                <span className="font-medium text-gray-900 dark:text-white">{knowledge.headquarters}</span>
              </div>
            )}
            {knowledge.employeeCount && (
              <div className="flex justify-between">
                <span className="text-gray-500">Employees</span>
                <span className="font-medium text-gray-900 dark:text-white">{knowledge.employeeCount}</span>
              </div>
            )}
            {knowledge.annualRevenue && (
              <div className="flex justify-between">
                <span className="text-gray-500">Revenue</span>
                <span className="font-medium text-gray-900 dark:text-white">{knowledge.annualRevenue}</span>
              </div>
            )}
            {knowledge.totalProductCount && (
              <div className="flex justify-between">
                <span className="text-gray-500">Total Products</span>
                <span className="font-medium text-gray-900 dark:text-white">{knowledge.totalProductCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📞</span> Contact Information
          </h4>
          <div className="space-y-3">
            {knowledge.salesEmail && (
              <div>
                <span className="text-gray-500 text-sm">Sales Email</span>
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  <a href={`mailto:${knowledge.salesEmail}`}>{knowledge.salesEmail}</a>
                </p>
              </div>
            )}
            {knowledge.salesPhone && (
              <div>
                <span className="text-gray-500 text-sm">Sales Phone</span>
                <p className="font-medium text-gray-900 dark:text-white">{knowledge.salesPhone}</p>
              </div>
            )}
            {knowledge.supportEmail && (
              <div>
                <span className="text-gray-500 text-sm">Support Email</span>
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  <a href={`mailto:${knowledge.supportEmail}`}>{knowledge.supportEmail}</a>
                </p>
              </div>
            )}
            {knowledge.supportPhone && (
              <div>
                <span className="text-gray-500 text-sm">Support Phone</span>
                <p className="font-medium text-gray-900 dark:text-white">{knowledge.supportPhone}</p>
              </div>
            )}
            {knowledge.wholesaleContact && (
              <div>
                <span className="text-gray-500 text-sm">Wholesale Contact</span>
                <p className="font-medium text-gray-900 dark:text-white">{knowledge.wholesaleContact}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certifications */}
      {knowledge.certifications.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">✅</span> Certifications
          </h4>
          <div className="flex flex-wrap gap-2">
            {knowledge.certifications.map((cert, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Product Categories */}
        {knowledge.productCategories.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📦</span> Product Categories
            </h4>
            <div className="flex flex-wrap gap-2">
              {knowledge.productCategories.map((cat, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brand Names */}
        {knowledge.brandNames.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🏷️</span> Brand Names
            </h4>
            <div className="flex flex-wrap gap-2">
              {knowledge.brandNames.map((brand, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manufacturing Locations */}
      {knowledge.manufacturingLocations.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">🏭</span> Manufacturing Locations
          </h4>
          <div className="flex flex-wrap gap-2">
            {knowledge.manufacturingLocations.map((loc, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm"
              >
                {loc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Distribution Info */}
      {knowledge.distributionInfo && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-xl">🚚</span> Distribution Information
          </h4>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{knowledge.distributionInfo}</p>
        </div>
      )}

      {/* Social Media */}
      {knowledge.socialMedia && Object.values(knowledge.socialMedia).some(v => v) && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">🔗</span> Social Media
          </h4>
          <div className="flex flex-wrap gap-3">
            {knowledge.socialMedia.facebook && (
              <a href={knowledge.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">Facebook</a>
            )}
            {knowledge.socialMedia.instagram && (
              <a href={knowledge.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm">Instagram</a>
            )}
            {knowledge.socialMedia.linkedin && (
              <a href={knowledge.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm">LinkedIn</a>
            )}
            {knowledge.socialMedia.twitter && (
              <a href={knowledge.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm">Twitter/X</a>
            )}
            {knowledge.socialMedia.youtube && (
              <a href={knowledge.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">YouTube</a>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Data scraped {formatDistanceToNow(new Date(knowledge.scrapedAt), { addSuffix: true })}
      </div>
    </div>
  );
}

function DocumentsView({ catalogProducts, shopifyProducts }: { catalogProducts: CatalogProduct[]; shopifyProducts: Product[] }) {
  // Filter products that have documents
  const productsWithDocs = catalogProducts.filter(cp => 
    cp.manualUrl || cp.specSheetUrl || cp.quickStartUrl || (cp.documents && cp.documents.length > 0)
  );

  // Get document type badge color and icon
  const getDocTypeStyle = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'manual':
        return { bg: 'bg-blue-600 hover:bg-blue-700', label: '📘 Manual' };
      case 'spec_sheet':
        return { bg: 'bg-purple-600 hover:bg-purple-700', label: '📊 Spec Sheet' };
      case 'quick_start':
        return { bg: 'bg-green-600 hover:bg-green-700', label: '⚡ Quick Start' };
      case 'brochure':
        return { bg: 'bg-orange-600 hover:bg-orange-700', label: '📄 Brochure' };
      default:
        return { bg: 'bg-gray-600 hover:bg-gray-700', label: '📎 Document' };
    }
  };

  if (productsWithDocs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Documents Found</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Scrape the manufacturer website to discover product manuals and documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Found {productsWithDocs.length} products with documentation
      </p>
      <div className="grid gap-4">
        {productsWithDocs.map((product) => {
          const matchedProduct = product.matchedProductId 
            ? shopifyProducts.find(p => p.id === product.matchedProductId)
            : null;

          // Collect all documents from various sources
          const allDocs: Array<{ name: string; url: string; type: string }> = [];
          
          // Add individual URL fields
          if (product.manualUrl) {
            allDocs.push({ name: 'User Manual', url: product.manualUrl, type: 'manual' });
          }
          if (product.specSheetUrl) {
            allDocs.push({ name: 'Spec Sheet', url: product.specSheetUrl, type: 'spec_sheet' });
          }
          if (product.quickStartUrl) {
            allDocs.push({ name: 'Quick Start Guide', url: product.quickStartUrl, type: 'quick_start' });
          }
          
          // Add documents from the documents array
          if (product.documents && Array.isArray(product.documents)) {
            product.documents.forEach(doc => {
              // Avoid duplicates
              if (!allDocs.some(d => d.url === doc.url)) {
                allDocs.push(doc);
              }
            });
          }

          return (
            <div key={product.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{product.name}</h4>
                    {product.modelNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Model: {product.modelNumber}</p>
                    )}
                    {matchedProduct && (
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Matched: {matchedProduct.name}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {allDocs.length} document{allDocs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Document Download Buttons */}
                <div className="flex flex-wrap gap-2">
                  {allDocs.map((doc, idx) => {
                    const style = getDocTypeStyle(doc.type);
                    return (
                      <a 
                        key={idx}
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`px-3 py-2 ${style.bg} text-white text-sm rounded-lg flex items-center gap-2 transition-colors`}
                        title={doc.name}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate max-w-[200px]">{doc.name || style.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


