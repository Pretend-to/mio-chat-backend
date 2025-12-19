#!/bin/bash

# OneBot API 测试运行脚本

set -e

echo "🚀 OneBot API 测试套件"
echo "====================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 设置默认值
BASE_URL=${BASE_URL:-"http://localhost:3080"}
ADMIN_CODE=${ADMIN_CODE:-""}

echo "📍 测试目标: $BASE_URL"

# 获取管理员访问码（如果未提供）
if [ -z "$ADMIN_CODE" ]; then
    echo "🔑 获取管理员访问码..."
    if [ -f "scripts/get-admin-code.js" ]; then
        ADMIN_CODE=$(node scripts/get-admin-code.js 2>/dev/null | grep -o '[a-zA-Z0-9]\{32\}' | head -1)
        if [ -n "$ADMIN_CODE" ]; then
            echo "✅ 已获取管理员访问码: ${ADMIN_CODE:0:8}..."
        else
            echo "⚠️  无法自动获取管理员访问码，请手动设置 ADMIN_CODE 环境变量"
        fi
    fi
fi

# 检查服务是否运行
echo "🔍 检查服务状态..."
if curl -s "$BASE_URL/api/gateway" > /dev/null 2>&1; then
    echo "✅ 服务正在运行"
else
    echo "❌ 服务未运行或无法访问"
    echo "请先启动服务: npm start"
    exit 1
fi

# 运行快速测试
echo ""
echo "🧪 运行快速测试..."
if BASE_URL="$BASE_URL" ADMIN_CODE="$ADMIN_CODE" node scripts/quick-test-onebot-api.js; then
    echo "✅ 快速测试通过"
else
    echo "❌ 快速测试失败"
    exit 1
fi

# 运行完整测试
echo ""
echo "🧪 运行完整测试..."
if BASE_URL="$BASE_URL" ADMIN_CODE="$ADMIN_CODE" EXPORT_RESULTS=true node scripts/test-onebot-api.js; then
    echo "✅ 完整测试通过"
else
    echo "❌ 完整测试失败"
    exit 1
fi

# 运行配置测试
echo ""
echo "🧪 运行配置测试..."
if node scripts/test-onebot-config.js; then
    echo "✅ 配置测试通过"
else
    echo "❌ 配置测试失败"
    exit 1
fi

echo ""
echo "🎉 所有测试通过！"
echo ""

# 显示测试结果文件
if [ -f "onebot-api-test-results.json" ]; then
    echo "📄 测试结果已保存到: onebot-api-test-results.json"
fi

echo "✅ 测试完成"