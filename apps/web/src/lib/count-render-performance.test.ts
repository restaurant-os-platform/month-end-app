import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('calculates section progress without rebuilding rooms for each product and preserves unsaved entries', () => {
  const products = Array.from({ length: 220 }, (_, index) => ({ id: `p${index}`, category: 'Spirits', subcategory: 'Vodka' }));
  const room = { id: 'count-room', roomId: 'floor', name: 'Bar', items: { p0: 7 }, extraProductIds: [] };
  const context = {
    state: { products, rooms: [{ id: 'floor', name: 'Bar', categoryNames: ['Spirits'], manualProductIds: [] }], inventories: [{ id: 'count', rooms: [room] }] },
    currentInvEdit: 'count', currentInvRoomId: 'count-room', currentInvRooms: [], currentInvMergedView: false,
    liveInvCounts: { p0: 0, p1: 3 },
    document: { addEventListener() {}, getElementById() { return null; } }, window: { addEventListener() {} },
  };
  const source = readFileSync(new URL('../../public/legacy/js/inventory.js', import.meta.url), 'utf8');
  const result = runInNewContext(`${source}
    let normalizations=0;
    const normalize=normalizeInventoryRooms;
    normalizeInventoryRooms=(...args)=>{normalizations++;return normalize(...args)};
    const progress=inventorySectionProgress('Spirits','Vodka');
    ({progress,normalizations,room:currentInventoryRoom()});`, context);
  expect(result.progress).toEqual({ filled: 2, total: 220, complete: false });
  expect(result.normalizations).toBe(0);
  expect(result.room).toBe(room);
  expect(room.items).toEqual({ p0: 7 });
  expect(context.liveInvCounts).toEqual({ p0: 0, p1: 3 });
});
