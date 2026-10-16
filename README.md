# Hubly Chat

Googleアカウントで参加できる、シンプルなDiscord風チャットUIです。チャンネル切り替え、メッセージ送信、検索、ライト／ダークテーマ切り替えに対応しています。Firebase設定がない場合はデモモードとしてlocalStorageに保存し、設定後はGoogle AuthenticationとFirestoreへ保存します。

## Firebase設定

1. Firebase ConsoleでWebアプリを作成する。
2. AuthenticationのSign-in providersでGoogleを有効にする。
3. Firestore Databaseを作成する。
4. `.env.example`を`.env`へコピーし、Firebase Web SDKの値を入力する。

```bash
cp .env.example .env
```

`.env`はGitへコミットしないでください。FirebaseのWeb設定値はアプリに含まれる公開設定ですが、Firestoreのルールで書き込み権限を認証ユーザーに限定してください。

## 開発とビルド

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

`pnpm start`は`dist`をNodeの静的サーバーとして配信します。WispbyteなどのNodeホスティングでは、ビルドコマンドを`pnpm install --frozen-lockfile && pnpm build`、起動コマンドを`pnpm start`、環境変数をFirebase設定値にしてください。GitHub Pagesを使う場合は、`main`へのpushで`.github/workflows/deploy.yml`が静的サイトを公開します。
