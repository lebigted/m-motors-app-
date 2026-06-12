/** @file bo-contrats-workflow.js  Actions workflow contrat : signature, paiement, RDV, livraison */

// ── Récap contrat (shared helper) ────────────────────────

function _contractRecap(c) {
  return `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem 1rem;font-size:.875rem">
    <div style="font-weight:700;color:var(--primary)">${c.dossier_ref} — ${c.client_info?.last_name} ${c.client_info?.first_name}</div>
    <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem">${c.vehicle_info?.brand} ${c.vehicle_info?.model} ${c.vehicle_info?.year} · ${c.type_display} · ${c.type === 'location' ? fmtPrice(c.montant)+'/mois' : fmtPrice(c.montant)}</div>
  </div>`;
}

// ── Ouverture des modals d'action ─────────────────────────

function openContratAction(action, contratId) {
  currentContratId = contratId;
  const c = allContrats.find(x => x.id === contratId);
  if (!c) return;
  closeModals();

  if (action === 'valider_signature') {
    const sigBlock = c.signature_nom
      ? `<div style="margin-top:.75rem;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:.45rem;padding:.85rem 1rem">
          <div style="font-size:.72rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">Signature soumise par le client</div>
          <div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.4rem;color:#1e3a5f;letter-spacing:.04em">${c.signature_nom}</div>
          ${c.signature_date ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.35rem">Signé le ${fmtDate(c.signature_date)}</div>` : ''}
        </div>`
      : `<div style="margin-top:.75rem;color:var(--danger);font-size:.85rem">Aucune signature trouvée.</div>`;
    document.getElementById('modal-vs-recap').innerHTML = _contractRecap(c) + sigBlock;
    document.getElementById('vs-commentaire').value = '';
    document.getElementById('vs-notes').value = '';
    document.getElementById('modal-vs-alert').innerHTML = '';
    document.getElementById('modal-valider-signature').classList.add('open');

  } else if (action === 'valider_paiement') {
    const montantBlock = `<div style="margin-top:.75rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:.45rem;padding:.85rem 1rem">
      <div style="font-size:.72rem;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">Montant à confirmer</div>
      <div style="font-size:1.3rem;font-weight:900;color:var(--primary)">${fmtPrice(c.montant)}${c.type === 'location' ? '<span style="font-size:.85rem;font-weight:400">/mois</span>' : ''}</div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:.25rem">Signature validée le ${fmtDate(c.signature_validee_at)} · Le client a soumis son règlement.</div>
    </div>
    <div style="margin-top:.6rem;background:#fef9c3;border:1px solid #fde68a;border-radius:.35rem;padding:.6rem .9rem;font-size:.8rem;color:#92400e">
      ℹ️ Vérifiez le mode et la référence dans la messagerie du dossier avant de confirmer.
    </div>`;
    document.getElementById('modal-vp-recap').innerHTML = _contractRecap(c) + montantBlock;
    document.getElementById('vp-mode').value = '';
    document.getElementById('vp-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('vp-ref').value = '';
    document.getElementById('vp-commentaire').value = '';
    document.getElementById('vp-notes').value = '';
    document.getElementById('modal-vp-alert').innerHTML = '';
    document.getElementById('modal-valider-paiement').classList.add('open');

  } else if (action === 'proposer_rdv') {
    const payBlock = c.paiement_date
      ? `<div style="margin-top:.75rem;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:.45rem;padding:.85rem 1rem;font-size:.82rem">
          <span style="color:var(--success);font-weight:700">✓ Paiement reçu :</span>
          <span style="color:var(--text-muted);margin-left:.4rem">${c.paiement_mode_display || c.paiement_mode} · ${fmtDate(c.paiement_date)}${c.paiement_reference ? ' · ' + c.paiement_reference : ''}</span>
        </div>`
      : '';
    document.getElementById('modal-rdv-recap').innerHTML = _contractRecap(c) + payBlock;
    document.getElementById('rdv-lieu').value = '';
    document.getElementById('rdv-commentaire').value = '';
    document.getElementById('rdv-notes').value = '';
    document.getElementById('modal-rdv-alert').innerHTML = '';
    rdvDatesList = [''];
    renderRDVDates();
    document.getElementById('modal-proposer-rdv').classList.add('open');

  } else if (action === 'livrer') {
    const rdvBlock = c.rdv_date_confirmee
      ? `<div style="margin-top:.75rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:.45rem;padding:.85rem 1rem;font-size:.82rem">
          <span style="color:var(--accent);font-weight:700">RDV confirmé :</span>
          <span style="color:var(--text-muted);margin-left:.4rem"><strong>${fmtDate(c.rdv_date_confirmee)}</strong>${c.rdv_lieu ? ' — ' + c.rdv_lieu : ''}</span>
        </div>`
      : '';
    document.getElementById('modal-liv-recap').innerHTML = _contractRecap(c) + rdvBlock;

    const recepEl = document.getElementById('modal-liv-reception-client');
    if (c.client_reception_nom) {
      recepEl.style.display = '';
      recepEl.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:.45rem;padding:.85rem 1rem">
          <div style="font-size:.72rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">Réception signée par le client</div>
          <div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.3rem;color:#1e3a5f">${c.client_reception_nom}</div>
          ${c.client_reception_date ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.3rem">Signé le ${fmtDate(c.client_reception_date)}</div>` : ''}
        </div>`;
    } else {
      recepEl.style.display = 'none';
      recepEl.innerHTML = '';
    }

    document.getElementById('liv-date').value = c.rdv_date_confirmee || '';
    document.getElementById('liv-admin-sig').value = '';
    document.getElementById('liv-admin-preview').textContent = '';
    document.getElementById('liv-commentaire').value = '';
    document.getElementById('liv-notes').value = '';
    document.getElementById('modal-liv-alert').innerHTML = '';
    document.getElementById('modal-livrer').classList.add('open');
  }
}

// ── Handlers d'action ─────────────────────────────────────

async function doValiderSignature() {
  const btn = document.getElementById('btn-vs');
  btn.disabled = true; btn.textContent = 'Validation…';
  try {
    await api.validerSignatureContrat(currentContratId, {
      commentaire: document.getElementById('vs-commentaire').value,
      notes_admin: document.getElementById('vs-notes').value,
    });
    toast('Signature validée.', 'success');
    closeModals(); loadContrats(); loadDashboard();
  } catch(e) {
    document.getElementById('modal-vs-alert').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally { btn.disabled = false; btn.textContent = 'Valider la signature'; }
}

async function doValiderPaiement() {
  const mode = document.getElementById('vp-mode').value;
  const date = document.getElementById('vp-date').value;
  if (!mode || !date) {
    document.getElementById('modal-vp-alert').innerHTML = '<div class="alert alert-warn">Mode et date sont obligatoires.</div>';
    return;
  }
  const btn = document.getElementById('btn-vp');
  btn.disabled = true; btn.textContent = 'Confirmation…';
  try {
    await api.validerPaiementContrat(currentContratId, {
      paiement_mode:      mode,
      paiement_date:      date,
      paiement_reference: document.getElementById('vp-ref').value,
      commentaire:        document.getElementById('vp-commentaire').value,
      notes_admin:        document.getElementById('vp-notes').value,
    });
    toast('Paiement confirmé.', 'success');
    closeModals(); loadContrats(); loadDashboard();
  } catch(e) {
    document.getElementById('modal-vp-alert').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally { btn.disabled = false; btn.textContent = 'Confirmer le paiement'; }
}

// ── RDV ───────────────────────────────────────────────────

let rdvDatesList = [''];

function addRDVDate() {
  if (rdvDatesList.length >= 5) return;
  rdvDatesList.push(''); renderRDVDates();
}

function removeRDVDate(idx) { rdvDatesList.splice(idx, 1); renderRDVDates(); }

function renderRDVDates() {
  document.getElementById('rdv-dates-list').innerHTML = rdvDatesList.map((d, i) => `
    <div style="display:flex;gap:.5rem;align-items:center">
      <input class="form-input" type="date" value="${d}" onchange="rdvDatesList[${i}]=this.value" style="flex:1"/>
      ${rdvDatesList.length > 1 ? `<button type="button" class="btn btn-danger btn-sm" onclick="removeRDVDate(${i})">X</button>` : ''}
    </div>`).join('');
}

async function doProposerRDV() {
  const dates = rdvDatesList.filter(d => d.trim());
  if (!dates.length) {
    document.getElementById('modal-rdv-alert').innerHTML = '<div class="alert alert-warn">Proposez au moins une date.</div>';
    return;
  }
  const btn = document.getElementById('btn-rdv');
  btn.disabled = true; btn.textContent = 'Envoi…';
  try {
    await api.proposerRDVContrat(currentContratId, {
      rdv_dates_proposees: dates,
      rdv_lieu:    document.getElementById('rdv-lieu').value,
      commentaire: document.getElementById('rdv-commentaire').value,
      notes_admin: document.getElementById('rdv-notes').value,
    });
    toast('Dates envoyées au client.', 'success');
    closeModals(); loadContrats(); loadDashboard();
  } catch(e) {
    document.getElementById('modal-rdv-alert').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally { btn.disabled = false; btn.textContent = 'Envoyer les dates au client'; }
}

// ── Livraison ─────────────────────────────────────────────

async function doLivrer() {
  const date     = document.getElementById('liv-date').value;
  const adminSig = document.getElementById('liv-admin-sig').value.trim();
  const alertEl  = document.getElementById('modal-liv-alert');
  if (!date)     { alertEl.innerHTML = '<div class="alert alert-warn">La date de remise est obligatoire.</div>'; return; }
  if (!adminSig) { alertEl.innerHTML = '<div class="alert alert-warn">Votre signature est obligatoire.</div>'; return; }
  const btn = document.getElementById('btn-liv');
  btn.disabled = true; btn.textContent = 'Confirmation…';
  try {
    await api.livrerContrat(currentContratId, {
      livraison_date:   date,
      admin_remise_nom: adminSig,
      commentaire:      document.getElementById('liv-commentaire').value,
      notes_admin:      document.getElementById('liv-notes').value,
    });
    toast('Remise des clés confirmée. Contrat actif !', 'success');
    closeModals(); loadContrats(); loadDashboard();
  } catch(e) {
    alertEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally { btn.disabled = false; btn.textContent = 'Confirmer la remise'; }
}
