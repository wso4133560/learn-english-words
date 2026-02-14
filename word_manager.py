import os
import json
import re
import random
from datetime import datetime
from typing import List, Dict, Optional, Tuple


class WordManager:
    """单词库和学习进度管理"""

    def __init__(self, data_dir: str = "data", progress_dir: str = "progress"):
        # 转换为绝对路径
        self.data_dir = os.path.abspath(data_dir)
        self.progress_dir = os.path.abspath(progress_dir)
        self.current_folder = None
        self.current_file = None
        self.words = []
        self.progress = {"learned": [], "total": 0}

        # 确保目录存在
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.progress_dir, exist_ok=True)

    def scan_folders(self) -> List[str]:
        """扫描 data/ 目录下的所有子文件夹"""
        try:
            folders = []
            for item in os.listdir(self.data_dir):
                item_path = os.path.join(self.data_dir, item)
                if os.path.isdir(item_path):
                    folders.append(item)
            return sorted(folders)
        except Exception as e:
            print(f"扫描文件夹失败: {e}")
            return []

    def get_files(self, folder: str) -> List[str]:
        """列出指定文件夹下的所有 .txt 文件"""
        try:
            folder_path = os.path.join(self.data_dir, folder)
            if not os.path.exists(folder_path):
                return []

            files = []
            for item in os.listdir(folder_path):
                if item.endswith('.txt'):
                    files.append(item)
            return sorted(files)
        except Exception as e:
            print(f"列出文件失败: {e}")
            return []

    def _sanitize_filename(self, folder: str, file: str) -> str:
        """清理文件路径中的特殊字符，生成合法的进度文件名"""
        # 移除 .txt 后缀
        file_base = file.replace('.txt', '')
        # 组合路径
        path = f"{folder}_{file_base}"
        # 替换特殊字符为下划线
        sanitized = re.sub(r'[^\w\u4e00-\u9fff]+', '_', path)
        # 移除首尾下划线
        sanitized = sanitized.strip('_')
        return f"{sanitized}.json"

    def load_words(self, folder: str, file: str) -> List[Dict[str, str]]:
        """加载单词文件，解析 word|meaning 格式"""
        file_path = os.path.join(self.data_dir, folder, file)
        words = []

        try:
            if not os.path.exists(file_path):
                print(f"文件不存在: {file_path}")
                return []

            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    if '|' not in line:
                        print(f"警告: 第 {line_num} 行格式错误，跳过: {line}")
                        continue

                    parts = line.split('|', 1)
                    if len(parts) == 2:
                        word, meaning = parts[0].strip(), parts[1].strip()
                        if word and meaning:
                            words.append({"word": word, "meaning": meaning})
                        else:
                            print(f"警告: 第 {line_num} 行内容为空，跳过")
                    else:
                        print(f"警告: 第 {line_num} 行格式错误，跳过: {line}")

            self.words = words
            self.current_folder = folder
            self.current_file = file
            return words

        except Exception as e:
            print(f"加载单词文件失败: {e}")
            return []

    def init_progress(self, folder: str, file: str) -> Dict:
        """初始化或加载进度文件"""
        progress_file = self._sanitize_filename(folder, file)
        progress_path = os.path.join(self.progress_dir, progress_file)

        try:
            # 如果进度文件存在，加载它
            if os.path.exists(progress_path):
                with open(progress_path, 'r', encoding='utf-8') as f:
                    self.progress = json.load(f)
                    # 验证数据结构
                    if "learned" not in self.progress:
                        self.progress["learned"] = []
                    if "total" not in self.progress:
                        self.progress["total"] = len(self.words)
            else:
                # 创建新的进度文件
                self.progress = {
                    "learned": [],
                    "total": len(self.words),
                    "last_updated": datetime.now().isoformat()
                }
                self._save_progress(progress_path)

            return self.progress

        except json.JSONDecodeError as e:
            print(f"进度文件损坏，重新初始化: {e}")
            # 进度文件损坏，重新初始化
            self.progress = {
                "learned": [],
                "total": len(self.words),
                "last_updated": datetime.now().isoformat()
            }
            self._save_progress(progress_path)
            return self.progress
        except Exception as e:
            print(f"加载进度失败: {e}")
            self.progress = {"learned": [], "total": len(self.words)}
            return self.progress

    def _save_progress(self, progress_path: str):
        """保存进度到文件"""
        try:
            self.progress["last_updated"] = datetime.now().isoformat()
            with open(progress_path, 'w', encoding='utf-8') as f:
                json.dump(self.progress, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存进度失败: {e}")

    def get_unlearned_words(self) -> List[Dict[str, str]]:
        """返回未学习的单词列表"""
        learned_set = set(self.progress.get("learned", []))
        unlearned = [w for w in self.words if w["word"] not in learned_set]
        return unlearned

    def mark_learned(self, word: str):
        """标记单词为已学习并保存进度"""
        if word not in self.progress["learned"]:
            self.progress["learned"].append(word)

        # 保存进度
        if self.current_folder and self.current_file:
            progress_file = self._sanitize_filename(self.current_folder, self.current_file)
            progress_path = os.path.join(self.progress_dir, progress_file)
            self._save_progress(progress_path)

    def reset_progress(self):
        """清空当前文件的学习进度"""
        self.progress["learned"] = []

        # 保存进度
        if self.current_folder and self.current_file:
            progress_file = self._sanitize_filename(self.current_folder, self.current_file)
            progress_path = os.path.join(self.progress_dir, progress_file)
            self._save_progress(progress_path)

    def get_progress_stats(self) -> Tuple[int, int, float]:
        """返回学习进度统计（learned, total, percentage）"""
        learned = len(self.progress.get("learned", []))
        total = self.progress.get("total", len(self.words))
        percentage = (learned / total * 100) if total > 0 else 0
        return learned, total, percentage

    def get_random_word(self) -> Optional[Dict[str, str]]:
        """从未学习单词中随机抽取一个"""
        unlearned = self.get_unlearned_words()
        if not unlearned:
            return None
        return random.choice(unlearned)
