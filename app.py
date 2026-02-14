import gradio as gr
from word_manager import WordManager
from tts_client import TTSClient

# 全局状态
word_manager = WordManager()
tts_client = None
current_word = None
show_marked = False


def init_tts():
    """初始化 TTS 客户端"""
    global tts_client
    try:
        tts_client = TTSClient()
        return "模型加载成功！"
    except Exception as e:
        return f"模型加载失败: {e}"


def get_folders():
    """获取文件夹列表"""
    folders = word_manager.scan_folders()
    if not folders:
        return gr.Dropdown(choices=[], value=None)
    return gr.Dropdown(choices=folders, value=folders[0] if folders else None)


def on_folder_change(folder):
    """文件夹选择变化时更新文件列表"""
    if not folder:
        return gr.Dropdown(choices=[], value=None)

    files = word_manager.get_files(folder)
    if not files:
        return gr.Dropdown(choices=[], value=None)
    return gr.Dropdown(choices=files, value=files[0] if files else None)


def start_learning(folder, file):
    """开始学习"""
    global current_word, show_marked

    if not folder or not file:
        return (
            gr.update(visible=True),  # 选择区
            gr.update(visible=False),  # 学习区
            gr.update(visible=False),  # 完成区
            "", "", "", None, ""
        )

    # 加载单词和进度
    words = word_manager.load_words(folder, file)
    if not words:
        return (
            gr.update(visible=True),
            gr.update(visible=False),
            gr.update(visible=False),
            "", "", "", None, "单词文件为空或加载失败"
        )

    word_manager.init_progress(folder, file)

    # 获取第一个随机单词
    current_word = word_manager.get_random_word()
    show_marked = False

    if current_word is None:
        # 所有单词已学完
        learned, total, percentage = word_manager.get_progress_stats()
        return (
            gr.update(visible=False),
            gr.update(visible=False),
            gr.update(visible=True),
            "", "", "", None,
            f"已学习: {learned}/{total} 单词"
        )

    # 显示学习界面
    learned, total, percentage = word_manager.get_progress_stats()
    progress_text = f"进度: {learned}/{total} ({percentage:.1f}%)"

    return (
        gr.update(visible=False),  # 隐藏选择区
        gr.update(visible=True),   # 显示学习区
        gr.update(visible=False),  # 隐藏完成区
        current_word["word"],
        current_word["meaning"],
        progress_text,
        None,  # 音频
        ""     # 状态消息
    )


def play_pronunciation():
    """播放发音"""
    global current_word, tts_client

    if current_word is None or tts_client is None:
        return None

    audio_path = tts_client.speak(current_word["word"])
    if audio_path:
        return audio_path
    return None


def mark_as_known():
    """标记为认识"""
    global current_word, show_marked

    if current_word is None:
        return "", "", "", None, ""

    # 标记已学习
    word_manager.mark_learned(current_word["word"])
    show_marked = True

    # 更新进度
    learned, total, percentage = word_manager.get_progress_stats()
    progress_text = f"进度: {learned}/{total} ({percentage:.1f}%)"

    return (
        current_word["word"],
        current_word["meaning"],
        progress_text,
        None,
        "✓ 已标记为认识"
    )


def next_word():
    """下一个单词"""
    global current_word, show_marked

    show_marked = False
    current_word = word_manager.get_random_word()

    if current_word is None:
        # 所有单词已学完
        learned, total, percentage = word_manager.get_progress_stats()
        return (
            gr.update(visible=False),  # 隐藏学习区
            gr.update(visible=True),   # 显示完成区
            "", "", "", None, "",
            f"已学习: {learned}/{total} 单词"
        )

    # 显示下一个单词
    learned, total, percentage = word_manager.get_progress_stats()
    progress_text = f"进度: {learned}/{total} ({percentage:.1f}%)"

    return (
        gr.update(visible=True),   # 学习区
        gr.update(visible=False),  # 完成区
        current_word["word"],      # 单词
        current_word["meaning"],   # 释义
        progress_text,             # 进度
        None,                      # 音频
        "",                        # 标记消息
        ""                         # 完成统计
    )


def reset_and_restart():
    """重置进度并重新开始"""
    global current_word, show_marked

    word_manager.reset_progress()
    current_word = word_manager.get_random_word()
    show_marked = False

    learned, total, percentage = word_manager.get_progress_stats()
    progress_text = f"进度: {learned}/{total} ({percentage:.1f}%)"

    return (
        gr.update(visible=True),   # 显示学习区
        gr.update(visible=False),  # 隐藏完成区
        current_word["word"],
        current_word["meaning"],
        progress_text,
        None,
        ""
    )


def switch_file():
    """切换文件"""
    return (
        gr.update(visible=True),   # 显示选择区
        gr.update(visible=False),  # 隐藏学习区
        gr.update(visible=False)   # 隐藏完成区
    )


# 创建 Gradio 界面
with gr.Blocks(title="背单词应用") as app:
    gr.Markdown("# 背单词应用")

    # 文件选择区
    with gr.Group(visible=True) as selection_area:
        gr.Markdown("## 选择单词文件")
        folder_dropdown = gr.Dropdown(label="文件夹", choices=[], interactive=True)
        file_dropdown = gr.Dropdown(label="文件", choices=[], interactive=True)
        start_btn = gr.Button("开始学习", variant="primary")
        status_msg = gr.Textbox(label="状态", interactive=False)

    # 学习区
    with gr.Group(visible=False) as learning_area:
        gr.Markdown("## 学习中")
        word_display = gr.Textbox(label="单词", interactive=False, elem_id="word")
        meaning_display = gr.Textbox(label="释义", interactive=False, elem_id="meaning")

        audio_output = gr.Audio(label="发音", autoplay=True)
        pronounce_btn = gr.Button("🔊 发音")

        with gr.Row():
            known_btn = gr.Button("认识", variant="primary")
            unknown_btn = gr.Button("不认识/下一个")

        marked_msg = gr.Textbox(label="", interactive=False, visible=True)
        next_btn = gr.Button("下一个", visible=False)

        progress_display = gr.Textbox(label="进度", interactive=False)

    # 完成区
    with gr.Group(visible=False) as completion_area:
        gr.Markdown("## 🎉 恭喜！本轮学习完成！")
        completion_stats = gr.Textbox(label="统计", interactive=False)
        with gr.Row():
            restart_btn = gr.Button("开始新一轮", variant="primary")
            switch_btn = gr.Button("切换文件")

    # 事件绑定
    app.load(init_tts, outputs=[status_msg])
    app.load(get_folders, outputs=[folder_dropdown])

    folder_dropdown.change(
        on_folder_change,
        inputs=[folder_dropdown],
        outputs=[file_dropdown]
    )

    start_btn.click(
        start_learning,
        inputs=[folder_dropdown, file_dropdown],
        outputs=[
            selection_area, learning_area, completion_area,
            word_display, meaning_display, progress_display,
            audio_output, status_msg
        ]
    )

    pronounce_btn.click(
        play_pronunciation,
        outputs=[audio_output]
    )

    known_btn.click(
        mark_as_known,
        outputs=[
            word_display, meaning_display, progress_display,
            audio_output, marked_msg
        ]
    ).then(
        lambda: (gr.update(visible=True), gr.update(visible=False)),
        outputs=[next_btn, known_btn]
    )

    unknown_btn.click(
        next_word,
        outputs=[
            learning_area, completion_area,
            word_display, meaning_display, progress_display,
            audio_output, marked_msg, completion_stats
        ]
    )

    next_btn.click(
        next_word,
        outputs=[
            learning_area, completion_area,
            word_display, meaning_display, progress_display,
            audio_output, marked_msg, completion_stats
        ]
    ).then(
        lambda: (gr.update(visible=False), gr.update(visible=True)),
        outputs=[next_btn, known_btn]
    )

    restart_btn.click(
        reset_and_restart,
        outputs=[
            learning_area, completion_area,
            word_display, meaning_display, progress_display,
            audio_output, marked_msg
        ]
    )

    switch_btn.click(
        switch_file,
        outputs=[selection_area, learning_area, completion_area]
    )


if __name__ == "__main__":
    app.launch(server_name="0.0.0.0", server_port=7860)
