"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Site = { id: string; name: string; domain?: string | null };
type Source = { id: string; siteId: string; type: "RSS" | "URL"; url: string; lastFetchedAt: string | null };
type Episode = {
  id: string;
  siteId: string;
  sourceId: string;
  title: string;
  status: "QUEUED" | "RUNNING" | "PUBLISHED" | "FAILED";
  publicId: string;
  createdAt: string;
};

export default function DashboardClient({
  sites,
  sources,
  episodes,
  stats,
}: {
  sites: Site[];
  sources: Source[];
  episodes: Episode[];
  stats: Record<string, { plays: number; progress: Record<number, number> }>;
}) {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [sourceSiteId, setSourceSiteId] = useState(sites[0]?.id || "");
  const [sourceType, setSourceType] = useState<"RSS" | "URL">("RSS");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceSiteId && sites[0]?.id) {
      setSourceSiteId(sites[0].id);
    }
  }, [sites, sourceSiteId]);

  const handleCreateSite = async () => {
    setError(null);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: siteName, domain: siteDomain }),
    });
    if (!res.ok) {
      setError("Failed to create site");
      return;
    }
    setSiteName("");
    setSiteDomain("");
    router.refresh();
  };

  const handleAddSource = async () => {
    setError(null);
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: sourceSiteId, type: sourceType, url: sourceUrl }),
    });
    if (!res.ok) {
      setError("Failed to add source");
      return;
    }
    setSourceUrl("");
    router.refresh();
  };

  const handleGenerate = async (siteId: string, sourceId: string) => {
    setError(null);
    setLoadingSource(sourceId);
    const res = await fetch("/api/episodes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, sourceId }),
    });
    if (!res.ok) {
      setError("Failed to queue episode");
    }
    setLoadingSource(null);
    router.refresh();
  };

  const sourceBySite = useMemo(() => {
    return sites.map((site) => ({
      site,
      sources: sources.filter((source) => source.siteId === site.id),
    }));
  }, [sites, sources]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Site name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
            <Input
              placeholder="Domain label (optional)"
              value={siteDomain}
              onChange={(e) => setSiteDomain(e.target.value)}
            />
            <Button onClick={handleCreateSite} disabled={!siteName}>
              Create
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                className="w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sourceSiteId}
                onChange={(e) => setSourceSiteId(e.target.value)}
                disabled={!sites.length}
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <select
                className="w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "RSS" | "URL")}
                disabled={!sites.length}
              >
                <option value="RSS">RSS</option>
                <option value="URL">URL</option>
              </select>
            </div>
            <Input
              placeholder={sourceType === "RSS" ? "RSS feed URL" : "Article URL"}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
            <Button onClick={handleAddSource} disabled={!sites.length || !sourceSiteId || !sourceUrl}>
              Add source
            </Button>
          </CardContent>
        </Card>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sourceBySite.length === 0 ? (
            <p className="text-sm text-zinc-500">Create a site to add sources.</p>
          ) : (
            sourceBySite.map(({ site, sources }) => (
              <div key={site.id} className="space-y-2">
                <div className="text-sm font-semibold text-zinc-700">
                  {site.name}
                  {site.domain ? <span className="ml-2 text-xs text-zinc-400">{site.domain}</span> : null}
                </div>
                <div className="space-y-2">
                  {sources.length === 0 ? (
                    <p className="text-xs text-zinc-400">No sources yet.</p>
                  ) : (
                    sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2"
                      >
                        <div className="text-xs text-zinc-600">
                          <span className="mr-2 rounded bg-zinc-100 px-2 py-1 text-[10px] font-semibold">
                            {source.type}
                          </span>
                          {source.url}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(site.id, source.id)}
                          disabled={loadingSource === source.id}
                        >
                          {loadingSource === source.id ? "Queueing..." : "Generate latest episode"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Episodes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Plays</TableHead>
                <TableHead>25%</TableHead>
                <TableHead>50%</TableHead>
                <TableHead>75%</TableHead>
                <TableHead>100%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {episodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-zinc-500">
                    No episodes yet.
                  </TableCell>
                </TableRow>
              ) : (
                episodes.map((episode) => (
                  <TableRow key={episode.id}>
                    <TableCell>
                      <Link className="text-sm text-zinc-900 underline" href={`/app/episodes/${episode.id}`}>
                        {episode.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={episode.status === "PUBLISHED" ? "default" : "secondary"}>
                        {episode.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {new Date(episode.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {stats[episode.id]?.plays || 0}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {stats[episode.id]?.progress?.[25] || 0}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {stats[episode.id]?.progress?.[50] || 0}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {stats[episode.id]?.progress?.[75] || 0}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {stats[episode.id]?.progress?.[100] || 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
