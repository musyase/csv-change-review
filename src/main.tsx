import { useMemo, useState, type ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { compareCsv, parseCsv, type ChangedRow, type Comparison, type DataRow, type ParsedCsv } from './compare';
import { sampleAfter, sampleBefore } from './sample';
import './styles.css';

type InputFile = { name: string; text: string; sample: boolean };
type Filter = 'all' | 'changed' | 'added' | 'removed';
type ReviewRow = { key: string; status: Exclude<Filter, 'all'>; change?: ChangedRow };
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function tryParse(file: InputFile | null): { data: ParsedCsv | null; error: string | null } {
  if (!file) return { data: null, error: null };
  try { return { data: parseCsv(file.text), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : 'Could not read CSV.' }; }
}

function FileControl({ label, file, onChange }: {
  label: string; file: InputFile | null; onChange: (file: File) => void;
}) {
  const id = label.toLowerCase();
  return <div className="file-control">
    <div className="file-heading"><label htmlFor={id}>{label}</label><span>{file?.sample ? 'Sample' : file ? 'Local file' : 'No file'}</span></div>
    <input id={id} className="file-input" type="file" accept=".csv,text/csv" onChange={(event: ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
      if (selected) onChange(selected);
      event.target.value = '';
    }} />
    <label className="choose-button" htmlFor={id}>{file ? 'Replace CSV' : 'Choose CSV'}</label>
    <p>{file ? `${file.name} · ${file.sample ? 'synthetic data' : `${(new Blob([file.text]).size / 1024).toFixed(1)} KiB`}` : 'Choose a UTF-8 CSV file'}</p>
  </div>;
}

function ResultDetails({ row, record, fields }: {
  row: ReviewRow; record: DataRow | undefined; fields: string[];
}) {
  return <details>
    <summary>{row.status === 'changed' ? `${row.change?.changes.length} field changes` : 'View record'}</summary>
    {row.status === 'changed' ? <div className="field-list">
      {row.change?.changes.map((item) => <div className="field-change" key={item.field}>
        <strong>{item.field}</strong><del>{item.before || '(empty)'}</del><ins>{item.after || '(empty)'}</ins>
      </div>)}
    </div> : <dl className="record-fields">
      {fields.map((field) => <div key={field}><dt>{field}</dt><dd>{record?.cells[field] || '(empty)'}</dd></div>)}
    </dl>}
  </details>;
}

function App() {
  const [beforeFile, setBeforeFile] = useState<InputFile | null>({ name: 'before.csv', text: sampleBefore, sample: true });
  const [afterFile, setAfterFile] = useState<InputFile | null>({ name: 'after.csv', text: sampleAfter, sample: true });
  const [key, setKey] = useState('record_id');
  const [ignored, setIgnored] = useState<string[]>(['updated_at']);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const before = useMemo(() => tryParse(beforeFile), [beforeFile]);
  const after = useMemo(() => tryParse(afterFile), [afterFile]);
  const common = before.data?.headers.filter((header) => after.data?.headers.includes(header)) ?? [];
  const activeKey = common.includes(key) ? key : common[0] ?? '';
  const ignoredOptions = common.filter((column) => column !== activeKey);
  const review = useMemo((): { comparison: Comparison | null; error: string | null } => {
    if (!before.data || !after.data || !activeKey) return { comparison: null, error: null };
    try { return { comparison: compareCsv(before.data, after.data, activeKey, ignored), error: null }; }
    catch (error) { return { comparison: null, error: error instanceof Error ? error.message : 'Could not compare files.' }; }
  }, [before.data, after.data, activeKey, ignored]);

  const comparison = review.comparison;
  const beforeRows = useMemo(() => new Map(before.data?.rows.map((row) => [row.cells[activeKey], row]) ?? []), [before.data, activeKey]);
  const afterRows = useMemo(() => new Map(after.data?.rows.map((row) => [row.cells[activeKey], row]) ?? []), [after.data, activeKey]);
  const rows: ReviewRow[] = comparison ? [
    ...comparison.changed.map((change) => ({ key: change.key, status: 'changed' as const, change })),
    ...comparison.added.map((item) => ({ key: item, status: 'added' as const })),
    ...comparison.removed.map((item) => ({ key: item, status: 'removed' as const })),
  ] : [];
  const visibleRows = rows.filter((row) => (filter === 'all' || row.status === filter)
    && row.key.toLowerCase().includes(search.toLowerCase()));
  const displayedRows = visibleRows.slice(0, 200);
  const problem = fileError || (before.error && `Before: ${before.error}`)
    || (after.error && `After: ${after.error}`) || review.error;

  async function loadFile(file: File, side: 'before' | 'after') {
    setFileError(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`${file.name} is larger than 10 MiB. Choose a smaller export.`);
      return;
    }
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      const next = { name: file.name, text, sample: false };
      if (side === 'before') setBeforeFile(next);
      else setAfterFile(next);
      setIgnored([]);
      setFilter('all');
    } catch {
      setFileError(`${file.name} is not valid UTF-8. Export it as UTF-8 CSV and try again.`);
    }
  }

  function resetSample() {
    setBeforeFile({ name: 'before.csv', text: sampleBefore, sample: true });
    setAfterFile({ name: 'after.csv', text: sampleAfter, sample: true });
    setKey('record_id');
    setIgnored(['updated_at']);
    setFilter('all');
    setSearch('');
    setFileError(null);
  }

  function exportReview() {
    if (!comparison) return;
    const output = { generatedAt: new Date().toISOString(), before: beforeFile?.name,
      after: afterFile?.name, ignoredColumns: ignored.filter((item) => ignoredOptions.includes(item)), comparison };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'csv-change-review.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="./">CSV Change Review</a>
      <a href="https://github.com/musyase/csv-change-review" target="_blank" rel="noreferrer">View source</a>
    </header>
    <main>
      <section className="intro" aria-labelledby="page-title">
        <h1 id="page-title">Compare CSV exports.</h1>
        <p>Match rows by a key, inspect field changes, and keep the files in your browser. The example below uses fictional records.</p>
      </section>

      <section className="setup" aria-labelledby="setup-title">
        <div className="section-heading"><div><h2 id="setup-title">Files and matching rules</h2><p>Use the sample or replace either side with a UTF-8 CSV file.</p></div>
          <div className="heading-actions"><button type="button" className="text-button" onClick={resetSample}>Use sample</button>
            <button type="button" className="text-button" onClick={() => { setBeforeFile(null); setAfterFile(null); setFileError(null); }}>Clear files</button></div></div>
        <div className="file-grid">
          <FileControl label="Before" file={beforeFile} onChange={(file) => void loadFile(file, 'before')} />
          <FileControl label="After" file={afterFile} onChange={(file) => void loadFile(file, 'after')} />
        </div>
        <div className="rules-grid">
          <div><label className="control-label" htmlFor="key-column">Match rows by</label>
            <select id="key-column" value={activeKey} onChange={(event) => setKey(event.target.value)} disabled={!common.length}>
              {common.length ? common.map((column) => <option key={column}>{column}</option>) : <option value="">No shared columns</option>}
            </select><p className="help">Keys must be unique and nonempty in both files.</p></div>
          <fieldset><legend>Ignore volatile columns</legend><div className="ignore-options">
            {ignoredOptions.length ? ignoredOptions.map((column) => <label key={column}>
              <input type="checkbox" checked={ignored.includes(column)} onChange={(event) => setIgnored(event.target.checked
                ? [...ignored, column] : ignored.filter((item) => item !== column))} />{column}
            </label>) : <span className="help">Load two files to choose columns.</span>}
          </div></fieldset>
        </div>
        <p className="rules-note">Cell values are compared exactly. Added or removed columns are reported separately from row changes.</p>
        {problem && <p className="error" role="alert">{problem}</p>}
      </section>

      <section className="results" aria-labelledby="results-title">
        <div className="section-heading"><div><h2 id="results-title">Review</h2><p aria-live="polite">{comparison ? `Matched on ${comparison.keyColumn}. ${before.data?.rows.length} rows before, ${after.data?.rows.length} after.` : 'Load two valid files to compare.'}</p></div>
          <button type="button" className="export-button" onClick={exportReview} disabled={!comparison}>Download JSON report</button></div>
        {comparison ? <>
          <div className="summary" aria-label="Comparison summary">
            <div><strong>{comparison.changed.length}</strong><span>Changed</span></div>
            <div><strong>{comparison.added.length}</strong><span>Added</span></div>
            <div><strong>{comparison.removed.length}</strong><span>Removed</span></div>
            <div><strong>{comparison.unchanged}</strong><span>Unchanged</span></div>
          </div>
          {(comparison.addedColumns.length > 0 || comparison.removedColumns.length > 0)
            && <div className="schema-note"><strong>Column changes</strong>
              {comparison.addedColumns.length > 0 && <p>Added: {comparison.addedColumns.join(', ')}</p>}
              {comparison.removedColumns.length > 0 && <p>Removed: {comparison.removedColumns.join(', ')}</p>}
            </div>}
          <div className="result-tools"><div className="filters" role="group" aria-label="Filter results">
            {(['all', 'changed', 'added', 'removed'] as Filter[]).map((item) => <button type="button" key={item}
              aria-pressed={filter === item} onClick={() => setFilter(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
          </div><label className="search-label">Search keys<input type="search" value={search}
              onChange={(event) => setSearch(event.target.value)} placeholder="Record ID" /></label></div>
          {visibleRows.length > displayedRows.length && <p className="result-limit">Showing the first 200 of {visibleRows.length} matching records. Search by key to narrow the list. The JSON report includes all results.</p>}
          {visibleRows.length ? <div className="table-scroll"><table><thead><tr><th scope="col">Record key</th><th scope="col">Status</th><th scope="col">Details</th></tr></thead>
            <tbody>{displayedRows.map((row) => <tr key={`${row.status}:${row.key}`}><th scope="row">{row.key}</th>
              <td><span className={`status status-${row.status}`}>{row.status}</span></td>
              <td><ResultDetails row={row} record={(row.status === 'removed' ? beforeRows : afterRows).get(row.key)}
                fields={row.status === 'removed' ? before.data!.headers : after.data!.headers} /></td>
            </tr>)}</tbody></table></div> : <p className="empty-results">No records match this filter. Try another status or search term.</p>}
        </> : <p className="empty-results">Choose two CSV files above, or use the sample to see a complete review.</p>}
      </section>
    </main>
    <footer><span>Local comparison. No upload or account.</span><span>UTF-8 CSV, up to 10 MiB per file.</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
