#!/usr/bin/env python3
"""
OraProjekt — Jira Issues Import Script
Creates 30 issues in Jira from docs/jira-issues.csv

Usage:
    export ATLASSIAN_TOKEN="your-token-here"
    python3 scripts/jira-import.py
"""
import csv
import json
import requests
import sys
import time
import os

# Config — set via environment variables or defaults
JIRA_SITE = os.environ.get("JIRA_SITE", "https://erlisgashi67-1783843555123.atlassian.net")
EMAIL = os.environ.get("ATLASSIAN_EMAIL", "erlisgashi67@gmail.com")
TOKEN = os.environ.get("ATLASSIAN_TOKEN", "")
PROJECT_KEY = os.environ.get("JIRA_PROJECT_KEY", "OR")

auth = (EMAIL, TOKEN)
headers = {"Content-Type": "application/json", "Accept": "application/json"}

# Colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

def create_issue(summary, issue_type, status, priority, labels, description):
    """Create a single Jira issue"""
    
    # Map status to Jira status
    status_map = {
        "To Do": "To Do",
        "Backlog": "To Do",  # Backlog maps to To Do in this project
        "In Progress": "In Progress",
        "In Review": "In Review",
        "Done": "Done",
    }
    jira_status = status_map.get(status, "To Do")
    
    # Build description as Atlassian Document Format
    desc_adf = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": description.replace("\\n", "\n").strip()
                    }
                ]
            }
        ]
    } if description else None
    
    payload = {
        "fields": {
            "project": {"key": PROJECT_KEY},
            "summary": summary,
            "issuetype": {"name": issue_type},
            "labels": [l.strip() for l in labels.split(";") if l.strip()],
        }
    }
    
    if desc_adf:
        payload["fields"]["description"] = desc_adf
    
    # Note: next-gen projects don't support priority via API directly
    # Priority is set via field updates if available
    
    try:
        resp = requests.post(
            f"{JIRA_SITE}/rest/api/3/issue",
            auth=auth,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if resp.status_code == 201:
            data = resp.json()
            issue_key = data["key"]
            issue_id = data["id"]
            
            # Transition to desired status
            if jira_status != "To Do":
                transition_issue(issue_id, jira_status)
            
            return issue_key, None
        else:
            error = resp.json().get("errorMessages", ["Unknown error"])[0]
            return None, error
    except Exception as e:
        return None, str(e)

def transition_issue(issue_id, target_status):
    """Transition issue to target status"""
    try:
        # Get available transitions
        resp = requests.get(
            f"{JIRA_SITE}/rest/api/3/issue/{issue_id}/transitions",
            auth=auth,
            headers=headers,
            timeout=30
        )
        
        if resp.status_code != 200:
            return False
        
        transitions = resp.json().get("transitions", [])
        for t in transitions:
            if t.get("to", {}).get("name") == target_status:
                requests.post(
                    f"{JIRA_SITE}/rest/api/3/issue/{issue_id}/transitions",
                    auth=auth,
                    headers=headers,
                    json={"transition": {"id": t["id"]}},
                    timeout=30
                )
                return True
        return False
    except:
        return False

def main():
    print(f"{BLUE}=========================================={NC}")
    print(f"{BLUE}  OraProjekt — Jira Issues Import{NC}")
    print(f"{BLUE}=========================================={NC}")
    print()
    print(f"{YELLOW}Jira Site:{NC} {JIRA_SITE}")
    print(f"{YELLOW}Project Key:{NC} {PROJECT_KEY}")
    print(f"{YELLOW}Email:{NC} {EMAIL}")
    print()
    
    # Read CSV
    issues = []
    with open("docs/jira-issues.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            issues.append(row)
    
    print(f"{BLUE}📋 Gjenda {len(issues)} issues për import...{NC}")
    print()
    
    created = 0
    failed = 0
    
    for i, issue in enumerate(issues, 1):
        summary = issue["Summary"]
        issue_type = issue["Issue Type"]
        status = issue["Status"]
        priority = issue["Priority"]
        labels = issue["Labels"]
        description = issue["Description"]
        
        print(f"[{i}/{len(issues)}] {summary[:50]}...", end=" ", flush=True)
        
        key, error = create_issue(summary, issue_type, status, priority, labels, description)
        
        if key:
            print(f"{GREEN}✅ {key}{NC}")
            created += 1
        else:
            print(f"{RED}❌ {error}{NC}")
            failed += 1
        
        # Rate limit — be nice to API
        time.sleep(0.5)
    
    print()
    print(f"{GREEN}=========================================={NC}")
    print(f"{GREEN}  ✅ Import përfundoi!{NC}")
    print(f"{GREEN}=========================================={NC}")
    print()
    print(f"{GREEN}Created:{NC} {created}")
    print(f"{RED}Failed:{NC}  {failed}")
    print()
    print(f"{BLUE}📍 Jira Board:{NC}")
    print(f"  {JIRA_SITE}/jira/software/projects/{PROJECT_KEY}/list")
    print()

if __name__ == "__main__":
    main()
