/**
 * Furina Music — Aceternity UI, Magic UI & Motion Primitives 3D Engine
 * Provides interactive 3D perspective tilt, dynamic spotlight glare,
 * 3D audio-reactive ocean grid, spring physics, and vinyl turntable deck.
 */

(function () {
  'use strict';

  class FurinaMotion3D {
    constructor() {
      this.initTiltCards();
      this.init3DOceanGrid();
      this.initSpringButtons();
      this.initStageVinyl3D();
      this.observeDynamicContent();
    }

    // 1. Aceternity UI 3D Card Tilt with Specular Glare
    initTiltCards() {
      const attachTilt = (el) => {
        if (el.dataset.tiltInitialized) return;
        el.dataset.tiltInitialized = 'true';

        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotX = ((y - centerY) / centerY) * -10; // max 10 deg
          const rotY = ((x - centerX) / centerX) * 10;  // max 10 deg

          el.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(8px)`;
          el.style.setProperty('--mouse-x', `${x}px`);
          el.style.setProperty('--mouse-y', `${y}px`);
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
          el.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          setTimeout(() => {
            el.style.transition = '';
          }, 500);
        });

        el.addEventListener('mouseenter', () => {
          el.style.transition = 'transform 0.1s ease-out';
        });
      };

      const selectors = '.card-item, .bento-card, .furina-companion-card, .stage-artwork-card, .playlist-hero-card';
      document.querySelectorAll(selectors).forEach(attachTilt);
    }

    // 2. Magic UI & Three-Dimensional Perspective Grid Canvas
    init3DOceanGrid() {
      const canvas = document.getElementById('ocean-ripple-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      });

      let time = 0;
      const particles = [];
      const particleCount = 45;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2.5 + 1,
          speedY: Math.random() * 0.6 + 0.2,
          speedX: (Math.random() - 0.5) * 0.4,
          opacity: Math.random() * 0.7 + 0.2,
          pulse: Math.random() * Math.PI * 2
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        // Draw 3D Perspective Lines receding towards horizon
        const horizonY = height * 0.65;
        const vanishX = width * 0.5;
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
        ctx.lineWidth = 1;

        // Perspective Rays
        const rays = 14;
        for (let i = 0; i <= rays; i++) {
          const xBottom = (width / rays) * i;
          ctx.beginPath();
          ctx.moveTo(vanishX, horizonY);
          ctx.lineTo(xBottom, height);
          ctx.stroke();
        }

        // Horizontal Grid Lines with 3D Depth Spacing
        const gridLines = 10;
        for (let j = 1; j <= gridLines; j++) {
          const progress = Math.pow(j / gridLines, 2.2);
          const y = horizonY + (height - horizonY) * progress;
          const waveOffset = Math.sin(time * 0.03 + j) * 4;
          ctx.beginPath();
          ctx.moveTo(0, y + waveOffset);
          ctx.lineTo(width, y + waveOffset);
          ctx.strokeStyle = `rgba(0, 242, 254, ${(0.03 + progress * 0.08).toFixed(3)})`;
          ctx.stroke();
        }

        // Floating Hydro Luminescent Particles
        for (let p of particles) {
          p.y -= p.speedY;
          p.x += p.speedX;
          p.pulse += 0.03;

          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          const currentAlpha = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
          ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha.toFixed(2)})`;
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        time += 1;
        requestAnimationFrame(render);
      };

      requestAnimationFrame(render);
    }

    // 3. Motion Primitives Spring Click & Tactile Physics
    initSpringButtons() {
      const springSelectors = '.btn-primary, .btn-secondary, .btn-icon, .nav-item, .mobile-nav-btn, .btn-play-hero, .btn-icon-subtle';
      document.addEventListener('mousedown', (e) => {
        const btn = e.target.closest(springSelectors);
        if (btn) {
          btn.style.transform = 'scale(0.92)';
          btn.style.transition = 'transform 0.08s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      });

      document.addEventListener('mouseup', (e) => {
        const btn = e.target.closest(springSelectors);
        if (btn) {
          btn.style.transform = 'scale(1.04)';
          btn.style.transition = 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          setTimeout(() => {
            btn.style.transform = '';
            btn.style.transition = '';
          }, 220);
        }
      });
    }

    // 4. 3D Stage Vinyl Record Deck
    initStageVinyl3D() {
      const stage = document.getElementById('stage-player-overlay');
      if (!stage) return;

      const artContainer = stage.querySelector('.stage-cover-frame');
      if (!artContainer) return;

      if (!artContainer.querySelector('.stage-vinyl-disc')) {
        const vinylDisc = document.createElement('div');
        vinylDisc.className = 'stage-vinyl-disc';
        const innerGroove = document.createElement('div');
        innerGroove.className = 'vinyl-groove-ring';
        vinylDisc.appendChild(innerGroove);
        artContainer.appendChild(vinylDisc);
      }
    }

    // Dynamic Observer for injected elements (Search results, playlist changes)
    observeDynamicContent() {
      const observer = new MutationObserver(() => {
        this.initTiltCards();
      });

      const mainContent = document.querySelector('.main-content') || document.body;
      observer.observe(mainContent, { childList: true, subtree: true });
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.furinaMotion3D = new FurinaMotion3D();
    });
  } else {
    window.furinaMotion3D = new FurinaMotion3D();
  }
})();
