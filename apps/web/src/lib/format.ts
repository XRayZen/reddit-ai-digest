export function formatDate(isoDate: string): string {
  // Storybook / test / SSR で表示差分が出ないよう、常に東京タイムゾーンで整形する。
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(isoDate));
}

export function formatDateTime(isoDate: string): string {
  // 管理画面では日付だけでなく時刻も必要だが、固定タイムゾーンは維持する。
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(isoDate));
}
