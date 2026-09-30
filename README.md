# Bahniman Talukdar — Portfolio

*Last updated: 1 October 2026*

**Live site:** <https://bahniman.github.io/>

A personal portfolio about product work, analytics, and strategy. It covers Bahniman Talukdar’s documented work on Core HRMS at Darwinbox, current study at XLRI Jamshedpur, selected case studies, and four product concepts.

## What you can explore

- Work history, six product-work examples, and three case studies.
- Four linked concept sites: Realium, Heirloom, Turnstile, and Windtunnel.
- Two short decision games: **Spot the edge cases** has six timed rounds; **Name the setting** has six plain-language label choices. Both show the result and explain the underlying rules. Personal bests are stored in this browser.
- A selectable eight-question product-spec checklist, case-study carousel, FAQs, and contact links.

## Design and interaction

The page uses the same Riso-inspired visual language as the project demos: cream paper, bold blue and pink, strong type, and printed-texture details. Its compact fixed header provides desktop section links and a small-screen section menu. A theme button switches light and dark themes and remembers the choice in local storage. Section links update the URL fragment and browser history; the floating control returns to the top. The page retains the browser's native scrollbar. Answer selection keeps the current viewport and focus; explicit next-round actions bring the new prompt into view.

Accessibility features include a skip link, semantic landmarks and headings, labeled navigation, native buttons and links, selected/pressed states, live game feedback, keyboard-operable controls, and reduced-motion styling. This is a description of implemented affordances, not a claim of formal WCAG certification.

## Run locally

This is a static HTML, CSS, and JavaScript site. No package installation or build step is required. From the repository root, serve the files with any local static server; for example:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/>. Keep `index.html`, `site.css`, `site.js`, and `lenis.min.js` together. Google Fonts are requested remotely; system font fallbacks are defined in the stylesheet.

## Source map

- `index.html` — content, navigation, and semantic structure.
- `site.css` — responsive layout, themes, and reduced-motion rules.
- `site.js` — section navigation, carousel, checklist, FAQs, contact copy action, game logic, score storage, and scroll behavior.
- `lenis.min.js` — bundled smooth-scroll library.
- `og.png` — social preview image.

There is no application build or type-check command in this repository. The static site is published at the live URL through GitHub Pages; the repository does not include a separate deployment workflow. No root `LICENSE` file is present; no repository-wide license is stated.
