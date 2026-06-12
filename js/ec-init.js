/** @file ec-init.js  Auth, nav, variables globales espace client et chargement initial */

const session = requireAuth();
if (!session) throw new Error('redirect');
renderNav('espace');

let allDossiers  = [];

let allContrats  = [];

let currentContratId = null;

async function init() {
  document.getElementById('welcome-msg').textContent = `Bonjour ${session.first_name}, bienvenue dans votre espace.`;
  document.getElementById('p-nom').value    = session.last_name  || '';
  document.getElementById('p-prenom').value = session.first_name || '';
  document.getElementById('p-email').value  = session.email      || '';
  await loadAll();
}

async function loadAll() {
  try {
    const [dData, cData] = await Promise.all([api.getMyDossiers(), api.getContrats({ mine: true })]);
    allDossiers = dData.results || [];
    allContrats = cData.results || [];
    renderStats(); renderContrats(); renderDossiers(); renderNotifications(); updateMsgBadge();
  } catch(e) { showError(document.getElementById('contrats-content'), e.message); }
}

function updateMsgBadge() {
  const total = allDossiers.reduce((s,d) => s + (d.messages_non_lus||0), 0);
  const badge = document.getElementById('msg-badge');
  if (badge) { badge.textContent = total; badge.style.display = total ? 'inline' : 'none'; }
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if(btn) btn.classList.add('active');
  if(name === 'messages') renderClientMsgList();
  if(name === 'sav')      loadSAV();
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

init();
