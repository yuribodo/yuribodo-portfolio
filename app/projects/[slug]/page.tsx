import { notFound } from "next/navigation";
import Link from "next/link";
import { projects } from "@/lib/projects-data";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/#projects"
          className="mb-8 inline-block font-mono text-xs text-subtle transition-colors duration-300 hover:text-accent"
        >
          ← Back to deck
        </Link>

        <h1 className="font-sans text-4xl font-black tracking-tight text-foreground-bright md:text-5xl">
          {project.title}
        </h1>

        <p className="mt-4 font-sans text-base leading-relaxed text-muted">
          {project.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.tech.map((tech) => (
            <span
              key={tech}
              className="rounded border border-border px-3 py-1 font-mono text-xs text-subtle"
            >
              {tech}
            </span>
          ))}
        </div>

        {project.links && (
          <div className="mt-8 flex gap-4">
            {project.links.live && (
              <a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-accent px-4 py-2 font-mono text-xs text-accent transition-colors duration-300 hover:bg-accent hover:text-background"
              >
                Live Demo →
              </a>
            )}
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-border px-4 py-2 font-mono text-xs text-subtle transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                GitHub →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
