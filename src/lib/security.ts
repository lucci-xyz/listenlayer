import { getBaseUrl } from "@/lib/url";

export function isAllowedAppOrigin(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;

  let appOrigin: string;
  try {
    appOrigin = new URL(getBaseUrl()).origin;
  } catch {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin === appOrigin;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === appOrigin;
    } catch {
      return false;
    }
  }

  return false;
}
