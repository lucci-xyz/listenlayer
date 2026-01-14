"use client";

import { useState, useEffect } from "react";
import { Rss } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeedIcon({ 
  url, 
  className,
  fallbackClassName 
}: { 
  url: string | null; 
  className?: string;
  fallbackClassName?: string;
}) {
  const [error, setError] = useState(false);

  // Reset error if url changes
  useEffect(() => {
    setError(false);
  }, [url]);

  if (!url || error) {
    return <Rss className={cn("h-6 w-6 text-orange-600", fallbackClassName)} strokeWidth={1.5} />;
  }

  return (
    <div className={cn("relative flex items-center justify-center bg-white rounded-md shadow-sm overflow-hidden p-1", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  );
}
