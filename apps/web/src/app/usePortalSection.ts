import { useLocation } from "react-router-dom";

/** Current page derives only from the URL, including browser back/forward. */
export function usePortalSection<T extends string>(mapping: Record<string, T>, fallback: T): T {
  const { pathname } = useLocation();
  return Object.entries(mapping).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ?? fallback;
}
