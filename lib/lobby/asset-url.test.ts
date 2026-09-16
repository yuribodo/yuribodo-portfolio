import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ASSET_VERSIONS } from './asset-versions';
import { lobbyAssetUrl } from './asset-url';

test('immutable asset versions match the actual shipped bytes', () => {
  for (const [url, version] of Object.entries(ASSET_VERSIONS)) {
    assert.equal(createHash('sha256').update(readFileSync(`public${url}`)).digest('hex').slice(0, 16), version, url);
  }
});

test('URL resolution preserves blob/external URLs and does not double-version preloads', () => {
  const source = '/lobby/models/wooden_desk.glb', resolved = lobbyAssetUrl(source);
  assert.match(resolved, /\?v=[a-f0-9]{16}$/);
  assert.equal(lobbyAssetUrl(resolved), resolved);
  for (const url of ['blob:http://localhost/id', 'https://example.com/image.webp', '/CREDITS.md']) assert.equal(lobbyAssetUrl(url), url);
});
