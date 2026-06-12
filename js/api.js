/** @file api.js — Couche HTTP M-Motors : objet `api` global, JWT auto-refresh, domaines fusionnés. */

const API_BASE = 'http://127.0.0.1:8000/api';

const api = {

  // ── Accès au contexte de session ──────────────────────────────────────────

  getToken()  { return localStorage.getItem('mm_token') },
  getUser()   { try { return JSON.parse(localStorage.getItem('mm_user')) } catch { return null } },
  isAdmin()   { const u = this.getUser(); return u && u.role === 'admin' },

  // ── Gestion de la session ─────────────────────────────────────────────────

  _saveAuth(data) {
    localStorage.setItem('mm_token',   data.access);
    localStorage.setItem('mm_refresh', data.refresh);
    localStorage.setItem('mm_user',    JSON.stringify(data.user));
  },

  logout() {
    ['mm_token','mm_refresh','mm_user'].forEach(k => localStorage.removeItem(k));
    const inPages = window.location.pathname.replace(/\\/g, '/').includes('/pages/');
    window.location.href = inPages ? '../index.html' : 'index.html';
  },

  // ── Utilitaires HTTP ──────────────────────────────────────────────────────

  _headers(auth = false, json = true) {
    const h = {};
    if (json)  h['Content-Type'] = 'application/json';
    if (auth && this.getToken()) h['Authorization'] = `Bearer ${this.getToken()}`;
    return h;
  },

  async _req(path, opts = {}) {
    const url = `${API_BASE}${path}`;
    let res = await fetch(url, opts);

    // Tentative de renouvellement silencieux du token expiré
    if (res.status === 401 && localStorage.getItem('mm_refresh')) {
      const r = await fetch(`${API_BASE.replace('/api','')}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: localStorage.getItem('mm_refresh') }),
      });
      if (r.ok) {
        const t = await r.json();
        localStorage.setItem('mm_token', t.access);
        if (t.refresh) localStorage.setItem('mm_refresh', t.refresh); // ROTATE_REFRESH_TOKENS
        opts.headers = { ...opts.headers, Authorization: `Bearer ${t.access}` };
        res = await fetch(url, opts);
      } else {
        this.logout();
        throw new Error('Session expirée — reconnectez-vous.');
      }
    }

    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      // Priorité au message métier Django, fallback vers le JSON brut
      const msg = data.detail || data.non_field_errors?.[0] || JSON.stringify(data);
      throw new Error(msg);
    }
    return data;
  },
};
