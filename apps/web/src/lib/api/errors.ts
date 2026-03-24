export class ApiNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    // UI 側では status code ではなく意味単位で 404 を扱いたいので専用型に分ける。
    this.name = "ApiNotFoundError";
  }
}

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    // transport 由来の失敗は status を保持し、画面・ログ・テストの判断材料に残す。
    this.name = "ApiRequestError";
    this.status = status;
  }
}
