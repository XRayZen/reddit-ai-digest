---
name: commit
description: |
  変更をレビュアーが理解しやすい単位で分割してコミット
  コミットメッセージは日本語で、.gitignore で除外されているファイルは対象外とする。
disable-model-invocation: true
allowed-tools: Bash(git *)
---

# Commit Skill

変更をレビュアーが理解しやすい単位で分割してコミット

## 目的

- レビュアーが理解しやすい単位で変更をグループ化
- 意味ある単位ごとにコミットを分割する
- 一つにまとめないで、複数のコミットに分割する
- 日本語のコミットメッセージで一貫性を確保
- .gitignore 対象外のファイルのみをコミット
- コミットコマンドを実行する前に、必ずプランを先に提示する

## 除外対象ファイルパターン

以下のファイルはコミット対象外とする（.gitignore に基づく）：

### 依存関係
- `node_modules/`, `.pnp`, `.pnp.js`, `.pnpm-store` - Node.js 依存関係

### ビルド artifacts
- `.next/`, `out/`, `build/`, `dist/`, `.swc/` - Next.js/ビルド出力
- `*.tsbuildinfo` - TypeScript ビルド情報
- Go: `*.exe`, `*.dll`, `*.so`, `*.dylib`, `*.test`, `*.out`, `/bin/` - Go ビルド出力

### IDE・エディタ設定
- `.vscode/`, `.idea/` - VSCode/IntelliJ 設定
- `*.swp`, `*.swo`, `*~` - Vim スワップファイル

### 環境変数・認証情報
- `.env`, `.env*.local`, `.envrc` - 環境変数ファイル
- `/secrets/`, `*.key`, `*.pem` - シークレット・認証情報

### Terraform
- `*.tfstate`, `*.tfstate.*`, `*.tfvars` - Terraform 状態・変数
- `.terraform/`, `.terraform.lock.hcl` - Terraform キャッシュ

### ログ・カバレッジ
- `log/`, `*.log`, `logs/` - ログファイル
- `coverage/`, `*.cover`, `*.coverprofile`, `*.out` - カバレッジレポート

### テスト・一時ファイル
- `apps/web/test-results/`, `apps/web/playwright-report/` - テスト結果
- `apps/web/artifacts/*` - Storybook artifacts（.gitkeep 除く）
- `/tmp/` - 一時フォルダ

### その他
- `.DS_Store` - macOS システムファイル
- `go.work` - Go workspace ロックファイル

## コミット手順

1. **変更の確認**
   ```bash
   git status
   git diff
   ```

2. **除外対象ファイルの除外**
   - 上記の除外対象ファイルパターンに一致するファイルを除外
   - .gitignore で除外されているファイルを除外

3. **変更のグループ化**
   Claude が変更内容を分析し、レビュアーにとって意味のある単位でグループ化する：
   - モノレポのパッケージ単位（apps/web, apps/api, apps/worker, packages/）を考慮
   - 機能的な関連性を考慮
   - 同じ機能・API・ユースケースに関連する変更をまとめる
   - 変更の規模や依存関係を考慮

4. **コミットメッセージの作成**
   グループごとに日本語コミットメッセージを作成する：
   - 既存のコミット履歴（`git log`）を参考にする
   - 簡潔で分かりやすい表現にする
   - 1行で概要が伝わるようにする

5. **ステージングとコミット**
   ```bash
   git add <files>
   git commit -m "<message>"
   ```

## コミットメッセージのガイドライン

### 形式
既存パターンに従い、簡潔に記述する：

**既存のコミットメッセージ例**（git log より）:
- `FE初期実装`
- `ドキュメント追加`
- `初期ドキュメント追加`

**ガイドライン**:
- 機能名や概要が分かる日本語表現
- 1行で概要が伝わるようにする
- 既存のコミット履歴と一貫性を保つ

### Co-Authored-By の追加

各コミットメッセージの最後に以下を追加する：

```

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**最終的なコミットメッセージ例**:
```
記事一覧画面の実装

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

## 使用方法

### 基本的な使用方法
```bash
/commit
```

変更を自動分析して、適切なグループでコミットを作成する。

### 引数を指定する場合
```bash
/commit "認証機能の修正"
```

指定したメッセージでコミットを作成する。

## 注意事項

- **手動実行のみ**: このスキルはユーザーが手動で実行することを想定している（`disable-model-invocation: true`）
- **レビュー**: コミット前に作成されるコミットメッセージを確認し、必要に応じて修正する
- **グループ化**: 変更の規模に応じて、複数のコミットに分けることを検討する
- **モノレポ考慮**: パッケージ間の変更が関連する場合は、まとめてコミットすることも検討する
