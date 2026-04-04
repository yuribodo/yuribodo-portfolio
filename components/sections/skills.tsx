"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SkillNode } from "@/components/ui/skill-node";
import { skills } from "@/lib/skills-data";

gsap.registerPlugin(ScrollTrigger);

const ORBIT_RADII = { inner: 100, middle: 170, outer: 240 } as const;
const ORBIT_SPEEDS = { inner: 0.0003, middle: 0.0002, outer: 0.00015 } as const;

export function Skills() {
  const sectionRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [angles, setAngles] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    const groups = { inner: 0, middle: 0, outer: 0 };
    const counts = { inner: 0, middle: 0, outer: 0 };

    for (const s of skills) counts[s.orbit]++;
    for (const s of skills) {
      const step = (Math.PI * 2) / counts[s.orbit];
      map.set(s.name, groups[s.orbit] * step);
      groups[s.orbit]++;
    }
    return map;
  });

  // Orbit animation
  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.ticker.add(() => {
          if (hoveredSkill) return; // pause on hover

          setAngles((prev) => {
            const next = new Map(prev);
            for (const s of skills) {
              const current = next.get(s.name) ?? 0;
              next.set(s.name, current + ORBIT_SPEEDS[s.orbit]);
            }
            return next;
          });
        });
      });

      // Entrance animation
      gsap.from(labelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: labelRef.current,
          start: "top 90%",
          end: "top 60%",
          scrub: 1,
        },
      });

      gsap.from(orbitRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: orbitRef.current,
          start: "top 90%",
          end: "top 60%",
          scrub: 1,
        },
      });

      return () => ctx.revert();
    },
    { scope: sectionRef, dependencies: [hoveredSkill] }
  );

  function handleHover(name: string | null) {
    setHoveredSkill(name);
  }

  const hoveredConnections = hoveredSkill
    ? skills.find((s) => s.name === hoveredSkill)?.connections ?? []
    : [];

  return (
    <section ref={sectionRef} className="relative min-h-screen px-6 py-32">
      <div className="mx-auto max-w-2xl text-center">
        <div
          ref={labelRef}
          className="mb-8 font-sans text-xs font-semibold uppercase tracking-[4px] text-subtle"
        >
          004 — Skills
        </div>

        <h2 className="mb-16 font-sans text-3xl font-black tracking-tight text-foreground-bright md:text-4xl">
          O sistema.
        </h2>
      </div>

      {/* Orbit visualization */}
      <div
        ref={orbitRef}
        className="relative mx-auto h-[500px] w-[500px] max-w-full"
      >
        {/* Orbit lines */}
        {(["inner", "middle", "outer"] as const).map((orbit) => (
          <div
            key={orbit}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border"
            style={{
              width: ORBIT_RADII[orbit] * 2,
              height: ORBIT_RADII[orbit] * 2,
            }}
          />
        ))}

        {/* Center node */}
        <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent bg-surface font-sans text-xs font-black text-accent shadow-[0_0_20px_rgba(250,75,18,0.15)]">
          YB
        </div>

        {/* Skill nodes */}
        {skills.map((skill) => (
          <SkillNode
            key={skill.name}
            skill={skill}
            angle={angles.get(skill.name) ?? 0}
            radius={ORBIT_RADII[skill.orbit]}
            isPaused={hoveredSkill !== null}
            isHighlighted={
              skill.name === hoveredSkill ||
              hoveredConnections.includes(skill.name)
            }
            onHover={handleHover}
          />
        ))}
      </div>
    </section>
  );
}
