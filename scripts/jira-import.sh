#!/bin/bash
# =============================================================================
# OraProjekt — Jira Issues Import Script
# =============================================================================
# Creates 30 issues in Jira from docs/jira-issues.csv
#
# Usage:
#   bash scripts/jira-import.sh <atlassian-email> <atlassian-api-token>
#
# How to get Atlassian API token:
#   1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
#   2. Click "Create API token"
#   3. Name: "OraProjekt Import"
#   4. Copy the token
#   5. Run: bash scripts/jira-import.sh your@email.com YOUR_TOKEN
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Jira config — update if your site/project key differs
JIRA_SITE="https://erlisgashi67-1783843555123.atlassian.net"
PROJECT_KEY="OR"

if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Mungojnë argumentet!${NC}"
    echo ""
    echo "Përdorimi:"
    echo "  bash scripts/jira-import.sh <atlassian-email> <atlassian-api-token>"
    echo ""
    echo "Shembull:"
    echo "  bash scripts/jira-import.sh erlisgashi67@gmail.com ABCD1234EFGH5678"
    echo ""
    echo "Si të gjesh Atlassian API token:"
    echo "  1. Shko te https://id.atlassian.com/manage-profile/security/api-tokens"
    echo "  2. Click 'Create API token'"
    echo "  3. Name: 'OraProjekt Import'"
    echo "  4. Copy the token"
    exit 1
fi

EMAIL="$1"
TOKEN="$2"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  OraProjekt — Jira Issues Import${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${YELLOW}Jira Site:${NC} $JIRA_SITE"
echo -e "${YELLOW}Project Key:${NC} $PROJECT_KEY"
echo -e "${YELLOW}Email:${NC} $EMAIL"
echo ""

# Verify credentials
echo -e "${BLUE}🔍 Verifikoj kredencialet...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "$EMAIL:$TOKEN" \
    "$JIRA_SITE/rest/api/3/myself")

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ Kredenciale të gabuara! (HTTP $HTTP_CODE)${NC}"
    echo "Kontrollo email dhe API token"
    exit 1
fi
echo -e "${GREEN}✅ Kredenciale të vlefshme!${NC}"
echo ""

# Get project info
echo -e "${BLUE}🔍 Kontrolloj projektin $PROJECT_KEY...${NC}"
PROJECT_RESPONSE=$(curl -s -u "$EMAIL:$TOKEN" "$JIRA_SITE/rest/api/3/project/$PROJECT_KEY")
if echo "$PROJECT_RESPONSE" | grep -q '"key"'; then
    PROJECT_NAME=$(echo "$PROJECT_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Projekti u gjet: $PROJECT_NAME${NC}"
else
    echo -e "${RED}❌ Projekti $PROJECT_KEY nuk u gjet!${NC}"
    echo "Krijo projekt në Jira me key: $PROJECT_KEY"
    echo "URL: $JIRA_SITE/jira/software/projects/$PROJECT_KEY/summary"
    exit 1
fi
echo ""

# Read CSV and create issues
echo -e "${BLUE}📋 Importoj issues nga CSV...${NC}"
echo ""

# Skip header line, process each row
tail -n +2 docs/jira-issues.csv | while IFS=, read -r SUMMARY ISSUE_TYPE STATUS PRIORITY LABELS ASSIGNEE DESCRIPTION
do
    # Clean up fields (remove quotes)
    SUMMARY=$(echo "$SUMMARY" | sed 's/^"//;s/"$//')
    ISSUE_TYPE=$(echo "$ISSUE_TYPE" | sed 's/^"//;s/"$//')
    STATUS=$(echo "$STATUS" | sed 's/^"//;s/"$//')
    PRIORITY=$(echo "$PRIORITY" | sed 's/^"//;s/"$//')
    LABELS=$(echo "$LABELS" | sed 's/^"//;s/"$//' | tr ';' ',')
    DESCRIPTION=$(echo "$DESCRIPTION" | sed 's/^"//;s/"$//' | sed 's/\\n/\n/g')

    # Map issue type (Jira may use different names)
    case $ISSUE_TYPE in
        "Story") JIRA_TYPE="Story" ;;
        "Task") JIRA_TYPE="Task" ;;
        "Bug") JIRA_TYPE="Bug" ;;
        "Epic") JIRA_TYPE="Epic" ;;
        *) JIRA_TYPE="Task" ;;
    esac

    # Map priority
    case $PRIORITY in
        "High") JIRA_PRIORITY="High" ;;
        "Medium") JIRA_PRIORITY="Medium" ;;
        "Low") JIRA_PRIORITY="Low" ;;
        *) JIRA_PRIORITY="Medium" ;;
    esac

    # Build labels array
    LABELS_JSON=$(echo "$LABELS" | tr ',' '\n' | sed 's/^/"/;s/$/"/' | paste -sd, | sed 's/^/[/;s/$/]/')

    # Build JSON payload
    PAYLOAD=$(cat <<EOF
{
    "fields": {
        "project": {"key": "$PROJECT_KEY"},
        "summary": "$SUMMARY",
        "issuetype": {"name": "$JIRA_TYPE"},
        "priority": {"name": "$JIRA_PRIORITY"},
        "description": {
            "type": "doc",
            "version": 1,
            "content": [{
                "type": "paragraph",
                "content": [{
                    "type": "text",
                    "text": $(echo "$DESCRIPTION" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))" 2>/dev/null || echo '""')
                }]
            }]
        },
        "labels": $(echo "$LABELS_JSON" | python3 -c "import sys,json; labels=[l.strip() for l in sys.stdin.read().strip('[]\n').split(',') if l.strip()]; print(json.dumps(labels))" 2>/dev/null || echo '[]')
    }
}
EOF
)

    # Create issue
    RESPONSE=$(curl -s -X POST \
        -u "$EMAIL:$TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$JIRA_SITE/rest/api/3/issue")

    if echo "$RESPONSE" | grep -q '"key"'; then
        ISSUE_KEY=$(echo "$RESPONSE" | grep -o '"key":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}✅${NC} $ISSUE_KEY — $SUMMARY"

        # Move to correct status column
        case $STATUS in
            "To Do") TRANSITION_ID="11" ;;
            "In Progress") TRANSITION_ID="21" ;;
            "In Review") TRANSITION_ID="31" ;;
            "Done") TRANSITION_ID="41" ;;
            "Backlog") TRANSITION_ID="1" ;;
            *) TRANSITION_ID="" ;;
        esac

        if [ -n "$TRANSITION_ID" ]; then
            curl -s -X POST \
                -u "$EMAIL:$TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"transition\":{\"id\":\"$TRANSITION_ID\"}}" \
                "$JIRA_SITE/rest/api/3/issue/$ISSUE_KEY/transitions" > /dev/null 2>&1
        fi
    else
        echo -e "${RED}❌${NC} $SUMMARY — $(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1)"
    fi
done

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  ✅ Import përfundoi!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}📍 Jira Board:${NC}"
echo "  $JIRA_SITE/jira/software/projects/$PROJECT_KEY/list"
echo ""
