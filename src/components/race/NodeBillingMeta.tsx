"use client";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { useTheme } from "@/contexts/ThemeContext";
import { expiryTone } from "@/lib/statusTone";
import { useTranslation } from "react-i18next";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function formatBillingCycle(t: TranslateFn, billingCycle: number) {
  if (billingCycle === -1) {
    return t("remainingValue.billingCycle.once", { defaultValue: "One-time" });
  }
  if (!Number.isFinite(billingCycle) || billingCycle <= 0) {
    return "";
  }
  return t("remainingValue.billingCycle.days", {
    count: billingCycle,
    defaultValue: "{{count}} days",
  });
}

function formatPriceText(node: NodeBasicInfo, t: TranslateFn) {
  if (!Number.isFinite(node.price) || node.price === 0) {
    return "—";
  }
  if (node.price === -1) {
    return t("nodeCard.free", { defaultValue: "Free" });
  }
  const currency = (node.currency || "").trim() || "¥";
  const cycle = formatBillingCycle(t, node.billing_cycle);
  const amount = `${currency}${node.price}`;
  return cycle ? `${amount} / ${cycle}` : amount;
}

function formatExpiryText(node: NodeBasicInfo, locale: string, t: TranslateFn) {
  if (!node.expired_at?.trim()) return "—";
  const ts = Date.parse(node.expired_at);
  if (!Number.isFinite(ts)) return "—";

  const tone = expiryTone(node.expired_at);
  if (tone === "crit") {
    return t("raceControl.expired", { defaultValue: "Expired" });
  }

  try {
    return new Intl.DateTimeFormat(locale.replace("_", "-"), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ts));
  } catch {
    return node.expired_at.slice(0, 10);
  }
}

/** Always reserves layout slots; fills content only when guestDisplay toggles allow. */
export function NodeBillingMeta({
  node,
  layout = "row",
}: {
  node: NodeBasicInfo;
  layout?: "row" | "stack" | "cells";
}) {
  const { t, i18n } = useTranslation();
  const { guestDisplay } = useTheme();
  const locale = i18n.language || "zh-CN";

  const priceText = guestDisplay.showPrice ? formatPriceText(node, t) : "\u00a0";
  const expiryText = guestDisplay.showExpiredAt
    ? formatExpiryText(node, locale, t)
    : "\u00a0";
  const tone = guestDisplay.showExpiredAt ? expiryTone(node.expired_at) : "neutral";

  if (layout === "cells") {
    return (
      <>
        <div className="rc-billing-cell rc-mono text-xs min-w-0 truncate" title={guestDisplay.showPrice ? priceText : undefined}>
          {priceText}
        </div>
        <div
          className="rc-billing-cell rc-mono text-xs min-w-0 truncate"
          data-tone={tone}
          title={guestDisplay.showExpiredAt ? expiryText : undefined}
        >
          {expiryText}
        </div>
      </>
    );
  }

  return (
    <div className={`rc-billing-meta rc-billing-meta--${layout}`} aria-hidden={!guestDisplay.showPrice && !guestDisplay.showExpiredAt}>
      <div className="rc-billing-meta__item">
        <span className="rc-label">{t("nodeCard.price", { defaultValue: "Price" })}</span>
        <span className="rc-mono truncate" title={guestDisplay.showPrice ? priceText : undefined}>
          {priceText}
        </span>
      </div>
      <div className="rc-billing-meta__item" data-tone={tone}>
        <span className="rc-label">{t("nodeCard.expiredAt", { defaultValue: "Expires" })}</span>
        <span className="rc-mono truncate" title={guestDisplay.showExpiredAt ? expiryText : undefined}>
          {expiryText}
        </span>
      </div>
    </div>
  );
}
