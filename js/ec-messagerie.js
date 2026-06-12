/** @file ec-messagerie.js  Messagerie dossier côté client  liste des conversations et envoi */

let _clientMsgCurrentId = null;

function renderClientMsgList() {
  const el = document.getElementById('client-msg-list');
  if (!allDossiers.length) {
    el.innerHTML = `<div style="padding:.75rem 1rem;font-size:.84rem;color:var(--text-muted)">
      Vous n'avez pas encore de dossier.<br>
      <a href="../index.html" style="color:var(--accent)">Déposer un dossier →</a></div>`;
    return;
  }
  const totalUnread = allDossiers.reduce((s,d) => s + (d.messages_non_lus||0), 0);
  const badge = document.getElementById('msg-badge');
  badge.textContent = totalUnread; badge.style.display = totalUnread ? 'inline' : 'none';
  el.innerHTML = allDossiers.map(d => {
    const v       = d.vehicle_info;
    const ref     = `MM-${String(d.id).padStart(6,'0')}`;
    const nom     = v ? v.brand + ' ' + v.model : ref;
    const dm      = d.dernier_message;
    const preview = dm ? dm.contenu : 'Aucun message';
    const unread  = d.messages_non_lus || 0;
    const isActive = d.id === _clientMsgCurrentId;
    return `<div onclick="openClientTabConversation(${d.id})"
      style="padding:.75rem 1rem;cursor:pointer;border-bottom:1px solid var(--border);
             background:${isActive ? 'var(--accent-light,#eff6ff)' : 'transparent'}"
      onmouseover="this.style.background='var(--accent-light,#eff6ff)'"
      onmouseout="this.style.background='${isActive ? 'var(--accent-light,#eff6ff)' : 'transparent'}'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.4rem">
        <div style="font-weight:${unread?'700':'500'};font-size:.85rem;color:var(--text)">${nom}</div>
        ${unread ? `<span style="background:var(--danger);color:#fff;border-radius:2rem;font-size:.68rem;padding:.1rem .4rem;font-weight:700">${unread}</span>` : ''}
      </div>
      <div style="font-size:.72rem;color:var(--text-muted);margin:.1rem 0">${ref} · ${fmtStatus(d.status)}</div>
      <div style="font-size:.78rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px">${preview}</div>
    </div>`;
  }).join('');
}

async function openClientTabConversation(dossierId) {
  _clientMsgCurrentId = dossierId;
  renderClientMsgList();
  const d   = allDossiers.find(x => x.id === dossierId);
  const v   = d?.vehicle_info;
  const ref = `MM-${String(dossierId).padStart(6,'0')}`;
  const nom = v ? v.brand + ' ' + v.model : ref;
  document.getElementById('client-msg-header-label').innerHTML =
    `<strong>${nom}</strong> <span style="font-weight:400;color:var(--text-muted);font-size:.8rem">· ${ref} · ${fmtStatus(d?.status)}</span>`;
  document.getElementById('client-msg-thread').innerHTML =
    '<p class="text-muted text-sm" style="text-align:center;margin:auto">Chargement…</p>';
  const input   = document.getElementById('client-msg-input');
  const sendBtn = document.getElementById('client-msg-send-btn');
  input.disabled   = false;
  sendBtn.disabled = false;
  input.placeholder = 'Envoyer un message à M-Motors…';
  await renderClientTabMessages(dossierId);
  const idx = allDossiers.findIndex(x => x.id === dossierId);
  if (idx !== -1) { allDossiers[idx].messages_non_lus = 0; renderClientMsgList(); }
}

async function renderClientTabMessages(dossierId) {
  const thread = document.getElementById('client-msg-thread');
  try {
    const msgs = await api.getMessages(dossierId);
    if (!msgs || !msgs.length) {
      thread.innerHTML = '<div style="margin:auto;text-align:center;color:var(--text-muted);font-size:.85rem">Pas encore de message. Posez votre première question !</div>';
      return;
    }
    thread.innerHTML = msgs.map(m => {
      const isMe  = m.auteur_role === 'client';
      const align = isMe ? 'flex-end' : 'flex-start';
      const bg    = isMe ? 'var(--accent)' : 'var(--primary)';
      const label = isMe ? 'Vous' : 'M-Motors';
      const date  = new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
      return `<div style="display:flex;flex-direction:column;align-items:${align}">
        <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:.15rem">${label} · ${date}</div>
        <div style="background:${bg};color:#fff;padding:.5rem .85rem;border-radius:1rem;font-size:.87rem;max-width:72%;word-break:break-word;line-height:1.4">${m.contenu}</div>
      </div>`;
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  } catch(e) {
    thread.innerHTML = '<div style="margin:auto;text-align:center;color:var(--danger);font-size:.85rem">Erreur chargement.</div>';
  }
}

async function sendClientTabMsg() {
  if (!_clientMsgCurrentId) return;
  const input   = document.getElementById('client-msg-input');
  const contenu = input.value.trim();
  if (!contenu) return;
  input.disabled = true;
  try {
    await api.sendMessage(_clientMsgCurrentId, contenu);
    input.value = '';
    const idx = allDossiers.findIndex(x => x.id === _clientMsgCurrentId);
    if (idx !== -1) allDossiers[idx].dernier_message = { contenu, auteur_role:'client', created_at: new Date().toISOString() };
    await renderClientTabMessages(_clientMsgCurrentId);
    renderClientMsgList();
  } catch(e) { toast(e.message,'danger'); }
  finally { input.disabled = false; input.focus(); }
}
