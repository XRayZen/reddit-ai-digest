import { getContentApiMode, liveContentApi } from "@/lib/api/live-content-api";
import { mockContentApi } from "@/lib/api/mock-content-api";
import type { ContentApi } from "@/lib/api/types";

export function resolveContentApi(): ContentApi {
  // page / component からは fixture と実 API の違いを見せず、
  // 差し替え境界をこの層に閉じ込める。
  return getContentApiMode() === "live" ? liveContentApi : mockContentApi;
}
