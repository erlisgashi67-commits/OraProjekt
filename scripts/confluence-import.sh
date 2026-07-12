#!/bin/bash
# =============================================================================
# OraProjekt — Confluence Wiki Import Script
# =============================================================================
# Creates pages in Confluence from docs/ markdown files
#
# Usage:
#   bash scripts/confluence-import.sh <atlassian-email> <atlassian-api-token>
#
# How to get Atlassian API token:
#   1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
#   2. Click "Create API token"
#   3. Name: "OraProjekt Import"
#   4. Copy the token
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Confluence config
CONFLUENCE_SITE="https://erlisgashi67.atlassian.net"
SPACE_KEY="OP"  # Change if your space key differs

if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Mungojnë argumentet!${NC}"
    echo ""
    echo "Përdorimi:"
    echo "  bash scripts/confluence-import.sh <atlassian-email> <atlassian-api-token>"
    echo ""
    echo "Shembull:"
    echo "  bash scripts/confluence-import.sh erlisgashi67@gmail.com ABCD1234EFGH5678"
    exit 1
fi

EMAIL="$1"
TOKEN="$2"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  OraProjekt — Confluence Wiki Import${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${YELLOW}Confluence Site:${NC} $CONFLUENCE_SITE"
echo -e "${YELLOW}Space Key:${NC} $SPACE_KEY"
echo -e "${YELLOW}Email:${NC} $EMAIL"
echo ""

# Verify credentials
echo -e "${BLUE}🔍 Verifikoj kredencialet...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "$EMAIL:$TOKEN" \
    "$CONFLUENCE_SITE/wiki/rest/api/user/current")

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ Kredenciale të gabuara! (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Kredenciale të vlefshme!${NC}"
echo ""

# Check if space exists, create if not
echo -e "${BLUE}🔍 Kontrolloj space $SPACE_KEY...${NC}"
SPACE_RESPONSE=$(curl -s -u "$EMAIL:$TOKEN" "$CONFLUENCE_SITE/wiki/rest/api/space/$SPACE_KEY")

if echo "$SPACE_RESPONSE" | grep -q '"key"'; then
    SPACE_NAME=$(echo "$SPACE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Space u gjet: $SPACE_NAME${NC}"
else
    echo -e "${YELLOW}⚠️  Space nuk ekziston. Po e krijoj...${NC}"
    CREATE_SPACE=$(curl -s -X POST \
        -u "$EMAIL:$TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$SPACE_KEY\",\"name\":\"OraProjekt Engineering\"}" \
        "$CONFLUENCE_SITE/wiki/rest/api/space")
    
    if echo "$CREATE_SPACE" | grep -q '"key"'; then
        echo -e "${GREEN}✅ Space u krijua!${NC}"
    else
        echo -e "${RED}❌ Dështoi krijimi i space${NC}"
        echo "Krijo manualisht: $CONFLUENCE_SITE/wiki/createentity?spaceKey=$SPACE_KEY"
        exit 1
    fi
fi
echo ""

# Get space homepage ID
HOMEPAGE_RESPONSE=$(curl -s -u "$EMAIL:$TOKEN" "$CONFLUENCE_SITE/wiki/rest/api/space/$SPACE_KEY?expand=homepage")
HOMEPAGE_ID=$(echo "$HOMEPAGE_RESPONSE" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['homepage']['id'])" 2>/dev/null)

if [ -z "$HOMEPAGE_ID" ]; then
    echo -e "${RED}❌ Nuk mund të gjej homepage ID${NC}"
    exit 1
fi
echo -e "${BLUE}📍 Homepage ID: $HOMEPAGE_ID${NC}"
echo ""

# Function to create a Confluence page from a markdown file
create_page() {
    local TITLE="$1"
    local FILE_PATH="$2"
    local PARENT_ID="$3"

    # Read file content
    local CONTENT=$(cat "$FILE_PATH")

    # Create page via Confluence API (using storage format)
    # Convert markdown to Confluence storage format (simplified — uses HTML-like format)
    local PAYLOAD=$(python3 << 'PYTHON'
import json, sys, re

# Read the markdown content
with open(sys.argv[1], 'r') as f:
    content = f.read()

# Simple markdown to Confluence storage format conversion
# Headers
content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
content = re.sub(r'^# (.+)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)

# Code blocks
content = re.sub(r'```(\w*)\n(.*?)```', r'<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">\1</ac:parameter><ac:plain-text-body><![CDATA[\2]]></ac:plain-text-body></ac:structured-macro>', content, flags=re.DOTALL)

# Inline code
content = re.sub(r'`([^`]+)`', r'<code>\1</code>', content)

# Bold
content = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', content)

# Italic
content = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', content)

# Links
content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)

# Lists (unordered)
content = re.sub(r'^- (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)

# Tables (basic)
content = re.sub(r'^\|(.+)\|$', r'<td>\1</td>', content, flags=re.MULTILINE)

# Line breaks (double newline = paragraph)
content = re.sub(r'\n\n', r'</p><p>', content)
content = '<p>' + content + '</p>'

# Build payload
title = sys.argv[2]
parent_id = sys.argv[3]

payload = {
    "type": "page",
    "title": title,
    "space": {"key": "OP"},
    "status": "current",
    "body": {
        "storage": {
            "value": content,
            "representation": "storage"
        }
    }
}

if parent_id and parent_id != "0":
    payload["ancestors"] = [{"id": parent_id}]

print(json.dumps(payload))
PYTHON
    "$FILE_PATH" "$TITLE" "$PARENT_ID")

    RESPONSE=$(curl -s -X POST \
        -u "$EMAIL:$TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$CONFLUENCE_SITE/wiki/rest/api/content")

    if echo "$RESPONSE" | grep -q '"id"'; then
        PAGE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        PAGE_URL=$(echo "$RESPONSE" | grep -o '"_links":{"base":"[^"]*","webui":"[^"]*"' | grep -o '"webui":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅${NC} $TITLE — $CONFLUENCE_SITE$PAGE_URL"
        echo "$PAGE_ID"
    else
        echo -e "${RED}❌${NC} $TITLE"
        echo ""
    fi
}

# ============================================================
# Create pages from docs/
# ============================================================
echo -e "${BLUE}📝 Krijoj faqe nga docs/...${NC}"
echo ""

# 1. API Reference
create_page "API Reference" "docs/API.md" "$HOMEPAGE_ID" > /tmp/confluence-api.txt
API_PAGE_ID=$(tail -1 /tmp/confluence-api.txt)

# 2. Architecture
create_page "Architecture" "docs/ARCHITECTURE.md" "$HOMEPAGE_ID" > /tmp/confluence-arch.txt
ARCH_PAGE_ID=$(tail -1 /tmp/confluence-arch.txt)

# 3. Onboarding
create_page "Onboarding" "docs/ONBOARDING.md" "$HOMEPAGE_ID" > /tmp/confluence-onb.txt
ONB_PAGE_ID=$(tail -1 /tmp/confluence-onb.txt)

# 4. Runbook
create_page "Runbook" "docs/RUNBOOK.md" "$HOMEPAGE_ID" > /tmp/confluence-run.txt
RUN_PAGE_ID=$(tail -1 /tmp/confluence-run.txt)

# 5. Deployment Guide
create_page "Deployment Guide" "docs/DEPLOYMENT.md" "$HOMEPAGE_ID" > /tmp/confluence-dep.txt
DEP_PAGE_ID=$(tail -1 /tmp/confluence-dep.txt)

# 6. Free Deployment
create_page "Free Deployment ($0)" "docs/FREE-DEPLOY.md" "$HOMEPAGE_ID" > /tmp/confluence-free.txt

# 7. Vercel Deploy
create_page "Vercel Deployment" "docs/VERCEL-DEPLOY.md" "$HOMEPAGE_ID" > /tmp/confluence-vercel.txt

# 8. VPS Deploy
create_page "VPS Deployment" "docs/VPS-DEPLOY.md" "$HOMEPAGE_ID" > /tmp/confluence-vps.txt

# 9. Jira Setup
create_page "Jira Setup Guide" "docs/JIRA-SETUP.md" "$HOMEPAGE_ID" > /tmp/confluence-jira.txt

# 10. Figma Guide
create_page "Figma Mockups Guide" "docs/FIGMA-GUIDE.md" "$HOMEPAGE_ID" > /tmp/confluence-figma.txt

# 11. App Store Metadata
create_page "App Store Metadata" "docs/app-store-metadata.md" "$HOMEPAGE_ID" > /tmp/confluence-as.txt

# 12. Play Store Metadata
create_page "Play Store Metadata" "docs/play-store-metadata.md" "$HOMEPAGE_ID" > /tmp/confluence-ps.txt

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  ✅ Import përfundoi!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}📍 Confluence Space:${NC}"
echo "  $CONFLUENCE_SITE/wiki/spaces/$SPACE_KEY"
echo ""
echo -e "${BLUE}📋 Faqe të krijuara:${NC}"
echo "  - API Reference"
echo "  - Architecture"
echo "  - Onboarding"
echo "  - Runbook"
echo "  - Deployment Guide"
echo "  - Free Deployment ($0)"
echo "  - Vercel Deployment"
echo "  - VPS Deployment"
echo "  - Jira Setup Guide"
echo "  - Figma Mockups Guide"
echo "  - App Store Metadata"
echo "  - Play Store Metadata"
echo ""
