/**
 * Server-side API çağrıları için base URL'i döndürür
 * - Vercel production: VERCEL_URL kullan
 * - Local development: localhost:3000 kullan
 */
export function getApiBaseUrl(): string {
  // Vercel production ortamında
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback
  return "http://localhost:3000";
}

/**
 * Server-side fetch çağrıları için tam URL'i oluşturur
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Eğer path zaten "/" ile başlıyorsa, eklemeden kullan
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
