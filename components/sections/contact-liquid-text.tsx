"use client";

import { useEffect, useRef, useCallback } from "react";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform vec2 u_resolution;

  void main() {
    vec2 uv = v_texCoord;
    vec2 mouseUV = u_mouse / u_resolution;
    mouseUV.y = 1.0 - mouseUV.y;

    float dist = distance(uv, mouseUV);
    float radius = 0.35;
    float strength = 1.0 - smoothstep(0.0, radius, dist);

    float ripple1 = sin(dist * 25.0 - u_time * 2.5) * strength * 0.025;
    float ripple2 = cos(dist * 18.0 - u_time * 2.0) * strength * 0.02;
    float ripple3 = sin(dist * 35.0 + u_time * 1.8) * strength * 0.012;

    vec2 distortedUV = uv + vec2(ripple1 + ripple3, ripple2 - ripple3);

    float aberration = strength * 0.003;
    float r = texture2D(u_texture, distortedUV + vec2(aberration, 0.0)).r;
    float g = texture2D(u_texture, distortedUV).g;
    float b = texture2D(u_texture, distortedUV - vec2(aberration, 0.0)).b;
    float a = texture2D(u_texture, distortedUV).a;

    gl_FragColor = vec4(r, g, b, a);
  }
`;

interface GLResources {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  posBuf: WebGLBuffer;
  texBuf: WebGLBuffer;
  texture: WebGLTexture;
  uniforms: {
    mouse: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
  };
}

interface LiquidSectionProps {
  children: React.ReactNode;
  reducedMotion: boolean;
}

export function LiquidSection({ children, reducedMotion }: LiquidSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<GLResources | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const hasWebGLRef = useRef(true);

  const destroyGL = useCallback(() => {
    const res = resourcesRef.current;
    if (!res) return;
    const { gl, program, vertexShader, fragmentShader, posBuf, texBuf, texture } = res;
    gl.deleteTexture(texture);
    gl.deleteBuffer(posBuf);
    gl.deleteBuffer(texBuf);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    resourcesRef.current = null;
  }, []);

  const captureContent = useCallback(() => {
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!source || !canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = rect.width * dpr;
    const h = rect.height * dpr;

    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    ctx.scale(dpr, dpr);

    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim();
    ctx.fillStyle = bgColor || "#1a1a1a";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const elements = source.querySelectorAll("[data-liquid-render]");
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const elRect = htmlEl.getBoundingClientRect();
      const relX = elRect.left - rect.left;
      const relY = elRect.top - rect.top;
      const styles = getComputedStyle(htmlEl);

      ctx.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      ctx.fillStyle = styles.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2;
      const textY = relY + (elRect.height - lineHeight) / 2;

      ctx.fillText(htmlEl.textContent || "", relX, textY);
    });

    return offscreen;
  }, []);

  const initGL = useCallback(() => {
    destroyGL();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      hasWebGLRef.current = false;
      return;
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) { hasWebGLRef.current = false; return; }

    gl.shaderSource(vertexShader, VERTEX_SHADER);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) { hasWebGLRef.current = false; return; }

    gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) { hasWebGLRef.current = false; return; }

    const program = gl.createProgram();
    if (!program) { hasWebGLRef.current = false; return; }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { hasWebGLRef.current = false; return; }
    gl.useProgram(program);

    const positions = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const texCoords = new Float32Array([0,1, 1,1, 0,0, 0,0, 1,1, 1,0]);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const contentCanvas = captureContent();
    if (contentCanvas) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, contentCanvas);
    }

    const uniforms = {
      mouse: gl.getUniformLocation(program, "u_mouse"),
      time: gl.getUniformLocation(program, "u_time"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
    };

    resourcesRef.current = { gl, program, vertexShader, fragmentShader, posBuf, texBuf, texture, uniforms };
    startTimeRef.current = performance.now();
  }, [destroyGL, captureContent]);

  const updateTexture = useCallback(() => {
    const res = resourcesRef.current;
    if (!res) return;
    const contentCanvas = captureContent();
    if (!contentCanvas) return;
    const { gl, texture } = res;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, contentCanvas);
  }, [captureContent]);

  useEffect(() => {
    if (reducedMotion) return;

    document.fonts.ready.then(() => {
      initGL();
      setTimeout(updateTexture, 100);
    });

    let resizeTimer: ReturnType<typeof setTimeout>;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initGL();
        setTimeout(updateTexture, 50);
      }, 150);
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
      const dpr = Math.min(window.devicePixelRatio, 2);

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
  }, [initGL, destroyGL, updateTexture, reducedMotion]);

  if (reducedMotion) {
    return <div ref={containerRef}>{children}</div>;
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Source content — visible, interactive. Canvas overlays on top. */}
      <div ref={sourceRef} className="absolute inset-0">
        {children}
      </div>
      {/* WebGL canvas — opaque, shows distorted version, pointer-events none so clicks pass through */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "auto", pointerEvents: "none" }}
        aria-hidden
      />
    </div>
  );
}
