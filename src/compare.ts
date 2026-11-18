export type DataRow = { line: number; cells: Record<string, string> };
export type ParsedCsv = { headers: string[]; rows: DataRow[] };
export type FieldChange = { field: string; before: string; after: string };
export type ChangedRow = { key: string; changes: FieldChange[] };
export type Comparison = {
  keyColumn: string;
  sharedColumns: string[];
  addedColumns: string[];
  removedColumns: string[];
  added: string[];
  removed: string[];
  changed: ChangedRow[];
  unchanged: number;
};

export class CsvError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.name = 'CsvError';
    this.line = line;
  }
}

/** RFC 4180-style CSV. Keeps source line numbers for useful errors. */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, '');
  const records: Array<{ line: number; values: string[] }> = [];
  let values: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let recordLine = 1;

  const endField = () => {
    values.push(field);
    field = '';
    afterQuote = false;
  };
  const endRecord = () => {
    endField();
    records.push({ line: recordLine, values });
    values = [];
    recordLine = line + 1;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += char;
        if (char === '\n') line++;
      }
      continue;
    }
    if (afterQuote && char !== ',' && char !== '\n' && char !== '\r') {
      throw new CsvError('unexpected character after closing quote', line);
    }
    if (char === '"') {
      if (field.length || afterQuote) throw new CsvError('quote inside an unquoted field', line);
      quoted = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRecord();
      line++;
    } else {
      field += char;
    }
  }
  if (quoted) throw new CsvError('unclosed quoted field', recordLine);
  if (field.length || values.length || afterQuote) {
    endField();
    records.push({ line: recordLine, values });
  }
  if (!records.length || records[0].values.every((value) => value === '')) {
    throw new CsvError('header row is empty', 1);
  }

  const headers = records[0].values;
  if (headers.some((header) => header === '')) throw new CsvError('header names cannot be empty', 1);
  if (new Set(headers).size !== headers.length) throw new CsvError('header names must be unique', 1);
  const rows = records.slice(1).map(({ line: rowLine, values: row }) => {
    if (row.length !== headers.length) {
      throw new CsvError(`expected ${headers.length} columns, found ${row.length}`, rowLine);
    }
    return { line: rowLine, cells: Object.fromEntries(headers.map((header, index) => [header, row[index]])) };
  });
  return { headers, rows };
}

function indexRows(data: ParsedCsv, keyColumn: string, label: string): Map<string, DataRow> {
  const result = new Map<string, DataRow>();
  for (const row of data.rows) {
    const key = row.cells[keyColumn];
    if (!key) throw new CsvError(`${label}: empty ${keyColumn} key`, row.line);
    if (result.has(key)) throw new CsvError(`${label}: duplicate ${keyColumn} key ${JSON.stringify(key)}`, row.line);
    result.set(key, row);
  }
  return result;
}

export function compareCsv(before: ParsedCsv, after: ParsedCsv, keyColumn: string,
  ignoredColumns: string[] = []): Comparison {
  if (!before.headers.includes(keyColumn) || !after.headers.includes(keyColumn)) {
    throw new Error(`Key column ${JSON.stringify(keyColumn)} must exist in both files.`);
  }
  const ignored = new Set(ignoredColumns);
  const sharedColumns = before.headers.filter((column) => after.headers.includes(column)
    && column !== keyColumn && !ignored.has(column));
  const addedColumns = after.headers.filter((column) => !before.headers.includes(column));
  const removedColumns = before.headers.filter((column) => !after.headers.includes(column));
  const oldRows = indexRows(before, keyColumn, 'Before');
  const newRows = indexRows(after, keyColumn, 'After');
  const added: string[] = [];
  const removed: string[] = [];
  const changed: ChangedRow[] = [];
  let unchanged = 0;
  for (const [key, row] of newRows) {
    const old = oldRows.get(key);
    if (!old) {
      added.push(key);
      continue;
    }
    const changes = sharedColumns.flatMap((field) => old.cells[field] === row.cells[field]
      ? [] : [{ field, before: old.cells[field], after: row.cells[field] }]);
    if (changes.length) changed.push({ key, changes });
    else unchanged++;
  }
  for (const key of oldRows.keys()) if (!newRows.has(key)) removed.push(key);
  const sortKeys = (keys: string[]) => keys.sort((a, b) => a.localeCompare(b, 'en'));
  changed.sort((a, b) => a.key.localeCompare(b.key, 'en'));
  return { keyColumn, sharedColumns, addedColumns, removedColumns,
    added: sortKeys(added), removed: sortKeys(removed), changed, unchanged };
}
