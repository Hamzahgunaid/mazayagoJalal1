# MazayaGo UI Style Guide

## Design Tokens
- `--color-bg`: Neutral background (#F6F8FB)
- `--color-surface`: Surface (#FFFFFF)
- `--color-surface-elevated`: Elevated surface (#F9FCFF)
- `--color-border`: Border (#E6EDF2)
- `--color-text`: Text (#0B1B2A)
- `--color-muted`: Muted text (#5A6B7E)
- `--color-primary`: Primary teal (#1AC1B9)
- `--color-primary-hover`: Teal hover (#12A09A)
- `--color-primary-weak`: Teal tint (#DCF5F3)
- `--color-secondary`: Secondary navy (#102F4D)
- `--color-accent`: Reward / CTA orange (#ED8937)
- `--color-success`: Success green (#7CBE43)
- `--color-warning`: Warning amber (#F1AD54)
- `--color-danger`: Danger red (#D64C4C)
- `--color-focus`: Focus ring teal (#1AC1B9)
- Shadows: `--shadow-soft`, `--shadow-card`, `--shadow-card-strong`
- Radii: `--radius-md` (12px), `--radius-lg` (16px), `--radius-xl` (20px)

These map to Tailwind tokens in `tailwind.config.js` (e.g., `bg-background`, `text-text`, `border-border`, `bg-primary`, `bg-accent`, `text-muted`).

## Components
- **Buttons**: `.btn` base + variants `.btn-primary`, `.btn-reward`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`.
  - Hover/active: subtle lift, 180ms transitions, slight scale on active.
  - Disabled: reduced opacity, no pointer.
- **Cards**: `.card` (surface, border, soft shadow, radius 16px), `.card-strong` (stronger shadow, radius 20px).
- **Inputs**: `.input`, `.select`, `.textarea` with border `border`, focus ring teal, error state `.error` (danger ring).
- **Badges/Chips**: `.badge` base, plus `.badge-success`, `.badge-reward`, `.badge-muted`. `.chip` for pill filters.
- **Dropdowns**: `.dropdown-panel`, `.dropdown-item`, `.dropdown-danger` for destructive.
- **Toasts/Modals**: `.toast` (success/error modifiers), `.modal-panel`, `.modal-backdrop`.

## Layout & Typography
- Base font stack includes Inter/Plus Jakarta Sans with Tajawal fallback for Arabic; body 16px, line-height 1.6.
- Background uses soft gradient via `.site-gradient`; primary surfaces stay white for clarity.
- Spacing follows 8px grid via Tailwind utilities; container helpers `.container-narrow` / `.container-wide`.
- Header logo: 40px desktop, 32px mobile; keep artwork unchanged.

## Usage Tips
- Prefer Tailwind token classes: `bg-surface`, `border-border`, `text-text`, `text-muted`, `bg-primary hover:bg-primary-hover`, `bg-accent` for reward CTAs, `bg-success` for success chips.
- Focus states: rely on default focus styles from `.btn`/`.input` or use `ring-2 ring-primary/20`.
- Gradients: keep minimal; reserve for hero/featured reward moments.
- Tables/rows: use `border-border` for dividers and `bg-background` for zebra/hover fills.

## Transparency & Gamification
- Show progress/steps with visible chips/badges using teal and success colors.
- Reward/“win” moments should use accent orange backgrounds with white/secondary text for contrast.
