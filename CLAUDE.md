# CLAUDE.md

Next.js 16 / React 19 / Turso / Drizzle ORM / Tailwind CSS v4。

## 言語
思考は英語、回答・コード・ドキュメントは日本語。

## 核心ルール
- `as` による型アサーションは使用しない（`as const` は許可）
- ループ内で DB クエリを発行しない

## 必須動作
- 変更前後にファイルを再読する
- コード変更後：`npm run lint && npm run test`

## コマンド
```bash
npm run dev              # 開発サーバー
npm run build && npm run lint
npm run test             # Vitest
npm run test:e2e         # Playwright（必ずビルドを挟む）
npm run db:generate && npm run db:migrate
```

E2E は古いビルドを掴む罠を避けるため必ず `npm run test:e2e` 経由で実行する。テストコードだけ反復したい時は自分の責任で `npx playwright test` を使う。

## 詳細は Skill で
- `/workflow` — 3フェーズ・TDD
- `/architecture` — features構造・Result型
- `/frontend` — Async React
- `/testing` — テスト方針
- `/style` — コーディングスタイル
- `/review` — レビューポリシー
