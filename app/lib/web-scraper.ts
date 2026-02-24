// Web scraper utility for fetching webpage content

export interface ScrapedPage {
  url: string;
  success: boolean;
  content?: string;
  html?: string;
  error?: string;
}

export interface PDFDocument {
  name: string;
  url: string;
  type: 'manual' | 'spec_sheet' | 'quick_start' | 'brochure' | 'other';
  productName?: string;
}

export interface DiscoveredLinks {
  productUrls: string[];
  supportUrls: string[];
  downloadUrls: string[];
  pdfDocuments: PDFDocument[];
}

export async function fetchWebpageContent(url: string): Promise<{ success: boolean; content?: string; html?: string; error?: string }> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { success: false, error: 'Invalid URL protocol' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const html = await response.text();
    
    // Extract meaningful text content (strip HTML but keep structure hints)
    const cleanedContent = extractTextContent(html);
    
    return { success: true, content: cleanedContent, html };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch webpage' };
  }
}

function extractTextContent(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Convert certain tags to indicate structure
  text = text.replace(/<h[1-6][^>]*>/gi, '\n### ');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<br[^>]*>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n- ');
  text = text.replace(/<\/li>/gi, '');
  text = text.replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  // Limit content length for LLM (roughly 50k chars)
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '\n\n[Content truncated...]';
  }
  
  return text;
}

// Discover all important links from HTML
export function discoverLinks(html: string, baseUrl: string): DiscoveredLinks {
  const productUrls = new Set<string>();
  const supportUrls = new Set<string>();
  const downloadUrls = new Set<string>();
  const pdfDocuments: PDFDocument[] = [];
  
  const baseHost = new URL(baseUrl).host;
  
  // Find all links
  const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  
  while ((match = linkPattern.exec(html)) !== null) {
    let href = match[1];
    const linkText = match[2].toLowerCase().trim();
    
    // Skip empty, javascript, mailto, tel links
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || 
        href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }
    
    // Convert relative to absolute URL
    try {
      if (href.startsWith('/')) {
        href = new URL(href, baseUrl).href;
      } else if (!href.startsWith('http')) {
        href = new URL(href, baseUrl).href;
      }
      
      // Only include same-domain links (except PDFs)
      const linkHost = new URL(href).host;
      const isPDF = href.toLowerCase().endsWith('.pdf');
      
      if (linkHost !== baseHost && !isPDF) continue;
      
      // Categorize the link
      const hrefLower = href.toLowerCase();
      
      // PDF Documents
      if (isPDF) {
        const docType = categorizePDF(href, linkText);
        pdfDocuments.push({
          name: extractPDFName(href, linkText),
          url: href,
          type: docType,
        });
        continue;
      }
      
      // Product pages
      if (hrefLower.includes('/product') || hrefLower.includes('/item/') ||
          hrefLower.includes('/shop/') || hrefLower.includes('/p/') ||
          hrefLower.includes('/catalog/') || hrefLower.includes('/collections/')) {
        productUrls.add(href);
      }
      
      // Support/Help pages
      if (hrefLower.includes('/support') || hrefLower.includes('/help') ||
          hrefLower.includes('/service') || hrefLower.includes('/faq') ||
          hrefLower.includes('/resources') || hrefLower.includes('/manuals')) {
        supportUrls.add(href);
      }
      
      // Download pages
      if (hrefLower.includes('/download') || hrefLower.includes('/docs') ||
          hrefLower.includes('/documentation') || hrefLower.includes('/library') ||
          hrefLower.includes('/files') || hrefLower.includes('/literature')) {
        downloadUrls.add(href);
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  return {
    productUrls: Array.from(productUrls).slice(0, 100),
    supportUrls: Array.from(supportUrls).slice(0, 30),
    downloadUrls: Array.from(downloadUrls).slice(0, 30),
    pdfDocuments: pdfDocuments.slice(0, 100),
  };
}

function categorizePDF(url: string, linkText: string): PDFDocument['type'] {
  const combined = (url + ' ' + linkText).toLowerCase();
  
  if (combined.includes('manual') || combined.includes('user guide') || combined.includes('instruction')) {
    return 'manual';
  }
  if (combined.includes('spec') || combined.includes('specification') || combined.includes('datasheet') || combined.includes('data sheet')) {
    return 'spec_sheet';
  }
  if (combined.includes('quick') || combined.includes('start') || combined.includes('setup')) {
    return 'quick_start';
  }
  if (combined.includes('brochure') || combined.includes('catalog') || combined.includes('flyer')) {
    return 'brochure';
  }
  return 'other';
}

function extractPDFName(url: string, linkText: string): string {
  if (linkText && linkText.length > 3 && linkText.length < 100) {
    return linkText.trim();
  }
  // Extract from URL
  const filename = url.split('/').pop()?.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') || 'Document';
  return filename.substring(0, 100);
}

// Crawl multiple pages and aggregate content
export async function crawlWebsite(baseUrl: string, maxPages: number = 20): Promise<{
  pages: ScrapedPage[];
  allPDFs: PDFDocument[];
  productUrls: string[];
}> {
  const visited = new Set<string>();
  const pages: ScrapedPage[] = [];
  const allPDFs: PDFDocument[] = [];
  const allProductUrls = new Set<string>();
  
  // Normalize base URL
  const normalizedBase = baseUrl.replace(/\/$/, '');
  
  // Priority URLs to crawl (in order)
  const priorityPaths = [
    '', // Main page
    '/products',
    '/all-products',
    '/shop',
    '/support',
    '/support/downloads',
    '/downloads',
    '/resources',
    '/manuals',
    '/documentation',
    '/about',
    '/about-us',
    '/contact',
    '/contact-us',
  ];
  
  const urlsToVisit: string[] = priorityPaths.map(p => normalizedBase + p);
  
  console.log(`Starting crawl of ${normalizedBase}, max ${maxPages} pages`);
  
  while (urlsToVisit.length > 0 && pages.length < maxPages) {
    const url = urlsToVisit.shift()!;
    
    // Skip if already visited
    const normalizedUrl = url.replace(/\/$/, '').toLowerCase();
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);
    
    console.log(`Crawling (${pages.length + 1}/${maxPages}): ${url}`);
    
    try {
      const result = await fetchWebpageContent(url);
      
      if (result.success && result.html) {
        pages.push({
          url,
          success: true,
          content: result.content,
          html: result.html,
        });
        
        // Discover links from this page
        const links = discoverLinks(result.html, normalizedBase);
        
        // Add discovered PDFs
        for (const pdf of links.pdfDocuments) {
          if (!allPDFs.some(p => p.url === pdf.url)) {
            allPDFs.push(pdf);
          }
        }
        
        // Add product URLs
        links.productUrls.forEach(u => allProductUrls.add(u));
        
        // Add support/download URLs to crawl queue
        [...links.supportUrls, ...links.downloadUrls].forEach(u => {
          const norm = u.replace(/\/$/, '').toLowerCase();
          if (!visited.has(norm) && !urlsToVisit.includes(u)) {
            urlsToVisit.push(u);
          }
        });
      } else {
        pages.push({
          url,
          success: false,
          error: result.error,
        });
      }
      
      // Rate limiting - be respectful
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      pages.push({
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  console.log(`Crawl complete. ${pages.length} pages, ${allPDFs.length} PDFs, ${allProductUrls.size} product URLs found`);
  
  return {
    pages,
    allPDFs,
    productUrls: Array.from(allProductUrls),
  };
}

// Legacy function for compatibility
export function findProductUrls(html: string, baseUrl: string): string[] {
  const links = discoverLinks(html, baseUrl);
  return links.productUrls;
}
