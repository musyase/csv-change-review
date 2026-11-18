# Design

Mode: Operate. The user should see the two inputs, matching rules, and outcome in that order. The visual language borrows from a paper reconciliation sheet: warm neutral ground, dark ink, thin dividers, and restrained status colors. It avoids decorative cards, icons, and dashboard charts.

## Layout

The first viewport contains a compact title, a clear privacy statement, two file controls, and the key selector. Results follow in a dense review table with an inline detail view. On narrow screens, file controls stack and the results area remains readable without a wide fixed table.

## Tokens

- Ground: `#f6f5f0`
- Paper: `#ffffff`
- Ink: `#1a2829`
- Muted ink: `#536160`
- Rule: `#cfd6d1`
- Accent: `#006d62`
- Changed: `#8b4d08`
- Removed: `#9d322d`
- Added: `#126276`

The type is a system UI sans for long data work, with tabular numerals for counts. Focus rings use the accent. Status text always includes a word, so color is never the only signal.
