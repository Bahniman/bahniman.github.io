# Design Specification: Gamified Portfolio (bahniman.github.io)

Date: 2026-08-25
Status: Approved

## Overview
This specification details the gamification layer for Bahniman Talukdar's portfolio website (`bahniman.github.io`). The objective is to elevate the site from a static editorial plate book into a tactile, interactive experience that showcases senior product management and protocol architecture capabilities without losing the high-craft typography and minimalist aesthetic.

## 1. Visual & Layout System Integration
- Design System: Dark stage (`#0b0c10`), 8-step ultramarine palette (`#141733` to `#8b93ff`), `Bricolage Grotesque` display and `Spectral` serif body.
- Zero Layout Distortion: All interactive elements reside inside standard `.inner` containers with responsive clamp typography and padding.
- Non-Intrusive HUD: A clearance indicator in the header tracks interaction milestones (`CLEARANCE: L1 OBSERVER [0/6]`) and advances to L4 Principal Architect.

## 2. Interactive PM & Protocol Sandboxes

### 2.1 Realium Dynamic Settlement Waterfall (Plate 5)
- Interactive range slider for invoice face value (₹5,00,000 to ₹50,00,000, default ₹18,63,900).
- Advance ratio buttons: 50%, 60%, 75%.
- Real-time recalculation of:
  - Day 0 Bank Advance: `Invoice * AdvanceRate`
  - Day 148 Maturity Balance: `Invoice * (1 - AdvanceRate) - DiscountFee - FixedFee`
  - Net Realized Contractor Total: `Advance + RemainderNet` (97.0% yield)
  - Days Saved: 147 Days.
- Formatted in Indian numbering system (`Intl.NumberFormat('en-IN')`).
- Smooth animated bar width updates via CSS/anime.js.

### 2.2 Turnstile Agent vs Human Inspector (Plate 4)
- Interactive radio toggle between "Human Client" and "AI Agent (JSON)".
- Human mode: interactive UI metric tiles and trigger button.
- Agent mode: high-contrast terminal with formatted JSON RPC payload, Ed25519 authentication headers, and one-click copy.

### 2.3 Darwinbox Edge-Case Matrix (Plate 3)
- Expandable interactive spec matrix demonstrating how 200+ PRDs solved after-hours triage by specifying edge cases before engineering handover.

## 3. Progression, Achievements & Easter Eggs

### 3.1 Achievements List
1. `welcome_explorer`: Landed on the site and surveyed the initial plates. (+25 XP)
2. `waterfall_solved`: Adjusted the Realium invoice slider and simulated Day 0 liquidity. (+50 XP)
3. `agent_lens_unlocked`: Switched Turnstile to AI Agent JSON inspection mode. (+50 XP)
4. `edge_cases_inspected`: Opened the Darwinbox PRD Edge-Case Matrix. (+50 XP)
5. `survey_lattice_active`: Clicked the surveyed canvas lattice to drop beacon pulses. (+50 XP)
6. `command_power_user`: Opened the Command Palette via `⌘K` or shortcut. (+50 XP)
7. `master_architect_konami`: Triggered the Konami Code (`↑ ↑ ↓ ↓ ← → ← → B A`). (+150 XP)

### 3.2 Toast Notification HUD
- Fixed bottom-right notification card (`#toast-container`).
- FIFO auto-draining queue, 3.5s display timeout, slide-up and fade-in motion.
- Stored in `localStorage` to avoid redundant triggers on return visits.

## 4. Developer HUD & Audio Layer

### 4.1 Command Palette (`⌘K` / `Ctrl+K`)
- Accessible WAI-ARIA 1.2 Combobox dialog with backdrop blur.
- Search filter across plates, demos, themes, sound toggles, and direct links.
- Keyboard navigation: `ArrowDown`, `ArrowUp`, `Enter`, `Escape`.
- Mobile FAB button (`#cmd-mobile-trigger`) on viewports under 640px.

### 4.2 Procedural Web Audio Engine
- Zero external audio files. Procedural sound synthesis using native browser `AudioContext`.
- Soft click: 45ms triangle pitch sweep (320Hz to 110Hz).
- Slider tick: 15ms sine burst with 35ms throttle.
- Achievement chime: Staggered pentatonic triad (Eb5 -> G5 -> Bb5 -> C6) with warm exponential decay.
- Default state: Quiet/muted, with audio toggle button in header.

### 4.3 Canvas Grid Interactivity
- Pointer clicks drop survey pin beacons that illuminate neighboring lattice vertices with radial falloff.
