/** @file bo-sav.js Tickets SAV admin  affichage, traitement accepter/refuser / clôture dossier */

// ── SAV admin ─────────────────────────────────────────────

async function loadSAVAdmin() {
  const el     = document.getElementById('sav-admin-list');
  const filter = document.getElementById('sav-filter')?.value || '';
  if (!el) return;
  el.innerHTML = '<p class="text-muted text-sm">Chargement…</p>';
  try {
    const data    = await api.getSAVTickets();
    const all     = data.results || [];
    const pending = all.filter(t => t.statut === 'en_attente').length;
    const badge   = document.getElementById('sav-tab-badge');
    const count   = document.getElementById('sav-pending-count');
    if (badge) { badge.textContent = pending; badge.style.display = pending ? 'inline' : 'none'; }
    if (count) count.textContent = pending ? `(${pending} en attente)` : `(${all.length} total)`;

    const tickets = filter ? all.filter(t => t.statut === filter) : all;
    if (!tickets.length) {
      el.innerHTML = '<div class="empty-state"><span class="empty-icon" style="opacity:.3">—</span><h3>Aucun ticket</h3></div>';
      return;
    }
    el.innerHTML = tickets.map(t => {
      const cl  = t.client_info;
      const nom = cl ? cl.last_name + ' ' + cl.first_name : `Client #${t.client}`;
      const cfg = {
        en_attente: { bg:'#fef9c3', color:'#854d0e', border:'#fde68a', label:'En attente' },
        accepte:    { bg:'#dcfce7', color:'#166534', border:'#86efac', label:'Suivi ouvert' },
        refuse:     { bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0', label:'Non retenu' },
      }[t.statut] || { bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0', label:t.statut };
      const actionHTML = t.statut === 'en_attente' ? `
        <div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:1rem">
          <div class="form-group" style="margin-bottom:.5rem">
            <label class="form-label" style="font-size:.8rem">Réponse (obligatoire si ouverture de suivi)</label>
            <textarea class="form-input" id="sav-rep-${t.id}" rows="2" placeholder="Message au client…" style="resize:vertical;font-size:.83rem"></textarea>
          </div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end">
            <button class="btn btn-sm" style="background:#f1f5f9;color:#64748b;border:1px solid var(--border)" onclick="traiterSAV(${t.id},'refuse')">Non retenu</button>
            <button class="btn btn-primary btn-sm" onclick="traiterSAV(${t.id},'accepte')">Ouvrir le suivi</button>
          </div>
        </div>` : (t.reponse ? `<div style="margin-top:.75rem;border-left:3px solid #10b981;padding:.5rem .85rem;background:#f0fdf4;border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:.83rem">${t.reponse}</div>` : '');
      return `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:.75rem;background:var(--white)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem">
          <div>
            <div style="font-weight:700;font-size:.92rem;color:var(--primary)">${t.sujet}</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:.15rem">${nom} · ${new Date(t.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
          <span style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border};border-radius:2rem;padding:.15rem .7rem;font-size:.75rem;font-weight:700;white-space:nowrap">${cfg.label}</span>
        </div>
        <div style="font-size:.85rem;color:var(--text);background:var(--bg);border-radius:var(--radius-sm);padding:.6rem .85rem;white-space:pre-wrap">${t.description}</div>
        ${actionHTML}
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function traiterSAV(id, statut) {
  const reponse = document.getElementById(`sav-rep-${id}`)?.value.trim() || '';
  if (statut === 'accepte' && !reponse) {
    toast('Veuillez saisir une réponse pour le client avant d\'ouvrir le suivi.', 'warn');
    return;
  }
  try {
    const ticket = await api.traiterSAVTicket(id, statut, reponse);
    toast(statut === 'accepte' ? 'Suivi ouvert — conversation SAV disponible dans le tchat.' : 'Ticket classé.', 'success');
    // Si accepté, ajouter au tchat SAV et ouvrir la conversation
    if (statut === 'accepte' && ticket) {
      _tchatSAV.unshift(ticket);
      renderTchatList();
      // Basculer sur l'onglet tchat et ouvrir la conv SAV
      switchTab('tchat', document.querySelector('[onclick*="tchat"]'));
      openSAVConversation(id);
    }
    loadSAVAdmin();
  } catch(e) { toast(e.message, 'danger'); }
}

async function cloturerDossier(dossierId) {
  if (!confirm('Clôturer ce dossier ? La conversation sera archivée.')) return;
  try {
    await api.archiveDossier(dossierId);
    toast('Dossier clôturé — conversation archivée.', 'success');
    // Déplacer de actifs → historique
    const idx = _tchatDossiers.findIndex(d => d.id === dossierId);
    if (idx !== -1) {
      const [dossier] = _tchatDossiers.splice(idx, 1);
      dossier.archived = true;
      _tchatClotures.unshift(dossier);
    }
    document.getElementById('tchat-header-actions').innerHTML = '';
    renderTchatList();
    updateTchatBadge();
    // Ouvrir la conversation en mode clôturé pour montrer le message de fin
    openTchatConversation(dossierId);
  } catch(e) { toast(e.message, 'danger'); }
}
