"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EmbedConfig, defaultEmbedConfig, embedConfigToQuery, embedHeight } from "@/lib/embed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmbedButton } from "@/components/embed-button";

const themeOptions: EmbedConfig["theme"][] = ["light", "dark", "auto"];
const radiusOptions: EmbedConfig["radius"][] = ["sharp", "soft", "round"];
const sizeOptions: EmbedConfig["size"][] = ["compact", "standard", "tall"];

const presets: Record<string, EmbedConfig> = {
  Minimal: {
    ...defaultEmbedConfig,
    theme: "light",
    accentColor: "#111827",
    radius: "sharp",
    size: "compact",
    showChapters: false,
    showTranscript: false,
    showOpenPlayer: true,
  },
  Modern: {
    ...defaultEmbedConfig,
    theme: "auto",
    accentColor: "#0f172a",
    radius: "soft",
    size: "standard",
  },
  Bold: {
    ...defaultEmbedConfig,
    theme: "dark",
    accentColor: "#f97316",
    radius: "round",
    size: "tall",
  },
};

const swatches = ["#111827", "#0f172a", "#2563eb", "#f97316", "#10b981", "#a855f7"];

export default function StyleClient({
  siteId,
  initialConfig,
  previewPublicId,
  baseUrl,
}: {
  siteId: string;
  initialConfig: EmbedConfig;
  previewPublicId: string | null;
  baseUrl: string;
}) {
  const [config, setConfig] = useState<EmbedConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const query = useMemo(() => embedConfigToQuery(config), [config]);
  const height = useMemo(() => embedHeight(config), [config]);
  const previewUrl = previewPublicId ? `/embed/e/${previewPublicId}?${query}` : null;

  const scheduleSave = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void handleSave();
    }, 700);
  };

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Style Studio</h2>
          <p className="text-sm text-zinc-500">Design the embed player once. It updates everywhere.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EmbedButton
            label="Copy embed"
            publicId={previewPublicId}
            baseUrl={baseUrl}
            config={config}
          />
          <Button variant="outline" onClick={() => setConfig(defaultEmbedConfig)}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Style controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Presets</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(presets).map(([name, preset]) => (
                  <Button
                    key={name}
                    size="sm"
                    variant="outline"
                    onClick={() => setConfig(preset)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Theme</div>
              <div className="flex flex-wrap gap-2">
                {themeOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={config.theme === option ? "default" : "outline"}
                    onClick={() => setConfig((prev) => ({ ...prev, theme: option }))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Accent</div>
              <div className="flex flex-wrap items-center gap-2">
                {swatches.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`h-8 w-8 rounded-full border ${config.accentColor === swatch ? "border-zinc-900" : "border-zinc-200"}`}
                    style={{ backgroundColor: swatch }}
                    onClick={() => setConfig((prev) => ({ ...prev, accentColor: swatch }))}
                  />
                ))}
                <Button size="sm" variant="outline" onClick={() => setAdvanced((prev) => !prev)}>
                  Custom
                </Button>
              </div>
              {advanced ? (
                <div className="flex items-center gap-2">
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
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Layout</div>
              <div className="flex flex-wrap gap-2">
                {radiusOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={config.radius === option ? "default" : "outline"}
                    onClick={() => setConfig((prev) => ({ ...prev, radius: option }))}
                  >
                    Radius: {option}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={config.size === option ? "default" : "outline"}
                    onClick={() => setConfig((prev) => ({ ...prev, size: option }))}
                  >
                    Size: {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Features</div>
              <div className="grid gap-3 text-sm">
                <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                  <span>
                    <div className="font-medium text-zinc-700">Chapters</div>
                    <div className="text-xs text-zinc-400">Show the chapters list.</div>
                  </span>
                  <Switch
                    checked={config.showChapters}
                    onCheckedChange={(value) =>
                      setConfig((prev) => ({ ...prev, showChapters: value }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                  <span>
                    <div className="font-medium text-zinc-700">Transcript</div>
                    <div className="text-xs text-zinc-400">Allow readers to open the transcript.</div>
                  </span>
                  <Switch
                    checked={config.showTranscript}
                    onCheckedChange={(value) =>
                      setConfig((prev) => ({ ...prev, showTranscript: value }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                  <span>
                    <div className="font-medium text-zinc-700">Open player</div>
                    <div className="text-xs text-zinc-400">Show the full player link.</div>
                  </span>
                  <Switch
                    checked={config.showOpenPlayer}
                    onCheckedChange={(value) =>
                      setConfig((prev) => ({ ...prev, showOpenPlayer: value }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              {saving ? <Badge variant="secondary">Saving…</Badge> : null}
              {saved ? <Badge variant="secondary">Saved</Badge> : null}
              {error ? <span className="text-red-600">{error}</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-400">
                  Article container preview
                </div>
                <iframe
                  title="Embed preview"
                  src={previewUrl}
                  style={{ height }}
                  className="w-full"
                  loading="lazy"
                />
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
