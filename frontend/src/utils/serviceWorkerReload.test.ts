import { watchForNewServiceWorker } from "./serviceWorkerReload";

const fakeNavigator = (controller: unknown) => {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    nav: {
      serviceWorker: {
        controller,
        addEventListener: (t: string, l: () => void) => {
          (listeners[t] ||= []).push(l);
        },
        removeEventListener: (t: string, l: () => void) => {
          listeners[t] = (listeners[t] || []).filter((x) => x !== l);
        },
      },
    },
    fire: (t: string) => (listeners[t] || []).forEach((l) => l()),
    count: (t: string) => (listeners[t] || []).length,
  };
};

describe("watchForNewServiceWorker", () => {
  // the deploy case: a worker was already driving this page, a new one taking
  // over means the html in front of the user is from the previous build
  it("reloads when a new worker takes over an already controlled page", () => {
    const { nav, fire } = fakeNavigator({});
    let reloads = 0;
    watchForNewServiceWorker(nav, () => reloads++);

    fire("controllerchange");
    expect(reloads).toBe(1);
  });

  // first visit: the worker claiming the page is not a new deploy, and
  // reloading here would make every first load flash
  it("stays quiet on the first install", () => {
    const { nav, fire } = fakeNavigator(null);
    let reloads = 0;
    watchForNewServiceWorker(nav, () => reloads++);

    fire("controllerchange");
    expect(reloads).toBe(0);
  });

  it("reloads at most once", () => {
    const { nav, fire } = fakeNavigator({});
    let reloads = 0;
    watchForNewServiceWorker(nav, () => reloads++);

    fire("controllerchange");
    fire("controllerchange");
    fire("controllerchange");
    expect(reloads).toBe(1);
  });

  it("detaches its listener when told to", () => {
    const { nav, fire, count } = fakeNavigator({});
    let reloads = 0;
    const stop = watchForNewServiceWorker(nav, () => reloads++);
    expect(count("controllerchange")).toBe(1);

    stop();
    expect(count("controllerchange")).toBe(0);
    fire("controllerchange");
    expect(reloads).toBe(0);
  });

  // server rendering, and browsers with the api switched off
  it("does nothing when there is no service worker support", () => {
    let reloads = 0;
    const stop = watchForNewServiceWorker({}, () => reloads++);
    expect(reloads).toBe(0);
    expect(() => stop()).not.toThrow();
  });
});
