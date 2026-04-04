export interface Skill {
  name: string;
  orbit: "inner" | "middle" | "outer";
  proficiency: number; // 0-1, affects node size
  connections: string[]; // names of connected skills
  description: string;
}

export const skills: Skill[] = [
  // Inner orbit — core skills
  {
    name: "React",
    orbit: "inner",
    proficiency: 0.9,
    connections: ["Next.js", "TypeScript"],
    description: "Component architecture, hooks, server components",
  },
  {
    name: "TypeScript",
    orbit: "inner",
    proficiency: 0.85,
    connections: ["React", "Next.js"],
    description: "Strict typing, generics, type inference",
  },
  {
    name: "Next.js",
    orbit: "inner",
    proficiency: 0.85,
    connections: ["React", "TypeScript"],
    description: "App Router, SSR, routing, API",
  },

  // Middle orbit — daily tools
  {
    name: "GSAP",
    orbit: "middle",
    proficiency: 0.9,
    connections: ["React"],
    description: "ScrollTrigger, SplitText, FLIP, timelines",
  },
  {
    name: "Tailwind",
    orbit: "middle",
    proficiency: 0.85,
    connections: ["React", "Next.js"],
    description: "Utility-first CSS, design systems",
  },
  {
    name: "Framer Motion",
    orbit: "middle",
    proficiency: 0.75,
    connections: ["React"],
    description: "Spring physics, layout animations, gestures",
  },

  // Outer orbit — specialized
  {
    name: "Three.js",
    orbit: "outer",
    proficiency: 0.6,
    connections: ["React", "GSAP"],
    description: "WebGL, 3D scenes, shaders, post-processing",
  },
  {
    name: "Pretext",
    orbit: "outer",
    proficiency: 0.5,
    connections: ["GSAP"],
    description: "Kinetic typography, Canvas text layout engine",
  },
  {
    name: "Web Audio",
    orbit: "outer",
    proficiency: 0.5,
    connections: ["GSAP"],
    description: "SFX, spatial audio, soundtrack management",
  },
];
