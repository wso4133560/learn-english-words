# Word+ 背单词客户端

Word+ 使用 Vue 3 与 Tauri 2，同一套前端支持 Windows 和 Android。词库内置、进度本地保存、Kokoro 在设备上推理，无后端服务和兼容层。

## 直接运行客户端

- Windows：安装 release/ 中的 Windows 安装程序，然后从开始菜单启动 WordPlus。
- Android：将 release/ 中的 ARM64 Debug APK 安装到手机。此包用于本地测试，正式发布前需要配置自己的 Release 签名。

安装后使用应用图标启动，无需终端。应用启动时会在后台初始化 Kokoro；首次启动需要网络下载模型，词库学习本身不依赖网络。进入卡片后会预生成当前音频，切换卡片时预生成下一张；已生成的音频会保存到本地缓存，重复播放和重新启动客户端都可直接开始。

## 开发与构建

```powershell
cd frontend
npm ci
npm run desktop:dev
```

这一个命令会启动开发预览和桌面窗口。仅查看网页可运行 npm run dev。

```powershell
npm run desktop:build
npm test
```

Windows 安装程序输出至 frontend/src-tauri/target/release/bundle/nsis/。

Android 构建需先设置 ANDROID_HOME、NDK_HOME、JAVA_HOME，并安装 aarch64-linux-android Rust target：

```powershell
npm run android:build
```

生成的 APK 位于 frontend/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/。完整步骤见 [快速开始](QUICK_START.md)。

## 词库和进度

- data/大学版 包含大学版分类词库源文件；词库来源快照见 [词库说明](data/大学版/README.md)。
- npm run dev / npm run build 自动同步 data/ 到应用资源，无需维护两份词库。
- 每个词义是一张独立卡片，避免同词多义导致完成度错误。
- 进度保存在当前应用的本地存储，Windows、Android、浏览器之间暂不自动同步。
- 轻松模式的建议是每天 8 张、每组 4 张。当前提示是建议量；手动学习不强制截断，自动播放每词重复 3 次。

架构说明见 [单客户端架构](doc/前端TTS与客户端迁移设计.md)。
