#!/bin/bash

echo "启动背单词应用..."

is_port_in_use() {
    local port=$1
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1
}

BACKEND_PORT=${GRADIO_SERVER_PORT:-7860}
if is_port_in_use "$BACKEND_PORT"; then
    for port in $(seq 7861 7899); do
        if ! is_port_in_use "$port"; then
            BACKEND_PORT=$port
            break
        fi
    done
fi

# 启动后端
echo "启动后端服务..."
GRADIO_SERVER_PORT=${BACKEND_PORT} python app.py --api &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "启动前端服务..."
cd frontend
VITE_GRADIO_PORT=${BACKEND_PORT} npm run dev &
FRONTEND_PID=$!

echo "应用已启动！"
echo "后端: http://localhost:${BACKEND_PORT}"
echo "前端: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
wait

# 清理进程
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
