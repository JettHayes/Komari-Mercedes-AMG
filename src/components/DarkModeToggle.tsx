"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export default function DarkModeToggle() {
  const { appearance, setAppearance } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = appearance === "dark";

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 cursor-pointer"
      onClick={() => setAppearance(isDark ? "light" : "dark")}
      aria-label={t("theme.toggle", { defaultValue: "Toggle theme" })}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">{t("theme.toggle", { defaultValue: "Toggle theme" })}</span>
    </Button>
  );
}
