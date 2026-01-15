# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## ⚠️ 重要：Monorepo 配置說明

此專案是 monorepo 結構。**所有 Expo/EAS 相關指令必須在 `apps/mobile/` 目錄下執行**：

```bash
cd apps/mobile
eas build --platform ios --profile preview
eas build --platform ios --profile production
eas submit --platform ios
```

**請勿在根目錄執行 EAS 指令**，根目錄的 `app.json` 和 `eas.json` 已被停用（改名為 `.disabled`）。

## Get started

1. Install dependencies

   ```bash
   pnpm install  # 在 monorepo 根目錄執行
   ```

2. Set up environment variables

   **本地開發：** 創建 `.env.local` 檔案在 `apps/mobile/`：

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **EAS Build（必要！）：** 在終端執行以下命令設定 secrets：

   ```bash
   cd apps/mobile
   
   # 設定 Supabase URL（替換為你的實際值）
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
   
   # 設定 Supabase Anon Key（替換為你的實際值）
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here"
   ```

   > 💡 EAS Secrets 會自動在 Build 時注入，`eas.json` 中已配置 `@EXPO_PUBLIC_SUPABASE_URL` 等引用。

3. Start the app

   ```bash
   cd apps/mobile
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
