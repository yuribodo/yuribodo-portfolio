"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Quaternion, Vector3, type PerspectiveCamera as Camera } from "three";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { clampLookPitch, DESK_CAMERA, DESK_PITCH, DESK_TARGET, type WorldView } from "@/lib/lobby/world-view";
import type { LobbyState } from "./use-lobby-state";

export interface CameraRigHandle {
  getCamera: () => Camera | null;
  turn: (yaw: number, pitch?: number) => void;
}

interface CameraRigProps {
  state: LobbyState;
  view: WorldView;
  onReturned: () => void;
  fov?: number;
}

const base = new Vector3(DESK_CAMERA.x, DESK_CAMERA.y, DESK_CAMERA.z);
const target = new Vector3(DESK_TARGET.x, DESK_TARGET.y, DESK_TARGET.z);
const RETURN_DURATION = 0.7;

const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(function CameraRig(
  { state, view, onReturned, fov = 50 }, ref,
) {
  const cameraRef = useRef<Camera>(null);
  const canvas = useThree((s) => s.gl.domElement);
  const reducedMotion = useReducedMotion();
  const drift = useRef({ x: 0, y: 0 });
  const look = useRef({ yaw: 0, pitch: DESK_PITCH });
  const currentLook = useRef({ yaw: 0, pitch: DESK_PITCH });
  const returning = useRef<{
    elapsed: number; from: Quaternion; to: Quaternion; position: Vector3;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    getCamera: () => cameraRef.current,
    turn: (yaw, pitch = 0) => {
      if (view !== "looking") return;
      look.current.yaw += yaw;
      look.current.pitch = clampLookPitch(look.current.pitch + pitch);
    },
  }), [view]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    if (view === "returning") {
      const from = camera.quaternion.clone();
      const position = camera.position.clone();
      camera.position.copy(base);
      camera.lookAt(target);
      const to = camera.quaternion.clone();
      camera.position.copy(position);
      camera.quaternion.copy(from);
      returning.current = { elapsed: 0, from, to, position };
    } else if (view === "desk") {
      returning.current = null;
      look.current = { yaw: 0, pitch: DESK_PITCH };
      currentLook.current = { ...look.current };
      drift.current = { x: 0, y: 0 };
      camera.lookAt(target);
    } else {
      camera.rotation.order = "YXZ";
      currentLook.current = { yaw: camera.rotation.y, pitch: camera.rotation.x };
      look.current = { ...currentLook.current };
    }
  }, [view]);

  useEffect(() => {
    if (state === "booting" || state === "loading" || view !== "desk" || reducedMotion) return;
    const move = (event: MouseEvent) => {
      drift.current = { x: event.clientX / window.innerWidth * 2 - 1, y: 1 - event.clientY / window.innerHeight * 2 };
    };
    const reset = () => { drift.current = { x: 0, y: 0 }; };
    window.addEventListener("mousemove", move);
    window.addEventListener("blur", reset);
    document.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("blur", reset);
      document.removeEventListener("mouseleave", reset);
    };
  }, [state, view, reducedMotion]);

  useEffect(() => {
    if (view !== "looking") return;
    let pointer: number | null = null;
    let last = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || pointer !== null) return;
      pointer = e.pointerId;
      last = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(pointer);
      canvas.dataset.dragging = "true";
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      look.current.yaw += (e.clientX - last.x) * 0.003;
      look.current.pitch = clampLookPitch(look.current.pitch + (e.clientY - last.y) * 0.003);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
      pointer = null;
      delete canvas.dataset.dragging;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    window.addEventListener("blur", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      window.removeEventListener("blur", up);
      up();
    };
  }, [canvas, view]);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera || state === "booting") return;
    const t = 1 - Math.exp(-6.3 * Math.min(delta, 0.1));
    if (view === "returning") {
      const r = returning.current;
      if (!r) return;
      r.elapsed += delta;
      const p = reducedMotion ? 1 : Math.min(1, r.elapsed / RETURN_DURATION);
      const ease = p * p * (3 - 2 * p);
      camera.position.lerpVectors(r.position, base, ease);
      camera.quaternion.slerpQuaternions(r.from, r.to, ease);
      if (p === 1) {
        returning.current = null;
        camera.position.copy(base);
        camera.lookAt(target);
        onReturned();
      }
      return;
    }
    if (view === "looking") {
      currentLook.current.yaw += (look.current.yaw - currentLook.current.yaw) * t;
      currentLook.current.pitch += (look.current.pitch - currentLook.current.pitch) * t;
      camera.rotation.set(currentLook.current.pitch, currentLook.current.yaw, 0, "YXZ");
      return;
    }
    camera.position.x += (base.x + drift.current.x * 0.06 - camera.position.x) * t;
    camera.position.y += (base.y + drift.current.y * 0.06 - camera.position.y) * t;
    camera.lookAt(target);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={base} fov={fov} near={0.05} far={3200} />;
});

export default CameraRig;
