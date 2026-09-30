"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useTheme, type Appearance } from "@/contexts/ThemeContext";

export default function DarkModeToggle() {
  const { appearance, setAppearance } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = appearance === "dark";

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next: Appearance = isDark ? "light" : "dark";
    const apply = () => {
      document.documentElement.classList.toggle("dark", next === "dark");
      setAppearance(next);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = document.startViewTransition?.bind(document);
    if (!start || reduce) {
      apply();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = start(apply);
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`],
        },
        {
          duration: 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

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
      className="rc-theme-toggle h-9 w-9 cursor-pointer"
      onClick={toggle}
      aria-label={t("theme.toggle", { defaultValue: "Toggle theme" })}
    >
      <span key={isDark ? "dark" : "light"} className="rc-theme-toggle__icon">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
      <span className="sr-only">{t("theme.toggle", { defaultValue: "Toggle theme" })}</span>
    </Button>
  );
}
