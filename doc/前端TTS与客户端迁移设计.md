# 单客户端架构

## 运行方式

Windows 和 Android 使用同一套 Vue 前端与 Tauri 2 外壳。安装后从系统应用图标启动；应用内部读取打包资源，不监听 HTTP 端口，不启动 Python，不提供后端兼容接口。

```text
Tauri Windows / Android WebView
  ├─ Vue 学习卡片
  ├─ LocalWordClient → 内置 word-data 词库
  ├─ LocalStudySession → 当前设备 localStorage
  └─ Kokoro → WebGPU / WASM → 本机音频播放
```

## 词库与进度

- data/ 是词库源文件。npm 的 predev/prebuild 自动同步为 public/word-data，打包时一并嵌入原生客户端。
- 运行时按分类加载，无需一次解析整个词库。目录之外的路径会被拒绝。
- 每个“单词＋词义”生成稳定 SHA-256 卡片 ID；不同词义分别学习，相同词义重复行合并。
- 进度按词库独立保存，重启后恢复；词库更新时过滤已不存在的卡片。
- 保存失败会显示错误并保留当前学习状态，不会假装保存成功。
- Windows、Android、浏览器各有自己的本地进度，当前未做跨设备同步。

## 前端语音

Kokoro 模型在客户端启动时后台初始化，从公开模型仓库下载所需文件。优先尝试 WebGPU，初始化失败后尝试 WASM；无法加载模型时，只有支持 Web Speech API 的设备可使用设备语音。模型会在当前应用进程中复用，进入卡片后预生成当前音频、切换后预生成下一张；已生成的音频按模型版本、文本、音色和语速保存到 IndexedDB（总容量上限 1 GiB，达到上限时清理最旧记录），重新启动应用仍可复用。

离开卡片、退出自动播放或暂停时，取消正在等待的语音播放；迟到的推理结果不会再自动发声。音频播放完成或取消后释放临时音频 URL。

## 原生构建

- Windows: npm run desktop:build，生成 NSIS 安装程序。
- Android: npm run android:build，生成签名的 ARM64 Debug APK，适合安装测试。
- Android 构建需要 JDK、Android SDK 36、NDK 和 Rust Android ARM64 target。
- Android ARM64 原生库使用 16 KB ELF 段对齐，APK 同时校验 16 KB ZIP 对齐；具体手机上的运行和语音能力仍需真机验证。
- Windows 未启用开发者模式时，Tauri 的符号链接操作会失败。构建脚本只对“本次 Rust 编译成功后的符号链接权限错误”启用复制库方式，再运行 Gradle 打包。其他失败仍立即停止。

参考：[Tauri 官方构建前置条件](https://v2.tauri.app/start/prerequisites/)。
