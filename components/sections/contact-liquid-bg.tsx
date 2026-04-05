"use client";

import { useEffect, useRef, useCallback } from "react";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = a_position * 0.5 + 0.5;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_bgColor;
  uniform vec3 u_accentColor;

  // Simplex-ish noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = v_uv;
    vec2 mouseUV = u_mouse / u_resolution;
    mouseUV.y = 1.0 - mouseUV.y;

    // Cursor ripple field
    float dist = distance(uv, mouseUV);
    float ripple = sin(dist * 20.0 - u_time * 3.0) * 0.5 + 0.5;
    ripple *= (1.0 - smoothstep(0.0, 0.4, dist));

    // Animated noise field
    vec2 noiseCoord = uv * 3.0 + u_time * 0.15;
    float n = fbm(noiseCoord);

    // Combine
    float field = n * 0.12 + ripple * 0.15;

    // Color: subtle accent glow around cursor, noise-driven variation
    vec3 color = u_bgColor;
    color += u_accentColor * field * 0.6;
    color += u_accentColor * ripple * 0.25;

    // Subtle vignette
    float vig = 1.0 - smoothstep(0.3, 0.85, length(uv - 0.5));
    color *= 0.92 + vig * 0.08;

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface GLResources {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vs: WebGLShader;
  fs: WebGLShader;
  buf: WebGLBuffer;
  uniforms: {
    mouse: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    bgColor: WebGLUniformLocation | null;
    accentColor: WebGLUniformLocation | null;
  };
}

export function LiquidBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resourcesRef = useRef<GLResources | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const destroyGL = useCallback(() => {
    const res = resourcesRef.current;
    if (!res) return;
    res.gl.deleteBuffer(res.buf);
    res.gl.deleteProgram(res.program);
    res.gl.deleteShader(res.vs);
    res.gl.deleteShader(res.fs);
    resourcesRef.current = null;
  }, []);

  const initGL = useCallback(() => {
    destroyGL();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const gl = canvas.getContext("webgl", { alpha: false });
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) return;

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAGMENT_SHADER);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      mouse: gl.getUniformLocation(program, "u_mouse"),
      time: gl.getUniformLocation(program, "u_time"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      bgColor: gl.getUniformLocation(program, "u_bgColor"),
      accentColor: gl.getUniformLocation(program, "u_accentColor"),
    };

    // Parse colors from CSS
    gl.uniform3f(uniforms.bgColor, 0.102, 0.102, 0.102); // #1a1a1a
    gl.uniform3f(uniforms.accentColor, 0.98, 0.295, 0.07); // #fa4b12

    resourcesRef.current = { gl, program, vs, fs, buf, uniforms };
    startTimeRef.current = performance.now();
  }, [destroyGL]);

  useEffect(() => {
    if (reducedMotion) return;
    initGL();

    let resizeTimer: ReturnType<typeof setTimeout>;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(initGL, 150);
    };

    const render = () => {
      const res = resourcesRef.current;
      const canvas = canvasRef.current;
      if (!res || !canvas) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      const { gl, uniforms } = res;
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 1.5);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.mouse, (mouseRef.current.x - rect.left) * dpr, (mouseRef.current.y - rect.top) * dpr);
      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrameRef.current = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animFrameRef.current);
      destroyGL();
    };
  }, [initGL, destroyGL, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "auto" }}
      aria-hidden
    />
  );
}
