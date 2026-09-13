# WordPlus 0.1.0 本地交付

## 启动

- Windows 安装版：双击 `WordPlus-0.1.0-windows-x64-setup.exe`，安装后从开始菜单启动 WordPlus。
- Windows 直接运行版：双击 `WordPlus-0.1.0-windows-x64.exe`，需要系统已安装 WebView2。
- Android 测试版：将 `WordPlus-0.1.0-android-arm64-debug.apk` 复制到 ARM64 手机后安装。要求 Android 7.0 / API 24 及以上；当前为 Debug 签名测试包。

应用启动无需终端、Python 或 Node。词库内置，学习进度保存在当前设备。客户端会在首屏绘制后后台初始化一次 Kokoro；首次启动需要联网下载模型，之后由设备执行推理。已生成音频保存到当前设备的 IndexedDB，总容量上限为 1 GiB，Windows、Android 和浏览器之间暂不同步进度。

## 验证边界

- 已构建 Windows NSIS 安装程序，实际启动同次构建的 Windows 程序，验证翻卡、认识/不认识、进度恢复、完成一轮和重新学习。
- 已在 Windows 客户端执行真实 Kokoro 推理并播放完整音频。
- 已检查手机宽度的词库和学习页面；返回词库后重新加载对应分类文件。
- Android APK 已构建，并检查签名、ARM64 架构、16 KB ELF 段对齐和 ZIP 对齐。
- Android 已在 `22041211AC / Android API 34` 真机安装并启动；真实设备上完成词库、翻卡、进度恢复、完成一轮、返回词库和 Kokoro 发音验收。
- 10 项自动化测试已通过，覆盖词义独立计数、存储失败、会话隔离、路径校验、语音取消、音频缓存和预生成共享。

`verification.json` 记录本次验收结果及包的 SHA-256，`SHA256SUMS.txt` 可用于核对文件。二进制安装包保留在本目录，未加入 Git。

- 最新 Android 包实测：预生成调用 1 次，点击播放时模型合成调用仍为 1 次，确认没有重复计算。
- 最新 Android 包实测：播放后 IndexedDB 有 16 条音频记录，重启应用后仍有 16 条记录，确认缓存持久化；缓存总容量上限为 1 GiB，达到上限时按最旧记录清理。
