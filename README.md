# Lavi Labs

Personal brand site for Oren Lavi and Lavi Labs.

## Local Preview

Run a static server from this folder:

```sh
python3 -m http.server 8798 --bind 127.0.0.1
```

Then open:

```txt
http://127.0.0.1:8798/
```

## Launch Notes

- Production domain: `lavilabs.co`
- Homepage: `index.html`
- Contact page: `contact.html`
- Results page: `results.html`
- Styles: `styles.css`
- Snake game: `snake.js`

The high-score ticker is currently static. Global live high scores will need a small backend, ideally Cloudflare Workers + D1 if this is hosted on Cloudflare Pages.
