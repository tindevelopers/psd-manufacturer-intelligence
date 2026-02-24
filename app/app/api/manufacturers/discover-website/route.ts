import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow longer for batch operations

// Prompt for analyzing search results and selecting the best website
const WEBSITE_ANALYSIS_PROMPT = `You are an expert at identifying official manufacturer websites for pet grooming and pet care product brands.

You will be given:
1. A brand/manufacturer name
2. Web search results with URLs and snippets
3. Optional: Content verification results from candidate websites

Your task is to analyze the data and identify the OFFICIAL corporate website.

CRITICAL RULES:
1. The official website MUST mention the brand name on its homepage
2. NEVER return reseller sites (Amazon, Chewy, PetSmart, Walmart, eBay, etc.)
3. NEVER return distributor sites or wholesaler sites  
4. NEVER return review sites, blog posts, or news articles
5. NEVER return social media pages (Facebook, Instagram, LinkedIn, etc.)
6. If the content verification shows the brand name is NOT on the homepage, mark confidence as "low"
7. Prefer .com domains, but accept country-specific domains (.co.uk, .de, etc.) for international brands
8. The domain should ideally contain the brand name or a close variant

Respond with ONLY a JSON object:
{
  "website": "https://example.com" or null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "Detailed explanation of your decision",
  "brandType": "manufacturer" | "private_label" | "unknown",
  "alternativeUrls": ["other potential URLs if found"],
  "needsReview": true/false (set true if confidence is low or uncertain)
}`;

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

interface WebsiteCandidate {
  url: string;
  source: 'search' | 'llm_guess';
  title?: string;
  snippet?: string;
  contentVerification?: {
    brandMentioned: boolean;
    isPetRelated: boolean;
    pageTitle: string;
    metaDescription: string;
  };
}

// Perform web search using LLM with web search capability
async function performWebSearch(brandName: string, productContext?: string): Promise<SearchResult[]> {
  try {
    const searchQuery = `"${brandName}" official website pet grooming manufacturer`;
    
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a web search assistant. Search for the official website of the given brand and return the search results.
            
Return ONLY a JSON array of search results in this format:
[
  {"url": "https://...", "title": "Page Title", "snippet": "Brief description"},
  ...
]

Include up to 5 most relevant results. Focus on finding:
1. The brand's official .com or corporate website
2. The brand's official product pages
3. About pages or company information

DO NOT include Amazon, eBay, Chewy, PetSmart, or other reseller links.
Return ONLY the JSON array, no other text.`
          },
          { 
            role: 'user', 
            content: `Search for: ${searchQuery}${productContext ? `\n\nContext: This brand makes pet grooming products like: ${productContext}` : ''}` 
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        // Enable web search if available
        web_search: true,
      }),
    });

    if (!response.ok) {
      console.error('Web search API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in search response');
      return [];
    }
    
    const results = JSON.parse(jsonMatch[0]);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

// Fetch and verify website content
async function verifyWebsiteContent(url: string, brandName: string): Promise<{
  valid: boolean;
  finalUrl?: string;
  brandMentioned: boolean;
  isPetRelated: boolean;
  pageTitle: string;
  metaDescription: string;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { 
        valid: false, 
        brandMentioned: false, 
        isPetRelated: false, 
        pageTitle: '', 
        metaDescription: '',
        error: `HTTP ${response.status}` 
      };
    }
    
    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    const lowerBrand = brandName.toLowerCase();
    
    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDescription = metaMatch ? metaMatch[1].trim() : '';
    
    // Check if brand name is mentioned (allowing for variations)
    const brandVariations = [
      lowerBrand,
      lowerBrand.replace(/\s+/g, ''),
      lowerBrand.replace(/[^a-z0-9]/g, ''),
    ];
    const brandMentioned = brandVariations.some(variant => 
      lowerHtml.includes(variant) || pageTitle.toLowerCase().includes(variant)
    );
    
    // Check for pet-related keywords
    const petKeywords = ['pet', 'dog', 'cat', 'grooming', 'animal', 'veterinary', 'vet', 'canine', 'feline', 'clipper', 'shear', 'blade'];
    const isPetRelated = petKeywords.some(keyword => lowerHtml.includes(keyword));
    
    return {
      valid: true,
      finalUrl: response.url,
      brandMentioned,
      isPetRelated,
      pageTitle,
      metaDescription,
    };
  } catch (error) {
    return { 
      valid: false, 
      brandMentioned: false, 
      isPetRelated: false, 
      pageTitle: '', 
      metaDescription: '',
      error: error instanceof Error ? error.message : 'Verification failed' 
    };
  }
}

// Analyze candidates and select the best website
async function analyzeAndSelectWebsite(
  brandName: string, 
  candidates: WebsiteCandidate[],
  productContext?: string
): Promise<{
  website: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  brandType: string;
  alternativeUrls: string[];
  needsReview: boolean;
}> {
  try {
    // Build context for LLM analysis
    const candidateInfo = candidates.map((c, i) => {
      let info = `${i + 1}. URL: ${c.url}`;
      if (c.title) info += `\n   Title: ${c.title}`;
      if (c.snippet) info += `\n   Snippet: ${c.snippet}`;
      if (c.contentVerification) {
        info += `\n   Content Verification:`;
        info += `\n   - Brand "${brandName}" mentioned on page: ${c.contentVerification.brandMentioned ? 'YES' : 'NO'}`;
        info += `\n   - Pet/grooming related content: ${c.contentVerification.isPetRelated ? 'YES' : 'NO'}`;
        info += `\n   - Page title: ${c.contentVerification.pageTitle}`;
      }
      return info;
    }).join('\n\n');

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: WEBSITE_ANALYSIS_PROMPT },
          { 
            role: 'user', 
            content: `Find the official website for this pet product brand:

Brand Name: ${brandName}
${productContext ? `Product Context: ${productContext}` : ''}

Candidate Websites Found:
${candidateInfo || 'No candidates found from web search.'}

Based on this information, determine the official website. If no suitable candidate is found or confidence is low, recommend manual review.`
          }
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      website: result.website || null,
      confidence: result.confidence || 'low',
      reasoning: result.reasoning || 'Unknown',
      brandType: result.brandType || 'unknown',
      alternativeUrls: result.alternativeUrls || [],
      needsReview: result.needsReview ?? (result.confidence === 'low'),
    };
  } catch (error) {
    console.error(`Error analyzing website for ${brandName}:`, error);
    return {
      website: null,
      confidence: 'low',
      reasoning: error instanceof Error ? error.message : 'Analysis failed',
      brandType: 'unknown',
      alternativeUrls: [],
      needsReview: true,
    };
  }
}

// Main discovery function with improved methodology
async function discoverWebsiteImproved(brandName: string, context?: string): Promise<{
  website: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  brandType: string;
  alternativeUrls: string[];
  needsReview: boolean;
  searchResults: SearchResult[];
  verificationDetails?: {
    brandMentioned: boolean;
    isPetRelated: boolean;
    pageTitle: string;
  };
}> {
  console.log(`[Discovery] Starting improved discovery for: ${brandName}`);
  
  // Step 1: Perform web search
  console.log(`[Discovery] Step 1: Web search...`);
  const searchResults = await performWebSearch(brandName, context);
  console.log(`[Discovery] Found ${searchResults.length} search results`);
  
  // Step 2: Build candidate list from search results
  const candidates: WebsiteCandidate[] = searchResults.map(r => ({
    url: r.url,
    source: 'search' as const,
    title: r.title,
    snippet: r.snippet,
  }));
  
  // Step 3: Verify top candidates (up to 3)
  console.log(`[Discovery] Step 2: Verifying top candidates...`);
  const topCandidates = candidates.slice(0, 3);
  
  for (const candidate of topCandidates) {
    try {
      const verification = await verifyWebsiteContent(candidate.url, brandName);
      if (verification.valid) {
        candidate.contentVerification = {
          brandMentioned: verification.brandMentioned,
          isPetRelated: verification.isPetRelated,
          pageTitle: verification.pageTitle,
          metaDescription: verification.metaDescription,
        };
        if (verification.finalUrl && verification.finalUrl !== candidate.url) {
          candidate.url = verification.finalUrl;
        }
      }
    } catch (error) {
      console.error(`[Discovery] Verification error for ${candidate.url}:`, error);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Step 4: Analyze and select best website
  console.log(`[Discovery] Step 3: Analyzing candidates...`);
  const analysis = await analyzeAndSelectWebsite(brandName, candidates, context);
  
  // Step 5: Final verification if we have a selected website
  let verificationDetails;
  if (analysis.website && analysis.confidence !== 'low') {
    const existingVerification = candidates.find(c => c.url === analysis.website)?.contentVerification;
    if (existingVerification) {
      verificationDetails = {
        brandMentioned: existingVerification.brandMentioned,
        isPetRelated: existingVerification.isPetRelated,
        pageTitle: existingVerification.pageTitle,
      };
      
      // Downgrade confidence if brand not mentioned
      if (!existingVerification.brandMentioned) {
        console.log(`[Discovery] Warning: Brand not found on selected website, downgrading confidence`);
        analysis.confidence = 'low';
        analysis.needsReview = true;
        analysis.reasoning += ` WARNING: Brand name "${brandName}" was not found on the website homepage.`;
      }
    }
  }
  
  console.log(`[Discovery] Complete. Result: ${analysis.website || 'none'} (${analysis.confidence})`);
  
  return {
    ...analysis,
    searchResults,
    verificationDetails,
  };
}

// Legacy function for backward compatibility
async function validateWebsite(url: string): Promise<{ valid: boolean; finalUrl?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    clearTimeout(timeout);
    
    if (response.ok || response.status === 405) {
      return { valid: true, finalUrl: response.url };
    }
    
    return { valid: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    };
  }
}

// POST - Discover website for a single manufacturer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manufacturerId, brandName } = body;
    
    if (!manufacturerId && !brandName) {
      return NextResponse.json(
        { success: false, error: 'manufacturerId or brandName required' },
        { status: 400 }
      );
    }
    
    let manufacturer = null;
    let name = brandName;
    
    if (manufacturerId) {
      manufacturer = await prisma.manufacturer.findUnique({
        where: { id: manufacturerId },
        include: { products: { take: 5, select: { name: true, category: true } } }
      });
      
      if (!manufacturer) {
        return NextResponse.json(
          { success: false, error: 'Manufacturer not found' },
          { status: 404 }
        );
      }
      
      name = manufacturer.name;
    }
    
    // Build context from products if available
    const context = manufacturer?.products?.length 
      ? `Sample products: ${manufacturer.products.map(p => p.name).join(', ')}`
      : undefined;
    
    // Use improved discovery with web search and content verification
    console.log(`[API] Starting improved discovery for: ${name}`);
    const discovery = await discoverWebsiteImproved(name, context);
    
    let updated = false;
    
    // Only auto-update if confidence is high or medium AND not marked for review
    if (discovery.website && manufacturer && !discovery.needsReview && discovery.confidence !== 'low') {
      await prisma.manufacturer.update({
        where: { id: manufacturer.id },
        data: { 
          website: discovery.website,
          updatedAt: new Date(),
        }
      });
      updated = true;
      console.log(`[API] Auto-updated website for ${name}: ${discovery.website}`);
    } else if (discovery.needsReview) {
      console.log(`[API] Website needs manual review for ${name}: ${discovery.website || 'none found'}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        brandName: name,
        manufacturerId: manufacturer?.id,
        discoveredUrl: discovery.website,
        validatedUrl: discovery.website,
        confidence: discovery.confidence,
        reasoning: discovery.reasoning,
        brandType: discovery.brandType,
        alternativeUrls: discovery.alternativeUrls,
        needsReview: discovery.needsReview,
        searchResultsCount: discovery.searchResults.length,
        verificationDetails: discovery.verificationDetails,
        updated,
      }
    });
    
  } catch (error) {
    console.error('Error in website discovery:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}

// GET - Batch discover websites for all manufacturers without valid URLs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const dryRun = searchParams.get('dryRun') === 'true';
    
    // Find manufacturers that need website discovery
    // (website is null, empty, or points to the Shopify store)
    const manufacturers = await prisma.manufacturer.findMany({
      where: {
        OR: [
          { website: null },
          { website: '' },
          { website: { contains: 'myshopify.com' } },
          { website: { contains: 'petstoredirect' } },
        ]
      },
      include: {
        products: { take: 5, select: { name: true, category: true } }
      },
      take: limit,
      orderBy: { name: 'asc' }
    });
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: {
          totalToProcess: manufacturers.length,
          manufacturers: manufacturers.map(m => ({
            id: m.id,
            name: m.name,
            currentWebsite: m.website,
            sampleProducts: m.products.map(p => p.name),
          }))
        }
      });
    }
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let needsReviewCount = 0;
    
    for (const manufacturer of manufacturers) {
      try {
        // Add delay to avoid rate limiting (longer for improved discovery)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const context = manufacturer.products.length 
          ? `Sample products: ${manufacturer.products.map(p => p.name).join(', ')}`
          : undefined;
        
        console.log(`[Batch] Processing: ${manufacturer.name}`);
        
        // Use improved discovery
        const discovery = await discoverWebsiteImproved(manufacturer.name, context);
        
        let updated = false;
        
        // Only auto-update if confidence is high/medium AND not marked for review
        if (discovery.website && !discovery.needsReview && discovery.confidence !== 'low') {
          await prisma.manufacturer.update({
            where: { id: manufacturer.id },
            data: { 
              website: discovery.website,
              updatedAt: new Date(),
            }
          });
          updated = true;
          successCount++;
        } else if (discovery.needsReview || discovery.confidence === 'low') {
          needsReviewCount++;
        } else {
          failedCount++;
        }
        
        results.push({
          id: manufacturer.id,
          name: manufacturer.name,
          previousUrl: manufacturer.website,
          discoveredUrl: discovery.website,
          validatedUrl: updated ? discovery.website : null,
          confidence: discovery.confidence,
          reasoning: discovery.reasoning,
          brandType: discovery.brandType,
          alternativeUrls: discovery.alternativeUrls,
          needsReview: discovery.needsReview,
          verificationDetails: discovery.verificationDetails,
          success: updated,
        });
        
      } catch (error) {
        console.error(`Error processing ${manufacturer.name}:`, error);
        failedCount++;
        results.push({
          id: manufacturer.id,
          name: manufacturer.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        processed: manufacturers.length,
        successCount,
        failedCount,
        needsReviewCount,
        results,
      }
    });
    
  } catch (error) {
    console.error('Error in batch website discovery:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Batch discovery failed' },
      { status: 500 }
    );
  }
}
