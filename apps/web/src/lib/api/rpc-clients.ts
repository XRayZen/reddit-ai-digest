import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";

import { ArticleService } from "@proto/article/v1/article_pb";
import { ThemeService } from "@proto/theme/v1/theme_pb";

function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
    httpVersion: "1.1",
    useBinaryFormat: false,
  });
}

export function createThemeServiceClient(baseUrl: string) {
  return createClient(ThemeService, createTransport(baseUrl));
}

export function createArticleServiceClient(baseUrl: string) {
  return createClient(ArticleService, createTransport(baseUrl));
}
