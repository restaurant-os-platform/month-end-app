import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function setup() {
  let finish!: (value: unknown) => void;
  const pending = new Promise(resolve => { finish = resolve; });
  const context = {
    document: { addEventListener: vi.fn(), getElementById: () => null, querySelectorAll: () => [] }, window: { addEventListener: vi.fn() },
    currentCountRoomLock: null, countRoomPickerCountId: "count", countRoomPickerLocks: [], countRoomPickerRefreshTimer: null,
    state: { inventories: [{ id: "count", rooms: [{ id: "room", roomId: "physical" }] }] },
    cloudAcquireCountRoom: vi.fn(() => pending), cloudReleaseCountRoom: vi.fn(),
    toast: vi.fn(), clearInterval: vi.fn(), closeModal: vi.fn(),
  };
  const source = readFileSync(new URL("../../public/legacy/js/inventory.js", import.meta.url), "utf8");
  runInNewContext(`${source}\nrenderCountRoomPicker=()=>{};inventoryIsFinalised=()=>false;startCountRoomHeartbeat=()=>{};openInventoryModal=(...args)=>globalThis.opened=args;globalThis.enter=enterCountRoom;`, context);
  return { context: context as typeof context & { enter: (room: string) => Promise<void>; opened?: string[] }, finish };
}
it("sends only one reservation when Open is clicked repeatedly", async () => {
  const { context, finish } = setup();
  const first = context.enter("room");
  await context.enter("room");
  expect(context.cloudAcquireCountRoom).toHaveBeenCalledTimes(1);
  finish({ acquired: true });
  await first;
  expect(context.opened).toEqual(["count", "room"]);
});
it("releases a late reservation instead of opening a dismissed room", async () => {
  const { context, finish } = setup();
  const first = context.enter("room");
  context.countRoomPickerCountId = "another-count";
  finish({ acquired: true });
  await first;
  expect(context.opened).toBeUndefined();
  expect(context.cloudReleaseCountRoom).toHaveBeenCalledWith("count", "room");
});
it("keeps a conflicting room closed and lets the user retry", async () => {
  const { context, finish } = setup();
  const first = context.enter("room");
  finish({ acquired: false, lock: { roomId: "room", holderName: "Coworker" } });
  await first;
  expect(context.opened).toBeUndefined();
  expect(context.toast).toHaveBeenCalledWith("Coworker is counting this room right now.", true);
  await context.enter("room");
  expect(context.cloudAcquireCountRoom).toHaveBeenCalledTimes(2);
});
