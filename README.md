# mdsite

A small static site generator. It converts a folder of Markdown files into an
HTML site using a theme template.

## What it does

- Reads Markdown from `content/*.md`
- Renders each file through the theme template
- Writes `site/*.html`, one per source file, plus a `site/index.html` linking them

## Add a page

Drop a `.md` file into `content/`:

```
content/about.md  ->  site/about.html
```

The file name (without `.md`) becomes the output page name and its link on the
index.

## Build

```
python3 mdsite/build.py
```

## Output

Generated HTML lands in `site/`:

- `site/index.html` — index of all pages
- `site/<name>.html` — one page per `content/<name>.md`
