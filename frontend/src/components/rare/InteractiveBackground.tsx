"use client";

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
// Adapted from RareUI; see ATTRIBUTION.md and LICENSE in this directory.

interface InteractiveBackgroundProps {
  className?: string; // Additional classes
  children?: React.ReactNode; // Content to display on top
}

export default function InteractiveBackground({
  className,
  children,
}: InteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouse = { x: -9999, y: -9999 };
    let clickEffect = { x: -9999, y: -9999, radius: 0, active: false };

    // Configuration
    const particleCount = 40;
    const connectionDistance = 140;
    const mouseDistance = 250;

    // Resize handler
    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    // Mouse handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      clickEffect.x = e.clientX - rect.left;
      clickEffect.y = e.clientY - rect.top;
      clickEffect.active = true;
      clickEffect.radius = 0;
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseX: number;
      baseY: number;
      density: number;
      color: string;
      glow: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        // Parallax effect: Larger particles move slower, smaller ones faster (or vice versa for depth preference)
        const depth = Math.random();
        this.size = Math.random() * 2 + 0.5;

        const speed = (Math.random() * 0.5 + 0.2) * (1 - depth * 0.5); // Vary speed based on "depth"
        const angle = Math.random() * Math.PI * 2;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.baseX = this.x;
        this.baseY = this.y;
        this.density = Math.random() * 20 + 5;

        // Random premium colors: Cyan, White, Purple-tint
        const r = Math.random();
        if (r > 0.9)
          this.color = "rgba(100, 200, 255, 0.8)"; // Cyan
        else if (r > 0.8)
          this.color = "rgba(200, 100, 255, 0.8)"; // Purple
        else this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`; // White varians

        this.glow = 10;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        // Glow Effect
        ctx.shadowBlur = this.glow;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        ctx.fill();
        ctx.shadowBlur = 0; // Reset for performance
      }

      update() {
        // Basic movement
        this.x += this.vx;
        this.y += this.vy;

        // Mouse interaction (Soft Repel/Attract)
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Gentle "push" from mouse
        if (distance > 0 && distance < mouseDistance) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const maxDistance = mouseDistance;
          let force = (maxDistance - distance) / maxDistance;
          const directionX = forceDirectionX * force * this.density * 0.6;
          const directionY = forceDirectionY * force * this.density * 0.6;

          this.x -= directionX;
          this.y -= directionY;
        }

        // Click Shockwave Effect
        if (clickEffect.active) {
          const cdx = clickEffect.x - this.x;
          const cdy = clickEffect.y - this.y;
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy);

          // If particle is within the expanding ring
          const ringWidth = 50;
          if (Math.abs(cDist - clickEffect.radius) < ringWidth) {
            const angle = Math.atan2(cdy, cdx);
            const pushForce =
              5 * (1 - Math.abs(cDist - clickEffect.radius) / ringWidth);
            this.x -= Math.cos(angle) * pushForce;
            this.y -= Math.sin(angle) * pushForce;
          }
        }

        // Boundary wrap (seamless space)
        if (this.x < 0) this.x = canvas!.width;
        if (this.x > canvas!.width) this.x = 0;
        if (this.y < 0) this.y = canvas!.height;
        if (this.y > canvas!.height) this.y = 0;
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update Click Shockwave
      if (clickEffect.active) {
        clickEffect.radius += 10; // Expand ripple
        if (clickEffect.radius > Math.max(canvas.width, canvas.height)) {
          clickEffect.active = false;
        }
        // Draw Shockwave Ring (optional visual)
        ctx.beginPath();
        ctx.arc(
          clickEffect.x,
          clickEffect.y,
          clickEffect.radius,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - clickEffect.radius / 1000)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Draw connections
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            const opacity = 1 - distance / connectionDistance;
            ctx.strokeStyle = `rgba(180, 220, 255, ${opacity * 0.15})`; // Subtle blue tint
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.closePath();
          }
        }

        // Connect to mouse
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const distMouse = Math.sqrt(dx * dx + dy * dy);
        if (distMouse < mouseDistance) {
          ctx.beginPath();
          const opacity = 1 - distMouse / mouseDistance;
          ctx.strokeStyle = `rgba(100, 200, 255, ${opacity * 0.4})`; // Stronger connection to user
          ctx.lineWidth = 1;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          // Glow on mouse connection
          ctx.shadowBlur = 5;
          ctx.shadowColor = "rgba(100, 200, 255, 0.5)";
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.closePath();
        }
      }
      if (!reduceMotion) animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    handleResize();
    animate();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reduceMotion]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#080b14] ${className || ""}`}
    >
      {/* Premium Gradient Background Layers */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 75% 5%, #31235380, transparent 60%)",
        }}
      />

      {/* Animated Aurora Layers */}
      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }
        }
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute top-[-30%] left-[20%] h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[150px]"
      />

      <motion.div
        animate={
          reduceMotion
            ? {}
            : {
                opacity: [0.1, 0.2, 0.1],
                scale: [1, 1.1, 1],
                rotate: [0, -15, 15, 0],
              }
        }
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute right-[-10%] bottom-[-20%] h-[50%] w-[50%] rounded-full bg-cyan-500/5 blur-[150px]"
      />

      {/* Canvas for Particles */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {/* Content Container */}
      <div className="relative z-20 h-full w-full">{children}</div>
    </div>
  );
}
