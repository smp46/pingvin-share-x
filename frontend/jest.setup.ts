// Adds the dom matchers (toBeInTheDocument, toHaveAttribute and friends) that
// the component tests read much better with.
import "@testing-library/jest-dom";

// jsdom does not provide these, and react-dom/server needs them. Without it a
// test cannot render the way the server does, which is the only way to check
// that a component agrees with itself across hydration.
import { TextDecoder, TextEncoder } from "util";

Object.assign(globalThis, { TextEncoder, TextDecoder });
