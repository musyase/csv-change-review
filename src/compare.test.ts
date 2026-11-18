import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCsv, parseCsv } from './compare.ts';
import { sampleBefore, sampleAfter } from './sample.ts';

test('parser handles BOM, quoted commas, escaped quotes and line breaks', () => {
  const data = parseCsv('\uFEFFid,name,note\r\n1,"Ada, A.","said ""yes""\nagain"\r\n');
  assert.deepEqual(data.headers, ['id', 'name', 'note']);
  assert.deepEqual(data.rows, [{ line: 2, cells: { id: '1', name: 'Ada, A.', note: 'said "yes"\nagain' } }]);
});

test('parser reports malformed rows at the source line', () => {
  assert.throws(() => parseCsv('id,name\n1,Ada\n2'), /Line 3: expected 2 columns, found 1/);
  assert.throws(() => parseCsv('id,name\n1,"Ada'), /Line 2: unclosed quoted field/);
  assert.throws(() => parseCsv('id,id\n1,2'), /Line 1: header names must be unique/);
});

test('comparison separates row changes and schema changes', () => {
  const before = parseCsv('id,name,plan,updated_at\na,Anna,Free,1\nb,Boris,Pro,1\nc,Cleo,Free,1\n');
  const after = parseCsv('id,name,plan,region,updated_at\na,Anna,Pro,EU,2\nb,Boris,Pro,US,2\nd,Dana,Free,EU,2\n');
  const result = compareCsv(before, after, 'id', ['updated_at']);
  assert.deepEqual(result.added, ['d']);
  assert.deepEqual(result.removed, ['c']);
  assert.deepEqual(result.changed, [{ key: 'a', changes: [{ field: 'plan', before: 'Free', after: 'Pro' }] }]);
  assert.equal(result.unchanged, 1);
  assert.deepEqual(result.addedColumns, ['region']);
});

test('comparison rejects duplicate and empty keys', () => {
  const valid = parseCsv('id,name\na,Ada\n');
  assert.throws(() => compareCsv(valid, parseCsv('id,name\na,Ada\na,Other\n'), 'id'),
    /Line 3: After: duplicate id key "a"/);
  assert.throws(() => compareCsv(valid, parseCsv('id,name\n,No key\n'), 'id'),
    /Line 2: After: empty id key/);
});

test('the public sample shows two changes, one addition and one removal', () => {
  const result = compareCsv(parseCsv(sampleBefore), parseCsv(sampleAfter), 'record_id', ['updated_at']);
  assert.equal(result.changed.length, 2);
  assert.deepEqual(result.added, ['A-108']);
  assert.deepEqual(result.removed, ['A-106']);
  assert.equal(result.unchanged, 1);
});
