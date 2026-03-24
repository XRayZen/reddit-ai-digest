import { render, screen } from "@testing-library/react";

import { Reveal } from "@/components/reveal";

describe("Reveal", () => {
  it("keeps content visible before the in-view observer resolves", () => {
    // hydration 前後でも主要コンテンツを空白にしないことを DOM 上の初期 style で見る。
    render(
      <Reveal>
        <div>visible content</div>
      </Reveal>,
    );

    expect(screen.getByText("visible content").parentElement).not.toHaveStyle({
      opacity: "0",
    });
  });
});
