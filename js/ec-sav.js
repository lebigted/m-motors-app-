/** @file ec-sav.js — SAV client : formulaire de demande, liste des tickets, fil de messages. */

function showSAVForm() {
  document.getElementById('sav-form-block').style.display = 'block';
  document.getElementById('sav-sujet').focus();
}

function hideSAVForm() {
  document.getElementById('sav-form-block').style.display = 'none';
  document.getElementById('sav-sujet').value = '';
  document.getElementById('sav-desc').value = '';
  document.getElementById('sav-form-alert').innerHTML = '';
}

async function submitSAV() {
  const sujet = document.getElementById('sav-sujet').value.trim();
  const desc  = document.getElementById('sav-desc').value.trim();
  const alert = document.getElementById('sav-form-alert');
  if (!sujet) { alert.innerHTML = '<div class="alert alert-warn">Le sujet est obligatoire.</div>'; return; }
  if (!desc)  { alert.innerHTML = '<div class="alert alert-warn">La description est obligatoire.</div>'; return; }
  try {
    await api.createSAVTicket(sujet, desc);
    hideSAVForm();
    toast('Demande envoyée. M-Motors vous contactera si nécessaire.', 'success');
    loadSAV();
  } catch(e) { alert.innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function loadSAV() {
  const el = document.getElementById('sav-list');
  if (!el) return;
  el.innerHTML = '<p class="text-muted text-sm">Chargement…</p>';
  try {
    const data = await api.getSAVTickets();
    const tickets = data.results || [];
    const badge = document.getElementById('sav-badge');
    const pending = tickets.filter(t => t.statut === 'en_attente').length;
    if (badge) { badge.textContent = pending; badge.style.display = pending ? 'inline' : 'none'; }
    if (!tickets.length) {
      el.innerHTML = `<div class="empty-state"><span class="empty-icon" style="opacity:.3">—</span><h3>Aucune demande</h3><p>Cliquez sur "Nouvelle demande" pour signaler un problème.</p></div>`;
      return;
    }
    el.innerHTML = tickets.map(t => {
      const cfg = {
        en_attente: { bg:'#fef9c3', color:'#854d0e', border:'#fde68a', label:'En attente' },
        accepte:    { bg:'#dcfce7', color:'#166534', border:'#86efac', label:'Suivi ouvert' },
        refuse:     { bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0', label:'Non retenu'  },
        cloture:    { bg:'#e2e8f0', color:'#475569', border:'#cbd5e1', label:'Clôturé'      },
      }[t.statut] || { bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0', label:t.statut };
      const threadSection = (t.statut === 'accepte' || t.statut === 'cloture') ? `
        <div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:.85rem">
          <div style="font-size:.78rem;font-weight:700;color:#0e7490;margin-bottom:.5rem;display:flex;align-items:center;gap:.4rem">
            <span style="display:inline-block;width:8px;height:8px;background:#0891b2;border-radius:50%"></span>
            Messagerie SAV
          </div>
          <div id="sav-thread-${t.id}" style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:.45rem;margin-bottom:.65rem;min-height:40px">
            <p style="font-size:.8rem;color:var(--text-muted);margin:0">Chargement…</p>
          </div>
          ${t.statut === 'cloture'
            ? `<div style="display:flex;align-items:center;gap:.6rem;margin-top:.5rem;color:var(--text-muted);font-size:.78rem">
                 <div style="flex:1;height:1px;background:var(--border)"></div>
                 <span style="white-space:nowrap;font-weight:600;color:#64748b">Suivi SAV terminé</span>
                 <div style="flex:1;height:1px;background:var(--border)"></div>
               </div>`
            : `<div style="display:flex;gap:.5rem">
                 <input id="sav-msg-${t.id}" class="form-input" placeholder="Votre message…"
                   style="flex:1;font-size:.83rem"
                   onkeydown="if(event.key==='Enter')sendSAVMsg(${t.id})">
                 <button class="btn btn-primary btn-sm" onclick="sendSAVMsg(${t.id})">Envoyer</button>
               </div>`}
        </div>` : '';
      const footerSection = t.statut === 'en_attente' ? `
          <div style="margin-top:.65rem;font-size:.82rem;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:var(--radius-sm);padding:.5rem .85rem">
            Votre demande a bien été reçue. M-Motors vous contactera si nécessaire.
          </div>` :
        t.statut === 'refuse' ? `
          <div style="margin-top:.65rem;font-size:.82rem;color:#64748b;font-style:italic">
            ${t.reponse || 'Votre demande n\'a pas nécessité d\'intervention supplémentaire.'}
          </div>` : '';
      return `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:.75rem;background:var(--white)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem">
          <div style="font-weight:700;font-size:.92rem;color:var(--primary)">${t.sujet}</div>
          <span style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border};border-radius:2rem;padding:.15rem .7rem;font-size:.75rem;font-weight:700;white-space:nowrap">${cfg.label}</span>
        </div>
        <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:.5rem">${new Date(t.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div>
        <div style="font-size:.85rem;color:var(--text);background:var(--bg);border-radius:var(--radius-sm);padding:.6rem .85rem;white-space:pre-wrap">${t.description}</div>
        ${footerSection}${threadSection}
      </div>`;
    }).join('');
    for (const t of tickets.filter(t => t.statut === 'accepte' || t.statut === 'cloture')) {
      loadSAVThread(t.id);
    }
  } catch(e) { el.innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function loadSAVThread(ticketId) {
  const el = document.getElementById(`sav-thread-${ticketId}`);
  if (!el) return;
  try {
    const msgs = await api.getSAVMessages(ticketId);
    if (!msgs || !msgs.length) {
      el.innerHTML = '<p style="font-size:.8rem;color:var(--text-muted);margin:auto 0">Aucun message pour l\'instant.</p>';
      return;
    }
    el.innerHTML = msgs.map(m => {
      const isClient = m.auteur_role === 'client';
      const align  = isClient ? 'flex-end' : 'flex-start';
      const bg     = isClient ? '#0891b2' : '#f1f5f9';
      const color  = isClient ? '#fff' : 'var(--text)';
      const label  = isClient ? 'Vous' : 'M-Motors';
      const date   = new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
      return `<div style="display:flex;flex-direction:column;align-items:${align}">
        <div style="font-size:.66rem;color:var(--text-muted);margin-bottom:.1rem">${label} · ${date}</div>
        <div style="background:${bg};color:${color};padding:.4rem .75rem;border-radius:1rem;font-size:.84rem;max-width:80%;word-break:break-word;line-height:1.4">${m.contenu}</div>
      </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  } catch(e) {
    if (el) el.innerHTML = `<p style="font-size:.8rem;color:var(--danger)">Erreur chargement.</p>`;
  }
}

async function sendSAVMsg(ticketId) {
  const input   = document.getElementById(`sav-msg-${ticketId}`);
  const contenu = input?.value.trim();
  if (!contenu) return;
  input.disabled = true;
  try {
    await api.sendSAVMessage(ticketId, contenu);
    input.value = '';
    await loadSAVThread(ticketId);
  } catch(e) { toast(e.message, 'danger'); }
  finally { input.disabled = false; input.focus(); }
}
