export interface Particle {
  char: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  fontSize: number;
  color: string;
}

interface EngineConfig {
  springStiffness: number;
  damping: number;
  cursorRadius: number;
  cursorForce: number;
  breathAmplitude: number;
}

const DEFAULT_CONFIG: EngineConfig = {
  springStiffness: 0.03,
  damping: 0.85,
  cursorRadius: 120,
  cursorForce: 8,
  breathAmplitude: 0.5,
};

export class ParticleEngine {
  particles: Particle[] = [];
  private config: EngineConfig;
  private time = 0;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setParticles(particles: Particle[]): void {
    this.particles = particles;
  }

  update(cursorX: number, cursorY: number, deltaTime: number): void {
    this.time += deltaTime;

    for (const p of this.particles) {
      // Spring force toward target
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      p.velocityX += dx * this.config.springStiffness;
      p.velocityY += dy * this.config.springStiffness;

      // Cursor repulsion
      const cdx = p.x - cursorX;
      const cdy = p.y - cursorY;
      const dist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (dist < this.config.cursorRadius && dist > 0) {
        const force =
          (1 - dist / this.config.cursorRadius) * this.config.cursorForce;
        p.velocityX += (cdx / dist) * force;
        p.velocityY += (cdy / dist) * force;
      }

      // Breathing — micro-movement
      const breathX =
        Math.sin(this.time * 0.001 + p.targetX * 0.01) *
        this.config.breathAmplitude;
      const breathY =
        Math.cos(this.time * 0.0013 + p.targetY * 0.01) *
        this.config.breathAmplitude;
      p.velocityX += (breathX - (p.x - p.targetX)) * 0.002;
      p.velocityY += (breathY - (p.y - p.targetY)) * 0.002;

      // Damping
      p.velocityX *= this.config.damping;
      p.velocityY *= this.config.damping;

      // Apply velocity
      p.x += p.velocityX;
      p.y += p.velocityY;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.font = `900 ${p.fontSize}px Archivo, system-ui, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, p.x, p.y);
    }
  }
}
