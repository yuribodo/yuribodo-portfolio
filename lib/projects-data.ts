export interface Project {
  slug: string;
  title: string;
  description: string;
  tech: string[];
  featured: boolean;
  image?: string;
  links?: {
    live?: string;
    github?: string;
  };
}

export const projects: Project[] = [
  {
    slug: "launchlist",
    title: "LaunchList",
    description:
      "Hackathon-born product for managing waitlists and early access campaigns. Built during competition, now a real product.",
    tech: ["TypeScript", "React", "Node.js"],
    featured: true,
    image: "/projects/launchlist.jpg",
    links: {
      github: "https://github.com/yuribodo/launchlist",
    },
  },
  {
    slug: "bugless",
    title: "BugLess",
    description:
      "AI-powered tools for automated bug detection and code quality analysis.",
    tech: ["TypeScript", "AI", "Node.js"],
    featured: true,
    links: {
      github: "https://github.com/yuribodo/bugless",
    },
  },
  {
    slug: "mario-charts",
    title: "Mario Charts",
    description:
      "Open-source React component library for data visualization. Used by other developers in production.",
    tech: ["React", "TypeScript", "Open Source"],
    featured: true,
    image: "/projects/mariocharts.svg",
    links: {
      github: "https://github.com/yuribodo/mario-charts",
    },
  },
  {
    slug: "auto-issue",
    title: "Auto-Issue",
    description:
      "Autonomous coding agent built in Go that opens pull requests without human intervention.",
    tech: ["Go", "AI Agents", "GitHub API"],
    featured: true,
    image: "/projects/auto-issue.png",
    links: {
      github: "https://github.com/yuribodo/auto-issue",
    },
  },
  {
    slug: "givememoney",
    title: "GiveMeMoney",
    description: "Web3 payment infrastructure on Solana blockchain.",
    tech: ["Solana", "Rust", "TypeScript"],
    featured: false,
    links: {
      github: "https://github.com/yuribodo/givememoney",
    },
  },
  {
    slug: "pattpay",
    title: "PattPay",
    description:
      "Solana subscription billing protocol. Handles recurring payments on-chain.",
    tech: ["Solana", "Rust", "Web3"],
    featured: false,
    links: {
      github: "https://github.com/yuribodo/pattpay",
    },
  },
];
