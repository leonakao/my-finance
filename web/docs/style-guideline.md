# Dark Finance Style Guideline

## Summary
- Theme: dark only
- Identity: purple + dark gray
- Shell: fixed collapsible sidebar on desktop, drawer on mobile
- Styling model: semantic CSS tokens + project-owned primitives
- Accessibility model: native semantics first, Radix UI for dialog, drawer, and tooltip behavior

## Core Tokens
```css
:root {
  --color-bg-app: #0b0b12;
  --color-bg-sidebar: #10101a;
  --color-bg-surface: #171624;
  --color-bg-surface-elevated: #1d1b2b;
  --color-bg-surface-hover: #242236;
  --color-bg-overlay: rgba(11, 11, 18, 0.78);

  --color-border-subtle: #29263a;
  --color-border-default: #343049;
  --color-border-strong: #45405f;

  --color-primary: #7c5cff;
  --color-primary-hover: #9b87ff;
  --color-primary-active: #6842e8;
  --color-primary-subtle: rgba(124, 92, 255, 0.1);
  --color-primary-border: rgba(124, 92, 255, 0.25);

  --color-text-primary: #f4f4f5;
  --color-text-secondary: #b4b4c0;
  --color-text-muted: #858596;
  --color-text-disabled: #5f5f70;

  --color-finance-income: #2ecc71;
  --color-finance-income-subtle: rgba(46, 204, 113, 0.1);
  --color-finance-expense: #ff5c70;
  --color-finance-expense-subtle: rgba(255, 92, 112, 0.1);
  --color-finance-warning: #f6b44b;
  --color-finance-warning-subtle: rgba(246, 180, 75, 0.1);
  --color-finance-info: #4db7e5;
  --color-finance-info-subtle: rgba(77, 183, 229, 0.1);
}
```

## Layout
- Desktop shell uses a fixed left sidebar with `280px` expanded width and `88px` collapsed width.
- Mobile replaces the fixed sidebar with a drawer.
- Main content keeps a generous max width and uses stacked panels instead of edge-to-edge sections.
- Page context appears at the start of the main column through a compact header card.

## Components
- `panel`: default surface for sections, tables, forms, and grouped analytics
- `hero-panel`: higher-emphasis introductory surface with branded glow
- `nav-link`: shared navigation primitive with active, hover, and collapsed states
- `button`: primary action by default; `ghost` for secondary; `danger` for destructive actions
- `feedback`: shared status block for info, warning, and error
- `dialog-content`: all modals and prompts use the same shell
- `type-badge`: semantic financial tag for income, expense, and transfer

## Typography and Spacing
- Use `Instrument Sans` for UI text and `IBM Plex Mono` only for code-like snippets.
- Titles stay compact and high-contrast; secondary text uses `--color-text-secondary` or `--color-text-muted`.
- Numeric-heavy areas must use tabular numbers.
- Spacing follows token increments; avoid one-off pixel values inside component implementations.

## Interaction Rules
- Focus always uses a visible lilac ring.
- Hover should increase contrast, not just brightness.
- Loading buttons preserve the label and add a spinner.
- Modals and drawer behavior come from Radix UI.
- Tooltip is used only where collapsed navigation hides labels.

## Accessibility Defaults
- Use native `button`, `a`, `label`, `input`, `select`, `textarea`, and `table` elements before ARIA fallbacks.
- Navigation remains link-based for modified-click support.
- Dialog and drawer must trap focus, close on `Esc`, and restore focus.
- Color is never the only status signal for finance or feedback.

## Implementation Notes
- Tokens live in `src/styles/theme.css`.
- Base element styling lives in `src/styles/base.css`.
- Shared semantic primitives live in `src/styles/components.css`.
- Screen-specific composition lives in `src/App.css` until enough reuse justifies splitting it further.
