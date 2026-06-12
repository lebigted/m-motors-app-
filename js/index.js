/** @file index.js — Page d'accueil : catalogue filtrable, animation hero canvas, bandeau cookies. */

let currentMode = 'achat';
renderNav('home');

// ── Bandeau cookies ─────────────────────────────────────────────────────────

if (!localStorage.getItem('mm_cookies')) document.getElementById('cookie-banner').style.display = 'block';

function acceptCookies() { localStorage.setItem('mm_cookies','accepted'); document.getElementById('cookie-banner').style.display='none'; }

function refuseCookies() { localStorage.setItem('mm_cookies','refused');  document.getElementById('cookie-banner').style.display='none'; }

// ── Animations au défilement ─────────────────────────────────────────────────

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: .12 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Catalogue / recherche ─────────────────────────────────────────────────────

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.search-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  document.getElementById('price-label').textContent  = mode === 'location' ? 'Budget mensuel max (€)' : 'Budget max (€)';
  document.getElementById('f-price').placeholder = mode === 'location' ? '400' : '15 000';
  doSearch();
}

async function doSearch() {
  const el = document.getElementById('results');
  const empty = document.getElementById('empty-results');
  const count = document.getElementById('result-count');
  showSpinner(el, 'Recherche en cours…');
  empty.classList.add('hidden');
  count.textContent = '';
  try {
    const params = { type: currentMode };
    const brand = document.getElementById('f-brand').value;
    const fuel  = document.getElementById('f-fuel').value;
    const price = document.getElementById('f-price').value;
    if (brand) params.brand = brand;
    if (fuel)  params.fuel  = fuel;
    if (price) params[currentMode === 'location' ? 'max_monthly' : 'max_price'] = price;
    const data = await api.getVehicles(params);
    const list = data.results || [];
    if (!list.length) { el.innerHTML = ''; empty.classList.remove('hidden'); }
    else {
      count.textContent = `${list.length} véhicule${list.length>1?'s':''} disponible${list.length>1?'s':''}`;
      el.innerHTML = list.map(v => vehicleCard(v)).join('');
      el.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }
  } catch(e) {
    showError(el, `Impossible de charger les véhicules. Vérifiez que le serveur Django tourne sur le port 8000.`);
  }
}

doSearch();

// ── Animation canvas — perspective route ─────────────────────────────────────

(function() {
  const canvas = document.getElementById('hero-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, raf;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function drawRoad() {
    const vanX = W * .5;
    const vanY = H * .38;

    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth   = 1;
    [-3,-1,1,3].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(vanX + offset * 4, vanY);
      ctx.lineTo(vanX + offset * 320, H + 20);
      ctx.stroke();
    });

    const dash = (Date.now() / 18) % 60;
    ctx.setLineDash([28, 32]);
    ctx.lineDashOffset = -dash;
    ctx.strokeStyle = 'rgba(59,130,246,.25)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(vanX, vanY + 5);
    ctx.lineTo(vanX, H + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const particles = Array.from({ length: 55 }, () => mkParticle());

  function mkParticle() {
    const side = Math.random() > .5 ? 1 : -1;
    const progress = Math.random();
    return {
      side,
      progress,
      speed:    .0005 + Math.random() * .0012,
      color:    Math.random() > .35 ? '#3b82f6' : (Math.random() > .5 ? '#93c5fd' : '#f59e0b'),
      size:     .5 + Math.random() * 2,
      trail:    30 + Math.random() * 60,
      isPhare:  Math.random() > .72,
    };
  }

  function particlePos(p) {
    const t   = p.progress;
    const eased = t * t;
    const vanX = W * .5;
    const vanY = H * .38;
    const spreadX = p.side * (12 + eased * 280);
    const x = vanX + spreadX;
    const y = vanY + eased * (H - vanY + 40);
    return { x, y, scale: .15 + eased * 1.2 };
  }

  function drawParticles() {
    particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) { Object.assign(p, mkParticle(), { progress: 0 }); return; }

      const { x, y, scale } = particlePos(p);
      const r = p.size * scale;

      if (p.isPhare) {
        [-1, 1].forEach(s => {
          const px = x + s * 6 * scale;
          const grad = ctx.createRadialGradient(px, y, 0, px, y, r * 6);
          grad.addColorStop(0,   'rgba(255,255,240,.9)');
          grad.addColorStop(.4,  p.color + '55');
          grad.addColorStop(1,   'transparent');
          ctx.beginPath();
          ctx.arc(px, y, r * 6, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px, y, r * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#fffef0';
          ctx.fill();
        });
      } else {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        grad.addColorStop(0,  p.color + 'cc');
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });
  }

  function drawGround() {
    const grad = ctx.createLinearGradient(0, H * .65, 0, H);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(59,130,246,.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * .65, W, H * .35);
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawGround();
    drawRoad();
    drawParticles();
    raf = requestAnimationFrame(loop);
  }

  loop();
})();
