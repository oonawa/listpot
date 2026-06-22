# CI / デプロイワークフロー

## 設計方針

このリポジトリの CI は「ローカルで実行される検査の重複」ではなく、**デプロイ前提条件のゲート** と **協働者間で結果を共有する報告手段** を役割とする。

### 検査の責任分界

| 検査 | ローカル | CI | 理由 |
| --- | --- | --- | --- |
| lint (biome) | ✓ | ✗ | `npm run lint` は `--write` の自動修正モード。CI で走らせても差分が失われ意味がない。CLAUDE.md でローカル実行を必須として明文化 |
| 型チェック (tsc) | ✓ | ✗ | 同上 |
| 単体テスト (vitest) | ✓ | ✓ | ローカルでも走るが、結果を PR 上で共有するため CI でも実行 |
| E2E (Playwright) | ✓ | ✗ | 実行時間が長く、Vercel preview deployment の手動 QA で代替 |
| build | ✗ | ✓ (Vercel) | Vercel deploy で実質的に検証 |
| 依存脆弱性 (npm audit) | ✗ | ✓ | 後述 |
| マイグレーション動作 | ✗ | ✓ (deploy 前) | Turso に対して実マイグレーション |

このプロジェクトは個人開発で、コードの大半は AI エージェント（主に Claude）が書く。Claude は CLAUDE.md の指示に従い `npm run lint && npm run test` をローカルで必ず実行するため、コード変更時点で lint / 型 / テストは通っている前提が成立する。CI が「最後の網」となるのは人間が手書きで CLAUDE.md を読まなかった場合だけで、頻度・コストを勘案して CI からは外している。

## ワークフロー一覧

### test.yml — PR テスト

- トリガー: `pull_request`
- Vitest 実行 + JUnit reporter で PR に結果掲載

### audit.yml — 脆弱性監査

- トリガー: `pull_request`
- `npm audit --audit-level=high --omit=dev` を test と並列で実行
- 詳細は後述

### wf-migration.yaml — Turso マイグレーション（再利用 workflow）

- preview / production それぞれから呼び出される
- `concurrency` で同時実行を直列化（`cancel-in-progress: false` で実行中のマイグレーションはキャンセルしない）

### on-preview.yaml — Vercel preview deploy

- トリガー: `push`（`main` と `dependabot/**` を除く）
- Migrate-Preview → Deploy-Preview の順
- `dependabot/**` を除外する理由: dependabot PR は手動 QA を行わずマージする運用で、preview を消費する利益が薄い

### on-deployment.yaml — Vercel production deploy

- トリガー: `push` to `main`
- Migrate-Production → Deploy-Production の順

## 脆弱性監査の方針

### なぜ並列ジョブか

`npm audit` は `package-lock.json` だけを入力に取り、テスト結果と意味的に独立する。直列にする必然性がなく、並列実行することで両方の signal が独立して同時に届く。テストが落ちている PR でも audit 結果は見えるためデバッグの観点でも有利。

### スコープ

- `--audit-level=high`: HIGH 以上のみをブロック対象にする
- `--omit=dev`: dev 専用パッケージ（`@react-email/preview-server`、`drizzle-kit` 等）の脆弱性は対象外
- moderate 以下は dependabot の定期更新に委ねる

### 巻き込み対策

スコープを絞ることで、新規 CVE 公開で無関係 PR が赤くなる事態を最小化している。それでも HIGH の本番影響が出れば、対処せず merge はさせない (`continue-on-error` は付けない)。

### dependabot との関係

dependabot は daily で `npm-dependencies` グループとして全パッケージを 1 PR にまとめている。audit gate と組み合わさると次のように機能する。

- 通常: dependabot が次回サイクルで脆弱パッケージをバンプ
- 緊急: 別の PR が来た場合、audit gate がブロックして気付く契機になる

## マイグレーション運用方針

### 原則: ダウンタイム不可

CI の構成上、`wf-migration.yaml`（Turso へのマイグレーション適用）が完了した後に Vercel deploy が走る。この間の数十秒〜数分は **新スキーマ × 旧コード** が同居する。

旧コードの書き込みが新スキーマの制約に引っかかると、その時間内のユーザー操作（特に auth 系）がエラーになる。ログインコード送信や検証が失敗するのはユーザーのリトライコストが大きく許容できない。

したがってマイグレーションは **旧コードでも書き込みが成功する形** で書く。

### 後方互換マイグレーションの書き方

新規 NOT NULL カラム追加、列の rename / drop などはそのままだと旧コードの INSERT を壊す。以下のいずれかの方法で安全に進める。

#### A. DEFAULT 付き NOT NULL（単一 PR で完結）

旧コードが値を書かなくても DEFAULT が当たって INSERT が成功する。

```sql
ALTER TABLE foo ADD COLUMN bar TEXT NOT NULL DEFAULT '';
```

新コードは明示的に値を書く。`getRecentAttemptsByTarget` のような検索系は `bar = hmac(real_value)` で検索するため、DEFAULT の空文字レコードはヒットしない。

必要なら後続 PR で `ALTER ... DROP DEFAULT` してセンチネルを取り除く（任意）。

#### B. expand-and-contract（二段階）

教科書的なゼロダウンタイム手法。スキーマの最終形を綺麗に保ちたい場合に使う。

**Phase 1 (expand) — 本 PR**

```sql
ALTER TABLE foo ADD COLUMN bar TEXT; -- nullable
```

- 同 PR で新コードを「常に `bar` を書く」形に更新
- 旧コードは `bar` を書かないが、nullable なので INSERT は成功
- このフェーズが本番デプロイ完了するまで待つ

**Phase 2 (backfill)**

- 既存の NULL 行を埋める（rate-limit テーブルのような ephemeral データなら省略可）

**Phase 3 (contract) — 次の PR**

```sql
ALTER TABLE foo ALTER COLUMN bar SET NOT NULL;
```

- このときには全コードが `bar` を書く状態なので落ちない

#### 列の rename / drop も同様

- expand: 新列を追加し dual-write
- backfill: 旧列のデータを新列にコピー
- contract: 旧列を drop

### どちらを選ぶか

| 観点 | A. DEFAULT 付き | B. expand-and-contract |
| --- | --- | --- |
| PR 数 | 1 | 2 |
| 最終スキーマの綺麗さ | 軽くセンチネルが残る | 綺麗 |
| 二度のリリース調整 | 不要 | 必要 |

特別な事情がなければ **A** が小回りが効く。スキーマ設計上 DEFAULT を許容したくない、または rename / drop のように DEFAULT で逃げられないケースは **B** を使う。

### 例外: 未リリース時

サービスがまだ公開されていない時期は、デプロイ中の auth エラーが誰にも届かないため、後方非互換なマイグレーションでも実害がない。マイグレーション `0039` はこの例外に該当する（本ドキュメント執筆時点で listpot は未リリース）。リリース後はこの例外は無効になる。
