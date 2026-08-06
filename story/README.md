# 19 Months — static story site

Everything in this folder is plain HTML/CSS/JS. No build step, no backend.

## Edit the content

Open `data.js`. It holds the intro, all 19 months, and the outro. Change titles,
captions and `accentColor`, and list your photos/videos in each month's `media`
array. See `media/README.md` for the media format.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy to GitHub Pages

Copy the contents of this folder (`index.html`, `styles.css`, `data.js`, `app.js`,
`media/`) into the root of a repo, push, then enable Pages on that branch. All paths
are relative, so it also works from a project subpath like
`https://user.github.io/repo/`.

## Controls

- Tap right / swipe left: next. Tap left / swipe right: previous.
- Hold to pause, release to resume.
- Desktop: arrow keys navigate, space pauses.
