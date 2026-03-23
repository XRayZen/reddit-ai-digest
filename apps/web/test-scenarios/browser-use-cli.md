# Browser Use CLI シナリオ

`apps/web` のローカル UI を Browser Use CLI で確認するための手順です。

## 前提

- Python 3.11+
- `uv`
- `browser-use`
- `apps/web` が `http://127.0.0.1:3000` で起動している

このリポジトリで確認したセットアップ:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv tool install browser-use
browser-use install
browser-use doctor
browser-use setup --mode local --yes
```

この環境では Chromium sandbox を有効のままにすると `open/state/screenshot` が待ち状態のまま戻らないため、
以降は `apps/web/scripts/browser-use-local.sh` を使う。

## シナリオ 1: ホーム

```bash
./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000
sleep 2
./apps/web/scripts/browser-use-local.sh --session webcheck state
./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/home.png
```

確認ポイント:

- `Reddit AI Digest` ヘッダが見える
- `テーマ一覧` セクションが見える
- 4 テーマのカードが見える

## シナリオ 2: テーマ詳細

```bash
./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000/themes/software-engineering
sleep 2
./apps/web/scripts/browser-use-local.sh --session webcheck state
./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/theme-software-engineering.png
```

確認ポイント:

- `Software Engineering` 見出しが見える
- `並び替え` と `フィルタ` の UI が見える
- 記事カード一覧が見える

## シナリオ 3: 記事詳細

```bash
./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000/articles/se-001
sleep 2
./apps/web/scripts/browser-use-local.sh --session webcheck state
./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/article-se-001.png
```

確認ポイント:

- 元スレタイトルが見える
- `翻訳` と `要約` セクションが見える
- `主要論点` と `原文スレッド` リンクが見える

## シナリオ 4: 管理画面

```bash
./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000/admin
sleep 2
./apps/web/scripts/browser-use-local.sh --session webcheck state
./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/admin.png
./apps/web/scripts/browser-use-local.sh --session webcheck close
```

確認ポイント:

- `収集実行` ボタンが見える
- `再要約実行` ボタンが見える
- `ジョブ一覧` テーブルが見える
