# Theme logos (drag & drop)

Drop a logo image per theme into this folder and it will appear as the big
watermark behind the dashboard's center cards. Name the file after the theme
id, `.png` or `.svg`:

```
logos/aura.png
logos/spiderman.png      (Spider-Man / Web-Slinger)
logos/batman.png         (Dark Knight)
logos/anime.png          (Sakura)
logos/naruto.png         (Hidden Leaf)
logos/superman.png       (Man of Steel)
logos/daylight.png
```

PNG with transparency works best. The image is rendered desaturated at low
opacity, so any colors are fine. When a file is missing, a built-in minimal
SVG mark for that theme is used instead.

After adding files run `npm run build` and reload the extension — Vite copies
everything in `public/` into the build output.
