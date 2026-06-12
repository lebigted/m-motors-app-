/** @file bo-init.js Chargé en dernier : closeModals, switchTab, démarrage */

// ── Utilitaires ───────────────────────────────────────────

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open')); }

function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'clients')   loadClients();
  if (name === 'contrats')  loadContrats();
  if (name === 'archives')  loadArchives();
  if (name === 'sav')       loadSAVAdmin();
  if (name === 'tchat')     loadTchat();
}

// ── Démarrage ─────────────────────────────────────────────

document.querySelectorAll('.modal-overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) closeModals(); })
);

loadStats();
loadDashboard();
loadVehicles();
loadDossiers();
loadSAVAdmin();
