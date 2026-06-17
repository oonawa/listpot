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

`.env`と`.env.test`を使います。

#### `.env`

| 変数名 | 用途 | 内容 |
| --- | --- | --- |
| RESEND_API_KEY | 認証時のメール送信 | [Resend](https://resend.com/)で発行 |
| TMDB_API_KEY | 詳細な映画情報の取得 | [TMDB](https://www.themoviedb.org/?language=ja)で発行 |
| TURSO_DATABASE_URL | アプリケーションが接続するデータベースの指定 | `file:local.db` |
| JWT_SECRET | セッションごとに発行されるトークンの検証 | ランダム文字列を指定 or `openssl rand -hex 64`などで作成

#### `.env.test`

| 変数名 | 用途 | 内容 |
| --- | --- | --- |
| TURSO_DATABASE_URL | アプリケーションが接続するデータベースの指定 | `file:local.test.db` |
| JWT_SECRET | セッションごとに発行されるトークンの検証 | ランダム文字列を指定 or `openssl rand -hex 64`などで作成

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
