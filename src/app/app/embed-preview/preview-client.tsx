"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EmbedPreviewClient({
  baseUrl,
  episodes,
}: {
  baseUrl: string;
  episodes: { id: string; title: string; publicId: string }[];
}) {
  const [selectedId, setSelectedId] = useState(episodes[0]?.publicId || "");
  const [manualId, setManualId] = useState("");

  const publicId = manualId.trim() || selectedId;

  const embedUrl = publicId ? `${baseUrl}/embed/e/${publicId}` : "";
  const playerUrl = publicId ? `${baseUrl}/listen/e/${publicId}` : "";
  const iframeSnippet = publicId
    ? `<iframe src=\"${embedUrl}\" style=\"width:100%;height:160px;border:0\" loading=\"lazy\"></iframe>`
    : "";
  const widgetSnippet = publicId
    ? `<script async src=\"${baseUrl}/widget.js\" data-episode=\"${publicId}\"></script>`
    : "";

  const widgetKey = useMemo(() => publicId || "empty", [publicId]);

  useEffect(() => {
    const container = document.getElementById("widget-preview");
    if (!container || !publicId) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.async = true;
    script.src = `${baseUrl}/widget.js`;
    script.setAttribute("data-episode", publicId);
    container.appendChild(script);
  }, [publicId, baseUrl, widgetKey]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embed Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-zinc-500">
            Choose a published episode to preview the iframe and widget embeds.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedId}
              onChange={(e) => {
                setManualId("");
                setSelectedId(e.target.value);
              }}
            >
              {episodes.length === 0 ? (
                <option value="">No published episodes</option>
              ) : (
                episodes.map((episode) => (
                  <option key={episode.id} value={episode.publicId}>
                    {episode.title}
                  </option>
                ))
              )}
            </select>
            <div className="flex gap-2">
              <Input
                placeholder="Or paste a publicId"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
              />
              <Button variant="outline" onClick={() => setManualId("")}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Iframe Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                style={{ width: "100%", height: "160px", border: 0 }}
                loading="lazy"
                title="ListenLayer iframe preview"
              />
            ) : (
              <div className="text-sm text-zinc-500">Select an episode to preview.</div>
            )}
            {iframeSnippet ? (
              <div className="rounded-md bg-zinc-100 p-3 font-mono text-xs">
                {iframeSnippet}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Widget Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="widget-preview" className="min-h-[160px]" />
            {widgetSnippet ? (
              <div className="rounded-md bg-zinc-100 p-3 font-mono text-xs">
                {widgetSnippet}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hosted Player</CardTitle>
        </CardHeader>
        <CardContent>
          {playerUrl ? (
            <div className="rounded-md bg-zinc-100 p-3 text-xs">{playerUrl}</div>
          ) : (
            <div className="text-sm text-zinc-500">Select an episode to preview.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
