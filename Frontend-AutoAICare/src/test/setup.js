import "@testing-library/jest-dom/vitest";

// Suppress React Router future flag warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress React Router future flag warnings
  if (
    args[0]?.includes?.("React Router Future Flag") ||
    args[0]?.includes?.("v7_startTransition") ||
    args[0]?.includes?.("v7_relativeSplatPath")
  ) {
    return;
  }
  originalWarn(...args);
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});
