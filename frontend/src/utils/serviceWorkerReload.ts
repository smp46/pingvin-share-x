// A deploy changes every chunk hash. A tab that is already open still holds
// the old html, so it asks for files the server no longer has, gets the 404
// page back as text/html, and the browser refuses to run it as a script. The
// service worker precaches the build, so it keeps pointing at the old set
// until it is replaced, and the NetworkOnly rule turns the failure into a dead
// page rather than something the app can recover from.
//
// next-pwa already ships skipWaiting and clientsClaim, so a new worker takes
// over on its own. What is missing is telling the page, which is still running
// the previous build, to fetch itself again once that happens.

type Nav = {
  serviceWorker?: {
    controller: unknown;
    addEventListener: (t: string, l: () => void) => void;
    removeEventListener: (t: string, l: () => void) => void;
  };
};

// Exported for the test: given whether a worker was already in charge, decide
// whether a controller change means a new deploy or just the first install.
export function shouldReloadOnControllerChange(hadController: boolean): boolean {
  return hadController;
}

export function watchForNewServiceWorker(
  nav: Nav = navigator as unknown as Nav,
  reload: () => void = () => window.location.reload(),
): () => void {
  const sw = nav.serviceWorker;
  if (!sw) return () => undefined;

  // On a first visit there is no controller yet and the worker claiming the
  // page is not a new deploy, so reloading there would just make every first
  // load flash.
  const hadController = !!sw.controller;
  let done = false;

  const onControllerChange = () => {
    if (done) return;
    if (!shouldReloadOnControllerChange(hadController)) return;
    done = true;
    reload();
  };

  sw.addEventListener("controllerchange", onControllerChange);
  return () => sw.removeEventListener("controllerchange", onControllerChange);
}
