#!/bin/bash

# 跨平台 API 端口修復腳本
# 自動將 NEXT_PUBLIC_API_BASE_URL 從 8000 端口改為 8001 端口

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}正在修復 API 端口配置...${NC}"

# 檢測平台並設置正確的 sed 命令
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SED_CMD="sed -i ''"
    PLATFORM="macOS"
else
    # Linux 和其他 Unix 系統
    SED_CMD="sed -i"
    PLATFORM="Linux/Unix"
fi

echo -e "檢測到平台: ${PLATFORM}"
echo ""

# 要修改的文件列表
ENV_FILES=(
    "apps/admin/.env"
    "apps/web/.env"
    "apps/space/.env"
)

SUCCESS_COUNT=0
FAILED_COUNT=0

# 修復每個文件
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        # 檢查是否包含需要修改的內容
        if grep -q "NEXT_PUBLIC_API_BASE_URL.*8000" "$env_file" 2>/dev/null; then
            # 執行替換
            if $SED_CMD 's|http://localhost:8000|http://localhost:8001|g' "$env_file" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} 已更新: $env_file"
                ((SUCCESS_COUNT++))
            else
                echo -e "${RED}✗${NC} 更新失敗: $env_file"
                ((FAILED_COUNT++))
            fi
        else
            # 檢查是否已經是正確的端口
            if grep -q "NEXT_PUBLIC_API_BASE_URL.*8001" "$env_file" 2>/dev/null; then
                echo -e "⏭️  已正確配置: $env_file (端口 8001)"
            else
                echo -e "${YELLOW}⚠${NC}  未找到 NEXT_PUBLIC_API_BASE_URL: $env_file"
            fi
        fi
    else
        echo -e "${RED}✗${NC} 文件不存在: $env_file"
        ((FAILED_COUNT++))
    fi
done

echo ""
if [ $FAILED_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ API 端口修復完成！${NC}"
    echo ""
    echo "已將所有前端應用的 API 端口從 8000 改為 8001"
    exit 0
else
    echo -e "${RED}❌ 部分文件修復失敗${NC}"
    exit 1
fi

