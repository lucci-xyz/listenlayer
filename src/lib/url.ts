export function getBaseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getDomainFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
