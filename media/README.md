# media/

Drop your photos and videos here, then reference them from `../data.js`.

Naming suggestion: `01-1.jpg`, `01-2.mp4`, `02-1.jpg`, … (month number, then item number).

Example entry in `data.js`:

```js
media: [
  { type: "image", src: "media/01-1.jpg", orientation: "portrait" },
  { type: "video", src: "media/01-2.mp4", orientation: "landscape", poster: "media/01-2-poster.jpg" }
]
```

- `orientation: "portrait"` fills the frame (center-cropped).
- `orientation: "landscape"` is letterboxed over a blurred copy of itself.
- Videos autoplay muted and advance when they end; a `poster` is shown while loading.
- Optional background music: put e.g. `music.mp3` here and set `music: "media/music.mp3"` in `data.js`.
