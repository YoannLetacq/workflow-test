#!/usr/bin/env python3
"""mdsite build engine: convert a Markdown subset to HTML in pure Python.

Subset: # / ## / ### headings, **bold**, [text](url) links, ``` fenced code
blocks, and paragraphs. Renders each content/*.md into site/<name>.html via
the theme template (placeholders {{title}} and {{content}}) plus a site index.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
SITE_DIR = ROOT / "site"
TEMPLATE = ROOT / "mdsite" / "template.html"

_BOLD = re.compile(r"\*\*(.+?)\*\*")
_LINK = re.compile(r"\[(.+?)\]\((.+?)\)")


def render_inline(text):
    """Escape HTML then apply inline markup (bold, links)."""
    text = html.escape(text)
    text = _BOLD.sub(r"<strong>\1</strong>", text)
    # links: escape() turned the raw text into safe HTML already
    text = _LINK.sub(r'<a href="\2">\1</a>', text)
    return text


def convert(md):
    """Convert Markdown-subset source to an HTML fragment."""
    lines = md.splitlines()
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
            continue
        if line.startswith("### "):
            out.append("<h3>" + render_inline(line[4:]) + "</h3>")
        elif line.startswith("## "):
            out.append("<h2>" + render_inline(line[3:]) + "</h2>")
        elif line.startswith("# "):
            out.append("<h1>" + render_inline(line[2:]) + "</h1>")
        elif line.strip() == "":
            pass  # blank line separates blocks
        else:
            # gather consecutive non-blank, non-structural lines into a paragraph
            para = [line]
            while (i + 1 < len(lines) and lines[i + 1].strip()
                   and not lines[i + 1].startswith(("#", "```"))):
                i += 1
                para.append(lines[i])
            out.append("<p>" + render_inline(" ".join(para)) + "</p>")
        i += 1
    return "\n".join(out)


def title_of(md, fallback):
    """First `# ` heading, else the file stem."""
    for line in md.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def render_page(title, body, template):
    return template.replace("{{title}}", html.escape(title)).replace("{{content}}", body)


def build():
    template = TEMPLATE.read_text(encoding="utf-8")
    SITE_DIR.mkdir(exist_ok=True)
    pages = []
    for src in sorted(CONTENT_DIR.glob("*.md")):
        md = src.read_text(encoding="utf-8")
        title = title_of(md, src.stem)
        body = convert(md)
        (SITE_DIR / f"{src.stem}.html").write_text(
            render_page(title, body, template), encoding="utf-8")
        pages.append((src.stem, title))

    links = "\n".join(
        f'<li><a href="{name}.html">{html.escape(title)}</a></li>'
        for name, title in pages)
    index_body = f"<ul>\n{links}\n</ul>"
    (SITE_DIR / "index.html").write_text(
        render_page("Index", index_body, template), encoding="utf-8")
    return pages


if __name__ == "__main__":
    built = build()
    print(f"Built {len(built)} page(s) + index into {SITE_DIR}")
