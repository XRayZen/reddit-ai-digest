import { themeDetailResponse, themesResponse } from "@/mocks/handlers";
import { getThemeFixture, listThemes } from "@/mocks/fixtures/content-fixtures";

describe("mock handlers", () => {
  it("returns the same themes as the mock adapter source", async () => {
    // handler と app-facing mock client が同じ fixture 境界を共有していることを確認する。
    const response = await themesResponse();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(listThemes());
  });

  it("returns 404 for missing resources", async () => {
    // MSW 経由でも not-found 契約が崩れないことを確認する。
    const response = await themeDetailResponse("missing");

    expect(response.status).toBe(404);
  });

  it("returns the same payload as the fixture for known resources", async () => {
    // ブラウザモックと direct fixture 参照の内容差分を防ぐ。
    const response = await themeDetailResponse("software-engineering");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      getThemeFixture("software-engineering"),
    );
  });
});
