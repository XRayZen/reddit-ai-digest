export function formatDate(isoDate: string): string {
  // Storybook / test / SSR で表示差分が出ないよう、常に東京タイムゾーンで整形する。
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(isoDate));
}
