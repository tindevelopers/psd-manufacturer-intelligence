import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crawlWebsite, PDFDocument } from '@/lib/web-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 120 seconds for deep scraping

const COMPANY_EXTRACTION_PROMPT = `You are an expert data extractor. Analyze the following webpage content from a pet product manufacturer's website and extract all relevant business information.

Extract the following information if available:

1. COMPANY INFORMATION:
   - Company overview/about us description
   - Year founded
   - Headquarters location
   - Number of employees
   - Annual revenue (if mentioned)

2. CONTACT INFORMATION:
   - Sales email
   - Sales phone
   - Customer support email
   - Customer support phone
   - Wholesale/distributor contact

3. BUSINESS DETAILS:
   - Distribution information
   - Certifications (FDA, USDA Organic, AAFCO, etc.)
   - Manufacturing locations

4. PRODUCT INFORMATION:
   - Main product categories
   - Brand names they own
   - Approximate total product count

5. SOCIAL MEDIA:
   - Facebook URL
   - Instagram URL
   - LinkedIn URL
   - Twitter/X URL
   - YouTube URL

Respond in JSON format with the following structure:
{
  "companyOverview": "string or null",
  "foundedYear": "string or null",
  "headquarters": "string or null",
  "employeeCount": "string or null",
  "annualRevenue": "string or null",
  "salesEmail": "string or null",
  "salesPhone": "string or null",
  "supportEmail": "string or null",
  "supportPhone": "string or null",
  "wholesaleContact": "string or null",
  "distributionInfo": "string or null",
  "certifications": ["array of certification strings"],
  "manufacturingLocations": ["array of location strings"],
  "productCategories": ["array of category strings"],
  "brandNames": ["array of brand name strings"],
  "totalProductCount": number or null,
  "socialMedia": {
    "facebook": "url or null",
    "instagram": "url or null",
    "linkedin": "url or null",
    "twitter": "url or null",
    "youtube": "url or null"
  }
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

const PRODUCT_MATCHING_PROMPT = `You are an expert at matching product data between a manufacturer's catalog and a retailer's product list.

I have a list of products from the manufacturer's website (with PDF manuals/documentation) and a list of products from a Shopify store.

Your task: Match each manufacturer product to the most likely Shopify product based on:
1. Product name similarity
2. Model numbers / SKU patterns  
3. Product category/type

For each match, provide:
- The manufacturer product index
- The Shopify product ID that matches
- Confidence score (0.0 to 1.0)
- Match method used (name, sku, model, category)

IMPORTANT: Only match products you're confident about (>0.6 confidence). Skip uncertain matches.

Respond in JSON format:
{
  "matches": [
    {
      "manufacturerIndex": 0,
      "shopifyProductId": "product_id_here",
      "confidence": 0.85,
      "method": "name"
    }
  ]
}

Respond with raw JSON only.`;

interface ShopifyProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
}

interface ManufacturerProduct {
  name: string;
  url?: string;
  manualUrl?: string;
  documents?: PDFDocument[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const websiteUrl = body.websiteUrl;

    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: 'Website URL is required' },
        { status: 400 }
      );
    }

    // Verify manufacturer exists and get their Shopify products
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true, name: true, sku: true, category: true }
        }
      }
    });

    if (!manufacturer) {
      return NextResponse.json(
        { success: false, error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // Create scrape job
    const scrapeJob = await prisma.manufacturerScrapeJob.create({
      data: {
        manufacturerId: id,
        status: 'running',
      },
    });

    // Update manufacturer website if different
    if (manufacturer.website !== websiteUrl) {
      await prisma.manufacturer.update({
        where: { id },
        data: { website: websiteUrl },
      });
    }

    // Create or update knowledge record with pending status
    await prisma.manufacturerKnowledge.upsert({
      where: { manufacturerId: id },
      create: {
        manufacturerId: id,
        scrapingStatus: 'in_progress',
        sourceUrls: [websiteUrl],
      },
      update: {
        scrapingStatus: 'in_progress',
        sourceUrls: [websiteUrl],
      },
    });

    try {
      // STEP 1: Deep crawl the website (up to 20 pages)
      console.log(`Starting deep crawl of ${websiteUrl} for ${manufacturer.name}`);
      const crawlResult = await crawlWebsite(websiteUrl, 20);
      
      const successfulPages = crawlResult.pages.filter(p => p.success);
      if (successfulPages.length === 0) {
        throw new Error('Could not fetch any pages from the website');
      }

      // Combine content from all pages
      let combinedContent = successfulPages
        .map(p => `=== ${p.url} ===\n${p.content}`)
        .join('\n\n');

      // Truncate for LLM
      if (combinedContent.length > 80000) {
        combinedContent = combinedContent.substring(0, 80000) + '\n[Content truncated...]';
      }

      const scrapedUrls = successfulPages.map(p => p.url);

      // STEP 2: Extract company information using LLM
      console.log('Extracting company information...');
      const companyResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: COMPANY_EXTRACTION_PROMPT },
            { role: 'user', content: `Here is the webpage content from ${manufacturer.name}'s website:\n\n${combinedContent}` },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4000,
        }),
      });

      if (!companyResponse.ok) {
        throw new Error('Company extraction LLM API request failed');
      }

      const companyData = await companyResponse.json();
      const extractedCompany = JSON.parse(companyData.choices?.[0]?.message?.content || '{}');

      // Update manufacturer knowledge with company info
      await prisma.manufacturerKnowledge.update({
        where: { manufacturerId: id },
        data: {
          companyOverview: extractedCompany.companyOverview,
          foundedYear: extractedCompany.foundedYear,
          headquarters: extractedCompany.headquarters,
          employeeCount: extractedCompany.employeeCount,
          annualRevenue: extractedCompany.annualRevenue,
          salesEmail: extractedCompany.salesEmail,
          salesPhone: extractedCompany.salesPhone,
          supportEmail: extractedCompany.supportEmail,
          supportPhone: extractedCompany.supportPhone,
          wholesaleContact: extractedCompany.wholesaleContact,
          distributionInfo: extractedCompany.distributionInfo,
          certifications: extractedCompany.certifications || [],
          manufacturingLocations: extractedCompany.manufacturingLocations || [],
          productCategories: extractedCompany.productCategories || [],
          totalProductCount: extractedCompany.totalProductCount,
          brandNames: extractedCompany.brandNames || [],
          socialMedia: extractedCompany.socialMedia || {},
          rawScrapedData: {
            ...extractedCompany,
            pdfDocuments: crawlResult.allPDFs,
            productUrls: crawlResult.productUrls,
          },
          sourceUrls: scrapedUrls,
          scrapingStatus: 'completed',
          scrapedAt: new Date(),
        },
      });

      // STEP 3: Process PDFs and match with Shopify products
      let matchedProducts = 0;
      const catalogProducts: ManufacturerProduct[] = [];

      // Group PDFs by potential product name
      const pdfsByProduct = new Map<string, PDFDocument[]>();
      for (const pdf of crawlResult.allPDFs) {
        // Try to extract product name from PDF name/URL
        const productKey = pdf.name.toLowerCase()
          .replace(/manual|guide|spec|sheet|instruction|user|quick|start|pdf/gi, '')
          .trim();
        
        if (productKey.length > 2) {
          if (!pdfsByProduct.has(productKey)) {
            pdfsByProduct.set(productKey, []);
          }
          pdfsByProduct.get(productKey)!.push(pdf);
        }
      }

      // Create catalog products from PDFs
      for (const [productKey, pdfs] of pdfsByProduct.entries()) {
        const manualPdf = pdfs.find(p => p.type === 'manual');
        const specPdf = pdfs.find(p => p.type === 'spec_sheet');
        
        catalogProducts.push({
          name: productKey,
          manualUrl: manualPdf?.url,
          documents: pdfs,
        });
      }

      // STEP 4: Match catalog products with Shopify products using LLM
      if (catalogProducts.length > 0 && manufacturer.products.length > 0) {
        console.log(`Matching ${catalogProducts.length} catalog products with ${manufacturer.products.length} Shopify products...`);

        const matchingPrompt = `
MANUFACTURER PRODUCTS (from website):
${catalogProducts.slice(0, 50).map((p, i) => `${i}. ${p.name}`).join('\n')}

SHOPIFY PRODUCTS (from store):
${manufacturer.products.slice(0, 100).map(p => `ID: ${p.id} | Name: ${p.name} | SKU: ${p.sku || 'N/A'}`).join('\n')}

Match the manufacturer products to Shopify products. Be strict - only match when you're confident.`;

        try {
          const matchResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4.1-mini',
              messages: [
                { role: 'system', content: PRODUCT_MATCHING_PROMPT },
                { role: 'user', content: matchingPrompt },
              ],
              response_format: { type: 'json_object' },
              max_tokens: 4000,
            }),
          });

          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            const matchResult = JSON.parse(matchData.choices?.[0]?.message?.content || '{"matches":[]}');

            // Store matched catalog products
            for (const match of (matchResult.matches || [])) {
              const catalogProduct = catalogProducts[match.manufacturerIndex];
              if (!catalogProduct) continue;

              const manualDoc = catalogProduct.documents?.find(d => d.type === 'manual');
              const specDoc = catalogProduct.documents?.find(d => d.type === 'spec_sheet');
              const quickDoc = catalogProduct.documents?.find(d => d.type === 'quick_start');

              try {
                await prisma.manufacturerCatalogProduct.upsert({
                  where: {
                    manufacturerId_sku: {
                      manufacturerId: id,
                      sku: catalogProduct.name.substring(0, 50), // Use name as pseudo-sku
                    }
                  },
                  create: {
                    manufacturerId: id,
                    name: catalogProduct.name,
                    sku: catalogProduct.name.substring(0, 50),
                    productUrl: catalogProduct.url,
                    manualUrl: manualDoc?.url,
                    specSheetUrl: specDoc?.url,
                    quickStartUrl: quickDoc?.url,
                    documents: catalogProduct.documents as any,
                    matchedProductId: match.shopifyProductId,
                    matchConfidence: match.confidence,
                    matchMethod: match.method,
                  },
                  update: {
                    manualUrl: manualDoc?.url,
                    specSheetUrl: specDoc?.url,
                    quickStartUrl: quickDoc?.url,
                    documents: catalogProduct.documents as any,
                    matchedProductId: match.shopifyProductId,
                    matchConfidence: match.confidence,
                    matchMethod: match.method,
                  },
                });
                matchedProducts++;
              } catch (dbError) {
                console.error('Error saving catalog product:', dbError);
              }
            }
          }
        } catch (matchError) {
          console.error('Product matching error:', matchError);
        }
      }

      // Also store unmatched PDFs as catalog products
      for (const pdf of crawlResult.allPDFs.slice(0, 50)) {
        try {
          await prisma.manufacturerCatalogProduct.upsert({
            where: {
              manufacturerId_sku: {
                manufacturerId: id,
                sku: `pdf-${pdf.url.split('/').pop()?.substring(0, 40) || 'unknown'}`,
              }
            },
            create: {
              manufacturerId: id,
              name: pdf.name,
              sku: `pdf-${pdf.url.split('/').pop()?.substring(0, 40) || 'unknown'}`,
              manualUrl: pdf.type === 'manual' ? pdf.url : null,
              specSheetUrl: pdf.type === 'spec_sheet' ? pdf.url : null,
              quickStartUrl: pdf.type === 'quick_start' ? pdf.url : null,
              documents: [pdf] as any,
            },
            update: {
              name: pdf.name,
              manualUrl: pdf.type === 'manual' ? pdf.url : undefined,
              specSheetUrl: pdf.type === 'spec_sheet' ? pdf.url : undefined,
              quickStartUrl: pdf.type === 'quick_start' ? pdf.url : undefined,
            },
          });
        } catch (pdfError) {
          // Skip duplicates
        }
      }

      // Update manufacturer's lastScraped
      await prisma.manufacturer.update({
        where: { id },
        data: { lastScraped: new Date() },
      });

      // Update scrape job
      await prisma.manufacturerScrapeJob.update({
        where: { id: scrapeJob.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          pagesScraped: successfulPages.length,
          productsFound: matchedProducts,
          resultSummary: {
            pagesScraped: successfulPages.length,
            pdfsFound: crawlResult.allPDFs.length,
            productUrlsFound: crawlResult.productUrls.length,
            matchedProducts,
            extractedFields: Object.keys(extractedCompany).filter(k => extractedCompany[k] !== null && extractedCompany[k] !== ''),
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          jobId: scrapeJob.id,
          pagesScraped: successfulPages.length,
          pdfsFound: crawlResult.allPDFs.length,
          productUrlsFound: crawlResult.productUrls.length,
          matchedProducts,
          extracted: extractedCompany,
          pdfs: crawlResult.allPDFs.slice(0, 20), // Return first 20 PDFs
        },
      });

    } catch (scrapeError) {
      // Update job and knowledge with error
      await prisma.manufacturerScrapeJob.update({
        where: { id: scrapeJob.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: scrapeError instanceof Error ? scrapeError.message : 'Scraping failed',
        },
      });

      await prisma.manufacturerKnowledge.update({
        where: { manufacturerId: id },
        data: {
          scrapingStatus: 'failed',
        },
      });

      throw scrapeError;
    }

  } catch (error) {
    console.error('Error scraping manufacturer website:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to scrape website' },
      { status: 500 }
    );
  }
}
