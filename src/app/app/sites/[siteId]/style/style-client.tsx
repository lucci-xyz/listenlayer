"use client";

import { useMemo, useState } from "react";
import { EmbedConfig, embedConfigToQuery, embedHeight } from "@/lib/embed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const themeOptions: EmbedConfig["theme"][] = ["light", "dark", "auto"];
const radiusOptions: EmbedConfig["radius"][] = ["sharp", "soft", "round"];
const sizeOptions: EmbedConfig["size"][] = ["compact", "standard", "tall"];

export default function StyleClient({
  siteId,
  initialConfig,
  previewPublicId,
}: {
  siteId: string;
  initialConfig: EmbedConfig;
  previewPublicId: string | null;
}) {
  const [config, setConfig] = useState<EmbedConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => embedConfigToQuery(config), [config]);
  const height = useMemo(() => embedHeight(config), [config]);
  const previewUrl = previewPublicId
    ? `/embed/e/${previewPublicId}?${query}`
    : null;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedConfig: config }),
      });
      if (!res.ok) {
        throw new Error("Failed to save styles");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save styles");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Style</h2>
        <p className="text-sm text-zinc-500">Set defaults for every embed on this site.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Embed controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Theme</div>
              <div className="flex flex-wrap gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      config.theme === option
                        ? "border-zinc-900 text-zinc-900"
                        : "border-zinc-200 text-zinc-500"
                    }`}
                    onClick={() => setConfig((prev) => ({ ...prev, theme: option }))}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Accent</div>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={config.accentColor}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, accentColor: event.target.value }))
                  }
                  className="h-10 w-16 p-1"
                />
                <Input
                  value={config.accentColor}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, accentColor: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Radius</div>
              <div className="flex flex-wrap gap-2">
                {radiusOptions.map((option) => (
                  <button
                    key={option}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      config.radius === option
                        ? "border-zinc-900 text-zinc-900"
                        : "border-zinc-200 text-zinc-500"
                    }`}
                    onClick={() => setConfig((prev) => ({ ...prev, radius: option }))}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Size</div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((option) => (
                  <button
                    key={option}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      config.size === option
                        ? "border-zinc-900 text-zinc-900"
                        : "border-zinc-200 text-zinc-500"
                    }`}
                    onClick={() => setConfig((prev) => ({ ...prev, size: option }))}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Toggles</div>
              <div className="grid gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.showChapters}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, showChapters: event.target.checked }))
                    }
                  />
                  Show chapters button
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.showTranscript}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, showTranscript: event.target.checked }))
                    }
                  />
                  Show transcript button
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.showOpenPlayer}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, showOpenPlayer: event.target.checked }))
                    }
                  />
                  Show open player link
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save styles"}
              </Button>
              {saved ? <Badge variant="secondary">Saved</Badge> : null}
              {error ? <span className="text-sm text-red-600">{error}</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="rounded-xl border border-zinc-200 bg-white">
                <iframe title="Embed preview" src={previewUrl} style={{ height }} className="w-full" />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Publish an episode to see the live embed preview.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
