#!/usr/bin/env python3
"""mdsite build engine — pure-Python Markdown SUBSET -> HTML static site.

Subset supported: #/##/### headings, **bold**, [text](url) links,
``` fenced code ```, and paragraphs. No external dependencies.

Placeholders in mdsite/template.html (from theme pole): {{title}} {{content}}
"""
import html
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, "content")
TEMPLATE_PATH = os.path.join(ROOT, "mdsite", "template.html")
SITE_DIR = os.path.join(ROOT, "site")

_BOLD = re.compile(r"\*\*(.+?)\*\*")
_LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_HEADING = re.compile(r"(#{1,3})\s+(.*)")
_H1 = re.compile(r"#\s+(.*)")


def _inline(text):
    """Apply inline rules (bold, links) to already-block-split text."""
    text = _BOLD.sub(r"<strong>\1</strong>", text)
    text = _LINK.sub(r'<a href="\2">\1</a>', text)
    return text


def md_to_html(md):
    """Convert a Markdown subset string to an HTML fragment."""
    lines = md.split("\n")
    out = []
    para = []

    def flush():
        if para:
            joined = " ".join(para).strip()
            if joined:
                out.append("<p>" + _inline(joined) + "</p>")
            para.clear()

    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        if line.startswith("```"):
            flush()
            i += 1
            code = []
            while i < n and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
            continue
        m = _HEADING.match(line)
        if m:
            flush()
            level = len(m.group(1))
            out.append("<h%d>%s</h%d>" % (level, _inline(m.group(2).strip()), level))
            i += 1
            continue
        if line.strip() == "":
            flush()
            i += 1
            continue
        para.append(line.strip())
        i += 1
    flush()
    return "\n".join(out)


def extract_title(md):
    """First H1 becomes the page title; fall back to 'Untitled'."""
    for line in md.split("\n"):
        m = _H1.match(line)
        if m:
            return m.group(1).strip()
    return "Untitled"


def render_page(template, title, content):
    """Substitute title + content HTML into template placeholders."""
    return template.replace("{{title}}", title).replace("{{content}}", content)


def build_site():
    """Build every content/*.md into site/<name>.html plus site/index.html."""
    os.makedirs(SITE_DIR, exist_ok=True)
    with open(TEMPLATE_PATH, encoding="utf-8") as f:
        template = f.read()

    pages = []
    for fn in sorted(os.listdir(CONTENT_DIR)):
        if not fn.endswith(".md"):
            continue
        name = fn[:-3]
        with open(os.path.join(CONTENT_DIR, fn), encoding="utf-8") as f:
            md = f.read()
        title = extract_title(md)
        content = md_to_html(md)
        with open(os.path.join(SITE_DIR, name + ".html"), "w", encoding="utf-8") as f:
            f.write(render_page(template, title, content))
        pages.append((name, title))

    links = "\n".join(
        '<li><a href="%s.html">%s</a></li>' % (name, html.escape(title))
        for name, title in pages
    )
    index = render_page(template, "Index", "<ul>\n%s\n</ul>" % links)
    with open(os.path.join(SITE_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index)
    return pages


if __name__ == "__main__":
    built = build_site()
    print("built %d page(s): %s" % (len(built), ", ".join(n for n, _ in built)))
