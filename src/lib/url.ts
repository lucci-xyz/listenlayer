export function getBaseUrl() {
  // Priority: explicit app URL > Vercel URL > fallback
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  
  // Vercel automatically sets this in deployments
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // Legacy fallback
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  
  return "http://localhost:3000";
}

export function getDomainFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
