import { render } from "@testing-library/react";

import { AuroraBackground } from "@/components/aurora-background";

describe("AuroraBackground", () => {
  it("aria-hidden でアクセシビリティツリーに露出しない", () => {
    const { container } = render(<AuroraBackground />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("4 層の aurora レイヤーと 1 枚の veil が描画される", () => {
    const { container } = render(<AuroraBackground />);
    const layers = container.querySelectorAll(".aurora-layer");
    const veils = container.querySelectorAll(".aurora-veil");
    expect(layers).toHaveLength(4);
    expect(veils).toHaveLength(1);
  });

  it("pointer-events: none がラッパーに設定されている", () => {
    const { container } = render(<AuroraBackground />);
    const wrapper = container.firstElementChild as HTMLElement;
    // Tailwind の pointer-events-none が適用されているか class で確認する。
    expect(wrapper.className).toContain("pointer-events-none");
  });
});
