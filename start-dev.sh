#!/bin/bash

echo "==================================="
echo "  背单词应用 - 开发环境启动"
echo "==================================="
echo ""

is_port_in_use() {
    local port=$1
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1
}

# 检查后端依赖
if ! python -c "import gradio" 2>/dev/null; then
    echo "❌ 后端依赖未安装，请运行: pip install -r requirements.txt"
    exit 1
fi

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ 前端依赖未安装，请运行: cd frontend && npm install"
    exit 1
fi

echo "✅ 依赖检查通过"
echo ""

BACKEND_PORT=${GRADIO_SERVER_PORT:-7860}
if is_port_in_use "$BACKEND_PORT"; then
    echo "⚠️  端口 ${BACKEND_PORT} 已被占用，自动寻找可用端口..."
    for port in $(seq 7861 7899); do
        if ! is_port_in_use "$port"; then
            BACKEND_PORT=$port
            break
        fi
    done
fi

# 启动后端
echo "🚀 启动后端服务 (http://localhost:${BACKEND_PORT})..."
GRADIO_SERVER_PORT=${BACKEND_PORT} python app.py --api > backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# 等待后端启动
echo "⏳ 等待后端启动..."
BACKEND_READY=0
for _ in $(seq 1 20); do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        break
    fi

    if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/config" 2>/dev/null | grep -q '"version"'; then
        BACKEND_READY=1
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" -ne 1 ]; then
    echo "❌ 后端启动失败，请查看 backend.log"
    kill $BACKEND_PID 2>/dev/null
    tail -n 50 backend.log
    exit 1
fi

echo "✅ 后端启动成功"
echo ""

# 启动前端
echo "🚀 启动前端服务 (http://localhost:5173)..."
cd frontend
VITE_GRADIO_PORT=${BACKEND_PORT} npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   前端 PID: $FRONTEND_PID"

echo ""
echo "==================================="
echo "✅ 应用启动成功！"
echo "==================================="
echo ""
echo "📱 前端地址: http://localhost:5173"
echo "🔧 后端地址: http://localhost:${BACKEND_PORT}"
echo ""
echo "📝 日志文件:"
echo "   - backend.log"
echo "   - frontend.log"
echo ""
echo "⌨️  键盘快捷键:"
echo "   Space  - 翻转卡片"
echo "   Enter  - 标记认识"
echo "   P      - 播放发音"
echo "   ← / →  - 切换单词"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 保存 PID 到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; echo '✅ 服务已停止'; exit 0" INT TERM

wait
