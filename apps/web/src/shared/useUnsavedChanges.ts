import { useCallback } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

/** Protect drafts on both in-app navigation and browser refresh/close. */
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname, [dirty]));
  useBeforeUnload(useCallback((event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ""; }
  }, [dirty]));
  return blocker;
}
