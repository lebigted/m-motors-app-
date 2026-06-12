/** @file bo-tchat.js — Messagerie admin : conversations dossier et tickets SAV. */

// ── Tchat admin ───────────────────────────────────────────

let _tchatDossiers    = [];

let _tchatClotures    = [];

let _tchatSAV         = [];

let _tchatSAVClotures = [];

let _tchatContrats    = [];

let _tchatCurrentId   = null;

let _tchatCurrentType = 'dossier';

async function loadTchat() {
  try {
    const [data, cData, savData] = await Promise.all([
      api.getDossiers({ archived: 'all' }),
      api.getContrats(),
      api.getSAVTickets(),
    ]);
    _tchatContrats = cData.results || [];
    const sortFn = (a, b) => {
      const aT = a.dernier_message?.created_at || a.updated_at;
      const bT = b.dernier_message?.created_at || b.updated_at;
      return new Date(bT) - new Date(aT);
    };
    const all = data.results || [];
    _tchatDossiers = all.filter(d => !d.archived).sort(sortFn);
    _tchatClotures = all.filter(d =>  d.archived).sort(sortFn);
    const savSort = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);
    const allSAV  = savData.results || [];
    _tchatSAV         = allSAV.filter(t => t.statut === 'accepte').sort(savSort);
    _tchatSAVClotures = allSAV.filter(t => t.statut === 'cloture').sort(savSort);
    renderTchatList();
    updateTchatBadge();
  } catch(e) { console.error(e); }
}

function _tchatRowHTML(d, isClosed = false) {
  const c    = d.client_info;
  const nom  = c ? c.last_name + ' ' + c.first_name : `#${d.client}`;
  const ref  = `MM-${String(d.id).padStart(6,'0')}`;
  const dm   = d.dernier_message;
  const preview  = dm ? dm.contenu : 'Aucun message';
  const unread   = d.messages_non_lus || 0;
  const isActive = d.id === _tchatCurrentId;
  const baseBg   = isClosed ? '#f8fafc' : 'transparent';
  const activeBg = 'var(--accent-light,#eff6ff)';
  return `<div onclick="openTchatConversation(${d.id})"
    style="padding:.65rem 1rem;cursor:pointer;border-bottom:1px solid var(--border);
           background:${isActive ? activeBg : baseBg};transition:background .15s;
           ${isClosed ? 'opacity:.72' : ''}"
    onmouseover="this.style.background='${activeBg}'"
    onmouseout="this.style.background='${isActive ? activeBg : baseBg}'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
      <div style="font-weight:${unread ? '700' : '500'};font-size:.85rem;color:var(--text)">${nom}</div>
      ${isClosed ? '<span style="font-size:.65rem;color:#64748b;background:#e2e8f0;border-radius:2rem;padding:.05rem .45rem;font-weight:600">clôturé</span>' : (unread ? `<span style="background:var(--danger);color:#fff;border-radius:2rem;font-size:.68rem;padding:.1rem .4rem;font-weight:700">${unread}</span>` : '')}
    </div>
    <div style="font-size:.71rem;color:var(--text-muted);margin:.1rem 0">${ref}</div>
    <div style="font-size:.77rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px">${preview}</div>
  </div>`;
}

function _tchatSAVRowHTML(t, isClosed = false) {
  const c        = t.client_info;
  const nom      = c ? c.last_name + ' ' + c.first_name : `Client #${t.client}`;
  const isActive = _tchatCurrentType === 'sav' && t.id === _tchatCurrentId;
  const activeBg = isClosed ? '#f8fafc' : '#ecfeff';
  const baseBg   = isClosed ? '#f8fafc' : 'transparent';
  const badge    = isClosed
    ? `<span style="font-size:.65rem;color:#64748b;background:#e2e8f0;border-radius:2rem;padding:.05rem .45rem;font-weight:600;white-space:nowrap">clôturé</span>`
    : `<span style="font-size:.65rem;color:#0891b2;background:#cffafe;border-radius:2rem;padding:.05rem .45rem;font-weight:600;white-space:nowrap">SAV</span>`;
  return `<div onclick="openSAVConversation(${t.id})"
    style="padding:.65rem 1rem;cursor:pointer;border-bottom:1px solid var(--border);
           background:${isActive ? activeBg : baseBg};transition:background .15s;
           ${isClosed ? 'opacity:.72' : ''}"
    onmouseover="this.style.background='${activeBg}'"
    onmouseout="this.style.background='${isActive ? activeBg : baseBg}'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
      <div style="font-weight:500;font-size:.85rem;color:var(--text)">${nom}</div>
      ${badge}
    </div>
    <div style="font-size:.77rem;color:#0e7490;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;font-weight:500">${t.sujet}</div>
  </div>`;
}

function renderTchatList() {
  const search = (document.getElementById('tchat-search')?.value || '').toLowerCase();
  const el = document.getElementById('tchat-list');
  const filterFn = d => {
    if (!search) return true;
    const c = d.client_info;
    return c && (c.last_name + ' ' + c.first_name + ' ' + c.email).toLowerCase().includes(search);
  };
  const actives  = _tchatDossiers.filter(filterFn);
  const clotures = _tchatClotures.filter(filterFn);

  const savFilterFn = t => {
    if (!search) return true;
    const c = t.client_info;
    return (c && (c.last_name + ' ' + c.first_name + ' ' + c.email).toLowerCase().includes(search))
           || (t.sujet || '').toLowerCase().includes(search);
  };
  const savItems    = _tchatSAV.filter(savFilterFn);
  const savClotures = _tchatSAVClotures.filter(savFilterFn);

  let html = '';
  if (!actives.length && !clotures.length && !savItems.length && !savClotures.length) {
    html = '<p class="text-muted text-sm" style="padding:.75rem 1rem">Aucune conversation.</p>';
  } else {
    if (actives.length) html += actives.map(d => _tchatRowHTML(d, false)).join('');
    if (savItems.length) {
      html += `<div style="padding:.45rem 1rem;font-size:.7rem;font-weight:700;color:#0891b2;background:#ecfeff;letter-spacing:.06em;text-transform:uppercase;border-top:1px solid var(--border)">SAV</div>`;
      html += savItems.map(t => _tchatSAVRowHTML(t, false)).join('');
    }
    if (clotures.length || savClotures.length) {
      html += `<div style="padding:.45rem 1rem;font-size:.7rem;font-weight:700;color:var(--text-muted);background:var(--border);letter-spacing:.06em;text-transform:uppercase">Historique</div>`;
      html += clotures.map(d => _tchatRowHTML(d, true)).join('');
      html += savClotures.map(t => _tchatSAVRowHTML(t, true)).join('');
    }
  }
  el.innerHTML = html;
}

function updateTchatBadge() {
  const total = _tchatDossiers.reduce((s, d) => s + (d.messages_non_lus || 0), 0);
  const b1 = document.getElementById('tchat-tab-badge');
  const b2 = document.getElementById('tchat-unread-total');
  [b1, b2].forEach(b => { if (!b) return; b.textContent = total; b.style.display = total ? 'inline' : 'none'; });
}

async function openTchatConversation(dossierId) {
  _tchatCurrentId   = dossierId;
  _tchatCurrentType = 'dossier';
  renderTchatList();
  const d        = _tchatDossiers.find(x => x.id === dossierId) || _tchatClotures.find(x => x.id === dossierId);
  const isClosed = _tchatClotures.some(x => x.id === dossierId);
  const c        = d?.client_info;
  const nom      = c ? c.last_name + ' ' + c.first_name : `Dossier #${dossierId}`;
  const ref      = `MM-${String(dossierId).padStart(6,'0')}`;
  document.getElementById('tchat-header-label').innerHTML =
    `<strong>${nom}</strong> <span style="font-weight:400;color:var(--text-muted);font-size:.8rem">· ${ref}</span>`
    + (isClosed ? ' <span style="font-size:.72rem;background:#e2e8f0;color:#64748b;border-radius:2rem;padding:.1rem .55rem;font-weight:600;vertical-align:middle">Clôturé</span>' : '');
  document.getElementById('tchat-thread').innerHTML =
    '<p class="text-muted text-sm" style="text-align:center;margin:auto">Chargement…</p>';
  const input   = document.getElementById('tchat-input');
  const sendBtn = document.getElementById('tchat-send-btn');
  if (isClosed) {
    input.disabled   = true;
    sendBtn.disabled = true;
    input.placeholder = 'Conversation clôturée';
  } else {
    input.disabled   = false;
    sendBtn.disabled = false;
    input.placeholder = `Répondre à ${nom}…`;
  }
  await renderTchatMessages(dossierId, isClosed);
  // Rafraîchir le compteur non lus seulement si actif
  if (!isClosed) {
    const idx = _tchatDossiers.findIndex(x => x.id === dossierId);
    if (idx !== -1) { _tchatDossiers[idx].messages_non_lus = 0; updateTchatBadge(); renderTchatList(); }
  }
  // Bouton clôture si contrat actif et dossier non clôturé
  const contrat    = _tchatContrats.find(ct => ct.dossier === dossierId);
  const actionsEl  = document.getElementById('tchat-header-actions');
  if (actionsEl) {
    actionsEl.innerHTML = (!isClosed && contrat?.statut === 'actif')
      ? `<button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:.78rem;padding:.3rem .75rem;border-radius:var(--radius-sm)" onclick="cloturerDossier(${dossierId})">Clôturer le dossier</button>`
      : '';
  }
}

async function renderTchatMessages(dossierId, isClosed = false) {
  const thread = document.getElementById('tchat-thread');
  try {
    const msgs = await api.getMessages(dossierId);
    const closedBanner = isClosed
      ? `<div style="display:flex;align-items:center;gap:.6rem;margin:.5rem 0;color:var(--text-muted);font-size:.78rem">
           <div style="flex:1;height:1px;background:var(--border)"></div>
           <span style="white-space:nowrap;font-weight:600;color:#64748b">Conversation terminée</span>
           <div style="flex:1;height:1px;background:var(--border)"></div>
         </div>`
      : '';
    if (!msgs || !msgs.length) {
      thread.innerHTML = '<div style="margin:auto;text-align:center;color:var(--text-muted);font-size:.85rem">Aucun message pour l\'instant.</div>' + closedBanner;
      return;
    }
    thread.innerHTML = msgs.map(m => {
      const isAdmin = m.auteur_role === 'admin';
      const align   = isAdmin ? 'flex-end' : 'flex-start';
      const bg      = isAdmin ? 'var(--primary)' : '#f1f5f9';
      const color   = isAdmin ? '#fff' : 'var(--text)';
      const label   = isAdmin ? 'Vous' : m.auteur_nom;
      const date    = new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
      return `<div style="display:flex;flex-direction:column;align-items:${align}">
        <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:.15rem">${label} · ${date}</div>
        <div style="background:${bg};color:${color};padding:.5rem .85rem;border-radius:1rem;font-size:.87rem;max-width:70%;word-break:break-word;line-height:1.4">${m.contenu}</div>
      </div>`;
    }).join('') + closedBanner;
    thread.scrollTop = thread.scrollHeight;
  } catch(e) {
    thread.innerHTML = '<div style="margin:auto;text-align:center;color:var(--danger);font-size:.85rem">Erreur chargement.</div>';
  }
}

async function openSAVConversation(ticketId) {
  _tchatCurrentId   = ticketId;
  _tchatCurrentType = 'sav';
  renderTchatList();
  const t        = _tchatSAV.find(x => x.id === ticketId) || _tchatSAVClotures.find(x => x.id === ticketId);
  const isClosed = t?.statut === 'cloture';
  const c        = t?.client_info;
  const nom      = c ? c.last_name + ' ' + c.first_name : `Client #${t?.client}`;
  document.getElementById('tchat-header-label').innerHTML =
    `<strong>${nom}</strong> <span style="font-weight:400;color:var(--text-muted);font-size:.8rem">· SAV</span>`
    + ` <span style="font-size:.72rem;background:#cffafe;color:#0e7490;border-radius:2rem;padding:.1rem .55rem;font-weight:600;vertical-align:middle">${t?.sujet || ''}</span>`
    + (isClosed ? ' <span style="font-size:.72rem;background:#e2e8f0;color:#64748b;border-radius:2rem;padding:.1rem .55rem;font-weight:600;vertical-align:middle">Clôturé</span>' : '');
  const actionsEl = document.getElementById('tchat-header-actions');
  actionsEl.innerHTML = (!isClosed)
    ? `<button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:.78rem;padding:.3rem .75rem;border-radius:var(--radius-sm)" onclick="cloturerSAV(${ticketId})">Clôturer le SAV</button>`
    : '';
  document.getElementById('tchat-thread').innerHTML =
    '<p class="text-muted text-sm" style="text-align:center;margin:auto">Chargement…</p>';
  const input   = document.getElementById('tchat-input');
  const sendBtn = document.getElementById('tchat-send-btn');
  if (isClosed) {
    input.disabled    = true;
    sendBtn.disabled  = true;
    input.placeholder = 'SAV clôturé';
  } else {
    input.disabled    = false;
    sendBtn.disabled  = false;
    input.placeholder = `Répondre à ${nom}…`;
  }
  await renderSAVMessages(ticketId, isClosed);
}

async function cloturerSAV(ticketId) {
  if (!confirm('Clôturer ce suivi SAV ? La messagerie sera désactivée.')) return;
  try {
    await api.cloturerSAVTicket(ticketId);
    toast('Suivi SAV clôturé — déplacé dans l\'historique.', 'success');
    const idx = _tchatSAV.findIndex(t => t.id === ticketId);
    if (idx !== -1) {
      const [ticket] = _tchatSAV.splice(idx, 1);
      ticket.statut = 'cloture';
      _tchatSAVClotures.unshift(ticket);
    }
    document.getElementById('tchat-header-actions').innerHTML = '';
    renderTchatList();
    openSAVConversation(ticketId);
  } catch(e) { toast(e.message, 'danger'); }
}

async function renderSAVMessages(ticketId, isClosed = false) {
  const thread = document.getElementById('tchat-thread');
  const closedBanner = isClosed
    ? `<div style="display:flex;align-items:center;gap:.6rem;margin:.5rem 0;color:var(--text-muted);font-size:.78rem">
         <div style="flex:1;height:1px;background:var(--border)"></div>
         <span style="white-space:nowrap;font-weight:600;color:#64748b">Suivi SAV terminé</span>
         <div style="flex:1;height:1px;background:var(--border)"></div>
       </div>`
    : '';
  try {
    const msgs = await api.getSAVMessages(ticketId);
    if (!msgs || !msgs.length) {
      thread.innerHTML = '<div style="margin:auto;text-align:center;color:var(--text-muted);font-size:.85rem">Aucun message.</div>' + closedBanner;
      return;
    }
    thread.innerHTML = msgs.map(m => {
      const isAdmin = m.auteur_role === 'admin';
      const align   = isAdmin ? 'flex-end' : 'flex-start';
      const bg      = isAdmin ? '#0891b2' : '#f1f5f9';
      const color   = isAdmin ? '#fff' : 'var(--text)';
      const label   = isAdmin ? 'Vous' : m.auteur_nom;
      const date    = new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
      return `<div style="display:flex;flex-direction:column;align-items:${align}">
        <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:.15rem">${label} · ${date}</div>
        <div style="background:${bg};color:${color};padding:.5rem .85rem;border-radius:1rem;font-size:.87rem;max-width:70%;word-break:break-word;line-height:1.4">${m.contenu}</div>
      </div>`;
    }).join('') + closedBanner;
    thread.scrollTop = thread.scrollHeight;
  } catch(e) {
    thread.innerHTML = '<div style="margin:auto;text-align:center;color:var(--danger);font-size:.85rem">Erreur chargement.</div>';
  }
}

async function sendTchatMsg() {
  if (!_tchatCurrentId) return;
  const input   = document.getElementById('tchat-input');
  const contenu = input.value.trim();
  if (!contenu) return;
  input.disabled = true;
  try {
    if (_tchatCurrentType === 'sav') {
      await api.sendSAVMessage(_tchatCurrentId, contenu);
      input.value = '';
      await renderSAVMessages(_tchatCurrentId);
    } else {
      await api.sendMessage(_tchatCurrentId, contenu);
      input.value = '';
      const idx = _tchatDossiers.findIndex(x => x.id === _tchatCurrentId);
      if (idx !== -1) _tchatDossiers[idx].dernier_message = { contenu, auteur_role: 'admin', created_at: new Date().toISOString() };
      await renderTchatMessages(_tchatCurrentId);
      renderTchatList();
    }
  } catch(e) { toast(e.message, 'danger'); }
  finally { input.disabled = false; input.focus(); }
}
