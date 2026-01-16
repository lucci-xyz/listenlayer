"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DeleteFeedDialog({
  feedId,
  feedName,
}: {
  feedId: string;
  feedName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const matches = confirm.trim().toLowerCase() === feedName.trim().toLowerCase();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feeds/${feedId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete feed");
      }
      toast.success("Feed deleted.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setLoading(false);
      setConfirm("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete feed
      </Button>
      <DialogContent>
        <DialogHeader>
        <DialogTitle>Delete feed subscription</DialogTitle>
          <DialogDescription>
            This will remove the feed subscription. Episodes generated from this feed will be kept.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[13px] text-muted-foreground">
          <p>
            Type <span className="font-semibold text-foreground">{feedName}</span> to confirm.
          </p>
          <Input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Feed name"
          />
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!matches || loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
