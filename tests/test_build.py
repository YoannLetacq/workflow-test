#!/usr/bin/env python3
"""Assert-based checks for the mdsite conversion. Uses an INLINE stub template
so tests do not depend on mdsite/template.html."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mdsite"))
import build  # noqa: E402

STUB = "<html><title>{{title}}</title><body>{{content}}</body></html>"


def test_heading():
    assert build.convert("# Title") == "<h1>Title</h1>"
    assert build.convert("## Sub") == "<h2>Sub</h2>"
    assert build.convert("### Deep") == "<h3>Deep</h3>"


def test_bold():
    assert build.convert("a **b** c") == "<p>a <strong>b</strong> c</p>"


def test_link():
    assert build.convert("[t](http://x)") == '<p><a href="http://x">t</a></p>'


def test_code_block():
    html = build.convert("```\nprint(1)\n```")
    assert html == "<pre><code>print(1)</code></pre>", html


def test_template_substitution():
    page = build.render_page("Hi", "<p>body</p>", STUB)
    assert page == "<html><title>Hi</title><body><p>body</p></body></html>", page


def test_escaping():
    # raw < in a paragraph must be escaped, not injected
    assert build.convert("a < b") == "<p>a &lt; b</p>"


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("ALL PASS")
