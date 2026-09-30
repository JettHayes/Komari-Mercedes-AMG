import type { MouseEvent } from "react";

export const SPA_NAVIGATION_EVENT = "komari:spa-navigation";

export function getCurrentSpaPathname(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname || "/";
}

export function navigateSpa(
  href: string,
  options: { replace?: boolean; scrollToTop?: boolean } = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(href, window.location.href);

  if (url.origin !== window.location.origin) {
    window.location.href = url.href;
    return;
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const didNavigate = nextUrl !== currentUrl;

  if (didNavigate) {
    if (options.replace) {
      window.history.replaceState(window.history.state, "", nextUrl);
    } else {
      window.history.pushState(window.history.state, "", nextUrl);
    }
  }

  window.dispatchEvent(new Event(SPA_NAVIGATION_EVENT));

  if (didNavigate && options.scrollToTop !== false && !url.hash) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }
}

export function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  );
}
