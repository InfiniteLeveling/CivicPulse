import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * React 19 safe client mounting detector.
 * Prevents cascading renders and hydration mismatches without calling setState in an effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
