"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewFeedPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      // First try to discover the feed
      const discoverRes = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      let feedUrl = normalizedUrl;
      let name: string | undefined;
      let faviconUrl: string | undefined;

      if (discoverRes.ok) {
        const discovery = await discoverRes.json();
        if (discovery.recommendedFeedUrl) {
          feedUrl = discovery.recommendedFeedUrl;
        } else if (discovery.feeds?.[0]?.url) {
          feedUrl = discovery.feeds[0].url;
        }
        name = discovery.displayName;
        faviconUrl = discovery.faviconUrl;
      }

      // Create the feed subscription
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl, name, faviconUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add feed");
      }

      toast.success("Feed added!");
      router.push(`/app/feeds/${data.feed.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/app/feeds"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feeds
      </Link>

      <Card>
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Rss className="h-5 w-5 text-emerald-600" />
          </div>
          <CardTitle>Add a feed subscription</CardTitle>
          <CardDescription>
            Paste a website URL or RSS feed link. We'll find the feed and show you new articles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="https://example.com or https://example.com/feed.xml"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="h-11"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Works with any blog, Substack, Medium, WordPress, or direct RSS/Atom feed URL.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading || !url.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Add feed"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/app/feeds")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
