# ローカルDBの永続化仕様

## 概要

ローカル開発環境のMySQLデータは、Dockerの命名付きボリューム（Named Volume）によって永続化されています。

## Docker Volume の仕組み

```mermaid
flowchart TB
    subgraph Dockerホスト
        subgraph MySQLコンテナ
            A[MySQLプロセス]
            B[/var/lib/mysql<br/>データディレクトリ/]
        end

        subgraph Docker Volume
            C[mysql-data<br/>永続ボリューム]
        end

        B <--->|マウント| C
    end

    D[ホストマシン<br/>/var/lib/docker/volumes/] --> C
```

**ポイント**: コンテナが削除されても、Volume `mysql-data` は残り続けるためデータが保持されます。

---

## コマンド別の挙動

| コマンド | コンテナ | Volume | データ | 用途 |
|----------|----------|--------|--------|------|
| `docker compose up` | 作成/起動 | 残る | **残る** | 開発時の起動 |
| `docker compose down` | 削除 | 残る | **残る** | 開発終了時 |
| `docker compose down -v` | 削除 | **削除** | **消える** | クリーン再構築 |
| `check-all-local.sh` | - | - | **毎回消える** | CI/セルフチェック |

---

## シーケンス図

### 通常の起動・停止（データ永続）

```mermaid
sequenceDiagram
    participant Dev as 開発者
    participant DC as Docker Compose
    participant C as MySQLコンテナ
    participant V as mysql-data<br/>Volume

    Note over Dev,V: 【パターン1】通常の起動・停止（データ永続）

    Dev->>DC: docker compose up -d
    DC->>C: コンテナ作成・起動
    C->>V: Volumeをマウント
    V-->>C: 既存データあれば読み込み

    Note over C: データ変更/追加

    Dev->>DC: docker compose down
    DC->>C: コンテナ停止・削除
    Note over V: ✅ Volumeは残る（データ保持）

    Dev->>DC: docker compose up -d
    DC->>C: 新しいコンテナ作成
    C->>V: 同じVolumeをマウント
    V-->>C: 前回のデータを復元
```

### check-all-local.sh の挙動

```mermaid
sequenceDiagram
    participant Dev as 開発者
    participant DC as Docker Compose
    participant C as MySQLコンテナ
    participant V as mysql-data<br/>Volume

    Note over Dev,V: 【パターン2】check-all-local.sh の挙動

    Dev->>DC: down -v
    DC->>C: コンテナ停止・削除
    DC->>V: ❌ Volumeも削除
    Note over V: データ完全消去

    Dev->>DC: up -d mysql
    DC->>C: 新しいコンテナ作成
    C->>V: 新しいVolume作成
    V-->>C: 空の状態

    Dev->>DC: migrate & seed 実行
    C->>V: スキーマ作成
    C->>V: テストデータ投入

    Dev->>DC: E2Eテスト実行
    C->>V: テスト用データ操作

    Dev->>DC: down -v（cleanup）
    DC->>V: ❌ Volume削除
    Note over V: 次回もクリーンな状態から
```

---

## 開発時の運用

### データを残したい通常の開発

```bash
# 起動
docker compose -f infra/compose/docker-compose.yml up -d

# 停止（データは残る）
docker compose -f infra/compose/docker-compose.yml down

# 再起動（前回のデータが残っている）
docker compose -f infra/compose/docker-compose.yml up -d
```

### データを完全に消したい時

```bash
# Volumeごと削除
docker compose -f infra/compose/docker-compose.yml down -v
```

---

## Volumeの確認方法

```bash
# Volume一覧表示
docker volume ls

# mysql-dataの詳細
docker volume inspect reddit-ai-digest_mysql-data

# Volumeを手動で削除したい時
docker volume rm reddit-ai-digest_mysql-data
```

---

## 関連ファイル

- [docker-compose.yml](../../infra/compose/docker-compose.yml) - Volume定義
- [check-all-local.sh](../../apps/api/scripts/check-all-local.sh) - CIスクリプト（`down -v`使用）
