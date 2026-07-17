import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useHydrated } from "@/hooks/use-hydrated";

const HydrationProbe = () => (
  <output>{useHydrated() ? "hydrated" : "server"}</output>
);

describe("useHydrated", () => {
  it("uses the server snapshot during SSR", () => {
    expect(renderToString(<HydrationProbe />)).toContain("server");
  });

  it("reports ready for a component mounted in an existing client tree", () => {
    render(<HydrationProbe />);

    expect(screen.getByText("hydrated")).toBeInTheDocument();
  });
});
