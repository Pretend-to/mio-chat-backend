#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source venv/bin/activate

echo "======================================"
echo "  ComfyUI + Anima 启动中..."
echo "  访问地址: http://localhost:8188"
echo "  如果浏览器打不开，试试: http://127.0.0.1:8188"
echo "======================================"

python3 main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --force-fp16
