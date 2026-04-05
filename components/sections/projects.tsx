"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { projects } from "@/lib/projects-data";

gsap.registerPlugin(ScrollTrigger);

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-project]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            end: "top 65%",
            scrub: 1,
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative px-6 py-40">
      <div className="mx-auto max-w-4xl">
        <div
          data-project
          className="mb-12 font-mono text-[10px] tracking-[2px] text-subtle"
        >
          SELECTED WORK
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <a
              key={project.slug}
              data-project
              href={project.links?.github ?? `/projects/${project.slug}`}
              target={project.links?.github ? "_blank" : undefined}
              rel={project.links?.github ? "noopener noreferrer" : undefined}
              className="group overflow-hidden rounded-lg border border-border bg-surface transition-premium hover:border-accent hover:shadow-[0_8px_30px_rgba(250,75,18,0.06)]"
            >
              {/* Preview area */}
              <div className="relative h-36 overflow-hidden bg-surface-hover md:h-44">
                {project.image ? (
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover opacity-70 transition-premium group-hover:opacity-90 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <div
                      className="absolute inset-0 opacity-40 transition-premium group-hover:opacity-60"
                      style={{
                        background: project.featured
                          ? "linear-gradient(135deg, #2e2024 0%, #45272f 50%, #1a1a1a 100%)"
                          : "linear-gradient(135deg, #222 0%, #2a2a2a 50%, #1a1a1a 100%)",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-sans text-4xl font-black text-foreground-bright/10 transition-premium group-hover:text-foreground-bright/20 md:text-5xl">
                        {project.title.charAt(0)}
                      </span>
                    </div>
                  </>
                )}
                {/* Arrow */}
                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface/80 font-mono text-xs text-subtle opacity-0 backdrop-blur-sm transition-premium group-hover:opacity-100 group-hover:text-accent group-hover:border-accent">
                  ↗
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-sans text-base font-bold text-foreground-bright transition-premium group-hover:text-accent">
                    {project.title}
                  </h3>
                  {project.featured && (
                    <span className="font-mono text-[10px] text-accent">★</span>
                  )}
                </div>
                <p className="mt-1.5 font-sans text-sm leading-relaxed text-muted">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="font-mono text-[10px] text-subtle"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
