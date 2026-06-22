# アーキテクチャ

**スタック**: Next.js 16 (React 19)、Turso (LibSQL)、Drizzle ORM、Tailwind CSS v4、Jotai、Zod、Vitest、Biome

バックエンド処理はすべて **Server Actions** で実装（APIルートなし）。

## features 階層

各 feature は以下の層で構成される。

```
features/<name>/
  actions/      # "use server" — 入力バリデーション + サービス呼び出し + Cookie操作
  services/     # ビジネスロジック + 認可
  helpers/      # 複数サービス間で共通のロジック（mappers, utils など）
  repositories/ # アプリケーション外部との接続（DB・外部API・LocalStorage など）
  hooks/        # フロントエンドの状態管理
  schemas/      # Zodバリデーションスキーマ
  types/        # TypeScript型定義
```

### services/ のルール

- `hogeService.ts` がエクスポートするのは `hogeService` 関数ひとつのみ
- 複数のサービスで共通して使うロジックは `helpers/` に切り出してそこからエクスポートする

Features: `auth`、`list`、`movieDatabase`、`user`、`shared`

## Result パターン

全レイヤーは以下の判別共用体を返す。

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: AppError }
```

`AppError` は `features/shared/types/` で定義。

## 認証

パスワードレスメール認証フロー：

1. 認証コードをメール送信
2. ユーザーがコードを入力して検証
3. 検証成功後、JWT セッショントークンを HttpOnly Cookie に設定（`session_token`）
4. 未登録ユーザーには登録完了まで短命の `temp_session_token` を発行

レート制限は `login_attempts` テーブルで管理。

## 認可

更新系 Action（mutation）は **Service 層で所有権を照合する**。Action 層で代用してはいけない（Service が単独で安全に呼び出せる状態を保つため）。

### 規約

- **Action 層**: `currentUserId()` で userId を取得し、Service に渡す。未認証なら `UNAUTHORIZED_ERROR` を返す。
- **Service 層**: 操作対象リソースの所有者と `userId` を照合する。
  - リソース不在 → `NOT_FOUND_ERROR`
  - 他人のリソース → `FORBIDDEN_ERROR`

### スケルトン

```typescript
// actions/updateHoge.ts
export async function updateHoge(args: Args): Promise<Result<Hoge>> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "..." } };
  }

  const authResult = await currentUserId();
  if (!authResult.success) {
    return { success: false, error: { code: "UNAUTHORIZED_ERROR", message: "..." } };
  }

  return await updateHogeService({ ...args, userId: authResult.data.userId });
}

// services/updateHogeService.ts
export async function updateHogeService({
  publicId,
  userId,
  ...
}: Args): Promise<Result<Hoge>> {
  const resource = await findResourceByPublicId(publicId);
  if (resource === null) {
    return { success: false, error: { code: "NOT_FOUND_ERROR", message: "..." } };
  }
  if (resource.ownerId !== userId) {
    return { success: false, error: { code: "FORBIDDEN_ERROR", message: "..." } };
  }

  // ビジネスロジック
}
```

参照系（read）も同様に Service 層で所有権を照合する。

## データベース

- スキーマ: `db/schema.ts`
- マイグレーション: `migrations/`
- ローカル開発: `file:local.db`（`TURSO_DATABASE_URL` で設定）
- 本番: Turso cloud

## フロントエンドのコンポーネント配置

| 種類 | 配置箇所 |
| --- | --- |
| 機能に紐づかない汎用コンポーネント | ルートの `/components` |
| 機能に紐づく汎用コンポーネント | `/app/components` |
| 特定のページ内でのみ使用するコンポーネント | `/page.tsx` と同階層の `/components` |

## list feature の詳細

→ [list-feature.md](list-feature.md) を参照。
