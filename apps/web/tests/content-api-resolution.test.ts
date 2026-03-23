import { resolveContentApi } from "@/lib/api/resolve-content-api";
import { liveContentApi } from "@/lib/api/live-content-api";
import { mockContentApi } from "@/lib/api/mock-content-api";

describe("content api resolution", () => {
  const originalMode = process.env.CONTENT_API_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.CONTENT_API_MODE;
    } else {
      process.env.CONTENT_API_MODE = originalMode;
    }
  });

  it("defaults to the mock adapter", () => {
    delete process.env.CONTENT_API_MODE;

    expect(resolveContentApi()).toBe(mockContentApi);
  });

  it("uses the live adapter only when explicitly requested", () => {
    process.env.CONTENT_API_MODE = "live";

    expect(resolveContentApi()).toBe(liveContentApi);
  });
});
