#!/bin/bash

echo "🛑 停止开发服务..."

if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    rm -f .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    rm -f .frontend.pid
fi

# 清理可能残留的进程
pkill -f "python app.py" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "✅ 所有服务已停止"
