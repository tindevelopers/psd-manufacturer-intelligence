
"use client";
import React, { useState } from "react";
import { SearchIcon, FilterIcon, ExternalLinkIcon, StarIcon, BotIcon } from "../icons";

interface Manufacturer {
  id: string;
  name: string;
  description: string;
  website?: string;
  rating?: number;
  category?: string;
  location?: string;
  products?: string[];
}

interface SearchResult {
  manufacturers: Manufacturer[];
  total: number;
  searchQuery: string;
}

const ManufacturerSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"basic" | "ai">("basic");
  const [progress, setProgress] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery?.trim()) return;

    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          query: searchQuery,
          searchType 
        }),
      });

      if (!response?.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let partialRead = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split("\n");
        partialRead = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === "processing") {
                setProgress((prev) => Math.min(prev + 10, 90));
              } else if (parsed?.status === "completed") {
                setResults(parsed?.result ?? null);
                setProgress(100);
                setLoading(false);
                return;
              } else if (parsed?.status === "error") {
                throw new Error(parsed?.message || "Search failed");
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults(null);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const renderRating = (rating?: number) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key="half" className="w-4 h-4 fill-yellow-200 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          ({rating?.toFixed(1)})
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Search Manufacturers
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Find pet product manufacturers from the petstore.direct directory
          </p>
        </div>

        {/* Search Type Toggle */}
        <div className="mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSearchType("basic")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === "basic"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <SearchIcon className="w-4 h-4 mr-2 inline" />
              Basic Search
            </button>
            <button
              onClick={() => setSearchType("ai")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === "ai"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <BotIcon className="w-4 h-4 mr-2 inline" />
              AI Search
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchType === "ai"
                  ? "Describe what you're looking for (e.g., 'dog food manufacturers with organic options')"
                  : "Enter manufacturer name, product type, or keywords..."
              }
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <FilterIcon className="w-4 h-4" />
              <span>Advanced Filters</span>
            </button>

            <button
              type="submit"
              disabled={loading || !searchQuery?.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Progress Bar */}
        {loading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Analyzing manufacturer database...
            </p>
          </div>
        )}
      </div>

      {/* Search Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search Results
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {results?.total ?? 0} manufacturers found for "{results?.searchQuery}"
            </span>
          </div>

          <div className="grid gap-4">
            {results?.manufacturers?.map((manufacturer) => (
              <div
                key={manufacturer?.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {manufacturer?.name}
                    </h4>
                    
                    {manufacturer?.rating && (
                      <div className="mb-2">{renderRating(manufacturer.rating)}</div>
                    )}
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {manufacturer?.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {manufacturer?.category && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded text-xs font-medium">
                          {manufacturer.category}
                        </span>
                      )}
                      {manufacturer?.location && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded text-xs">
                          {manufacturer.location}
                        </span>
                      )}
                    </div>

                    {manufacturer?.products && manufacturer.products.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Product Categories:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {manufacturer.products.slice(0, 4).map((product, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded text-xs"
                            >
                              {product}
                            </span>
                          ))}
                          {manufacturer.products.length > 4 && (
                            <span className="text-xs text-gray-500">
                              +{manufacturer.products.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {manufacturer?.website && (
                      <a
                        href={manufacturer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                      >
                        <ExternalLinkIcon className="w-4 h-4" />
                        <span>Visit Site</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {results?.manufacturers?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No manufacturers found for your search query.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try different keywords or use AI search for better results.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManufacturerSearch;
