import os
import sys
import torch

# 添加 Kokoro 模块路径
sys.path.insert(0, './Kokoro-82M-WebUI')

from KOKORO.models import build_model
from KOKORO.utils import tts


class TTSClient:
    """TTS 语音合成客户端"""

    def __init__(self, model_path: str = "./Kokoro-82M-WebUI/KOKORO/kokoro-v0_19.pth",
                 cache_dir: str = "audio_cache",
                 voice: str = "af_bella"):
        """
        初始化 TTS 客户端并加载 Kokoro 模型

        Args:
            model_path: Kokoro 模型文件路径
            cache_dir: 音频缓存目录
            voice: 使用的语音（固定为 af_bella）
        """
        self.cache_dir = cache_dir
        self.voice = voice
        self.model = None
        self.device = None
        self.original_dir = os.getcwd()
        self.kokoro_dir = os.path.abspath('./Kokoro-82M-WebUI')

        # 确保缓存目录存在
        os.makedirs(self.cache_dir, exist_ok=True)

        # 加载模型
        try:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(f"正在加载 Kokoro 模型... (设备: {self.device})")

            if not os.path.exists(model_path):
                raise FileNotFoundError(f"模型文件不存在: {model_path}")

            # 切换到 Kokoro 目录加载模型
            os.chdir(self.kokoro_dir)
            self.model = build_model('./KOKORO/kokoro-v0_19.pth', self.device)
            os.chdir(self.original_dir)

            print("模型加载成功！")

        except Exception as e:
            os.chdir(self.original_dir)
            print(f"模型加载失败: {e}")
            raise

    def speak(self, word: str) -> str:
        """
        生成单词语音（带缓存）

        Args:
            word: 要发音的单词

        Returns:
            音频文件路径，失败返回空字符串
        """
        try:
            # 检查缓存
            cache_filename = f"{word}_{self.voice}.wav"
            cache_path = os.path.join(self.original_dir, self.cache_dir, cache_filename)

            if os.path.exists(cache_path):
                print(f"使用缓存音频: {cache_path}")
                return cache_path

            # 生成音频
            if self.model is None:
                print("错误: 模型未加载")
                return ""

            print(f"生成音频: {word}")

            # 切换到 Kokoro 目录生成音频
            os.chdir(self.kokoro_dir)

            # 使用临时路径生成音频
            temp_output = os.path.join(self.original_dir, cache_path)
            audio_path = tts(
                self.model,
                self.device,
                word,
                self.voice,
                speed=1.0,
                trim=0,
                pad_between_segments=0,
                output_file=temp_output,
                remove_silence=False,
                minimum_silence=50
            )

            # 切换回原目录
            os.chdir(self.original_dir)

            return cache_path

        except Exception as e:
            os.chdir(self.original_dir)
            print(f"TTS 生成失败: {e}")
            return ""
