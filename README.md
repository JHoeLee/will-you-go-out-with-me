# A Day in JB 💙

A playful side-scrolling webpage inviting Yi Xuan on a date trip to Johor Bahru.
Scroll (or swipe) and a little car drives down a street, passing each stop of the
day as an illustrated scene — from morning dim sum all the way to a neon-lit
hotpot dinner — ending with the big question.

## Run it

It's a static site — no build step. Just open `index.html` in a browser, or visit
the live page (GitHub Pages).

## Swap in your own photos

Each stop has a square photo slot. Replace the placeholder images in `images/`
(`stop1-dimsum.svg` … `stop6-dinner.svg`) or point each `info-photo` `src` in
`index.html` to your own `.jpg`/`.png`.

## Files

- `index.html` — page structure (hero, 6 stops, the question)
- `styles.css` — sky/road-trip theme, building scenes, responsive layout
- `script.js` — horizontal scroll, runaway "No" button, confetti
- `images/` — swappable placeholder photos
