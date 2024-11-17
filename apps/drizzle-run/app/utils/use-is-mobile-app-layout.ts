import { useSyncExternalStore } from "react";

const breakingPoint = "(max-width: 768px)"; // lower than md

function subscribe(callback: (event: MediaQueryListEvent) => void) {
  window.matchMedia(breakingPoint).addEventListener("change", callback);

  return () => {
    window.matchMedia(breakingPoint).removeEventListener("change", callback);
  };
}

/**
 * Check if the app should use the mobile app layout
 *
 * @returns true if the app is installed as a PWA
 */
export function useIsMobileAppLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(breakingPoint).matches, // How to get the value on the client
    () => false, // How to get the value on the server
  );
}
