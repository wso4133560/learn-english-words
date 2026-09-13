# 快速开始

## 使用安装包

Windows：双击 release/WordPlus-0.1.0-windows-x64-setup.exe 安装，之后从开始菜单启动 WordPlus。

Android：将 release/WordPlus-0.1.0-android-arm64-debug.apk 复制到手机安装。它是用于本地测试的 Debug 签名包。

启动客户端不需要 Python、Node 或终端。客户端启动时会后台初始化 Kokoro；首次启动需要网络下载模型。进入卡片后会预生成当前音频，切换卡片时预生成下一张；已生成的音频会保存到本地缓存，重新启动客户端也可复用。离线时能否使用设备语音取决于系统 WebView 支持情况。

## 从源码开发 Windows 客户端

安装 Node.js、Rust MSVC 工具链、Visual Studio C++ 构建工具和 WebView2。参考 [Tauri 官方前置条件](https://v2.tauri.app/start/prerequisites/)。

```powershell
cd D:\code\learn-english-words\frontend
npm ci
npm run desktop:dev
```

只需这一个终端，Tauri 会管理前端开发进程并打开桌面窗口。打包：

```powershell
npm run desktop:build
```

安装程序位于 src-tauri/target/release/bundle/nsis/。

## 从源码构建 Android

安装 Android SDK 36、Build Tools 36、NDK 和 JDK，然后设置环境变量为实际安装位置：

```powershell
$env:JAVA_HOME = '你的JDK目录'
$env:ANDROID_HOME = '你的Android SDK目录'
$env:NDK_HOME = '你的Android SDK目录\ndk\版本号'
rustup target add aarch64-linux-android
npm run android:build
```

首次搭建其他平台时可运行 npm run android:init。Android ARM64 APK 输出至 src-tauri/gen/android/app/build/outputs/apk/arm64/debug/。

Windows 无符号链接权限时，构建脚本自动复制本次成功编译的原生库再打包，不需要修改系统开发者模式。

## 词库与测试

修改 data/ 下的词库后，开发启动和构建会自动同步。手动同步：npm run sync-data。

```powershell
npm test
npm run build
```

网页预览可以单独运行 npm run dev；生产静态资源位于 dist/，原生安装包内已包含这些资源。
