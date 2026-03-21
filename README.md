# Ads Checker - Meta広告ダッシュボード

Meta広告のデータ取得からDB保存、複数ダッシュボード表示までを行う基盤システムです。

## 全体構成

```
Meta Ads API → Python ETL → Neon (PostgreSQL) → FastAPI → Next.js Dashboard
                                                              ↓
                                                     OpenClaw (Slack連携)
```

### データフロー

```
[Meta API] → raw_meta_daily (生データ) → fact_ad_daily (正規化) → mart_*_daily (集計済み)
```

### DB 3層構造

| 層 | テーブル | 目的 |
|---|---|---|
| raw | raw_meta_daily | API生レスポンスの保存 |
| fact | fact_ad_daily | 正規化された広告実績 |
| mart | mart_summary_daily, mart_campaign_daily, mart_creative_daily, mart_period_summary | 集計済みデータ |

## ディレクトリ構成

```
ads_checker/
  backend/
    app/
      main.py            # FastAPI アプリ
      config.py           # 環境変数読み込み
      db.py               # DB接続
      logger.py           # ログ設定
      connectors/
        meta_ads.py       # Meta API コネクタ
      services/
        normalizer.py     # raw → fact 変換
        aggregator.py     # fact → mart 集計
      cli/
        commands.py       # CLI コマンド
    tests/
    requirements.txt
  frontend/
    app/
      dashboard/
        summary/          # Summary Dashboard
        daily/            # Daily Trend Dashboard
        campaign/         # Campaign Dashboard
        creative/         # Creative Dashboard
    components/
    lib/
    package.json
  infra/
    schema.sql
    docker-compose.yml
    Dockerfile.backend
    Dockerfile.frontend
  .env.example
  README.md
```

## ローカル起動手順

### 1. リポジトリのクローンと環境変数設定

```bash
git clone <repo-url>
cd ads_checker
cp .env.example .env
# .env を編集して実際の値を入れる
```

### 2. Backend 起動

```bash
cd backend
pip install -r requirements.txt
# DB スキーマ初期化（初回のみ）
python -c "from app.db import init_schema; init_schema()"
# サーバー起動
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend 起動

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000 でアクセス
```

### 4. Docker で起動する場合

```bash
cd infra
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

## Neon の接続設定

1. [Neon](https://neon.tech/) でアカウント作成
2. 新しいプロジェクトを作成
3. ダッシュボードの「Connection Details」から接続文字列をコピー
4. `.env` の `DATABASE_URL` に貼り付け

```
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/ads_checker?sslmode=require
```

## Meta API の超初心者向け取得手順

**ゴール**: Meta の広告データを API で取得するために必要な `META_ACCESS_TOKEN` と `META_AD_ACCOUNT_ID` を手に入れること。

---

### Step 1: Meta for Developers に登録する

1. https://developers.facebook.com/ にアクセス
2. Facebook アカウントでログイン
3. 「スタート」または「Get Started」をクリック
4. 開発者規約に同意
5. 電話番号の認証を求められたら認証する

> 💡 これをしないと App Dashboard に進めません。

---

### Step 2: App を作成する

1. https://developers.facebook.com/apps/ にアクセス
2. 「アプリを作成」(Create App) をクリック
3. **App type は「Business」を選択** (広告データ取得にはこれが最適)
4. アプリ名を入力（例: `ads-checker`）
5. ビジネスポートフォリオを選択（なければ作成を求められます）
6. 「アプリを作成」をクリック

---

### Step 3: App を Business に紐づける

1. https://business.facebook.com/settings/ にアクセス
2. 左メニュー「アカウント」→「アプリ」を選択
3. 「追加」→ Step 2 で作ったアプリを追加

---

### Step 4: System User を作成する

1. https://business.facebook.com/settings/ にアクセス
2. 左メニュー「ユーザー」→「システムユーザー」を選択
3. 「追加」をクリック
4. 名前を入力（例: `ads-checker-bot`）
5. 役割は「管理者」を選択
6. 「システムユーザーを作成」をクリック

> 💡 System User はボット用のアカウントです。個人ユーザーの token より安定しています。

---

### Step 5: System User に広告アカウントを追加する

1. 作成した System User をクリック
2. 「アセットを追加」をクリック
3. 「広告アカウント」を選択
4. 対象の広告アカウントにチェックを入れる
5. 「変更を保存」

---

### Step 6: Token を発行する

1. System User の画面で「新しいトークンを生成」をクリック
2. Step 2 で作った App を選択
3. 以下の権限にチェックを入れる:
   - **ads_read** (必須)
   - business_management (推奨)
4. 「トークンを生成」をクリック
5. **表示されたトークンを必ずコピーして安全な場所に保存する**

> ⚠️ トークンは一度しか表示されません！ 閉じたら再生成が必要です。

---

### Step 7: 広告アカウント ID を確認する

1. https://business.facebook.com/settings/ →「アカウント」→「広告アカウント」
2. 対象アカウントをクリック
3. 「広告アカウント ID」をコピー（数字のみ）
4. `.env` には `act_` を付けて記入:

```
META_AD_ACCOUNT_ID=act_123456789
```

---

### Step 8: .env に値を設定する

```env
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxx
META_AD_ACCOUNT_ID=act_123456789
META_API_VERSION=v21.0
```

---

### Step 9: テスト疎通を実行する

```bash
cd backend
python -m app.cli.commands verify-meta-connection
```

成功すると以下のように表示されます:

```
=== Verifying Meta API Connection ===
  OK: account_name=MyAdAccount account_id=123456789
      currency=JPY status=1
=== Verifying Database Connection ===
  OK: Database connected
All connections verified!
```

## CLI コマンド一覧

すべてのコマンドは `backend/` ディレクトリから実行します。

```bash
# Meta API 疎通確認
python -m app.cli.commands verify-meta-connection

# データ取得（raw保存）
python -m app.cli.commands fetch-meta --start 2026-03-01 --end 2026-03-31

# 正規化（raw → fact）
python -m app.cli.commands normalize-meta

# 集計（fact → mart）
python -m app.cli.commands aggregate-meta --start 2026-03-01 --end 2026-03-31

# 全パイプライン実行（fetch → normalize → aggregate）
python -m app.cli.commands run-meta-report --start 2026-03-01 --end 2026-03-31

# ダッシュボード URL 生成（OpenClaw用）
python -m app.cli.commands build-report-url --dashboard summary --start 2026-03-01 --end 2026-03-31
```

## ダッシュボード URL 一覧

| ダッシュボード | URL | 目的 |
|---|---|---|
| Summary | `/dashboard/summary?start=YYYY-MM-DD&end=YYYY-MM-DD` | 全体サマリー |
| Daily Trend | `/dashboard/daily?start=YYYY-MM-DD&end=YYYY-MM-DD` | 日別推移 |
| Campaign | `/dashboard/campaign?start=YYYY-MM-DD&end=YYYY-MM-DD` | キャンペーン比較 |
| Creative | `/dashboard/creative?start=YYYY-MM-DD&end=YYYY-MM-DD&campaign_id=123` | クリエイティブ比較 |

- `start` / `end` 未指定の場合、直近30日がデフォルト
- すべてのダッシュボードで期間フィルタが使用可能

## OpenClaw 呼び出し例

OpenClaw は以下の流れで使います:

1. Slack でコマンドを受ける
2. `build-report-url` で URL を生成する
3. ブラウザで URL を開く
4. スクショを撮る
5. Slack チャンネルに投稿する

### URL 生成コマンドの例

```bash
# サマリー（直近30日）
python -m app.cli.commands build-report-url --dashboard summary

# 特定期間のキャンペーン比較
python -m app.cli.commands build-report-url --dashboard campaign --start 2026-03-01 --end 2026-03-31

# 特定キャンペーンのクリエイティブ比較
python -m app.cli.commands build-report-url --dashboard creative --start 2026-03-01 --end 2026-03-31 --campaign-id 123456

# 本番 URL を指定
python -m app.cli.commands build-report-url --dashboard summary --base-url https://ads.example.com
```

### OpenClaw 側の実装例（参考）

```python
# OpenClaw が build-report-url を呼び出す例
import subprocess

result = subprocess.run(
    ["python", "-m", "app.cli.commands", "build-report-url",
     "--dashboard", "summary", "--start", "2026-03-01", "--end", "2026-03-31"],
    capture_output=True, text=True, cwd="/path/to/ads_checker/backend"
)
url = result.stdout.strip()
# → url を使ってスクショ処理
```

## よくあるエラー

### `OAuthException: Invalid OAuth access token`
- **原因**: TOKEN が間違っている、または期限切れ
- **対処**: Business Settings → System Users → 新しいトークンを再生成

### `Error validating access token: The user has not authorized application`
- **原因**: App が Business に紐づいていない
- **対処**: Business Settings → アプリ → 対象アプリを追加

### `(#100) Missing permissions`
- **原因**: Token に `ads_read` 権限がない
- **対処**: Token を再生成する際に `ads_read` にチェック

### `(#2635) You are calling a deprecated version of the Ads API`
- **原因**: API バージョンが古い
- **対処**: `.env` の `META_API_VERSION` を最新に変更（例: `v21.0`）

### `(#803) Some of the aliases you requested do not exist`
- **原因**: `META_AD_ACCOUNT_ID` が間違っている
- **対処**: `act_` prefix が付いているか確認。数字部分も確認

### `Database connection failed`
- **原因**: Neon の接続文字列が間違い、またはプロジェクトが停止中
- **対処**: Neon ダッシュボードで接続文字列を再確認。プロジェクトが Active か確認

### `permission denied for table`
- **原因**: スキーマが未初期化
- **対処**: `python -c "from app.db import init_schema; init_schema()"`

### 自分以外の広告アカウントでエラーが出る
- **原因**: Standard Access では自分のアカウントしかアクセスできない
- **対処**: App Review で Advanced Access を申請する

## 今後の拡張案

- [ ] Google Ads コネクタ追加 (`source = "google"`)
- [ ] Yahoo 広告コネクタ追加 (`source = "yahoo"`)
- [ ] アフィリエイト ASP 連携 (`source = "affiliate"`)
- [ ] 定期実行（cron / Cloud Scheduler）
- [ ] アラート機能（CPA が閾値を超えたら Slack 通知）
- [ ] データエクスポート（CSV / Excel ダウンロード）
- [ ] ユーザー認証（ログイン機能）
- [ ] マルチアカウント対応
- [ ] A/B テスト分析ダッシュボード
- [ ] 予算消化ペースの可視化
