"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/meta-pixel";

interface Props {
  content_name: string;
  content_category: string;
}

export function ViewContentTracker({ content_name, content_category }: Props) {
  useEffect(() => {
    trackEvent("ViewContent", { content_name, content_category });
  }, [content_name, content_category]);

  return null;
}
