import React, { useEffect, useRef } from 'react';

const TechVisualizer = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastFrame = 0;

    const setCanvasSize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 0.5,
      color: Math.random() > 0.5 ? 'rgba(45, 212, 191, ' : 'rgba(147, 51, 234, ' // Neon teal or Purple
    }));

    const render = (timestamp) => {
      if (document.hidden) return;
      animationFrameId = requestAnimationFrame(render);
      if (timestamp - lastFrame < 1000 / 30) return;
      lastFrame = timestamp;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Nebulosa background (radial gradients moving slowly)
      const time = Date.now() * 0.0005;
      const g1x = canvas.width / 2 + Math.cos(time) * 100;
      const g1y = canvas.height / 2 + Math.sin(time) * 100;
      
      const gradient = ctx.createRadialGradient(g1x, g1y, 0, canvas.width/2, canvas.height/2, canvas.width);
      gradient.addColorStop(0, 'rgba(45, 212, 191, 0.05)');
      gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.03)');
      gradient.addColorStop(1, 'rgba(2, 2, 3, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (Math.sin(time + i) * 0.5 + 0.5) + ')';
        ctx.fill();

        // Conexiones
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(45, 212, 191, ${0.15 - dist/1000})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

    };

    const handleVisibility = () => {
      cancelAnimationFrame(animationFrameId);
      if (!document.hidden) {
        lastFrame = 0;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full max-w-lg aspect-[4/3] rounded-3xl border border-white/5 bg-[#020203]/50 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-2xl">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
      
      {/* Central Hologram text */}
      <div className="relative z-20 flex flex-col items-center justify-center p-8 bg-[#020203]/40 backdrop-blur-md rounded-full border border-white/5 shadow-[0_0_30px_rgba(45,212,191,0.1)]">
        <h3 className="text-white font-black tracking-[0.2em] uppercase text-sm mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          El Futuro de la Productividad
        </h3>
        <p className="text-neon-teal/80 text-[10px] uppercase font-bold tracking-widest text-center max-w-[250px]">
          Supervisa agentes, analiza datos y toma decisiones en tiempo real.
        </p>
      </div>
    </div>
  );
};

export default TechVisualizer;
