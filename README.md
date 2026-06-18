<p align="center">
    <img height="250" width="250" src="public/logo.png">
</p>
<h1 align="center">LISTPOT</h1>
<p align="center">観たい映画のリストを作成・管理するためのWebアプリケーション</p>

配信サービスからタイトルと視聴URLを入力することで、一元化されたリストを作成します。

以下の配信サービスに対応しています。

- Netflix
- Prime Video
- Disney+
- Hulu
- U-NEXT

oonawaの個人プロジェクトであり、個人的な利用とソフトウェア開発の学習を兼ねて開発しています。

## 主な機能

- メールアドレス＋認証コードによるパスワードレスの認証（JWT＋Cookie）
- 配信サービスの共有リンクを使ったリスト登録
- TMDB API と連携した映画情報の検索 ＆ 取得
- リストからランダムに一本を抽選
- LocalStorageによるユーザー登録なしでの利用

## ローカル環境構築

Next.js / Turso / Vercel のフルスタックな構成になっています。

### 環境変数

Next.js の規約に従い、ローカル開発では `.env`、テスト実行では `.env.test` を読み込みます。

- `.env` — `.gitignore` 済み。各自で作成する
- `.env.test` — リポジトリにコミット済み。`npm run test` / `npm run test:e2e` で自動的に読み込まれる

> ⚠️ `.env.test` はテスト専用の値（ローカル SQLite ＋ ダミー API キー）です。リポジトリ公開済みのため、**`.env` や本番（Vercel など）で同じ値を流用してはいけません**。特に `JWT_SECRET` / `ENCRYPTION_KEY` / `HMAC_SECRET` は環境ごとに必ず別の値を設定してください。

#### `.env`（ローカル開発用）

| 変数名 | 用途 | 内容 |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | 接続先 DB の指定 | `file:local.db` |
| `RESEND_API_KEY` | 認証メール送信 | [Resend](https://resend.com/) で発行 |
| `TMDB_API_KEY` | 映画情報の取得 | [TMDB](https://www.themoviedb.org/?language=ja) で発行 |
| `JWT_SECRET` | セッショントークン署名 | `openssl rand -hex 64` |
| `ENCRYPTION_KEY` | メールアドレス暗号化（AES-256-GCM） | `openssl rand -hex 32` |
| `HMAC_SECRET` | メールアドレスの HMAC インデックス | `openssl rand -hex 32` |
| `COOKIE_SECURE` | Cookie の Secure 属性 | 既定 `true`。ローカルで `http` を使う場合のみ `false` |

#### `.env.test`（テスト実行用）

リポジトリにコミット済みのため、クローン後そのままテストが動きます。値はテスト専用で、外部サービスには接続しません。

| 変数名 | 値 | 備考 |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | `file:local.test.db` | ローカル SQLite |
| `RESEND_API_KEY` | `re_test_dummy` | ダミー値（実際には送信されない） |
| `COOKIE_SECURE` | `false` | HTTP のテストサーバー向け |
| `JWT_SECRET` / `ENCRYPTION_KEY` / `HMAC_SECRET` | テスト用ランダム値 | 本番・ローカル開発と必ず異なる値で固定 |

### リポジトリをクローン

1. リポジトリをクローン（`git clone https://github.com/oonawa/listpot.git`）
2. 依存関係をインストール（`npm install`）
3. ルートへ`local.db`を作成
4. 環境変数をセット
5. 開発サーバーを起動（`npm run dev` or `make dev`）
6. データベースをマイグレーション（`npm run db:migrate` or `make migrate`）
7. マスタテーブルへレコードを登録（`npm run db:seed` or `make seed`）
8. `https://localhost:3000`をブラウザで開く

<br>

> ⚠️開発サーバーは`https`化しています。

## AIの利用ポリシー

このプロジェクトでは開発にClaude Codeを使用しています。
しかし設計（再設計）・リファクタリングの多くは開発者自身で行なっています。

生成されたコードは、基本的に開発者によるレビュー / リファクタリングを受けます。

## 開発フロー

### タスク管理
- 追加や修正の内容はIssueへ書き出す。
- 新規機能など、影響範囲の大きい作業はなるべくSub Issueへ分割する。
- ローカルではIssue（Sub Issue）ごとにブランチを作成する。
    - タスクがSub Issueへ分割される場合は、main > 親Issue > Sub Issueとして作成する。
    - ブランチ名は新規追加なら`feat/#Issue番号`・修正なら`fix/#Issue番号`とする。

### Git運用
- コミットはコメントへプレフィックスをつける。
    - feat: 追加
    - fix: 修正
    - ref: 振る舞いの変わらないリファクタリング
    - test: テストコードの追加
- 適宜Claude Codeへレビューを依頼し、コードの品質をチェックする。
- リモートへプッシュする際はコミットをスカッシュする。
    - `git rebase -i HEAD~{コミット数}`
    - 単一Issueなら`main`・Sub Issue なら 親IssueのブランチへPRを作成する。

## 設計ポリシー

`/features` へ機能のカテゴリ別にディレクトリを作成します。ディレクトリ内では責務ごとに層を分けます。actions → services → repositories の順でバックエンド処理が流れ、全層で共通の `Result` 型（`success: boolean`）を返します。

詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

## 自動テストのポリシー

「テストサイズ」を用いて分類し、Medium テストを中心に実装します。Action 層を起点に DB まで一気通貫でテストします。

詳細は [docs/testing.md](docs/testing.md) を参照してください。
