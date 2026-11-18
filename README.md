# CSV Change Review

Compare two CSV exports in a browser when a migration, import, or scheduled export may have changed records. Choose a column that identifies each row, then inspect added, removed, and changed records. The app also reports columns that appeared or disappeared.

**[Open the live sample](https://musyase.github.io/csv-change-review/)**. It starts with fictional records, so the review is visible before you select files. The sample has two changed records, one added record, one removed record, and a new `region` column.

## Use it

1. Open the live sample or run it locally.
2. Replace the Before and After samples with your own UTF-8 CSV files, up to 10 MiB each.
3. Select a shared key column. Keys must be nonempty and unique in each file.
4. Optionally ignore fields such as `updated_at` that change on every export.
5. Filter by change type, search record keys, open field details, or download a JSON report.

Files are read with the browser's File API and compared in memory. The app has no server endpoint and does not upload CSV contents. The downloaded report contains the comparison and file names, not full source rows. Treat the report as private if record keys or changed values are sensitive.

## Run locally

Requires Node.js 24 or newer. The project uses React and TypeScript, with esbuild for a small static bundle.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. The same synthetic inputs are in [`samples/before.csv`](samples/before.csv) and [`samples/after.csv`](samples/after.csv) for manual file selection.

## Comparison rules

- CSV parsing supports quoted commas, escaped quotes, CRLF, multiline fields, and UTF-8 BOM.
- Rows are matched by exact key text. A duplicate or empty key stops the comparison with a source line number.
- Shared, non-ignored fields use exact string comparison. Case and whitespace differences count.
- Added or removed columns are shown as schema changes. Their values do not count as row changes.
- The table shows at most 200 matching results at a time; search narrows it. The JSON report includes every result.
- Input files stay in the current tab. Reloading the page clears them and restores the fictional sample.

The app does not infer renamed keys, normalize dates or numbers, or compare files larger than 10 MiB. Those rules would require a data-specific contract rather than silent guesses.

## Checks

```bash
npm test
npm run build
npm audit
```

Tests cover CSV parsing errors, duplicate keys, schema drift, row changes, and the public sample. GitHub Actions runs tests and a production build on Windows and Ubuntu, then publishes the static app to GitHub Pages.
