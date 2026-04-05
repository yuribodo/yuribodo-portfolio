"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const ACCENT = 0xfa4b12;
const MUTED = 0x45272f;
const SUBTLE = 0x2e2024;
const BG = 0x1a1a1a;

interface SceneObject {
  mesh: THREE.Mesh;
  rotSpeed: THREE.Vector3;
  baseColor: number;
  floatOffset: number;
  floatSpeed: number;
  baseY: number;
}

export function Craft() {
  const containerRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.035);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(8, 5, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x9f5454, 0.3);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(ACCENT, 2, 30);
    pointLight1.position.set(5, 8, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x45272f, 1.5, 25);
    pointLight2.position.set(-5, 3, -5);
    scene.add(pointLight2);

    // Ground grid
    const gridHelper = new THREE.GridHelper(40, 40, SUBTLE, SUBTLE);
    gridHelper.position.y = -2;
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.15;
    scene.add(gridHelper);

    // Create geometric objects
    const objects: SceneObject[] = [];
    const geometries = [
      new THREE.IcosahedronGeometry(0.8, 1),
      new THREE.TorusKnotGeometry(0.5, 0.15, 64, 8),
      new THREE.OctahedronGeometry(0.7, 0),
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.TetrahedronGeometry(0.8, 0),
      new THREE.DodecahedronGeometry(0.6, 0),
      new THREE.TorusGeometry(0.6, 0.2, 8, 16),
      new THREE.ConeGeometry(0.5, 1.2, 6),
      new THREE.IcosahedronGeometry(1.2, 0),
      new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
      new THREE.TorusKnotGeometry(0.4, 0.12, 48, 6, 2, 3),
    ];

    for (let i = 0; i < geometries.length; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: MUTED,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        emissive: MUTED,
        emissiveIntensity: 0.1,
      });

      const mesh = new THREE.Mesh(geometries[i], material);

      // Spread objects in a circular arrangement
      const angle = (i / geometries.length) * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      const y = (Math.random() - 0.5) * 4;
      mesh.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      scene.add(mesh);
      objects.push({
        mesh,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        baseColor: MUTED,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 0.5,
        baseY: y,
      });
    }

    // Ambient particles
    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: ACCENT,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });
    const particleSystem = new THREE.Points(
      particleGeometry,
      particleMaterial
    );
    scene.add(particleSystem);

    // Resize
    function resize() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    }
    resize();
    window.addEventListener("resize", resize);

    // Animation loop
    const clock = new THREE.Clock();
    let animFrame = 0;

    function animate() {
      animFrame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Update objects
      for (const obj of objects) {
        // Rotation
        obj.mesh.rotation.x += obj.rotSpeed.x;
        obj.mesh.rotation.y += obj.rotSpeed.y;
        obj.mesh.rotation.z += obj.rotSpeed.z;

        // Float up and down
        obj.mesh.position.y =
          obj.baseY +
          Math.sin(elapsed * obj.floatSpeed + obj.floatOffset) * 0.3;

        // Proximity glow — highlight when camera is close
        const dist = camera.position.distanceTo(obj.mesh.position);
        const material = obj.mesh.material as THREE.MeshStandardMaterial;

        if (dist < 6) {
          const intensity = 1 - dist / 6;
          material.emissive.setHex(ACCENT);
          material.emissiveIntensity = intensity * 0.5;
          material.opacity = 0.6 + intensity * 0.4;
          material.color.setHex(ACCENT);
        } else {
          material.emissive.setHex(MUTED);
          material.emissiveIntensity = 0.1;
          material.opacity = 0.6;
          material.color.setHex(MUTED);
        }
      }

      // Rotate particles slowly
      particleSystem.rotation.y += 0.0003;

      // Animate lights subtly
      pointLight1.position.x = Math.sin(elapsed * 0.3) * 8;
      pointLight1.position.z = Math.cos(elapsed * 0.3) * 8;

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();

      // Dispose all geometries and materials
      for (const obj of objects) {
        obj.mesh.geometry.dispose();
        (obj.mesh.material as THREE.Material).dispose();
      }
      particleGeometry.dispose();
      particleMaterial.dispose();

      container.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="flex h-screen items-center justify-center">
        <span className="font-sans text-4xl font-black text-accent/20">
          PLAYGROUND
        </span>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Hint overlay */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 font-mono text-[10px] tracking-[4px] text-subtle/50">
        DRAG TO EXPLORE
      </div>
    </section>
  );
}
