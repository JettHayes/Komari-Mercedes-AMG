"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Keeps html lang in sync; tab title stays English brand. */
export default function DocumentTitleSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.title = "AMG Race Control";
    document.documentElement.lang = (i18n.language || "zh-CN").replace("_", "-");
  }, [i18n.language]);

  return null;
}
