"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AppLayout from "@/components/layout/app-layout";

interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  position: number;
}

interface Manufacturer {
  id: string;
  name: string;
  verified: boolean;
  website: string | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  imageUrl: string | null;
  inStock: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  descriptionHtml: string | null;
  price: number | null;
  compareAtPrice: number | null;
  currency: string | null;
  imageUrl: string | null;
  images: ProductImage[] | null;
  sku: string | null;
  inStock: boolean;
  inventoryQuantity: number | null;
  shopifyProductUrl: string | null;
  category: string | null;
  tags: string[];
  weight: number | null;
  weightUnit: string | null;
  specifications: {
    variants?: number;
    options?: Array<{ name: string; values: string[] }>;
  } | null;
  manufacturer: Manufacturer;
  relatedProducts: RelatedProduct[];
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${id}`);
      const result = await response.json();

      if (result.success) {
        setProduct(result.data);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Product Not Found</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  const images = product.images || (product.imageUrl ? [{ src: product.imageUrl, alt: product.name, width: 800, height: 800, position: 0 }] : []);
  const hasDiscount = product.compareAtPrice && product.price && product.compareAtPrice > product.price;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-blue-500">Home</Link>
          <span>›</span>
          <Link href="/products" className="hover:text-blue-500">Products</Link>
          <span>›</span>
          <Link href={`/manufacturers/${product.manufacturer.id}`} className="hover:text-blue-500">
            {product.manufacturer.name}
          </Link>
          <span>›</span>
          <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {hasDiscount && (
                <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full">
                  SALE
                </span>
              )}
              {images.length > 0 ? (
                <Image
                  src={images[selectedImageIndex].src}
                  alt={images[selectedImageIndex].alt || product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? "border-blue-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || `${product.name} image ${index + 1}`}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Manufacturer */}
            <div>
              <Link
                href={`/manufacturers/${product.manufacturer.id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2"
              >
                {product.manufacturer.name}
                {product.manufacturer.verified && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </Link>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xl text-gray-500 line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                product.inStock
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${product.inStock ? "bg-emerald-500" : "bg-red-500"}`}></span>
                {product.inStock ? "In Stock" : "Out of Stock"}
                {product.inventoryQuantity !== null && product.inStock && (
                  <span className="text-xs opacity-75">({product.inventoryQuantity} available)</span>
                )}
              </span>
              {product.sku && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  SKU: {product.sku}
                </span>
              )}
            </div>

            {/* View on Store Button */}
            {product.shopifyProductUrl && (
              <a
                href={product.shopifyProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                View on Store
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.slice(0, 10).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Category */}
            {product.category && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Category:</span> {product.category}
              </div>
            )}

            {/* Product Options */}
            {product.specifications?.options && product.specifications.options.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Available Options</h3>
                {product.specifications.options.map((option, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{option.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value, vIndex) => (
                        <span
                          key={vIndex}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        {product.descriptionHtml && (
          <div className="mt-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 lg:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product Description</h2>
            <div
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </div>
        )}

        {/* Related Products */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              More from {product.manufacturer.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {product.relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/products/${related.id}`}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square relative mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {related.imageUrl ? (
                      <Image
                        src={related.imageUrl}
                        alt={related.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 50vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {related.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPrice(related.price)}
                    </span>
                    {related.compareAtPrice && related.price && related.compareAtPrice > related.price && (
                      <span className="text-xs text-gray-500 line-through">
                        {formatPrice(related.compareAtPrice)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 pb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
