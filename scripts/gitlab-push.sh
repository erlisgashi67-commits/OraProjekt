#!/bin/bash
# =============================================================================
# OraProjekt — GitLab Push Automation Script
# =============================================================================
# Usage:
#   bash scripts/gitlab-push.sh <gitlab-username> <gitlab-token> [repo-name]
#
# Example:
#   bash scripts/gitlab-push.sh erlisgashi67 ghp_xxxxxxxx OraProjekt
#
# What it does:
#   1. Validates inputs
#   2. Adds GitLab remote (with token auth)
#   3. Pushes current branch to GitLab
#   4. Verifies push succeeded
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  OraProjekt — GitLab Push Automation${NC}"
echo -e "${BLUE}==========================================${NC}"

# Validate arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Gabim: Mungojnë argumentet!${NC}"
    echo ""
    echo "Përdorimi:"
    echo "  bash scripts/gitlab-push.sh <gitlab-username> <gitlab-token> [repo-name]"
    echo ""
    echo "Shembull:"
    echo "  bash scripts/gitlab-push.sh erlisgashi67 glpat-xxxxxxxxxxxx OraProjekt"
    echo ""
    echo "Si të gjesh GitLab token:"
    echo "  1. Shko te https://gitlab.com/-/user_settings/personal_access_tokens"
    echo "  2. Generate new token"
    echo "  3. Scopes: write_repository, api"
    echo "  4. Kopjo token-in (fillon me glpat-)"
    exit 1
fi

GITLAB_USER="$1"
GITLAB_TOKEN="$2"
REPO_NAME="${3:-OraProjekt}"

echo -e "${YELLOW}📋 Konfigurimi:${NC}"
echo "  GitLab User: $GITLAB_USER"
echo "  Repo Name:   $REPO_NAME"
echo "  Token:       ${GITLAB_TOKEN:0:10}..."
echo ""

# Check if we're in a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}❌ Nuk jemi në një git repository!${NC}"
    exit 1
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo -e "${YELLOW}🌿 Branch aktuale: ${BRANCH}${NC}"
echo ""

# Check if GitLab remote already exists
if git remote get-url gitlab > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Remote 'gitlab' ekziston tashmë. Po e përditësoj...${NC}"
    git remote remove gitlab
fi

# Add GitLab remote with token authentication
GITLAB_URL="https://${GITLAB_USER}:${GITLAB_TOKEN}@gitlab.com/${GITLAB_USER}/${REPO_NAME}.git"
echo -e "${BLUE}➕ Shtoj remote 'gitlab'...${NC}"
git remote add gitlab "$GITLAB_URL"

# Verify remote was added
if git remote get-url gitlab > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Remote 'gitlab' u shtua me sukses${NC}"
else
    echo -e "${RED}❌ Dështoi shtimi i remote-it${NC}"
    exit 1
fi

echo ""

# Check if repo exists on GitLab
echo -e "${BLUE}🔍 Kontrolloj nëse repo ekziston në GitLab...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    "https://gitlab.com/api/v4/projects/${GITLAB_USER}%2F${REPO_NAME}")

if [ "$HTTP_STATUS" = "404" ]; then
    echo -e "${YELLOW}⚠️  Repo nuk ekziston në GitLab. Po e krijoj...${NC}"
    
    # Create repo via GitLab API
    CREATE_RESPONSE=$(curl -s -X POST \
        --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        --header "Content-Type: application/json" \
        --data "{\"name\": \"${REPO_NAME}\", \"visibility\": \"private\", \"initialize_with_readme\": false}" \
        "https://gitlab.com/api/v4/projects")
    
    if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
        echo -e "${GREEN}✅ Repo u krijua në GitLab!${NC}"
    else
        echo -e "${RED}❌ Dështoi krijimi i repo-s${NC}"
        echo "Përgjigja: $CREATE_RESPONSE"
        echo ""
        echo "Krijo manualisht: https://gitlab.com/projects/new"
        exit 1
    fi
elif [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Repo ekziston në GitLab${NC}"
else
    echo -e "${YELLOW}⚠️  Nuk mund të verifikova repo-n (HTTP $HTTP_STATUS)${NC}"
    echo "Krijo manualisht nëse nuk ekziston: https://gitlab.com/projects/new"
fi

echo ""

# Push to GitLab
echo -e "${BLUE}🚀 Po bëj push në GitLab...${NC}"
if git push -u gitlab "$BRANCH" 2>&1; then
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  ✅ PUSH I SUKSESSHËM!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo -e "${BLUE}📍 GitLab URL:${NC}"
    echo "  https://gitlab.com/${GITLAB_USER}/${REPO_NAME}"
    echo ""
    echo -e "${BLUE}📍 Branch:${NC}"
    echo "  ${BRANCH}"
    echo ""
    echo -e "${BLUE}📍 Commits:${NC}"
    git log --oneline -5
    echo ""
    echo -e "${GREEN}🎉 U krye! Repo është tani në GitHub + GitLab${NC}"
else
    echo -e "${RED}❌ Push dështoi${NC}"
    exit 1
fi

# Clean up: remove token from remote URL for security
echo ""
echo -e "${BLUE}🔒 Po heq token-in nga remote URL...${NC}"
git remote remove gitlab
git remote add gitlab "https://gitlab.com/${GITLAB_USER}/${REPO_NAME}.git"
echo -e "${GREEN}✅ Token u hoq. Remote tani përdor URL pa token${NC}"
echo ""
echo -e "${YELLOW}💡 Për push në të ardhmen, përdor:${NC}"
echo "  git push gitlab main"
echo ""
echo "Git do të kërkojë username/password. Përdor:"
echo "  Username: $GITLAB_USER"
echo "  Password: [GitLab token yt]"
echo ""
echo "Ose ruaj credentials:"
echo "  git config credential.helper store"
echo "  git push gitlab main  # shkruaj token-in një herë"
