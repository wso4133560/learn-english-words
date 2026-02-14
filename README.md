# 背单词应用

一个简单高效的背单词工具，支持按文件夹分类管理单词库，提供随机学习模式和真人语音发音功能。

## 功能特点

- 📁 基于文件夹的单词库管理
- 🎲 随机抽取未学习单词
- 🔊 真人语音发音（Kokoro TTS）
- 💾 自动保存学习进度
- 🌐 Web 界面，浏览器访问

## 安装步骤

### 1. 环境要求

- Python 3.10+
- 已安装 Kokoro-82M-WebUI（位于当前目录）

### 2. 安装 eSpeak NG

**Linux:**
```bash
sudo apt-get install espeak-ng
```

**Windows:**
下载并安装 [eSpeak NG](https://github.com/espeak-ng/espeak-ng/releases)，安装到默认路径 `C:\Program Files\eSpeak NG`

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 准备单词库

在 `data/` 目录下创建文件夹和单词文件：

```
data/
├─ CET4/
│  └─ unit1.txt
└─ CET6/
   └─ unit1.txt
```

单词文件格式（每行一个单词，使用 `|` 分隔）：
```
apple|苹果
banana|香蕉
computer|计算机
```

## 使用方法

### 启动应用

```bash
python app.py
```

应用启动后，浏览器访问 `http://localhost:7860`

### 学习流程

1. 选择文件夹和单词文件
2. 点击"开始学习"
3. 查看单词，点击"🔊 发音"听读音
4. 点击"认识"标记已学习，或点击"不认识/下一个"继续
5. 所有单词学完后，可选择"开始新一轮"或"切换文件"

## 目录结构

```
.
├─ app.py                 # 主程序
├─ word_manager.py        # 单词管理模块
├─ tts_client.py          # TTS 语音模块
├─ requirements.txt       # 依赖清单
├─ data/                  # 单词库（用户创建）
├─ progress/              # 学习进度（自动生成）
├─ audio_cache/           # 音频缓存（自动生成）
└─ Kokoro-82M-WebUI/      # TTS 模型
```

## 常见问题

**Q: 模型加载很慢？**
A: 首次加载需要 3-10 秒，这是正常现象。建议使用 GPU 加速。

**Q: 如何清理音频缓存？**
A: 直接删除 `audio_cache/` 目录即可。

**Q: 如何备份学习进度？**
A: 复制 `progress/` 目录即可。

**Q: 单词文件格式错误怎么办？**
A: 应用会跳过格式错误的行，检查文件确保每行使用 `|` 分隔。

## 许可证

MIT License
