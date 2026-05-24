# テスト方針

## テストサイズの定義

| サイズ | 定義 |
| --- | --- |
| Small | 単一プロセスで実行可能なテスト |
| Medium | 単一マシン内で実行可能なテスト（外部リソースに依存しない） |
| Large | マシン外のリソース（外部 API・外部メールサーバーなど）に依存するテスト |

## 実装方針

**Medium テストを中心に実装する。**

- Action 層を起点に action → service → repository → テスト用 DB まで一気通貫でテストする。
- テストファイルは Action の `.ts` ファイルのすぐ隣に置く。
  - 例: `getCurrentUserMovieList.ts` / `getCurrentUserMovieList.test.ts`
- テストケース名は日本語で記述する。
  - 例: `ログイン中ユーザーは自身のリストアイテム全件を取得できる`
- 1 ケース = 1 仕様とし、戻り値・DB の状態など期待する処理結果を網羅的に検証する。
- Cookie など副作用的に参照・更新される領域はモックしてテストする。

## UI コンポーネントのテスト方針

jsdom 環境では `useOptimistic` / `useTransition` の非同期スケジューリングを正確に再現できないため、フロントエンドのコンポーネントテストは **Playwright（E2E）で実施する**。

- テストファイルは `tests/e2e/pages/<ページ名>/` に置く。
  - 機能要件のテストは `functional/`、非機能要件のテストは `non-functional/` に格納する。
  - ファイル名は機能を示す名前にする。
    - 機能要件の例: `tests/e2e/pages/list/functional/sublist.test.ts`
    - 非機能要件の例: `tests/e2e/pages/list/non-functional/sublist.security.test.ts`、`tests/e2e/pages/list/non-functional/sublist.performance.test.ts`
- デバイスカバレッジは `playwright.config.ts` の 5 プロジェクト（iPhone / Pixel 7 / Desktop Chrome / Firefox / Safari）に対応し、各テストは `test.skip` で対象プロジェクトを絞る。
- `beforeEach` で `resetDatabase()` + `seedDatabase()`、`afterEach` で `resetDatabase()` を呼ぶ。
- 認証が必要なテストは `setupAuthenticatedUser()` を使う。
- テスト実行は `npm run test:e2e`（ビルド込み、デフォルト）で行う。古いビルドを掴む罠を避けるため、特別な理由がない限りこちらを使う。テストコードだけ反復したい時は自分の責任で `npx playwright test <ファイル>` を使ってよい。

## セットアップ

- `tests/helpers/setup.ts`: 初回にマイグレーションを実行し、各テスト間で全テーブルをリセットする。
- `vitest.config.ts`: 最大ワーカー数は 1（テスト間の DB 競合を防ぐため）。
