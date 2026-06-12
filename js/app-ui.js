/** @file app-ui.js — Composants UI partagés : toast, spinner, erreur. */

function toast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '[OK]', danger: '[!]', info: '[i]', warn: '[!]' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span style="font-weight:700;opacity:.85">${icons[type]||''}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

function showSpinner(el, text = 'Chargement…') {
  if (el) el.innerHTML = `<div class="empty-state"><span class="empty-icon"></span><h3>${text}</h3></div>`;
}

function showError(el, msg) {
  if (el) el.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}
