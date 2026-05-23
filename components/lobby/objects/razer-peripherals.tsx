"use client";

import Keyboard from "./keyboard";
import Mouse from "./mouse";

// World y of the desk's writing surface — the TableTop_DeskBoards_0 mesh top
// after desk.tsx's scale + recentre. Same constant the MacBook (#9) uses;
// kept duplicated rather than shared because each object is responsible for
// placing itself on the desk independently and doesn't import from siblings.
const DESK_TOP_Y = -0.602;

// Positions from spec §6 (seated POV). The mouse component owns the embedded
// mousepad (gimora's GLB ships them as one scene), so the mouse position is
// where the pad lands — Mouse.tsx centres the pad on the group origin, so
// this is literally the mousepad spec coord projected onto the desk surface.
const KEYBOARD_POSITION: [number, number, number] = [-0.10, DESK_TOP_Y, 0.20];
const MOUSE_ASSEMBLY_POSITION: [number, number, number] = [0.20, DESK_TOP_Y, 0.20];

export default function RazerPeripherals() {
  return (
    <>
      <Keyboard position={KEYBOARD_POSITION} />
      <Mouse position={MOUSE_ASSEMBLY_POSITION} />
    </>
  );
}
