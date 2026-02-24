
"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlayIcon, RefreshIcon, CheckIcon, ExclamationIcon, DatabaseIcon, GlobeIcon, ZapIcon, SettingsIcon } from '../icons';

interface ScrapingJob {
  id: string;
  status: string;
  jobType?: string;
  startedAt: string;
  completedAt?: string;
  progress: number;
  manufacturersFound: number;
  error?: string;
}

interface ScrapingStats {
  totalManufacturers: number;
  averageRating: number;
}

interface ScrapingResult {
  totalFound: number;
  newManufacturers?: number;
  updatedManufacturers?: number;
  manufacturers?: number;
  products?: number;
  message: string;
}

interface DiscoveryResult {
  id: string;
  name: string;
  previousUrl?: string;
  discoveredUrl?: string;
  validatedUrl?: string;
  validationStatus?: string;
  confidence?: string;
  reasoning?: string;
  brandType?: string;
  alternativeUrls?: string[];
  needsReview?: boolean;
  verificationDetails?: {
    brandMentioned: boolean;
    isPetRelated: boolean;
    pageTitle: string;
  };
  success: boolean;
  error?: string;
}

interface DiscoveryPreview {
  id: string;
  name: string;
  currentWebsite: string | null;
  sampleProducts: string[];
}

const ScraperDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [stats, setStats] = useState<ScrapingStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScrapingResult | null>(null);
  const [shopifyConfigured, setShopifyConfigured] = useState(false);
  
  // Website Discovery State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryPreview, setDiscoveryPreview] = useState<DiscoveryPreview[] | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[] | null>(null);
  const [discoveryStats, setDiscoveryStats] = useState<{ processed: number; success: number; failed: number; needsReview: number } | null>(null);
  const [discoveryLimit, setDiscoveryLimit] = useState(10);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/scrape');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const checkShopifyConfig = async () => {
    try {
      const response = await fetch('/api/settings?category=shopify');
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const hasRequiredSettings = result.data.some((setting: any) => 
          setting.key === 'shopify_access_token' && setting.value
        );
        setShopifyConfigured(hasRequiredSettings);
      } else {
        setShopifyConfigured(false);
      }
    } catch (error) {
      console.error('Error checking Shopify configuration:', error);
      setShopifyConfigured(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    checkShopifyConfig();
  }, []);

  const startScraping = async (type: 'full' | 'quick' | 'shopify' = 'full') => {
    setIsRunning(true);
    setCurrentResult(null);
    
    try {
      let endpoint = '/api/scrape';
      let payload: any = {};
      
      if (type === 'shopify') {
        endpoint = '/api/scrape-shopify';
        payload = {}; // Shopify endpoint doesn't need URL
      } else {
        payload.url = 'https://petstore.direct';
        if (type === 'quick') {
          payload.mode = 'quick';
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start scraping');
      }

      if (type === 'shopify') {
        // Shopify API returns immediate response
        const result = await response.json();
        if (result.success) {
          setCurrentResult({
            message: `Shopify sync completed successfully! Found ${result.data.manufacturersFound} manufacturers and ${result.data.productsFound} products.`,
            totalFound: result.data.manufacturersFound + result.data.productsFound,
            manufacturers: result.data.manufacturersFound,
            products: result.data.productsFound,
          });
          fetchJobs(); // Refresh jobs list
        } else {
          throw new Error(result.error || 'Shopify sync failed');
        }
        setIsRunning(false);
        return;
      }

      // Handle streaming response for web scraping
      if (!response?.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsRunning(false);
              fetchJobs(); // Refresh jobs list
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'completed') {
                setCurrentResult(parsed.result);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Scraping error:', error);
      setIsRunning(false);
      setCurrentResult({
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        totalFound: 0,
        manufacturers: 0,
        products: 0,
      });
    }
  };

  // Website Discovery Functions
  const previewDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryPreview(null);
    setDiscoveryResults(null);
    setDiscoveryStats(null);
    
    try {
      const response = await fetch(`/api/manufacturers/discover-website?limit=${discoveryLimit}&dryRun=true`);
      const result = await response.json();
      
      if (result.success) {
        setDiscoveryPreview(result.data.manufacturers);
      } else {
        console.error('Preview failed:', result.error);
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const runDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryPreview(null);
    setDiscoveryResults(null);
    setDiscoveryStats(null);
    
    try {
      const response = await fetch(`/api/manufacturers/discover-website?limit=${discoveryLimit}`);
      const result = await response.json();
      
      if (result.success) {
        setDiscoveryResults(result.data.results);
        setDiscoveryStats({
          processed: result.data.processed,
          success: result.data.successCount,
          failed: result.data.failedCount,
          needsReview: result.data.needsReviewCount || 0,
        });
        fetchJobs(); // Refresh to show updated manufacturer count
      } else {
        console.error('Discovery failed:', result.error);
      }
    } catch (error) {
      console.error('Discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const getConfidenceBadge = (confidence: string | undefined) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-red-100 text-red-800">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckIcon className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <ExclamationIcon className="w-4 h-4 text-red-600" />;
      case 'running':
        return <RefreshIcon className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <RefreshIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Data Scraper Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage data collection from multiple sources
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkShopifyConfig}
            className="flex items-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Check Config
          </Button>
        </div>
      </div>

      {/* Scraping Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Data Collection Sources</CardTitle>
          <CardDescription>
            Choose your preferred method to collect manufacturer and product data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!shopifyConfigured && (
            <Alert className="mb-6">
              <SettingsIcon className="h-4 w-4" />
              <AlertDescription>
                Configure your Shopify API credentials in{' '}
                <a href="/settings" className="text-blue-600 hover:underline font-medium">
                  Settings
                </a>{' '}
                to enable Shopify data sync.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => startScraping('full')}
              disabled={isRunning}
              className="h-24 flex flex-col items-center justify-center space-y-2"
              variant="default"
            >
              <GlobeIcon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold">Web Scraping</div>
                <div className="text-xs opacity-80">Scrape petstore.direct</div>
              </div>
            </Button>
            
            <Button
              onClick={() => startScraping('shopify')}
              disabled={isRunning || !shopifyConfigured}
              variant="outline"
              className={`h-24 flex flex-col items-center justify-center space-y-2 ${
                shopifyConfigured 
                  ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' 
                  : 'opacity-50'
              }`}
            >
              <DatabaseIcon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold">Shopify Sync</div>
                <div className="text-xs opacity-80">
                  {shopifyConfigured ? 'Import from Shopify API' : 'Configure API first'}
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => startScraping('quick')}
              disabled={isRunning}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2"
            >
              <ZapIcon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold">Quick Update</div>
                <div className="text-xs opacity-80">Refresh existing data</div>
              </div>
            </Button>
          </div>
          
          {isRunning && (
            <div className="flex items-center justify-center mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <RefreshIcon className="w-5 h-5 text-blue-600 animate-spin mr-3" />
              <span className="text-blue-700 dark:text-blue-300">
                Scraping in progress...
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <DatabaseIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Manufacturers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalManufacturers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Website Discovery Card */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Website Discovery (Phase 1)
          </CardTitle>
          <CardDescription>
            Use AI to automatically find official manufacturer websites from brand names
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Batch Size:
              </label>
              <select 
                value={discoveryLimit}
                onChange={(e) => setDiscoveryLimit(parseInt(e.target.value))}
                className="px-3 py-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
                disabled={isDiscovering}
              >
                <option value={5}>5 brands</option>
                <option value={10}>10 brands</option>
                <option value={25}>25 brands</option>
                <option value={50}>50 brands</option>
                <option value={100}>All remaining</option>
              </select>
            </div>
            
            <Button
              onClick={previewDiscovery}
              disabled={isDiscovering}
              variant="outline"
              size="sm"
            >
              {isDiscovering ? (
                <RefreshIcon className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
              Preview
            </Button>
            
            <Button
              onClick={runDiscovery}
              disabled={isDiscovering}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isDiscovering ? (
                <RefreshIcon className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              Run Discovery
            </Button>
          </div>

          {isDiscovering && (
            <div className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
              <RefreshIcon className="w-5 h-5 text-purple-600 animate-spin mr-3" />
              <span className="text-purple-700 dark:text-purple-300">
                Discovering websites using AI... This may take a moment.
              </span>
            </div>
          )}

          {/* Preview Results */}
          {discoveryPreview && discoveryPreview.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Manufacturers needing website discovery ({discoveryPreview.length}):
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {discoveryPreview.map((m) => (
                  <div key={m.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {m.currentWebsite ? 'Invalid URL' : 'No URL'}
                      </Badge>
                    </div>
                    {m.sampleProducts.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Products: {m.sampleProducts.slice(0, 2).join(', ')}
                        {m.sampleProducts.length > 2 && '...'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discovery Stats */}
          {discoveryStats && (
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800">
              <CheckIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertDescription>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-medium text-purple-800 dark:text-purple-200">
                    Discovery Complete
                  </span>
                  <Badge className="bg-gray-100 text-gray-800">{discoveryStats.processed} processed</Badge>
                  <Badge className="bg-green-100 text-green-800">{discoveryStats.success} auto-saved</Badge>
                  <Badge className="bg-amber-100 text-amber-800">{discoveryStats.needsReview} needs review</Badge>
                  <Badge className="bg-red-100 text-red-800">{discoveryStats.failed} failed</Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Discovery Results */}
          {discoveryResults && discoveryResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Discovery Results:
              </h4>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {discoveryResults.map((result) => (
                  <div 
                    key={result.id} 
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                        : result.needsReview
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{result.name}</span>
                      <div className="flex items-center gap-2">
                        {result.needsReview && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">Needs Review</Badge>
                        )}
                        {getConfidenceBadge(result.confidence)}
                        {result.success ? (
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        ) : result.needsReview ? (
                          <ExclamationIcon className="w-4 h-4 text-amber-600" />
                        ) : (
                          <ExclamationIcon className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    {(result.discoveredUrl || result.validatedUrl) && (
                      <a 
                        href={result.validatedUrl || result.discoveredUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <GlobeIcon className="w-3 h-3" />
                        {result.validatedUrl || result.discoveredUrl}
                        {result.success && <span className="text-green-600 ml-1">(saved)</span>}
                        {result.needsReview && <span className="text-amber-600 ml-1">(not saved - review needed)</span>}
                      </a>
                    )}
                    {/* Verification Details */}
                    {result.verificationDetails && (
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className={result.verificationDetails.brandMentioned ? 'text-green-600' : 'text-red-600'}>
                          {result.verificationDetails.brandMentioned ? '✓' : '✗'} Brand on page
                        </span>
                        <span className={result.verificationDetails.isPetRelated ? 'text-green-600' : 'text-gray-500'}>
                          {result.verificationDetails.isPetRelated ? '✓' : '○'} Pet-related
                        </span>
                        {result.verificationDetails.pageTitle && (
                          <span className="text-gray-500 truncate max-w-xs" title={result.verificationDetails.pageTitle}>
                            Title: {result.verificationDetails.pageTitle.substring(0, 40)}...
                          </span>
                        )}
                      </div>
                    )}
                    {result.reasoning && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {result.reasoning}
                      </p>
                    )}
                    {/* Alternative URLs */}
                    {result.alternativeUrls && result.alternativeUrls.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">Alternatives: </span>
                        {result.alternativeUrls.slice(0, 2).map((url, i) => (
                          <a 
                            key={i}
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline mr-2"
                          >
                            {new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    )}
                    {result.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Result */}
      {currentResult && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
          <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription>
            <div>
              <h4 className="text-green-800 dark:text-green-200 font-medium mb-1">
                Operation Completed Successfully
              </h4>
              <p className="text-green-700 dark:text-green-300 text-sm mb-2">
                {currentResult.message}
              </p>
              <div className="flex items-center space-x-4 text-sm text-green-600 dark:text-green-400">
                <span>Total Found: {currentResult.totalFound}</span>
                {currentResult.newManufacturers && <span>New: {currentResult.newManufacturers}</span>}
                {currentResult.updatedManufacturers && <span>Updated: {currentResult.updatedManufacturers}</span>}
                {currentResult.manufacturers && <span>Manufacturers: {currentResult.manufacturers}</span>}
                {currentResult.products && <span>Products: {currentResult.products}</span>}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Jobs History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Jobs</CardTitle>
            <Button
              onClick={fetchJobs}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <RefreshIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {job.jobType === 'shopify_sync' ? 'Shopify Sync' : 'Web Scraping'}
                        </span>
                        <Badge variant="outline" className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Started: {new Date(job.startedAt).toLocaleString()}
                        {job.completedAt && ` • Completed: ${new Date(job.completedAt).toLocaleString()}`}
                      </p>
                      {job.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Error: {job.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {job.manufacturersFound} manufacturers
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Progress: {job.progress}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No scraping jobs found. Start your first data collection job above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScraperDashboard;
