"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface ShopifyCredentials {
  shopName: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
}

interface SettingData {
  key: string;
  value: string;
  category: string;
  description: string;
  isEncrypted: boolean;
  updatedAt: string;
}

const ShopifySettingsInner: React.FC = () => {
  const searchParams = useSearchParams();
  
  const [credentials, setCredentials] = useState<ShopifyCredentials>({
    shopName: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [showSecrets, setShowSecrets] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success) {
      toast({
        title: "Success",
        description: success,
      });
      setConnectionStatus('success');
      setIsConnected(true);
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
    }
    
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      setConnectionStatus('error');
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  // Load existing settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings?category=shopify');
      const result = await response.json();
      
      if (result.success && result.data) {
        const settingsMap: Record<string, string> = {};
        let latestUpdate = '';
        
        result.data.forEach((setting: SettingData) => {
          const key = setting.key.replace('shopify_', '');
          settingsMap[key] = setting.value || '';
          if (setting.updatedAt > latestUpdate) {
            latestUpdate = setting.updatedAt;
          }
        });
        
        setCredentials({
          shopName: settingsMap.shop_name || '',
          apiKey: settingsMap.api_key || '',
          apiSecret: settingsMap.api_secret || '',
          accessToken: settingsMap.access_token || '',
        });
        
        // Check if we have a valid access token
        if (settingsMap.access_token) {
          setIsConnected(true);
          setConnectionStatus('success');
        }
        
        if (latestUpdate) {
          setLastUpdated(new Date(latestUpdate).toLocaleString());
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load Shopify settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        {
          key: 'shopify_shop_name',
          value: credentials.shopName,
          category: 'shopify',
          description: 'Shopify store name',
          isEncrypted: false,
        },
        {
          key: 'shopify_api_key',
          value: credentials.apiKey,
          category: 'shopify',
          description: 'Shopify Client ID (API Key)',
          isEncrypted: true,
        },
        {
          key: 'shopify_api_secret',
          value: credentials.apiSecret,
          category: 'shopify',
          description: 'Shopify Client Secret',
          isEncrypted: true,
        },
      ];

      for (const setting of settingsToSave) {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(setting),
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${setting.key}`);
        }
      }

      toast({
        title: "Success",
        description: "Shopify credentials saved. Now click 'Connect to Shopify' to authorize.",
      });
      
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save Shopify settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const connectToShopify = async () => {
    if (!credentials.shopName || !credentials.apiKey || !credentials.apiSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter Shop Name, Client ID, and Client Secret",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: credentials.shopName,
          clientId: credentials.apiKey,
          clientSecret: credentials.apiSecret,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus('success');
        setIsConnected(true);
        setLastUpdated(new Date().toLocaleString());
        toast({
          title: "Connected Successfully!",
          description: result.message || `Connected to ${result.shop?.name}`,
        });
        // Reload settings to get the new access token
        loadSettings();
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to Shopify",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const disconnectShopify = async () => {
    try {
      // Delete access token
      await fetch('/api/settings?key=shopify_access_token', {
        method: 'DELETE',
      });
      
      setCredentials(prev => ({ ...prev, accessToken: '' }));
      setIsConnected(false);
      setConnectionStatus('unknown');
      
      toast({
        title: "Disconnected",
        description: "Shopify connection has been removed",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from Shopify",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    if (!credentials.shopName || !credentials.accessToken) {
      toast({
        title: "Missing Credentials",
        description: "Shop name and access token are required to test connection",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('/api/test-shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: credentials.shopName,
          accessToken: credentials.accessToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus('success');
        toast({
          title: "Connection Successful",
          description: `Connected to ${result.data?.shop || 'your Shopify store'}`,
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to your Shopify store",
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: "An error occurred while testing the connection",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleInputChange = (field: keyof ShopifyCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const canConnect = credentials.shopName && credentials.apiKey && credentials.apiSecret;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Shopify API Configuration
              {isConnected && connectionStatus === 'success' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
              {connectionStatus === 'error' && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect to your Shopify store to sync products and manufacturer data
            </CardDescription>
          </div>
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connected State */}
        {isConnected ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Connected to Shopify!</strong>
              <br />
              Store: <code className="bg-green-100 px-1 rounded">{credentials.shopName}.myshopify.com</code>
              <br />
              <span className="text-sm text-green-600">
                You can now sync products and manufacturers from the Scraper page.
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Shopify Dev Dashboard Connection (Updated Jan 2026)</strong>
              <br />
              <br />
              <strong>Step 1:</strong> Get your credentials from the Shopify Partners Dashboard:
              <br />
              • Go to <a href="https://partners.shopify.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">partners.shopify.com <ExternalLink className="w-3 h-3" /></a>
              <br />
              • Navigate to: Apps → Your App → Client credentials
              <br />
              • Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> (starts with <code className="bg-gray-100 px-1 rounded">shpss_</code>)
              <br />
              <br />
              <strong>Step 2:</strong> Enter your credentials below and click "Connect to Shopify"
              <br />
              <span className="text-sm text-gray-600">
                The connection uses Client Credentials Grant - no redirect or browser popup needed.
                Access tokens expire in ~24 hours and will auto-refresh.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Credentials Form */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name *</Label>
            <Input
              id="shopName"
              placeholder="your-store-name (without .myshopify.com)"
              value={credentials.shopName}
              onChange={(e) => handleInputChange('shopName', e.target.value)}
              disabled={isConnected}
            />
            <p className="text-xs text-gray-500">
              Example: if your store is "mystore.myshopify.com", enter "mystore"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Client ID (API Key) *</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showSecrets ? 'text' : 'password'}
                placeholder="Your Shopify Client ID"
                value={credentials.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                disabled={isConnected}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">Client Secret *</Label>
            <Input
              id="apiSecret"
              type={showSecrets ? 'text' : 'password'}
              placeholder="Your Shopify Client Secret"
              value={credentials.apiSecret}
              onChange={(e) => handleInputChange('apiSecret', e.target.value)}
              disabled={isConnected}
            />
          </div>

          {/* Show access token status if connected */}
          {isConnected && (
            <div className="space-y-2">
              <Label>Access Token</Label>
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700 text-sm">Access token obtained via OAuth</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!isConnected ? (
            <>
              <Button
                onClick={saveSettings}
                disabled={saving || !credentials.shopName || !credentials.apiKey || !credentials.apiSecret}
                variant="outline"
                className="min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Credentials'
                )}
              </Button>
              
              <Button
                onClick={connectToShopify}
                disabled={!canConnect || saving}
                className="min-w-[180px] bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Connect to Shopify
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={testConnection}
                disabled={testingConnection}
                variant="outline"
                className="min-w-[140px]"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              
              <Button
                onClick={disconnectShopify}
                variant="destructive"
                className="min-w-[140px]"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
        
        {!canConnect && !isConnected && (
          <p className="text-sm text-amber-600">
            ⚠️ Please fill in Shop Name, Client ID, and Client Secret to connect.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Wrap with Suspense to handle useSearchParams
const ShopifySettings: React.FC = () => {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    }>
      <ShopifySettingsInner />
    </Suspense>
  );
};

export default ShopifySettings;
