# Word+ 客户端工程

Vue 3 + TypeScript + Vite + Tauri 2，Windows 与 Android 共用卡片、词库、进度和语音逻辑。

```powershell
npm ci
npm run desktop:dev
```

- npm run desktop:build：Windows NSIS 安装程序
- npm run android:build：Android ARM64 Debug APK（需 Android SDK/NDK/JDK）
- npm run dev：单独调试网页
- npm run build：生成静态资源
- npm test：本地进度与音频生命周期回归测试

src/services/localWordClient.ts 提供有类型的本地词库和学习会话方法，没有 HTTP 数据服务或后端接口格式。

public/word-data/ 是构建前自动生成的资源；请修改仓库根目录的 data/ 源文件。设备本地进度按单词＋词义生成稳定 ID，避免同词多义计数错误。

完整安装与 Android 环境设置见根目录 QUICK_START.md。
