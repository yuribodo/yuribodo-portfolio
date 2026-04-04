"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Icosahedron with wireframe
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x45272f,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Warm rim light
    const light = new THREE.PointLight(0xfa4b12, 2, 10);
    light.position.set(2, 2, 3);
    scene.add(light);

    function resize() {
      const rect = container!.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    }
    resize();
    window.addEventListener("resize", resize);

    let mouseX = 0;
    let mouseY = 0;
    function handleMouse(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    window.addEventListener("mousemove", handleMouse);

    let animFrame = 0;
    function animate() {
      animFrame = requestAnimationFrame(animate);
      mesh.rotation.x += 0.002;
      mesh.rotation.y += 0.003;
      mesh.rotation.x += (mouseY * 0.5 - mesh.rotation.x) * 0.02;
      mesh.rotation.y += (mouseX * 0.5 - mesh.rotation.y) * 0.02;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute right-[10%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 opacity-30"
    />
  );
}
