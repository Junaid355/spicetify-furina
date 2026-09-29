/**
 * Furina Music — Dynamic Album-Art Color Extraction & Fluid Ocean Ripple Canvas
 */
class DynamicBackgroundEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.ripples = [];
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 40;
    this.offscreenCanvas.height = 40;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    this.currentArtworkUrl = '';
    this.meshLayer = null;

    this.initCanvas();
    this.initListeners();
  }

  initCanvas() {
    this.canvas = document.getElementById('ocean-ripple-canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'ocean-ripple-canvas';
      document.body.prepend(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());

    // Create dynamic mesh background layer if absent
    this.meshLayer = document.querySelector('.dynamic-mesh-layer');
    if (!this.meshLayer) {
      this.meshLayer = document.createElement('div');
      this.meshLayer.className = 'dynamic-mesh-layer';
      document.body.prepend(this.meshLayer);
    }

    this.animate();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initListeners() {
    window.addEventListener('pointerdown', (e) => {
      this.addRipple(e.clientX, e.clientY);
    });
  }

  addRipple(x, y, maxRadius = 90) {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius,
      opacity: 0.45,
      speed: 2.2
    });
  }

  triggerAudioPulse() {
    if (this.canvas) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      this.addRipple(cx, cy, 140);
    }
  }

  async extractColors(imgUrl) {
    return new Promise((resolve) => {
      if (!imgUrl) return resolve([2, 132, 199]);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imgUrl;
      img.onload = () => {
        try {
          this.offscreenCtx.clearRect(0, 0, 40, 40);
          this.offscreenCtx.drawImage(img, 0, 0, 40, 40);
          const data = this.offscreenCtx.getImageData(0, 0, 40, 40).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 16) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            if (lum > 25 && lum < 235) {
              r += data[i]; g += data[i + 1]; b += data[i + 2];
              count++;
            }
          }
          if (count > 0) {
            resolve([Math.floor(r / count), Math.floor(g / count), Math.floor(b / count)]);
          } else {
            resolve([2, 132, 199]);
          }
        } catch (_) {
          resolve([2, 132, 199]);
        }
      };
      img.onerror = () => resolve([2, 132, 199]);
    });
  }

  /**
   * Extract dominant hue from image and apply as dynamic CSS variables
   */
  async updateArtworkColors(imgUrl) {
    if (!imgUrl || imgUrl === this.currentArtworkUrl) return;
    this.currentArtworkUrl = imgUrl;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imgUrl;

    img.onload = () => {
      try {
        this.offscreenCtx.clearRect(0, 0, 40, 40);
        this.offscreenCtx.drawImage(img, 0, 0, 40, 40);
        const data = this.offscreenCtx.getImageData(0, 0, 40, 40).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          // Avoid near-black or blown-out white
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum > 25 && lum < 235) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);

          const glowColor = `rgba(${r}, ${g}, ${b}, 0.32)`;
          const accentColor = `rgb(${r}, ${g}, ${b})`;

          document.documentElement.style.setProperty('--dynamic-glow-color', glowColor);
          document.documentElement.style.setProperty('--dynamic-accent', accentColor);
        }
      } catch (err) {
        console.warn('[DynamicBG] Color extraction note:', err.message);
      }
    };
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.ctx || this.ripples.length === 0) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.opacity -= 0.012;

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.7})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Soft secondary inner wave
      if (r.radius > 15) {
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius - 12, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 229, 255, ${r.opacity * 0.35})`;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }
    }
  }
}

window.dynamicBgEngine = new DynamicBackgroundEngine();
