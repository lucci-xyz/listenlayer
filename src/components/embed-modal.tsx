"use client";

import { useMemo } from "react";
import Link from "next/link";
import { embedHeight } from "@/lib/embed";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyField } from "@/components/copy-field";

const PLAYER_HEIGHT = embedHeight();

export function EmbedModal({
  open,
  onOpenChange,
  publicId,
  baseUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicId: string | null;
  baseUrl: string;
}) {
  const { embedUrl, iframeSnippet, widgetSnippet, playerUrl } = useMemo(() => {
    if (!publicId) {
      return { embedUrl: "", iframeSnippet: "", widgetSnippet: "", playerUrl: "" };
    }
    const embedUrl = `${baseUrl}/embed/e/${publicId}`;
    const iframeSnippet = `<iframe src="${embedUrl}" style="width:100%;height:${PLAYER_HEIGHT}px;border:0;background:transparent" loading="lazy" allow="autoplay"></iframe>`;
    const widgetSnippet = `<script async src="${baseUrl}/widget.js" data-episode="${publicId}"></script>`;
    const playerUrl = `${baseUrl}/listen/e/${publicId}`;
    return { embedUrl, iframeSnippet, widgetSnippet, playerUrl };
  }, [publicId, baseUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Embed this episode</DialogTitle>
          <DialogDescription>Share on your site or newsletter in seconds.</DialogDescription>
        </DialogHeader>

        {!publicId ? (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-[13px] text-muted-foreground">
            Publish an episode to unlock embed snippets.
          </div>
        ) : (
          <Tabs defaultValue="iframe" className="mt-4">
            <TabsList>
              <TabsTrigger value="iframe">Iframe</TabsTrigger>
              <TabsTrigger value="widget">Widget</TabsTrigger>
              <TabsTrigger value="link">Link</TabsTrigger>
            </TabsList>
            <TabsContent value="iframe" className="mt-4 space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Drop this iframe into any HTML page to render the player.
              </p>
              <CopyField label="Iframe snippet" value={iframeSnippet} mono />
            </TabsContent>
            <TabsContent value="widget" className="mt-4 space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Use the widget script to auto-inject the iframe wherever the script loads.
              </p>
              <CopyField label="Widget.js snippet" value={widgetSnippet} mono />
            </TabsContent>
            <TabsContent value="link" className="mt-4 space-y-4">
              <p className="text-[13px] text-muted-foreground">Share the hosted player link directly.</p>
              <CopyField label="Hosted player URL" value={playerUrl} />
            </TabsContent>
          </Tabs>
        )}

        {publicId ? (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-[13px]">
            <div className="text-muted-foreground">Want to see the live embed?</div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/embed?publicId=${publicId}`}>Test embed</Link>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
