import { resolveContentApi } from "@/lib/api/resolve-content-api";
import { liveContentApi } from "@/lib/api/live-content-api";
import { mockContentApi } from "@/lib/api/mock-content-api";

describe("content api resolution", () => {
  const originalMode = process.env.CONTENT_API_MODE;

  afterEach(() => {
    // resolveContentApi の既定動作を正しく見るため、env は必ず元に戻す。
    if (originalMode === undefined) {
      delete process.env.CONTENT_API_MODE;
    } else {
      process.env.CONTENT_API_MODE = originalMode;
    }
  });

  it("defaults to the mock adapter", () => {
    // FE 先行フェーズでは backend 未接続でも画面が壊れないことを優先する。
    delete process.env.CONTENT_API_MODE;

    expect(resolveContentApi()).toBe(mockContentApi);
  });

  it("uses the live adapter only when explicitly requested", () => {
    process.env.CONTENT_API_MODE = "live";

    expect(resolveContentApi()).toBe(liveContentApi);
  });
});
