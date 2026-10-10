import React, { useEffect, useRef } from 'react';

// ── Floating & Rotating Data Objects Specification ──
// Palette: Coral (#FF7867), Lavender Purple (#A78BFA), Light Lavender (#D8C7FF), Mint Green (#7CE7C5)
// Resized to small, subtle data cells (10px - 18px) designed to float lightly behind text & boxes
const DATA_OBJECTS = [
  // Top sector
  { id: 1, top: '8%', left: '6%', size: 15, color: '#A78BFA', radius: 4, anim: 'floatRotateA', duration: 18, delay: -3, rot: 15 },
  { id: 2, top: '10%', right: '7%', size: 16, color: '#7CE7C5', radius: 4, anim: 'floatRotateC', duration: 20, delay: -5, rot: -25 },
  { id: 3, top: '16%', left: '18%', size: 12, color: '#FF7867', radius: 3, anim: 'floatRotateB', duration: 22, delay: -8, rot: -20 },
  { id: 4, top: '18%', right: '20%', size: 14, color: '#D8C7FF', radius: 4, anim: 'floatRotateD', duration: 17, delay: -9, rot: 18 },

  // Background of hero banner & text area
  { id: 5, top: '25%', left: '38%', size: 11, color: '#7CE7C5', radius: 3, anim: 'floatRotateB', duration: 25, delay: -12, rot: 10 },
  { id: 6, top: '28%', right: '35%', size: 13, color: '#FF7867', radius: 3, anim: 'floatRotateA', duration: 23, delay: -4, rot: -15 },
  { id: 7, top: '38%', left: '28%', size: 12, color: '#D8C7FF', radius: 3, anim: 'floatRotateC', duration: 21, delay: -14, rot: 25 },
  { id: 8, top: '42%', right: '26%', size: 14, color: '#A78BFA', radius: 4, anim: 'floatRotateD', duration: 19, delay: -7, rot: -18 },

  // Mid flanks
  { id: 9, top: '36%', left: '4%', size: 15, color: '#FF7867', radius: 4, anim: 'floatRotateC', duration: 20, delay: -6, rot: 35 },
  { id: 10, top: '40%', right: '5%', size: 16, color: '#7CE7C5', radius: 4, anim: 'floatRotateA', duration: 22, delay: -2, rot: 42 },
  { id: 11, top: '54%', left: '7%', size: 13, color: '#D8C7FF', radius: 3, anim: 'floatRotateD', duration: 24, delay: -15, rot: -15 },
  { id: 12, top: '56%', right: '7%', size: 14, color: '#A78BFA', radius: 4, anim: 'floatRotateB', duration: 18, delay: -8, rot: -30 },

  // Behind feature cards & workflow sections
  { id: 13, top: '65%', left: '32%', size: 11, color: '#7CE7C5', radius: 3, anim: 'floatRotateA', duration: 26, delay: -11, rot: 20 },
  { id: 14, top: '68%', right: '33%', size: 13, color: '#FF7867', radius: 3, anim: 'floatRotateC', duration: 22, delay: -13, rot: -22 },
  { id: 15, top: '75%', left: '10%', size: 14, color: '#A78BFA', radius: 4, anim: 'floatRotateB', duration: 21, delay: -5, rot: 16 },
  { id: 16, top: '78%', right: '11%', size: 15, color: '#D8C7FF', radius: 4, anim: 'floatRotateD', duration: 19, delay: -10, rot: -14 },

  // Bottom sector
  { id: 17, bottom: '8%', left: '6%', size: 16, color: '#A78BFA', radius: 4, anim: 'floatRotateA', duration: 23, delay: -9, rot: -18 },
  { id: 18, bottom: '6%', left: '22%', size: 12, color: '#FF7867', radius: 3, anim: 'floatRotateB', duration: 19, delay: -6, rot: 28 },
  { id: 19, bottom: '8%', right: '8%', size: 15, color: '#7CE7C5', radius: 4, anim: 'floatRotateC', duration: 24, delay: -16, rot: -14 },
  { id: 20, bottom: '5%', right: '24%', size: 13, color: '#D8C7FF', radius: 3, anim: 'floatRotateD', duration: 20, delay: -3, rot: 36 },
  { id: 21, bottom: '12%', left: '46%', size: 10, color: '#FF7867', radius: 3, anim: 'floatRotateA', duration: 25, delay: -14, rot: 12 },
  { id: 22, bottom: '14%', right: '44%', size: 11, color: '#7CE7C5', radius: 3, anim: 'floatRotateC', duration: 22, delay: -7, rot: -20 },
];

export default function AnimatedBackground() {
  const canvasRef = useRef(null);
  const fgCanvasRef = useRef(null);

  useEffect(() => {
    const bgCanvas = canvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const fgCtx = fgCanvas.getContext('2d');
    if (!bgCtx || !fgCtx) return;

    let animationFrameId;
    let width = (bgCanvas.width = fgCanvas.width = window.innerWidth);
    let height = (bgCanvas.height = fgCanvas.height = window.innerHeight);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMotionChange);
    }

    const handleResize = () => {
      if (!bgCanvas || !fgCanvas) return;
      width = bgCanvas.width = fgCanvas.width = window.innerWidth;
      height = bgCanvas.height = fgCanvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    const particleColors = ['#8B5CF6', '#A78BFA', '#7CE7C5', '#FF7867', '#D8C7FF'];
    let bgParticles = [];
    let fgParticles = [];
    let orbs = [];

    const initParticles = () => {
      const isMobile = width < 768;
      const speedMultiplier = prefersReducedMotion ? 0.08 : 0.22;

      // ── Background Ambient Deep Layer ──
      const bgCount = isMobile ? 18 : Math.min(36, Math.floor((width * height) / 32000));
      bgParticles = [];
      for (let i = 0; i < bgCount; i++) {
        bgParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speedMultiplier,
          vy: (Math.random() - 0.5) * speedMultiplier,
          radius: Math.random() * 1.5 + 1.8,
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
          alpha: Math.random() * 0.25 + 0.25,
          glowRadius: Math.random() * 5 + 3,
        });
      }

      // ── Foreground Connected Balls Layer (Low Effect: Subtle, Delicate) ──
      const fgCount = isMobile ? 16 : 28;
      fgParticles = [];
      for (let i = 0; i < fgCount; i++) {
        fgParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speedMultiplier,
          vy: (Math.random() - 0.5) * speedMultiplier,
          radius: Math.random() * 0.9 + 1.2, // Small delicate balls (1.2px - 2.1px)
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
          alpha: Math.random() * 0.14 + 0.22, // Low effect alpha (0.22 - 0.36)
          glowRadius: 2.5,
        });
      }

      orbs = [
        { x: width * 0.18, y: height * 0.22, r: 420, color: 'rgba(167, 139, 250, 0.04)', vx: 0.08, vy: 0.06 },
        { x: width * 0.82, y: height * 0.38, r: 480, color: 'rgba(216, 199, 255, 0.045)', vx: -0.06, vy: 0.08 },
        { x: width * 0.52, y: height * 0.85, r: 440, color: 'rgba(124, 231, 197, 0.035)', vx: 0.05, vy: -0.07 },
      ];
    };

    initParticles();

    const render = () => {
      bgCtx.clearRect(0, 0, width, height);
      fgCtx.clearRect(0, 0, width, height);

      // 1. Background soft radiant ambient orbs
      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -180 || orb.x > width + 180) orb.vx *= -1;
        if (orb.y < -180 || orb.y > height + 180) orb.vy *= -1;

        const grad = bgCtx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'transparent');
        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        bgCtx.fill();
      });

      // 2. Background floating particles
      bgParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        bgCtx.save();
        bgCtx.shadowColor = p.color;
        bgCtx.shadowBlur = p.glowRadius;
        bgCtx.globalAlpha = p.alpha;
        bgCtx.fillStyle = p.color;
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
      });

      // 3. Foreground Connected Balls with Low Effect (In front of text & box)
      const maxDistance = 115;
      for (let i = 0; i < fgParticles.length; i++) {
        for (let j = i + 1; j < fgParticles.length; j++) {
          const dx = fgParticles[i].x - fgParticles[j].x;
          const dy = fgParticles[i].y - fgParticles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            // Subtle, delicate connecting line
            const lineAlpha = (1 - dist / maxDistance) * 0.10;
            fgCtx.strokeStyle = `rgba(167, 139, 250, ${lineAlpha})`;
            fgCtx.lineWidth = 0.75;
            fgCtx.beginPath();
            fgCtx.moveTo(fgParticles[i].x, fgParticles[i].y);
            fgCtx.lineTo(fgParticles[j].x, fgParticles[j].y);
            fgCtx.stroke();
          }
        }
      }

      // Draw foreground small balls
      fgParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        fgCtx.save();
        fgCtx.shadowColor = p.color;
        fgCtx.shadowBlur = p.glowRadius;
        fgCtx.globalAlpha = p.alpha;
        fgCtx.fillStyle = p.color;
        fgCtx.beginPath();
        fgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        fgCtx.fill();
        fgCtx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleMotionChange);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* ── Background Ambient Canvas Layer ── */}
      <canvas
        ref={canvasRef}
        className="rowbot-animated-bg"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Floating & Rotating Rounded-Square Data Objects Layer (Background) ── */}
      <div className="data-objects-container" aria-hidden="true">
        {DATA_OBJECTS.map((obj) => (
          <div
            key={obj.id}
            className={`data-floating-object ${obj.anim} ${obj.hideOnMobile ? 'hide-on-mobile' : ''}`}
            style={{
              top: obj.top,
              bottom: obj.bottom,
              left: obj.left,
              right: obj.right,
              width: `${obj.size}px`,
              height: `${obj.size}px`,
              backgroundColor: obj.color,
              borderRadius: `${obj.radius}px`,
              animationDuration: `${obj.duration}s`,
              animationDelay: `${obj.delay}s`,
              '--rot-init': `${obj.rot}deg`,
            }}
          />
        ))}
      </div>

      {/* ── Foreground Connected Balls Effect Layer (Low-Intensity, In Front) ── */}
      <canvas
        ref={fgCanvasRef}
        className="rowbot-foreground-particles"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 10005,
        }}
      />
    </>
  );
}
