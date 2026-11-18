# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user. React and TypeScript were chosen to show an interactive frontend alongside the portfolio's Python and C# projects.

## Users
Working assumption: developers checking two CSV exports after a data migration or import. They need to identify row and schema differences by a stable key.

## Product Purpose
Compare two local CSV files in one browser tab. Show added, removed, changed, and unchanged records, plus columns that appeared or disappeared.

## Operating Context
The user may have exports containing private business data. Files are parsed in memory in the browser and are never uploaded. A synthetic sample lets a visitor inspect the full workflow without bringing their own files.

## Capabilities and Constraints
One key column shared by both files. Optional ignored columns for volatile fields. Exact string comparison for other cells. Files are limited to 10 MiB each in the UI. Duplicate or empty keys and malformed CSV are errors. Exported JSON contains the comparison, not the source rows.

## Evidence on Hand
Only synthetic sample CSV and tests. No user data, customer claims, or performance benchmarks.

## Product Principles
- Make matching rules visible before showing results.
- Explain malformed data with the source line.
- Keep private CSV contents in the browser.
- Show schema changes separately from row changes.
