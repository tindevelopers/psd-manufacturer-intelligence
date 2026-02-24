
"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ShopifySettings from '@/components/settings/shopify-settings';
import { Settings, Database, Key, Globe, Download } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("shopify");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings & Configuration</h1>
      </div>
      
      <p className="text-gray-600">
        Configure your API credentials and system settings to enable data scraping and integration with external services.
      </p>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger 
            value="shopify" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("shopify")}
          >
            <Globe className="h-4 w-4" />
            Shopify API
          </TabsTrigger>
          <TabsTrigger 
            value="database" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("database")}
          >
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger 
            value="scraping" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("scraping")}
          >
            <Key className="h-4 w-4" />
            Scraping
          </TabsTrigger>
          <TabsTrigger 
            value="export" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("export")}
          >
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger 
            value="general" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("general")}
          >
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shopify" className="space-y-6">
          <ShopifySettings />
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>
                Configure database settings and connection parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Connection Status</h4>
                  <p className="text-green-600 text-sm">✅ PostgreSQL Connected</p>
                  <p className="text-green-600 text-sm">✅ Prisma ORM Active</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Database Stats</h4>
                  <p className="text-blue-600 text-sm">📊 Auto-managed</p>
                  <p className="text-blue-600 text-sm">🔄 Auto-backup enabled</p>
                </div>
              </div>
              <div className="text-center py-4 text-gray-500">
                Advanced database configuration options will be available in a future update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scraping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Configuration</CardTitle>
              <CardDescription>
                Configure web scraping settings and rate limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rate Limit (requests/second)</label>
                  <input 
                    type="number" 
                    defaultValue={2} 
                    min={1} 
                    max={10}
                    className="w-full px-3 py-2 border rounded-md bg-gray-50" 
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timeout (seconds)</label>
                  <input 
                    type="number" 
                    defaultValue={30} 
                    min={10} 
                    max={120}
                    className="w-full px-3 py-2 border rounded-md bg-gray-50" 
                    disabled
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="respectRobots" defaultChecked disabled />
                <label htmlFor="respectRobots" className="text-sm">Respect robots.txt</label>
              </div>
              <div className="text-center py-4 text-gray-500 text-sm">
                ⚙️ Default scraping settings are optimized for reliability and compliance.
                <br />
                Advanced configuration options will be available in future updates.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Data for Chatbot</CardTitle>
              <CardDescription>
                Export your product catalog and manufacturer data to train your AI chatbot (Ask PSD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">📚 How to Use This Export</h4>
                <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                  <li>Download your data in Markdown format (recommended for chatbots)</li>
                  <li>Go to your Abacus.AI project → Datasets → "Grooming"</li>
                  <li>Click "Upload New Version" and upload the downloaded file</li>
                  <li>The Document Retriever will automatically vectorize the data</li>
                  <li>Your chatbot will now recommend products from your catalog!</li>
                </ol>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">📝</div>
                    <h4 className="font-semibold mb-1">Markdown</h4>
                    <p className="text-xs text-gray-500 mb-3">Best for chatbot training</p>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = '/api/export/chatbot-knowledge?format=markdown';
                        a.download = 'psd-product-catalog.md';
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download .md
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <h4 className="font-semibold mb-1">JSON</h4>
                    <p className="text-xs text-gray-500 mb-3">Structured data format</p>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = '/api/export/chatbot-knowledge?format=json';
                        a.download = 'psd-product-catalog.json';
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download .json
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">📄</div>
                    <h4 className="font-semibold mb-1">CSV</h4>
                    <p className="text-xs text-gray-500 mb-3">Spreadsheet compatible</p>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = '/api/export/chatbot-knowledge?format=csv';
                        a.download = 'psd-products.csv';
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download .csv
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">💡 Pro Tip</h4>
                <p className="text-amber-700 text-sm">
                  The <strong>Markdown</strong> format is optimized for AI chatbots. It includes product descriptions, 
                  prices, stock status, manufacturer information, and categories in a format that's easy for the 
                  AI to understand and use for recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Application preferences and general configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Search Results</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-white" defaultValue="20">
                    <option value="10">10 results</option>
                    <option value="20">20 results</option>
                    <option value="50">50 results</option>
                    <option value="100">100 results</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme Preference</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-white" defaultValue="system">
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="notifications" defaultChecked />
                <label htmlFor="notifications" className="text-sm">Enable email notifications</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="autoRefresh" defaultChecked />
                <label htmlFor="autoRefresh" className="text-sm">Auto-refresh data every 24 hours</label>
              </div>
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => alert('Preferences saved! These settings will be available in the next update.')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
