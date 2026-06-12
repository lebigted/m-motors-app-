/** @file app.js — Nav, scroll-spy, gardes d'authentification. Chargé sur toutes les pages. */

const _page    = window.location.pathname.split('/').pop() || 'index.html';
const _onIndex = _page === 'index.html' || _page === '';

function _p(page) {
  const inPages = window.location.pathname.replace(/\\/g, '/').includes('/pages/');
  if (!page || page === 'index.html') return inPages ? '../index.html' : 'index.html';
  return inPages ? page : 'pages/' + page;
}

function navScrollTo(sectionId) {
  if (_onIndex) {
    const el = sectionId ? document.getElementById(sectionId) : document.body;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.location.href = _p('index.html') + (sectionId ? '#' + sectionId : '');
  }
}

function renderNav(activePage = '') {
  const user = api.getUser();
  const nav  = document.getElementById('main-nav');
  if (!nav) return;

  // Auto-détection de la page active depuis le nom du fichier
  if (!activePage) {
    const map = { 'index.html':'home','login.html':'login','espace-client.html':'espace',
                  'backoffice.html':'backoffice','dossier.html':'dossier','vehicle.html':'vehicule',
                  'mentions-legales.html':'legal','politique-confidentialite.html':'legal',
                  'cookies.html':'legal','cgv.html':'legal' };
    activePage = map[_page] || '';
  }

  // Génère un lien de navigation (standard ou ancre avec scroll smooth)
  const navItem = (href, label, active, anchor) => {
    const isAnchor = anchor || href.includes('#');
    const sid      = isAnchor ? href.split('#')[1] : '';
    const click    = isAnchor ? `onclick="event.preventDefault();navScrollTo('${sid}')"` : '';
    return `<a href="${href}" class="nav-link ${active?'active':''}" ${click}>${label}</a>`;
  };

  // Bloc utilisateur : connecté → profil + liens ; déconnecté → bouton login
  let userHtml = '';
  if (user) {
    userHtml = `
      <span class="nav-user" style="border-left:1px solid rgba(255,255,255,.12);padding-left:.85rem;margin-left:.25rem">
        <strong>${user.first_name}</strong>
      </span>
      ${api.isAdmin() ? navItem(_p('backoffice.html'),'Administration',activePage==='backoffice') : ''}
      ${navItem(_p('espace-client.html'),'Mon espace',activePage==='espace')}
      <a href="#" class="nav-btn-outline nav-link" onclick="event.preventDefault();api.logout()">Déconnexion</a>`;
  } else {
    userHtml = `<a href="${_p('login.html')}" class="nav-btn nav-link">Se connecter</a>`;
  }

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="${_p('index.html')}" class="nav-brand">M<span>-</span>Motors</a>
      <nav class="nav-links">
        ${navItem(_p('index.html'),                'Accueil',      activePage==='home')}
        ${navItem(_p('index.html') + '#vehicules', 'Véhicules',    false, true)}
        ${navItem(_p('index.html') + '#services',  'Location LLD', false, true)}
        ${navItem(_p('index.html') + '#apropos',   'À propos',     false, true)}
        ${userHtml}
      </nav>
    </div>`;

  // Scroll-spy sur la page d'accueil uniquement
  if (_onIndex) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const labels = { vehicules:'Véhicules', services:'Location LLD' };
        const lbl = labels[e.target.id];
        nav.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.textContent.trim() === lbl));
      });
    }, { threshold:.25, rootMargin:'-64px 0px 0px 0px' });
    ['vehicules','services'].forEach(id => { const el=document.getElementById(id); if(el) spy.observe(el); });
  }
}

// ── Gardes d'authentification ─────────────────────────────────────────────────

function requireAuth() {
  if (!api.getToken() || !api.getUser()) {
    sessionStorage.setItem('redirect_after_login', window.location.href);
    window.location.href = _p('login.html');
    return null;
  }
  return api.getUser();
}

function requireAdmin() {
  const user = requireAuth();
  if (user && !api.isAdmin()) {
    alert('Accès réservé aux administrateurs.');
    window.location.href = _p('index.html');
    return null;
  }
  return user;
}

function redirectLogin() {
  sessionStorage.setItem('redirect_after_login', window.location.href);
  window.location.href = _p('login.html');
  return false;
}
