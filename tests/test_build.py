"""Assert-based tests for the mdsite build engine.

Run: python3 tests/test_build.py  (exit 0 == pass)

Uses an INLINE stub template so it never depends on mdsite/template.html.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mdsite"))
import build  # noqa: E402

STUB_TEMPLATE = "<title>{{title}}</title><main>{{content}}</main>"


def test_heading():
    html = build.md_to_html("# Title\n## Sub\n### Deep")
    assert "<h1>Title</h1>" in html, html
    assert "<h2>Sub</h2>" in html, html
    assert "<h3>Deep</h3>" in html, html


def test_bold():
    html = build.md_to_html("a **strong** word")
    assert "<strong>strong</strong>" in html, html


def test_link():
    html = build.md_to_html("see [here](https://x.io)")
    assert '<a href="https://x.io">here</a>' in html, html


def test_code_block():
    html = build.md_to_html("```\nx = 1\n```")
    assert "<pre><code>" in html and "x = 1" in html and "</code></pre>" in html, html


def test_paragraph():
    html = build.md_to_html("just a line")
    assert "<p>just a line</p>" in html, html


def test_render_with_stub_template():
    out = build.render_page(STUB_TEMPLATE, "My Page", "<p>hi</p>")
    assert out == "<title>My Page</title><main><p>hi</p></main>", out


def test_title_from_first_heading():
    assert build.extract_title("# Real Title\nbody") == "Real Title"
    assert build.extract_title("no heading here") == "Untitled"


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print("ok", t.__name__)
    print("ALL PASS (%d tests)" % len(tests))
