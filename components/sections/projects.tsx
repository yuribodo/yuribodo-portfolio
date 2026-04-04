"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects } from "@/lib/projects-data";

gsap.registerPlugin(ScrollTrigger);

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-project]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            end: "top 65%",
            scrub: 1,
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative px-6 py-32"
      style={{
        background: "linear-gradient(180deg, #1a1a1a 0%, #191517 50%, #1a1a1a 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          data-project
          className="mb-12 font-sans text-3xl font-black tracking-tight text-foreground-bright md:text-4xl"
        >
          Selected work
        </h2>

        <div className="space-y-1">
          {projects.map((project) => (
            <a
              key={project.slug}
              data-project
              href={project.links?.github ?? `/projects/${project.slug}`}
              target={project.links?.github ? "_blank" : undefined}
              rel={project.links?.github ? "noopener noreferrer" : undefined}
              className="group block border-b border-border py-5 transition-premium hover:border-accent"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-sans text-lg font-bold text-foreground-bright transition-premium group-hover:text-accent md:text-xl">
                    {project.title}
                  </h3>
                  {project.featured && (
                    <span className="font-mono text-[10px] text-accent">&star;</span>
                  )}
                </div>
                <span className="font-mono text-xs text-muted transition-premium group-hover:text-accent">
                  &nearr;
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-between">
                <p className="font-sans text-sm text-muted">
                  {project.description}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tech.map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-[10px] text-subtle"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
