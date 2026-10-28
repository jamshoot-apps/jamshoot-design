import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { RENDER_VERSION, crc32, renderFingerprint, sourceFingerprint, withSourceFingerprint } from '../../src/cli/og-image.mjs';

/* The smallest valid PNG: one pixel, with real IHDR and IEND CRCs. */
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const FINGERPRINT = renderFingerprint('<!doctype html><p>card</p>');
const IHDR_END = 8 + 25; // signature, then the 25-byte IHDR chunk
const STAMP_LENGTH = 12 + 'jamshoot-og-source'.length + 1 + FINGERPRINT.length; // length, type, keyword, NUL, text, CRC

test('the fingerprint covers the render pipeline version, not only the HTML and canvas size', () => {
  const html = '<!doctype html><p>card</p>';
  const withoutVersion = createHash('sha256').update(`1200x630\n${html}`).digest('hex');

  assert.ok(Number.isSafeInteger(RENDER_VERSION) && RENDER_VERSION >= 1);
  assert.notEqual(renderFingerprint(html), withoutVersion);
  assert.equal(renderFingerprint(html), createHash('sha256').update(`1200x630 render-${RENDER_VERSION}\n${html}`).digest('hex'));
});

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('the source fingerprint is written straight after IHDR and reads back', () => {
  const stamped = withSourceFingerprint(PIXEL, FINGERPRINT);

  assert.equal(stamped.toString('latin1', IHDR_END + 4, IHDR_END + 8), 'tEXt');
  assert.equal(sourceFingerprint(stamped), FINGERPRINT);
  assert.equal(stamped.length, PIXEL.length + STAMP_LENGTH);
  // Removing the chunk restores the original file: pixels and every other chunk are untouched.
  assert.deepEqual(Buffer.concat([stamped.subarray(0, IHDR_END), stamped.subarray(IHDR_END + STAMP_LENGTH)]), PIXEL);
});

test('restamping replaces the fingerprint instead of adding a second chunk', () => {
  const other = renderFingerprint('<p>other card</p>');
  const restamped = withSourceFingerprint(withSourceFingerprint(PIXEL, FINGERPRINT), other);

  assert.equal(sourceFingerprint(restamped), other);
  assert.equal(restamped.length, PIXEL.length + STAMP_LENGTH);
});

test('an unstamped or non-PNG file has no fingerprint, and a non-PNG cannot be stamped', () => {
  assert.equal(sourceFingerprint(PIXEL), null);
  assert.equal(sourceFingerprint(Buffer.from('rendered-fixture')), null);
  assert.equal(sourceFingerprint(Buffer.alloc(0)), null);
  assert.equal(sourceFingerprint(undefined), null);
  assert.throws(() => withSourceFingerprint(Buffer.from('rendered-fixture'), FINGERPRINT), /well-formed PNG/);
});

test('a corrupted, truncated or oversized PNG is reported as unstamped without throwing', () => {
  const stamped = withSourceFingerprint(PIXEL, FINGERPRINT);
  const flipped = Buffer.from(stamped);
  flipped[IHDR_END + 4 + 4 + 6] ^= 0x01; // a byte inside the tEXt data: its CRC no longer matches
  const oversized = Buffer.from(stamped);
  oversized.writeUInt32BE(0xffffffff, IHDR_END); // the tEXt length runs past the end of the file

  for (const broken of [
    flipped,
    oversized,
    stamped.subarray(0, stamped.length - 1), // IEND cut short
    stamped.subarray(0, IHDR_END + 6), // tEXt length only partly present
    stamped.subarray(0, 12), // IHDR cut short
    PIXEL.subarray(0, PIXEL.length - 12), // no IEND chunk at all
  ]) {
    assert.equal(sourceFingerprint(broken), null);
  }
});
