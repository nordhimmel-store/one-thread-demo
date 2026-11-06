# Shop v2 — Concept (Finley, co-lead) — KEEP IT SIMPLE

Product: one embroidered dad hat, one original logo, made to order by our partner (Printful). Retail $38 suggested ($35–45 band). One SKU, a few colourways.

## Brand name options
1. **STITCH & SON** — warm, dad-hat pun, crafted feel.
2. **LOWKEY** — the hat you wear when you don't want to try. Logo: a small lowercase "lk" mark.
3. **ONE THREAD** — "one hat, one thread, one logo". Tagline: *Pulled from a single thread.*
Recommendation: **ONE THREAD**, because the brand name is also the site's central idea (below).

## The idea in one line
A single thread runs through the whole site. You pull it, and it stitches your hat.

## Journey (3 scenes + checkout)
1. **The Thread**: a cream screen with one loose red thread hanging from the logo. The only interaction is "pull". Dragging the thread unspools the title and scrolls you down. That's the hook.
2. **The Hat**: one 3D hat (Three.js, a single GLB), slow turntable, drag to rotate. Pick a colourway with 4 big fabric swatches (stone, black, olive, washed navy) and a thread colour with 3 dots. The logo embroiders itself onto the front in about 1.5 s with a stitch-path animation (an SVG path drawn on a canvas texture). Every change re-stitches it.
3. **On You**: the hat drops onto a simple flat-illustrated head (no AI, a few hand-drawn SVG faces/hair options), with a tiny wink. Short copy: "Made to order by our partner. Ships in about a week." One honest detail line: cotton twill, adjustable strap, one size.
4. **Tie Off (checkout)**: a mock checkout card. On "Order", the thread pulls tight, gets snipped (scissors snip sound, CC0), and becomes a small knot icon with the real mock order number: "ONE THREAD No. 0001 — tied off". Button: "Back to the thread" returns to scene 1.

## Art direction
- Palette: cream #F3EEE4, ink #1B1B1B, thread red #D9442B, plus hat colourways. Lots of empty space.
- Type: one display face (Archivo Black) for the name, Inter for everything else. That's it.
- Texture: a subtle linen grain overlay. One visible running-stitch line separates sections.
- Motion: GSAP, eased and calm. Two moments get drama: the pull (scene 1) and the snip (scene 4). Everything else is quiet.
- Sound (optional, off by default): soft thread pull and snip, Freesound CC0.
- Mobile first: each scene is one full-screen panel, and the pull works with touch.

## Must-haves
- Original logo only (hand-made SVG), no third-party marks.
- Honest copy: "made to order by our partner", no fake scarcity, counters or countdowns (EEA law).
- Prices shown incl. shipping estimate (~$5 EU/US first hat, verify at Printful).
- Reduced-motion fallback: the thread becomes a "Start" button and the embroidery appears instantly.
- Mock checkout clearly labelled as a demo, no real payment fields.
- One 3D model (CC0 hat from Poly Haven/Sketchfab CC0, or a simple lathe-built cap). If no good model, fall back to a layered 2D hat illustration. Still works.

## Build budget (under one night, ~5–6 h)
- Scene 1 pull + thread (1 h), scene 2 hat + swatches + stitch anim (2 h), scene 3 head drop (45 min), scene 4 checkout + snip (1 h), polish/mobile (1 h).
- Cut first if late: sound, head options (keep one), 3D (use 2D).

## [CHECK]
- Printful embroidery digitisation fee and exact dad-hat base price.
- Printful thread colour list (use only colours they offer).
