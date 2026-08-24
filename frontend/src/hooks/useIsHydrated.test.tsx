import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useIsHydrated } from "./useIsHydrated.hook";

const Probe = () => <span data-testid="v">{String(useIsHydrated())}</span>;

describe("useIsHydrated", () => {
  it("is false while rendering on the server", () => {
    expect(renderToString(<Probe />)).toContain("false");
  });

  it("is true once rendering in the browser", () => {
    render(<Probe />);
    expect(screen.getByTestId("v")).toHaveTextContent("true");
  });
});
