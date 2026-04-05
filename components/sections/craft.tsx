"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

const ACCENT = 0xfa4b12;
const MUTED = 0x45272f;
const SUBTLE = 0x2e2024;
const BG = 0x1a1a1a;

export function Craft() {
  const containerRef = useRef<HTMLElement>(null);
  const scrollProgressRef = useRef({ value: 0 });
  const reducedMotion = useReducedMotion();

  // ScrollTrigger: pin section + drive camera via scroll
  useGSAP(() => {
    if (!containerRef.current || reducedMotion) return;

    // Clip-path reveal
    gsap.fromTo(
      containerRef.current,
      { clipPath: "circle(0% at 50% 50%)" },
      {
        clipPath: "circle(100% at 50% 50%)",
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "top 20%",
          scrub: 1,
        },
      }
    );

    // Pin + scroll-driven camera progress
    gsap.to(scrollProgressRef.current, {
      value: 1,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 1,
      },
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.025);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Camera path — a sweeping curve through the scene
    const cameraPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3, 18),     // Start: far back, slightly above
      new THREE.Vector3(8, 5, 12),      // Swing right and up
      new THREE.Vector3(12, 2, 4),      // Sweep past objects
      new THREE.Vector3(8, 4, -4),      // Curve behind
      new THREE.Vector3(0, 6, -8),      // Rise above
      new THREE.Vector3(-8, 3, -2),     // Swing left
      new THREE.Vector3(-6, 2, 8),      // Come around
      new THREE.Vector3(0, 1.5, 5),     // End: close and low, intimate
    ], true); // closed=true for smooth looping if needed

    // LookAt target — slightly offset from center, moves subtly
    const lookTarget = new THREE.Vector3(0, 1, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(MUTED, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(ACCENT, 3, 40);
    pointLight1.position.set(5, 8, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(MUTED, 2, 30);
    pointLight2.position.set(-5, 3, -5);
    scene.add(pointLight2);

    // Ground grid
    const gridHelper = new THREE.GridHelper(50, 50, SUBTLE, SUBTLE);
    gridHelper.position.y = -2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.12;
    scene.add(gridHelper);

    // Create objects in a spread
    interface SceneObj {
      mesh: THREE.Mesh;
      rotSpeed: THREE.Vector3;
      floatOffset: number;
      floatSpeed: number;
      baseY: number;
    }

    const objects: SceneObj[] = [];
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
      new THREE.IcosahedronGeometry(0.5, 2),
      new THREE.OctahedronGeometry(0.9, 1),
      new THREE.DodecahedronGeometry(0.8, 1),
    ];

    for (let i = 0; i < geometries.length; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: MUTED,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        emissive: MUTED,
        emissiveIntensity: 0.05,
      });

      const mesh = new THREE.Mesh(geometries[i], material);
      const angle = (i / geometries.length) * Math.PI * 2;
      const radius = 3 + Math.random() * 8;
      const y = (Math.random() - 0.5) * 5;
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
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008
        ),
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
        baseY: y,
      });
    }

    // Particles
    const particleCount = 600;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 40;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: ACCENT,
      size: 0.05,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

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

    // Render loop
    const clock = new THREE.Clock();
    let animFrame = 0;

    function animate() {
      animFrame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const progress = scrollProgressRef.current.value;

      // Camera follows path based on scroll progress
      const point = cameraPath.getPointAt(progress % 1);
      camera.position.copy(point);

      // Smooth lookAt — slight offset based on progress for cinematic feel
      lookTarget.x = Math.sin(progress * Math.PI * 2) * 2;
      lookTarget.y = 1 + Math.sin(progress * Math.PI) * 1.5;
      lookTarget.z = Math.cos(progress * Math.PI * 2) * 2;
      camera.lookAt(lookTarget);

      // Update objects
      for (const obj of objects) {
        obj.mesh.rotation.x += obj.rotSpeed.x;
        obj.mesh.rotation.y += obj.rotSpeed.y;
        obj.mesh.rotation.z += obj.rotSpeed.z;
        obj.mesh.position.y = obj.baseY + Math.sin(elapsed * obj.floatSpeed + obj.floatOffset) * 0.3;

        // Proximity glow
        const dist = camera.position.distanceTo(obj.mesh.position);
        const mat = obj.mesh.material as THREE.MeshStandardMaterial;
        if (dist < 5) {
          const intensity = 1 - dist / 5;
          mat.emissive.setHex(ACCENT);
          mat.emissiveIntensity = intensity * 0.6;
          mat.opacity = 0.5 + intensity * 0.5;
          mat.color.setHex(ACCENT);
        } else {
          mat.emissive.setHex(MUTED);
          mat.emissiveIntensity = 0.05;
          mat.opacity = 0.5;
          mat.color.setHex(MUTED);
        }
      }

      // Animate lights
      pointLight1.position.x = Math.sin(elapsed * 0.2) * 10;
      pointLight1.position.z = Math.cos(elapsed * 0.2) * 10;

      // Rotate particles
      particles.rotation.y += 0.0002;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      for (const obj of objects) {
        obj.mesh.geometry.dispose();
        (obj.mesh.material as THREE.Material).dispose();
      }
      pGeo.dispose();
      pMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
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
      {/* Three.js mounts here */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 font-mono text-[10px] tracking-[4px] text-subtle/40">
        SCROLL TO FLY THROUGH
      </div>
    </section>
  );
}
