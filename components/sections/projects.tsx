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
          y: 40,
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
    <section ref={sectionRef} className="relative px-6 py-32">
      <div className="mx-auto max-w-3xl">

        <div className="space-y-1">
          {projects.map((project) => (
            <a
              key={project.slug}
              data-project
              href={project.links?.github ?? `/projects/${project.slug}`}
              target={project.links?.github ? "_blank" : undefined}
              rel={project.links?.github ? "noopener noreferrer" : undefined}
              className="group flex items-baseline justify-between border-b border-border py-6 transition-premium hover:border-accent"
            >
              <div className="flex items-baseline gap-3">
                <h3 className="font-sans text-lg font-bold text-foreground transition-premium group-hover:text-accent md:text-xl">
                  {project.title}
                </h3>
                {project.featured && (
                  <span className="font-mono text-[10px] text-accent">★</span>
                )}
              </div>

              <div className="hidden items-baseline gap-3 md:flex">
                <span className="font-mono text-xs text-muted">
                  {project.tech.slice(0, 3).join(" · ")}
                </span>
                <span className="font-mono text-xs text-subtle transition-premium group-hover:text-accent">
                  ↗
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
