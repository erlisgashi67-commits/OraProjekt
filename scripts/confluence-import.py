#!/usr/bin/env python3
"""
OraProjekt — Confluence Wiki Import Script
Creates pages in Confluence from docs/ markdown files

Usage:
    export ATLASSIAN_TOKEN="your-token-here"
    python3 scripts/confluence-import.py
"""
import json
import requests
import sys
import os
import re
import html

# Config — set via environment variables or defaults
CONFLUENCE_SITE = os.environ.get("CONFLUENCE_SITE", "https://erlisgashi67.atlassian.net")
EMAIL = os.environ.get("ATLASSIAN_EMAIL", "erlisgashi67@gmail.com")
TOKEN = os.environ.get("ATLASSIAN_TOKEN", "")
SPACE_KEY = os.environ.get("CONFLUENCE_SPACE_KEY", "OE")
HOMEPAGE_ID = os.environ.get("CONFLUENCE_HOMEPAGE_ID", "295021")

auth = (EMAIL, TOKEN)
headers = {"Content-Type": "application/json", "Accept": "application/json"}

GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

def markdown_to_confluence(md):
    """Convert markdown to Confluence storage format (XHTML-based)"""
    content = md
    
    # Remove markdown metadata/frontmatter
    content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
    
    # Code blocks — convert to Confluence code macro
    def code_repl(m):
        lang = m.group(1) or ''
        code = m.group(2)
        # Escape XML special chars in code
        code = code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return f'<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">{lang}</ac:parameter><ac:parameter ac:name="theme">RDark</ac:parameter><ac:plain-text-body><![CDATA[{code}]]></ac:plain-text-body></ac:structured-macro>'
    
    content = re.sub(r'```(\w*)\n(.*?)```', code_repl, content, flags=re.DOTALL)
    
    # Headers
    content = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', content, flags=re.MULTILINE)
    content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
    content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
    content = re.sub(r'^# (.+)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)
    
    # Horizontal rules
    content = re.sub(r'^---+$', r'<hr/>', content, flags=re.MULTILINE)
    
    # Bold
    content = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', content)
    
    # Italic
    content = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', content)
    
    # Inline code
    content = re.sub(r'`([^`]+)`', r'<code>\1</code>', content)
    
    # Links [text](url)
    content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
    
    # Tables — basic conversion
    lines = content.split('\n')
    in_table = False
    table_lines = []
    result = []
    
    for line in lines:
        if line.strip().startswith('|') and line.strip().endswith('|'):
            table_lines.append(line.strip())
        else:
            if table_lines:
                # Process table
                result.append('<table><tbody>')
                for i, tl in enumerate(table_lines):
                    cells = [c.strip() for c in tl.strip('|').split('|')]
                    if i == 1 and re.match(r'^[-:]+$', cells[0].replace(' ', '')):
                        continue  # skip separator row
                    tag = 'th' if i == 0 else 'td'
                    row = '<tr>' + ''.join(f'<{tag}>{c}</{tag}>' for c in cells) + '</tr>'
                    result.append(row)
                result.append('</tbody></table>')
                table_lines = []
            result.append(line)
    
    if table_lines:
        result.append('<table><tbody>')
        for i, tl in enumerate(table_lines):
            cells = [c.strip() for c in tl.strip('|').split('|')]
            tag = 'th' if i == 0 else 'td'
            row = '<tr>' + ''.join(f'<{tag}>{c}</{tag}>' for c in cells) + '</tr>'
            result.append(row)
        result.append('</tbody></table>')
    
    content = '\n'.join(result)
    
    # Lists (unordered)
    content = re.sub(r'^- (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)
    content = re.sub(r'(<li>.*?</li>\n?)+', lambda m: '<ul>' + m.group(0) + '</ul>', content, flags=re.DOTALL)
    
    # Numbered lists
    content = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)
    
    # Checkboxes
    content = re.sub(r'^- \[ \] (.+)$', r'<li>☐ \1</li>', content, flags=re.MULTILINE)
    content = re.sub(r'^- \[x\] (.+)$', r'<li>☑ \1</li>', content, flags=re.MULTILINE | re.IGNORECASE)
    
    # Blockquotes
    content = re.sub(r'^> (.+)$', r'<blockquote>\1</blockquote>', content, flags=re.MULTILINE)
    
    # Paragraphs — wrap text blocks in <p> tags
    paragraphs = []
    current_para = []
    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped:
            if current_para:
                para_text = '\n'.join(current_para)
                if not para_text.startswith('<'):
                    paragraphs.append(f'<p>{para_text}</p>')
                else:
                    paragraphs.append(para_text)
                current_para = []
        else:
            current_para.append(line)
    
    if current_para:
        para_text = '\n'.join(current_para)
        if not para_text.startswith('<'):
            paragraphs.append(f'<p>{para_text}</p>')
        else:
            paragraphs.append(para_text)
    
    return '\n'.join(paragraphs)

def create_page(title, file_path, parent_id=None):
    """Create a Confluence page from a markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        storage_format = markdown_to_confluence(md_content)
        
        payload = {
            "type": "page",
            "title": title,
            "space": {"key": SPACE_KEY},
            "status": "current",
            "body": {
                "storage": {
                    "value": storage_format,
                    "representation": "storage"
                }
            }
        }
        
        if parent_id:
            payload["ancestors"] = [{"id": parent_id}]
        
        resp = requests.post(
            f"{CONFLUENCE_SITE}/wiki/rest/api/content",
            auth=auth,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if resp.status_code == 200:
            data = resp.json()
            page_id = data["id"]
            webui = data.get("_links", {}).get("webui", "")
            url = f"{CONFLUENCE_SITE}{webui}"
            return page_id, url, None
        else:
            try:
                error = resp.json().get("message", f"HTTP {resp.status_code}")
            except:
                error = f"HTTP {resp.status_code}"
            return None, None, error
    except Exception as e:
        return None, None, str(e)

def main():
    print(f"{BLUE}=========================================={NC}")
    print(f"{BLUE}  OraProjekt — Confluence Wiki Import{NC}")
    print(f"{BLUE}=========================================={NC}")
    print()
    print(f"{YELLOW}Confluence Site:{NC} {CONFLUENCE_SITE}")
    print(f"{YELLOW}Space Key:{NC} {SPACE_KEY}")
    print(f"{YELLOW}Homepage ID:{NC} {HOMEPAGE_ID}")
    print()
    
    # Pages to create
    pages = [
        ("API Reference", "docs/API.md"),
        ("Architecture", "docs/ARCHITECTURE.md"),
        ("Onboarding", "docs/ONBOARDING.md"),
        ("Runbook", "docs/RUNBOOK.md"),
        ("Deployment Guide", "docs/DEPLOYMENT.md"),
        ("Free Deployment ($0)", "docs/FREE-DEPLOY.md"),
        ("Vercel Deployment", "docs/VERCEL-DEPLOY.md"),
        ("VPS Deployment", "docs/VPS-DEPLOY.md"),
        ("Jira Setup Guide", "docs/JIRA-SETUP.md"),
        ("Figma Mockups Guide", "docs/FIGMA-GUIDE.md"),
        ("App Store Metadata", "docs/app-store-metadata.md"),
        ("Play Store Metadata", "docs/play-store-metadata.md"),
    ]
    
    print(f"{BLUE}📝 Krijoj {len(pages)} faqe nga docs/...{NC}")
    print()
    
    created = 0
    failed = 0
    
    for title, file_path in pages:
        print(f"  {title[:40]:40s}", end=" ", flush=True)
        
        if not os.path.exists(file_path):
            print(f"{RED}❌ File not found{NC}")
            failed += 1
            continue
        
        page_id, url, error = create_page(title, file_path, HOMEPAGE_ID)
        
        if page_id:
            print(f"{GREEN}✅ ID: {page_id}{NC}")
            created += 1
        else:
            print(f"{RED}❌ {error}{NC}")
            failed += 1
    
    print()
    print(f"{GREEN}=========================================={NC}")
    print(f"{GREEN}  ✅ Import përfundoi!{NC}")
    print(f"{GREEN}=========================================={NC}")
    print()
    print(f"{GREEN}Created:{NC} {created}")
    print(f"{RED}Failed:{NC}  {failed}")
    print()
    print(f"{BLUE}📍 Confluence Space:{NC}")
    print(f"  {CONFLUENCE_SITE}/wiki/spaces/{SPACE_KEY}")
    print()

if __name__ == "__main__":
    main()
