# mdsite

A tiny static-site generator. It converts a folder of Markdown files into a
themed HTML site.

## How it works

- Content lives in `content/` as `*.md` files.
- Each `content/<name>.md` becomes `site/<name>.html`, plus a `site/index.html`
  listing the pages.
- Pages are rendered through `mdsite/template.html`, which uses the
  `{{title}}` and `{{content}}` placeholders, styled by `mdsite/theme.css`.

## Add a page

Drop a Markdown file in `content/`:

```
content/about.md
```

The first `# Heading` is used as the page title.

## Build

```
python3 mdsite/build.py
```

The generated site is written to `site/`. Open `site/index.html` in a browser.
