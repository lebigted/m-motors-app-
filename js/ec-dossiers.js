/** @file ec-dossiers.js  Onglets Dossiers et Notifications de l'espace client. */

function renderDossiers() {
  const el = document.getElementById('dossiers-list');
  if (!allDossiers.length) { el.innerHTML=`<div class="empty-state"><span class="empty-icon">—</span><h3>Aucun dossier</h3><a href="../index.html" class="btn btn-primary mt-2">Parcourir les véhicules</a></div>`; return; }
  el.innerHTML = allDossiers.map(d=>{
    const v = d.vehicle_info;
    return `<div class="card" style="margin-bottom:1rem"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem">
        <div><div style="font-weight:700;color:var(--primary)">${v?v.brand+' '+v.model+' '+v.year:'—'}</div>
        <div class="text-muted text-sm">${d.type_display} · ${fmtDate(d.created_at)}</div></div>
        ${fmtStatus(d.status)}
      </div>
      ${d.motif?`<div class="alert alert-${d.status==='refuse'?'danger':'info'} mt-2"><strong>Motif :</strong> ${d.motif}</div>`:''}
    </div><div class="card-footer">
      <button class="btn btn-secondary btn-sm" onclick="openDossierDetail(${d.id})">Voir les détails</button>
      ${d.status==='valide'?`<button class="btn btn-primary btn-sm" onclick="switchTab('contrats',document.querySelectorAll('.tab-btn')[0])">Voir le contrat</button>`:''}
    </div></div>`;
  }).join('');
}

function renderNotifications() {
  const el     = document.getElementById('notifs-list');
  const notifs = [];
  allDossiers.forEach(d => {
    if (d.status === 'refuse')
      notifs.push({ t:'Dossier refusé', b: d.motif||'Contactez notre service commercial.', col:'var(--danger)', bg:'#fee2e2', read:true });
    if (d.status === 'valide' && !allContrats.some(c => c.dossier === d.id))
      notifs.push({ t:'Dossier validé', b:`Votre contrat pour ${d.vehicle_info?.brand||'—'} est en préparation.`, col:'var(--success)', bg:'var(--success-light)', read:false });
  });
  allContrats.forEach(c => {
    const v = c.vehicle_info;
    const nom = v ? v.brand+' '+v.model : `contrat ${c.dossier_ref}`;
    if (c.statut === 'a_signer')
      notifs.push({ t:'Action requise — Signature', b:`Signez votre contrat pour ${nom}.`, col:'var(--warn)', bg:'#fef3c7', read:false });
    if (c.statut === 'signe')
      notifs.push({ t:'Signature reçue', b:'M-Motors vérifie votre signature.', col:'var(--accent)', bg:'var(--accent-light)', read:false });
    if (c.statut === 'a_payer')
      notifs.push({ t:'Signature validée — Paiement attendu', b: c.commentaire||`Effectuez le règlement de ${fmtPrice(c.montant)} pour ${nom}.`, col:'var(--warn)', bg:'#fef3c7', read:false });
    if (c.statut === 'paye')
      notifs.push({ t:'Paiement confirmé', b:'Nous préparons les dates de remise.', col:'var(--success)', bg:'var(--success-light)', read:false });
    if (c.statut === 'rdv_propose')
      notifs.push({ t:'Action requise — Choisissez votre RDV', b: c.commentaire||`${c.rdv_dates_proposees?.length||0} date(s) proposée(s) pour ${nom}.`, col:'var(--accent)', bg:'var(--accent-light)', read:false });
    if (c.statut === 'rdv_confirme')
      notifs.push({ t:'Action requise — Signer la réception', b:`RDV le ${fmtDate(c.rdv_date_confirmee)}${c.rdv_lieu ? ' · ' + c.rdv_lieu : ''} — Signez la réception du véhicule.`, col:'var(--warn)', bg:'#fef3c7', read:false });
    if (c.statut === 'reception_signee')
      notifs.push({ t:'Réception signée — Finalisation en cours', b:'M-Motors confirme la remise des clés de votre côté.', col:'var(--accent)', bg:'var(--accent-light)', read:false });
    if (c.statut === 'actif' && c.km_actuel && c.km_actuel > (c.km_initial||0)+10000)
      notifs.push({ t:'Entretien recommandé', b:`${(c.km_actuel-c.km_initial).toLocaleString('fr-FR')} km — pensez à planifier votre entretien.`, col:'var(--warn)', bg:'#fef3c7', read:true });
  });
  const unread = notifs.filter(n => !n.read).length;
  const badge  = document.getElementById('notif-badge');
  badge.style.display = unread ? 'inline' : 'none';
  badge.textContent   = unread;
  el.innerHTML = notifs.length
    ? notifs.map(n => `<div class="notif-item" style="background:${n.read?'var(--bg)':n.bg}">
        <div class="notif-dot" style="background:${n.col}"></div>
        <div><div style="font-weight:600;font-size:.9rem">${n.t}</div><div style="font-size:.82rem;color:var(--text-muted)">${n.b}</div></div>
      </div>`).join('')
    : '<p class="text-muted text-sm">Aucune notification.</p>';
}

async function openDossierDetail(id) {
  document.getElementById('modal-dossier-content').innerHTML='<p class="text-muted">Chargement…</p>';
  document.getElementById('modal-dossier').classList.add('open');
  try {
    const d=await api.getDossier(id), v=d.vehicle_info;
    document.getElementById('modal-dossier-content').innerHTML=`
      <table class="data-table" style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">
        <tr><td style="font-weight:600;background:var(--bg);width:140px">Référence</td><td>MM-${String(d.id).padStart(6,'0')}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Véhicule</td><td>${v?v.brand+' '+v.model+' '+v.year:'—'}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Type</td><td>${d.type_display}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Statut</td><td>${fmtStatus(d.status)}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Date dépôt</td><td>${fmtDate(d.created_at)}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Documents</td><td>${(d.documents||[]).map(doc=>doc.fichier_url?`<a href="${doc.fichier_url}" target="_blank" style="color:var(--accent)">${doc.type_doc_display}</a>`:doc.type_doc_display).join(' · ')||'—'}</td></tr>
        ${d.motif?`<tr><td style="font-weight:600;background:var(--bg)">Motif</td><td>${d.motif}</td></tr>`:''}
      </table>
      <div style="margin-top:.75rem;text-align:right">
        <button class="btn btn-outline btn-sm" onclick="closeModal('modal-dossier');switchTab('messages',document.querySelector('[onclick*=messages]'));openClientTabConversation(${id})">Messagerie →</button>
      </div>`;
  } catch(e){document.getElementById('modal-dossier-content').innerHTML=`<div class="alert alert-danger">${e.message}</div>`;}
}
