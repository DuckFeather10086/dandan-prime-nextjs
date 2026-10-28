import { test } from 'node:test';
import assert from 'node:assert/strict';
import { episodeGroups, adjacentEpisodes, episodeHref, scoreLabel } from '../src/utils/library.js';
import { readProgress, saveProgress } from '../src/utils/progress.js';

const season = { episodes: { '10': [{ id: 100 }], '2': [{ id: 20 }, { id: 21 }], '1': [{ id: 10 }], unknown: [{ id: 999 }], '3': [] } };
test('剧集按数字排序，多版本只占一集，特典不进入正片导航', () => {
  assert.deepEqual(episodeGroups(season).map(([number]) => number), ['1', '2', '10', 'unknown']);
  assert.deepEqual(adjacentEpisodes(season, '21'), { previous: { id: 10 }, next: { id: 100 } });
  assert.equal(adjacentEpisodes(season, 10).previous, null);
  assert.equal(adjacentEpisodes(season, 100).next, null);
  assert.deepEqual(adjacentEpisodes(season, 999), { previous: null, next: null });
  assert.deepEqual(adjacentEpisodes(null, 1), { previous: null, next: null });
  assert.equal(episodeHref(21, 8), '/play/21?season=8');
});
test('缺失评分不显示假数据', () => {
  assert.equal(scoreLabel(null), null);
  assert.equal(scoreLabel('invalid'), null);
  assert.equal(scoreLabel('8.2'), '8.2');
});
test('进度在服务器不可用时保留到浏览器，读取时采用较新的记录', async t => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  t.after(() => { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; });
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await saveProgress(12, 250, 1400), false);
  const local = await readProgress(12);
  assert.equal(local.position, 250);
  const older = { ...local, position: 100, updated_at: local.updated_at - 1000 };
  globalThis.fetch = async () => ({ ok: true, json: async () => older });
  assert.equal((await readProgress(12)).position, 250);
  const newer = { ...local, position: 600, updated_at: local.updated_at + 1000 };
  globalThis.fetch = async () => ({ ok: true, json: async () => newer });
  assert.equal((await readProgress(12)).position, 600);
  await saveProgress(12, NaN, 1400);
  assert.equal(JSON.parse(storage.get('dandan.progress.12')).position, 250);
});
