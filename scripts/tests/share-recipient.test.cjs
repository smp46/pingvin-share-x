const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const localRequire = createRequire(path.resolve("frontend/package.json"));
const ts = localRequire("typescript");
const React = localRequire("react");
const { renderToStaticMarkup } = localRequire("react-dom/server");
function load(relative, overrides = {}, globals = {}) {
  const filename = path.resolve("frontend/src", relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    ...globals,
    require(name) {
      if (name in overrides) return overrides[name];
      if (name.startsWith(".")) {
        const target = path.relative(
          path.resolve("frontend/src"),
          path.resolve(path.dirname(filename), name),
        );
        for (const suffix of [".ts", ".tsx"])
          if (fs.existsSync(path.resolve("frontend/src", target + suffix)))
            return load(target + suffix, overrides, globals);
      }
      return localRequire(name);
    },
  });
  return exports;
}
function harness() {
  let states = [],
    refs = [],
    deps = [],
    cleanups = [],
    cursor,
    refCursor,
    effectCursor,
    effects,
    changed;
  const hooks = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in states))
        states[i] = typeof initial === "function" ? initial() : initial;
      return [
        states[i],
        (value) => {
          const next = typeof value === "function" ? value(states[i]) : value;
          changed ||= next !== states[i];
          states[i] = next;
        },
      ];
    },
    useRef(initial) {
      const i = refCursor++;
      return (refs[i] ||= { current: initial });
    },
    useEffect(effect, next) {
      const i = effectCursor++;
      if (!deps[i] || next.some((v, j) => v !== deps[i][j])) {
        deps[i] = next;
        effects.push(() => {
          cleanups[i]?.();
          cleanups[i] = effect();
        });
      }
    },
  };
  return {
    hooks,
    render(component, props) {
      let result;
      for (let i = 0; i < 10; i++) {
        cursor = refCursor = effectCursor = 0;
        effects = [];
        changed = false;
        result = component(props);
        effects.forEach((f) => f());
        if (!changed) return result;
      }
      throw Error("did not settle");
    },
    dispose() {
      cleanups.forEach((f) => f?.());
    },
  };
}
const messages = load("i18n/translations/en-US.ts").default;
const { createIntl } = localRequire("react-intl");
const intl = createIntl({ locale: "en-US", messages });
const t = (id, values) => intl.formatMessage({ id }, values);
const translate = {
  default: () => t,
  translateOutsideContext: () => t,
  __esModule: true,
};
const host =
  (name) =>
  ({ children, ...props }) =>
    React.createElement(name, {}, children);
const mantine = new Proxy(
  {},
  { get: (_, name) => host(name === "Text" ? "p" : "div") },
);
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const rejection = (error, message = error) => ({
  response: { data: { error, message } },
});
(async () => {
  // Removing the interval/zero clamp or null guard must fail these real-component checks.
  let now = Date.parse("2026-10-28T00:00:00Z"),
    tick,
    cleared = 0;
  const h = harness();
  const { default: Ring } = load(
    "components/share/ExpiryRing.tsx",
    {
      react: h.hooks,
      "../../hooks/useTranslate.hook": translate,
      "framer-motion": {
        useReducedMotion: () => false,
        motion: { circle: host("circle") },
      },
    },
    {
      Date: class extends Date {
        static now() {
          return now;
        }
      },
      setInterval(fn) {
        tick = fn;
        return 1;
      },
      clearInterval() {
        cleared++;
      },
    },
  );
  const props = {
    expiresAt: "2026-10-28T00:00:02Z",
    createdAt: "2026-10-27T00:00:00Z",
  };
  assert.match(renderToStaticMarkup(h.render(Ring, props)), /2s/);
  now += 1000;
  tick();
  assert.match(renderToStaticMarkup(h.render(Ring, props)), /1s/);
  now += 1000;
  tick();
  assert.match(renderToStaticMarkup(h.render(Ring, props)), /Expired/);
  assert.match(
    renderToStaticMarkup(h.render(Ring, { expiresAt: null })),
    /No expiry/,
  );
  assert.ok(cleared > 0);
  h.dispose();
  console.log(
    "PASS: countdown ticks, reaches expired at zero, null is No expiry, timer cleaned up",
  );

  const { default: Card } = load("components/share/SafetyCard.tsx", {
    "@mantine/core": mantine,
    "../../hooks/useTranslate.hook": translate,
    "./ExpiryRing": {
      __esModule: true,
      default: () => React.createElement("span", {}, "ring"),
    },
  });
  const safety = {
    sharedBy: null,
    views: 2,
    maxViews: 5,
    hasPassword: true,
    blockedExtensions: ["exe", "js"],
    expiresAt: null,
  };
  const markup = renderToStaticMarkup(
    React.createElement(Card, {
      safety,
      files: [
        { name: "Report.PDF", size: "1500000" },
        { name: "README", size: "0" },
      ],
    }),
  );
  for (const text of [
    "Shared by Anonymous",
    "1.5 MB",
    "PDF",
    "Unknown type",
    "Password protected",
    "2 of 5 views used",
    "2 types",
    "128-bit unguessable",
  ])
    assert.ok(markup.includes(text), text);
  assert.match(
    renderToStaticMarkup(
      React.createElement(Card, {
        safety: { ...safety, maxViews: null, hasPassword: false },
        files: [],
      }),
    ),
    /Unlimited views/,
  );
  console.log(
    "PASS: safety card fallback, case-insensitive extension type, unknown type, human size, password and view limits",
  );

  // Real access hook: no API infrastructure is required; only transport and modal boundaries are faked.
  for (const source of ["get", "token"])
    for (const [code, title] of [
      ["share_not_found", "Link not found"],
      ["share_expired", "This link has expired"],
      ["share_removed", "This link was revoked"],
      ["share_max_views_exceeded", "View limit reached"],
      ["private_share", "Private share"],
    ]) {
      const hook = harness(),
        modals = {
          openModal() {},
          closeModal() {
            this.closed = true;
          },
        };
      const service = {
        get: async () => {
          throw rejection(
            source === "token" ? "share_token_required" : code,
            "Revoked by owner",
          );
        },
        getShareToken: async () => {
          throw rejection(code, "Revoked by owner");
        },
      };
      const useAccess = load("hooks/shareAccess.hook.ts", {
        react: hook.hooks,
        "../services/share.service": { __esModule: true, default: service },
        "../components/share/showEnterPasswordModal": {
          __esModule: true,
          default: () => "password-modal",
        },
      }).default;
      hook.render(useAccess, { shareId: "one", modals, t });
      await flush();
      const state = hook.render(useAccess, { shareId: "one", modals, t });
      assert.equal(t(state.error.title), title, `${source}: ${code}`);
      if (code === "share_removed")
        assert.equal(state.error.message, "Revoked by owner");
      hook.dispose();
    }
  console.log(
    "PASS: GET and token errors map to distinct full-page states, revoked reason preserved",
  );

  let submit,
    tokenCalls = 0,
    closeCalls = 0;
  const hook = harness(),
    modals = {
      closeModal() {
        closeCalls++;
      },
    };
  const service = {
    get: async () => {
      throw rejection("share_password_required");
    },
    getShareToken: async () => {
      tokenCalls++;
      throw rejection(
        tokenCalls === 1 ? "wrong_password" : "share_removed",
        "Auto-revoked: too many wrong passwords",
      );
    },
  };
  const useAccess = load("hooks/shareAccess.hook.ts", {
    react: hook.hooks,
    "../services/share.service": { __esModule: true, default: service },
    "../components/share/showEnterPasswordModal": {
      __esModule: true,
      default: (_, callback) => {
        submit = callback;
        return "password-modal";
      },
    },
  }).default;
  const accessProps = { shareId: "one", modals, t };
  hook.render(useAccess, accessProps);
  await flush();
  await assert.rejects(
    submit("bad"),
    (e) => e.response.data.error === "wrong_password",
  );
  assert.equal(hook.render(useAccess, accessProps).error, undefined);
  assert.equal(closeCalls, 0);
  await submit("bad again");
  const removed = hook.render(useAccess, accessProps);
  assert.equal(removed.error.message, "Auto-revoked: too many wrong passwords");
  assert.equal(closeCalls, 1);
  hook.dispose();
  console.log(
    "PASS: token wrong password stays inline, next tripwire revocation closes modal and sets full-page error",
  );

  const bodyHarness = harness();
  const { PasswordModalBody } = load(
    "components/share/showEnterPasswordModal.tsx",
    {
      react: bodyHarness.hooks,
      "@mantine/core": mantine,
      "../../hooks/useTranslate.hook": translate,
    },
  );
  function find(node, type) {
    if (!node || typeof node !== "object") return;
    if (node.type === type) return node;
    return React.Children.toArray(node.props?.children)
      .map((n) => find(n, type))
      .find(Boolean);
  }
  // The real submit handler must catch the rejection and stop loading.
  const modalProps = {
    submitCallback: async () => {
      throw rejection("wrong_password");
    },
  };
  let tree = bodyHarness.render(PasswordModalBody, modalProps);
  await find(tree, "form").props.onSubmit({ preventDefault() {} });
  tree = bodyHarness.render(PasswordModalBody, modalProps);
  const stackChildren = tree.props.children[1].props.children.props.children;
  assert.equal(stackChildren[0].props.error, "Invalid password");
  assert.equal(stackChildren[1].props.loading, false);
  bodyHarness.dispose();
  console.log(
    "PASS: actual password form renders inline wrong-password error and clears loading",
  );

  let resolveOld;
  const staleHarness = harness();
  const staleService = {
    get: (id) =>
      id === "old"
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({ id: "new", files: [] }),
  };
  const staleHook = load("hooks/shareAccess.hook.ts", {
    react: staleHarness.hooks,
    "../services/share.service": { __esModule: true, default: staleService },
    "../components/share/showEnterPasswordModal": {
      __esModule: true,
      default: () => "",
    },
  }).default;
  staleHarness.render(staleHook, { shareId: "old", modals, t });
  staleHarness.render(staleHook, { shareId: "new", modals, t });
  await flush();
  resolveOld({ id: "old", files: [] });
  await flush();
  assert.equal(
    staleHarness.render(staleHook, { shareId: "new", modals, t }).share.id,
    "new",
  );
  staleHarness.dispose();
  console.log(
    "PASS: late response from previous share cannot replace current route",
  );
  // The page must render terminal states itself and place safety above the file list.
  let access = {
    share: undefined,
    setShare() {},
    isRestricted: false,
    error: undefined,
  };
  const page = load("pages/share/[shareId]/index.tsx", {
    "@mantine/core": mantine,
    "@mantine/modals": { useModals: () => ({}) },
    "next/link": { __esModule: true, default: host("a") },
    "next/router": { useRouter: () => ({ query: {} }) },
    "../../../components/Meta": { __esModule: true, default: () => null },
    "../../../components/share/DownloadAllButton": {
      __esModule: true,
      default: () => null,
    },
    "../../../components/share/FileList": {
      __esModule: true,
      default: () => React.createElement("div", {}, "file-list"),
    },
    "../../../components/share/SafetyCard": {
      __esModule: true,
      default: () => React.createElement("div", {}, "safety-card"),
    },
    "../../../components/share/showShareInformationsModal": {
      __esModule: true,
      default: () => {},
    },
    "../../../hooks/shareAccess.hook": {
      __esModule: true,
      default: () => access,
    },
    "../../../hooks/config.hook": {
      __esModule: true,
      default: () => ({ get: () => "" }),
    },
    "../../../hooks/user.hook": {
      __esModule: true,
      default: () => ({ user: null }),
    },
    "../../../hooks/useTranslate.hook": translate,
    "../../../services/share.service": { __esModule: true, default: {} },
    "../../../utils/toast.util": { __esModule: true, default: {} },
    "../../../components/core/HoverTip": { HoverTip: host("span") },
  }).default;
  const { IntlProvider } = localRequire("react-intl");
  const pageMarkup = () =>
    renderToStaticMarkup(
      React.createElement(
        IntlProvider,
        { locale: "en-US", messages },
        React.createElement(page, { shareId: "test" }),
      ),
    );
  access.error = {
    title: "share.error.removed.title",
    message: "Revoked by owner",
  };
  let pageHtml = pageMarkup();
  assert.match(pageHtml, /This link was revoked/);
  assert.match(pageHtml, /Revoked by owner/);
  assert.ok(!pageHtml.includes("file-list"));
  access.error = undefined;
  access.share = { id: "test", files: [], safety };
  pageHtml = pageMarkup();
  assert.ok(pageHtml.indexOf("safety-card") < pageHtml.indexOf("file-list"));
  access.share = { id: "test", files: [] };
  pageHtml = pageMarkup();
  assert.ok(!pageHtml.includes("safety-card"));
  assert.match(pageHtml, /file-list/);
  console.log(
    "PASS: actual recipient page renders terminal reason, safety before files, and legacy shares without safety",
  );

  // Preserve token success and restricted login behavior while resetting terminal state on route change.
  const flowHarness = harness();
  let fetched = 0,
    issued = 0;
  const flowService = {
    get: async (id) => {
      if (id === "restricted")
        throw rejection("share_restricted_to_recipients");
      if (id === "bad") throw rejection("share_expired");
      if (fetched++ === 0) throw rejection("share_token_required");
      return { id, files: [] };
    },
    getShareToken: async () => {
      issued++;
    },
  };
  const flowHook = load("hooks/shareAccess.hook.ts", {
    react: flowHarness.hooks,
    "../services/share.service": { __esModule: true, default: flowService },
    "../components/share/showEnterPasswordModal": {
      __esModule: true,
      default: () => "",
    },
  }).default;
  flowHarness.render(flowHook, { shareId: "good", modals });
  await flush();
  assert.equal(
    flowHarness.render(flowHook, { shareId: "good", modals }).share.id,
    "good",
  );
  assert.equal(issued, 1);
  flowHarness.render(flowHook, { shareId: "bad", modals });
  await flush();
  assert.equal(
    flowHarness.render(flowHook, { shareId: "bad", modals }).error.title,
    "share.error.expired.title",
  );
  flowHarness.render(flowHook, { shareId: "restricted", modals });
  await flush();
  const restricted = flowHarness.render(flowHook, {
    shareId: "restricted",
    modals,
  });
  assert.equal(restricted.isRestricted, true);
  assert.equal(restricted.error, undefined);
  assert.equal(restricted.share, undefined);
  flowHarness.dispose();
  console.log(
    "PASS: token issuance reloads files, restricted access survives, route change clears old terminal state",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
