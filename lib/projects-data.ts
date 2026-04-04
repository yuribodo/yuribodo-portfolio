export interface Project {
  slug: string;
  title: string;
  description: string;
  tech: string[];
  featured: boolean;
  links?: {
    live?: string;
    github?: string;
  };
}

export const projects: Project[] = [
  // Placeholder projects — Yuri will replace with real data
  {
    slug: "project-one",
    title: "Project One",
    description:
      "A description of the first project showcasing creative frontend work.",
    tech: ["React", "GSAP", "TypeScript"],
    featured: true,
  },
  {
    slug: "project-two",
    title: "Project Two",
    description:
      "Another project demonstrating animation and interaction craft.",
    tech: ["Next.js", "Three.js"],
    featured: false,
  },
  {
    slug: "project-three",
    title: "Project Three",
    description:
      "A third project exploring the boundaries of web interaction.",
    tech: ["Canvas", "Pretext"],
    featured: false,
  },
];
