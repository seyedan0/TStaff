import { useCallback } from "react";
import { useBeforeUnload, useBlocker, type BlockerFunction } from "react-router-dom";

/** Protect drafts on both in-app navigation and browser refresh/close. */
export function useUnsavedChanges(dirty: boolean) {
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      `${currentLocation.pathname}${currentLocation.search}` !==
        `${nextLocation.pathname}${nextLocation.search}`,
    [dirty],
  );
  const blocker = useBlocker(shouldBlock);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty],
    ),
  );
  return blocker;
}
