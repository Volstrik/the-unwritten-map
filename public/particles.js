// The Unwritten Map - Fireflies & Celestial Particles Canvas Engine

(function () {
  const canvas = document.getElementById('fireflyCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let fireflies = [];
  const COUNT = 35;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  class Firefly {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = 1.2 + Math.random() * 2.2;
      this.vx = (Math.random() - 0.5) * 0.45;
      this.vy = -(0.25 + Math.random() * 0.45);
      this.alpha = 0.1;
      this.maxAlpha = 0.45 + Math.random() * 0.5;
      this.pulseSpeed = 0.015 + Math.random() * 0.025;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.hue = Math.random() > 0.3 ? 42 : 160; // warm gold or mystic emerald
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulsePhase += this.pulseSpeed;

      // Sine wave breathing brightness
      this.alpha = ((Math.sin(this.pulsePhase) + 1) / 2) * this.maxAlpha;

      // Slight natural wind wiggle
      this.vx += (Math.random() - 0.5) * 0.03;
      this.vx = Math.max(-0.6, Math.min(0.6, this.vx));

      // Reset when drifting off-screen
      if (this.y < -20 || this.x < -20 || this.x > width + 20) {
        this.reset();
      }
    }

    draw() {
      if (this.alpha <= 0.01) return;

      // Outer glow
      const grad = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size * 4.5
      );

      if (this.hue === 42) {
        // Gold Firefly
        grad.addColorStop(0, `rgba(254, 240, 138, ${this.alpha})`);
        grad.addColorStop(0.3, `rgba(234, 179, 8, ${this.alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
      } else {
        // Emerald / Cyan Firefly
        grad.addColorStop(0, `rgba(167, 243, 208, ${this.alpha})`);
        grad.addColorStop(0.3, `rgba(16, 185, 129, ${this.alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Core point
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.alpha * 1.5)})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < COUNT; i++) {
    fireflies.push(new Firefly());
  }

  // Interactive spark ripple on tap/click
  const ripples = [];
  window.addEventListener('pointerdown', (e) => {
    // Spawn 4-6 micro sparks at touch location
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.6;
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.9,
        size: 1.5 + Math.random() * 2
      });
    }
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    fireflies.forEach(f => {
      f.update();
      f.draw();
    });

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.x += r.vx;
      r.y += r.vy;
      r.alpha -= 0.03;
      if (r.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(254, 243, 199, ${r.alpha})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
