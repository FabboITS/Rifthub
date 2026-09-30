import "@testing-library/jest-dom/vitest";

// Recharts' ResponsiveContainer needs ResizeObserver, missing in jsdom.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Node >= 25 ships an experimental global localStorage that shadows jsdom's and is unusable
// without --localstorage-file: replace it with an in-memory store.
if (typeof globalThis.localStorage?.clear !== "function") {
  const store = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
  });
}

// jsdom has no PointerEvent: without it fireEvent.pointer* drops clientX.
globalThis.PointerEvent ??= class PointerEvent extends MouseEvent {
  constructor(type, props = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
};
