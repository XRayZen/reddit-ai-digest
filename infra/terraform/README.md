# infra/terraform

## 目的
このディレクトリは、本プロジェクトの
AWS インフラを Infrastructure as Code として管理する場所です。

対象:
- ECS
- RDS
- S3
- CloudFront
- WAF
- Route 53
- Secrets 管理
- 監視関連リソース

関連ドキュメント:
- `../../AGENTS.md`
- `../../docs/architecture/overview.md`
- `../../docs/architecture/observability.md`
- `../../docs/adr/architecture-decisions.md`
- `../../docs/development/coding-rules-common.md`

---

## 基本方針
- Terraform を IaC の正本として扱う
- root module と child modules の構成を前提にする
- 再利用可能な単位は `modules/` に切り出す
- 環境差分は `envs/` 側で管理する
- モジュールは責務ごとに小さく分ける
- 本番運用を意識しつつ、MVP では過度な一般化を避ける

---

## 想定ディレクトリ構成

```text
infra/terraform/
├── README.md
├── envs/
│   ├── dev/
│   └── prod/
└── modules/
    ├── network/
    ├── ecs-service/
    ├── rds/
    ├── s3/
    ├── cloudfront/
    ├── waf/
    ├── route53/
    ├── secrets/
    └── observability/
```

---

## 使い分け

`envs/`
- 環境ごとの root module
- `dev` / `prod` などの差分を管理する
- module 呼び出しと環境変数設定を持つ

`modules/`
- 再利用可能な child module
- ネットワーク、ECS、RDS など責務単位で分ける
- 単一責務を意識する

---

## 設計ルール
- 環境差分を module に埋め込みすぎない
- module は責務ごとに分割する
- 変数、出力、README を揃える
- resource 名と module 名は責務が分かるようにする
- secrets をコードへ直書きしない
- 破壊的変更は意図を明示する

---

## このディレクトリでよくある作業
- ECS サービス追加
- RDS 設定変更
- CloudFront / S3 設定追加
- WAF ルール追加
- Route 53 / ACM 関連変更
- CloudWatch / 監視リソース追加

---

## 実行の基本フロー

例:

```bash
terraform fmt
terraform validate
terraform plan
terraform apply
```

環境ごとに対象ディレクトリへ移動して実行する。

例:

```bash
cd envs/dev
terraform init
terraform plan
```

---

## module 設計の考え方
- まとめて管理したいリソース群を1 module とする
- 再利用性があるものを切り出す
- module を細かくしすぎない
- root module は環境構成の読みやすさを優先する
- child module は入力と出力を明確にする

---

## やってはいけないこと
- すべてを巨大な root module に詰め込むこと
- secrets を tf ファイルへ直書きすること
- module の責務を曖昧にすること
- plan を確認せずに apply すること
- 環境差分を無秩序にコピペで増やすこと

---

## 完了条件
- `fmt` と `validate` が通る
- plan の差分意図を説明できる
- module / envs の責務が明確である
- docs 更新が反映されている
- セルフレビュー済みである
