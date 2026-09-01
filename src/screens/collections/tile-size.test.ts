import test from 'node:test';
import assert from 'node:assert/strict';

import { computeTileSize, GRID_PADDING, NUM_COLUMNS, TILE_MARGIN } from './tile-size.ts';

test('computeTileSize fills the row exactly (3 tiles + margins never exceed available width)', () => {
  for (const width of [320, 340, 360, 375, 390, 412, 428]) {
    const size = computeTileSize(width);
    const contentPadding = GRID_PADDING - TILE_MARGIN;
    const rowWidth = NUM_COLUMNS * (size + 2 * TILE_MARGIN) + 2 * contentPadding;
    assert.ok(rowWidth <= width, `width=${width}: rowWidth ${rowWidth} exceeds ${width}`);
    assert.ok(size > 0, `width=${width}: tile size ${size} must be positive`);
  }
});
