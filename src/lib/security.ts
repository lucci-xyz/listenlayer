import { getBaseUrl } from "@/lib/url";

export function isAllowedAppOrigin(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;

  const allowedOrigins = new Set<string>();

  // Always allow the current request host origin (works with custom domains without extra env).
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(",")[0]?.trim() ||
    "";
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") ? "http" : "https");
  if (host) {
    allowedOrigins.add(`${proto}://${host}`);
  }

  // Also allow the configured canonical origin (if set).
  try {
    allowedOrigins.add(new URL(getBaseUrl()).origin);
  } catch {
    // ignore
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Some same-origin browser requests omit Origin/Referer (e.g. privacy settings).
  // Use Fetch Metadata headers as a fallback signal.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site") {
    return true;
  }

  return false;
}
