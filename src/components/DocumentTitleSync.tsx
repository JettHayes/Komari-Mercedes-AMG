"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

/** Sync html lang; keep tab title aligned with Komari site settings after SSR replace. */
export default function DocumentTitleSync() {
  const { i18n } = useTranslation();
  const { publicInfo } = usePublicInfo();

  useEffect(() => {
    document.documentElement.lang = (i18n.language || "zh-CN").replace("_", "-");
  }, [i18n.language]);

  useEffect(() => {
    if (publicInfo?.sitename) {
      document.title = publicInfo.sitename;
    }
  }, [publicInfo?.sitename]);

  return null;
}
