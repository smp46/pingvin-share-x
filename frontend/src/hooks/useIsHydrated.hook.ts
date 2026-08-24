import { useSyncExternalStore } from "react";

// Says whether the component is running in a hydrated browser tree yet.
//
// Anything that reads from window has to wait, because the server rendered the
// markup without it and React compares the two. Components used to arrange that
// with a piece of state flipped from an empty effect, which costs a second
// render and is the pattern the compiler rules object to.
//
// useSyncExternalStore is built for exactly this: the server snapshot and the
// first client snapshot are both false, so hydration matches, and the client
// snapshot then reads true with no effect and no extra state.

// nothing ever changes, so the subscription has nothing to do
const subscribe = () => () => undefined;

export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
