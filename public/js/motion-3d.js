/**
 * Furina Music — Aceternity UI, Magic UI & Motion Primitives 3D Engine (v8.0)
 * Provides interactive 3D perspective tilt, dynamic spotlight glare,
 * macOS-style floating dock spring magnification, 3D vinyl turntable deck,
 * and audio-reactive particle waves.
 */

(function () {
  'use strict';

  class FurinaMotion3D {
    constructor() {
      this.initTiltCards();
      this.initDockMagnification();
      this.init3DOceanGrid();
      this.initSpringButtons();
      this.initBentoAudioSync();
      this.initStageVinyl3D();
      this.observeDynamicContent();
    }

    // 1. Aceternity UI 3D Card Tilt with Specular Glare & Spotlight
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

          const rotX = ((y - centerY) / centerY) * -8; // max 8 deg
          const rotY = ((x - centerX) / centerX) * 8;  // max 8 deg

          el.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(6px)`;
          el.style.setProperty('--mouse-x', `${x}px`);
          el.style.setProperty('--mouse-y', `${y}px`);
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
          el.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          setTimeout(() => {
            el.style.transition = '';
          }, 450);
        });

        el.addEventListener('mouseenter', () => {
          el.style.transition = 'transform 0.08s ease-out';
        });
      };

      const selectors = '.card-item, .bento-card, .furina-companion-card, .stage-artwork-card, .playlist-hero-card, .category-bento-card';
      document.querySelectorAll(selectors).forEach(attachTilt);
    }

    // 2. Magic UI macOS-Style Floating Dock Magnification (Desktop & Mobile Touch)
    initDockMagnification() {
      const docks = document.querySelectorAll('.floating-glass-dock, .mobile-navbar');
      docks.forEach(dock => {
        const items = Array.from(dock.querySelectorAll('.dock-item, .mobile-nav-item'));
        const maxDistance = 110;
        const baseScale = 1.0;
        const maxScale = 1.28;

        const handleMove = (clientX) => {
          items.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const itemCenter = rect.left + rect.width / 2;
            const distance = Math.abs(clientX - itemCenter);

            if (distance < maxDistance) {
              const factor = 1 - distance / maxDistance;
              const scale = baseScale + (maxScale - baseScale) * Math.sin((factor * Math.PI) / 2);
              item.style.transform = `scale(${scale.toFixed(3)}) translateY(-${(factor * 5).toFixed(1)}px)`;
            } else {
              item.style.transform = `scale(${baseScale}) translateY(0)`;
            }
          });
        };

        dock.addEventListener('mousemove', (e) => handleMove(e.clientX));
        dock.addEventListener('touchmove', (e) => {
          if (e.touches && e.touches[0]) handleMove(e.touches[0].clientX);
        }, { passive: true });

        const resetItems = () => {
          items.forEach((item) => {
            item.style.transform = `scale(${baseScale}) translateY(0)`;
            item.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            setTimeout(() => { item.style.transition = ''; }, 300);
          });
        };

        dock.addEventListener('mouseleave', resetItems);
        dock.addEventListener('touchend', resetItems);
      });
    }

    // 3. Aceternity Vinyl Turntable & Tonearm Live Playback Synchronization
    initBentoAudioSync() {
      const updateVinylState = (isPlaying) => {
        const vinyls = document.querySelectorAll('.vinyl-record-disc, .stage-vinyl-disc');
        const tonearms = document.querySelectorAll('.vinyl-tonearm');

        vinyls.forEach(v => {
          if (isPlaying) {
            v.classList.add('vinyl-spinning');
          } else {
            v.classList.remove('vinyl-spinning');
          }
        });

        tonearms.forEach(t => {
          if (isPlaying) {
            t.classList.add('active');
          } else {
            t.classList.remove('active');
          }
        });
      };

      // Listen to master audio engine events
      if (window.furinaAudio) {
        window.furinaAudio.on('statechange', ({ isPlaying }) => {
          updateVinylState(isPlaying);
        });
      }

      // Also poll current state safely on track loads
      document.addEventListener('furina:trackchange', (e) => {
        const track = e.detail?.track;
        if (track?.coverUrl || track?.cover_url) {
          const centerArts = document.querySelectorAll('.vinyl-center-art, .stage-vinyl-center-art');
          centerArts.forEach(img => {
            img.src = track.coverUrl || track.cover_url;
          });
        }
      });
    }

    // 4. Magic UI & Three-Dimensional Perspective Grid Canvas
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
          size: Math.random() * 2.2 + 1,
          speedY: Math.random() * 0.5 + 0.2,
          speedX: (Math.random() - 0.5) * 0.35,
          opacity: Math.random() * 0.7 + 0.2,
          pulse: Math.random() * Math.PI * 2
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        // Draw 3D Perspective Lines receding towards horizon
        const horizonY = height * 0.65;
        const vanishX = width * 0.5;
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.04)';
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

    // 5. Motion Primitives Spring Click & Tactile Physics
    initSpringButtons() {
      const springSelectors = '.btn-primary, .magic-shimmer-btn, .btn-secondary, .btn-icon, .nav-item, .dock-item, .btn-play-hero, .btn-icon-subtle';
      document.addEventListener('mousedown', (e) => {
        const btn = e.target.closest(springSelectors);
        if (btn) {
          btn.style.transform = 'scale(0.94)';
          btn.style.transition = 'transform 0.08s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      });

      document.addEventListener('mouseup', (e) => {
        const btn = e.target.closest(springSelectors);
        if (btn) {
          btn.style.transform = 'scale(1.03)';
          btn.style.transition = 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          setTimeout(() => {
            btn.style.transform = '';
            btn.style.transition = '';
          }, 220);
        }
      });
    }

    // 6. 3D Stage Vinyl Record Deck & Perspective Tilt
    initStageVinyl3D() {
      const container = document.querySelector('.stage-artwork-container');
      if (!container || container.dataset.vinyl3dReady) return;
      container.dataset.vinyl3dReady = 'true';

      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotX = ((y - centerY) / centerY) * -12;
        const rotY = ((x - centerX) / centerX) * 12;

        container.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      });

      container.addEventListener('mouseleave', () => {
        container.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
        container.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        setTimeout(() => { container.style.transition = ''; }, 500);
      });

      container.addEventListener('mouseenter', () => {
        container.style.transition = 'transform 0.1s ease-out';
      });
    }

    // Dynamic Observer for injected elements (Search results, playlist changes)
    observeDynamicContent() {
      const observer = new MutationObserver(() => {
        this.initTiltCards();
        this.initDockMagnification();
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
