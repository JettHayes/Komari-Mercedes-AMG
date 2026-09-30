"use client";

import { useSyncExternalStore } from "react";
import { getCurrentSpaPathname, SPA_NAVIGATION_EVENT } from "@/lib/spaNavigation";

function subscribeToSpaPathname(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(SPA_NAVIGATION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(SPA_NAVIGATION_EVENT, onStoreChange);
  };
}

export function useSpaPathname() {
  return useSyncExternalStore(
    subscribeToSpaPathname,
    getCurrentSpaPathname,
    () => "/"
  );
}
