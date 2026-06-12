/** @file ec-paiement.js — Modale de paiement CB/virement/chèque et impression des factures client */

// ── État de la modale ─────────────────────────────────────────────────────────

let _payContratId  = null;
let _payDossierId  = null;
let _payMode       = 'cb';
let _lastReceipt   = null;

// ── Ouverture et navigation ───────────────────────────────────────────────────

function openPaiementModal(contratId, dossierId) {
  _payContratId = contratId;
  _payDossierId = dossierId;
  _payMode      = 'cb';
  _lastReceipt  = null;

  // Restaure la structure si elle a été remplacée par le reçu précédent
  const modalEl = document.querySelector('#modal-paiement .modal');
  if (!document.getElementById('pay-recap')) {
    modalEl.innerHTML = `
      <button class="modal-close" onclick="closeModal('modal-paiement')">×</button>
      <h3 style="margin-bottom:1.25rem">Paiement sécurisé</h3>
      <div id="pay-recap" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem 1rem;margin-bottom:1.25rem;font-size:.88rem"></div>
      <div class="form-group">
        <label class="form-label">Mode de paiement</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap" id="pay-modes">
          <button type="button" class="pay-mode-btn active" onclick="selectPayMode('cb',this)">💳 Carte bancaire</button>
          <button type="button" class="pay-mode-btn" onclick="selectPayMode('virement',this)">🏦 Virement</button>
          <button type="button" class="pay-mode-btn" onclick="selectPayMode('cheque',this)">📄 Chèque</button>
        </div>
      </div>
      <div id="pay-form-cb">
        <div class="form-group"><label class="form-label">Numéro de carte</label>
          <input class="form-input" id="pay-card-num" type="text" maxlength="19" placeholder="1234 5678 9012 3456" oninput="fmtCardNum(this)" style="font-size:1rem;letter-spacing:.08em;font-family:monospace"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Expiration</label><input class="form-input" id="pay-card-exp" type="text" maxlength="5" placeholder="MM/AA" oninput="fmtCardExp(this)"></div>
          <div class="form-group"><label class="form-label">CVV</label><input class="form-input" id="pay-card-cvv" type="password" maxlength="3" placeholder="•••"></div>
        </div>
        <div class="form-group"><label class="form-label">Nom sur la carte</label><input class="form-input" id="pay-card-name" type="text" placeholder="JEAN DUPONT" style="text-transform:uppercase"></div>
      </div>
      <div id="pay-form-virement" style="display:none">
        <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:var(--radius-sm);padding:.85rem 1rem;font-size:.87rem;line-height:1.7">
          <div style="font-weight:700;margin-bottom:.3rem">Coordonnées bancaires M-Motors</div>
          <div>IBAN : <strong>FR76 3000 6000 0112 3456 7890 189</strong></div>
          <div>BIC : <strong>AGRIFRPP882</strong></div>
          <div>Référence à indiquer : <strong id="pay-vir-ref"></strong></div>
        </div>
        <div class="form-group mt-2"><label class="form-label">Référence de votre virement</label>
          <input class="form-input" id="pay-vir-refclient" type="text" placeholder="Ex : VIR-2024-0042"></div>
      </div>
      <div id="pay-form-cheque" style="display:none">
        <div style="background:#fefce8;border:1px solid #fde047;border-radius:var(--radius-sm);padding:.85rem 1rem;font-size:.87rem;line-height:1.7">
          <div style="font-weight:700;margin-bottom:.3rem">Chèque à l'ordre de M-Motors SAS</div>
          <div>À envoyer à : M-Motors SAS, Paris</div>
        </div>
        <div class="form-group mt-2"><label class="form-label">Numéro du chèque</label>
          <input class="form-input" id="pay-cheque-num" type="text" placeholder="Ex : 0012345"></div>
      </div>
      <div id="pay-alert" style="margin-top:.75rem"></div>
      <div id="pay-processing" style="display:none;text-align:center;padding:1.5rem;color:var(--primary);font-weight:600">Traitement en cours…</div>
      <div style="display:flex;gap:.75rem;margin-top:1.25rem;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal('modal-paiement')">Annuler</button>
        <button class="btn btn-primary" id="pay-submit-btn" onclick="submitPaiement()">Payer</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:.4rem;margin-top:.75rem;font-size:.75rem;color:var(--text-muted)">
        🔒 Paiement sécurisé SSL · Données chiffrées
      </div>`;
  }

  const c = allContrats.find(x => x.id === contratId);
  const v = c?.vehicle_info;
  document.getElementById('pay-recap').innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:center">
       <span>${v ? v.brand + ' ' + v.model : 'Contrat'} · ${c?.type_display || ''}</span>
       <strong style="font-size:1.1rem;color:var(--primary)">${fmtPrice(c?.montant)}${c?.type === 'location' ? '/mois' : ''}</strong>
     </div>`;
  document.getElementById('pay-vir-ref').textContent = `MM-${String(contratId).padStart(6,'0')}`;
  document.getElementById('pay-alert').innerHTML = '';
  document.getElementById('pay-processing').style.display = 'none';
  document.getElementById('pay-submit-btn').disabled = false;
  ['pay-card-num','pay-card-exp','pay-card-cvv','pay-card-name','pay-vir-refclient','pay-cheque-num']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  selectPayMode('cb', document.querySelector('.pay-mode-btn'));
  document.getElementById('modal-paiement').classList.add('open');
}

function selectPayMode(mode, btn) {
  _payMode = mode;
  document.querySelectorAll('.pay-mode-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('pay-form-cb').style.display       = mode === 'cb'       ? '' : 'none';
  document.getElementById('pay-form-virement').style.display = mode === 'virement' ? '' : 'none';
  document.getElementById('pay-form-cheque').style.display   = mode === 'cheque'   ? '' : 'none';
}

// ── Formatage des champs carte ────────────────────────────────────────────────

function fmtCardNum(el) {
  let v = el.value.replace(/\D/g,'').slice(0,16);
  el.value = v.match(/.{1,4}/g)?.join(' ') || v;
}

function fmtCardExp(el) {
  let v = el.value.replace(/\D/g,'').slice(0,4);
  if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
  el.value = v;
}

// ── Soumission du paiement ────────────────────────────────────────────────────

async function submitPaiement() {
  const alert   = document.getElementById('pay-alert');
  alert.innerHTML = '';
  let reference = '';
  if (_payMode === 'cb') {
    const num  = document.getElementById('pay-card-num').value.replace(/\s/g,'');
    const exp  = document.getElementById('pay-card-exp').value;
    const cvv  = document.getElementById('pay-card-cvv').value;
    const name = document.getElementById('pay-card-name').value.trim();
    if (num.length < 16)  { alert.innerHTML = '<div class="alert alert-warn">Numéro de carte invalide (16 chiffres requis).</div>'; return; }
    if (!/^\d{2}\/\d{2}$/.test(exp)) { alert.innerHTML = '<div class="alert alert-warn">Date d\'expiration invalide (MM/AA).</div>'; return; }
    if (cvv.length < 3)   { alert.innerHTML = '<div class="alert alert-warn">CVV invalide (3 chiffres requis).</div>'; return; }
    if (!name)            { alert.innerHTML = '<div class="alert alert-warn">Nom sur la carte requis.</div>'; return; }
    reference = `CB ****${num.slice(-4)}`;
  } else if (_payMode === 'virement') {
    reference = document.getElementById('pay-vir-refclient').value.trim() || 'VIR';
  } else if (_payMode === 'cheque') {
    reference = document.getElementById('pay-cheque-num').value.trim() || 'CHQ';
  }
  document.getElementById('pay-processing').style.display = 'block';
  document.getElementById('pay-submit-btn').disabled = true;
  await new Promise(r => setTimeout(r, 1800));
  document.getElementById('pay-processing').style.display = 'none';
  const c   = allContrats.find(x => x.id === _payContratId);
  const msg = `Paiement effectué — Mode : ${_payMode === 'cb' ? 'Carte bancaire' : _payMode === 'virement' ? 'Virement' : 'Chèque'} · Référence : ${reference} · Montant : ${c ? fmtPrice(c.montant) : '—'}. Merci de valider la réception.`;
  try {
    await api.sendMessage(_payDossierId, msg);
    const modeLabel = _payMode === 'cb' ? 'Carte bancaire' : _payMode === 'virement' ? 'Virement bancaire' : 'Chèque';
    const rctRef    = `RCT-${String(_payContratId).padStart(6,'0')}-${Date.now().toString().slice(-4)}`;
    const today     = new Date().toLocaleDateString('fr-FR');
    _lastReceipt    = { ref: rctRef, mode: modeLabel, reference, contratId: _payContratId };
    document.querySelector('#modal-paiement .modal').innerHTML = `
      <div style="text-align:center;padding:1.5rem 0 .5rem">
        <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto .85rem">✅</div>
        <div style="font-size:1.05rem;font-weight:800;color:#166534;margin-bottom:.3rem">Paiement soumis avec succès</div>
        <div style="font-size:.83rem;color:var(--text-muted)">M-Motors va confirmer votre règlement sous 24h.</div>
      </div>
      <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:1.25rem;margin:1rem 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;padding-bottom:.6rem;border-bottom:1px solid var(--border)">
          <span style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)">Reçu de soumission</span>
          <span style="font-size:.7rem;color:var(--text-muted);font-family:monospace">${rctRef}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.55rem;font-size:.875rem">
          <div style="display:flex;justify-content:space-between;gap:1rem"><span style="color:var(--text-muted)">Véhicule</span><strong style="text-align:right">${c?.vehicle_info ? c.vehicle_info.brand+' '+c.vehicle_info.model+' '+c.vehicle_info.year : '—'}</strong></div>
          <div style="display:flex;justify-content:space-between;gap:1rem"><span style="color:var(--text-muted)">Montant</span><strong style="color:var(--primary)">${fmtPrice(c?.montant)}${c?.type==='location'?'/mois':''}</strong></div>
          <div style="display:flex;justify-content:space-between;gap:1rem"><span style="color:var(--text-muted)">Mode de paiement</span><strong>${modeLabel}</strong></div>
          <div style="display:flex;justify-content:space-between;gap:1rem"><span style="color:var(--text-muted)">Référence</span><strong style="font-family:monospace">${reference}</strong></div>
          <div style="display:flex;justify-content:space-between;gap:1rem"><span style="color:var(--text-muted)">Date de soumission</span><strong>${today}</strong></div>
        </div>
      </div>
      <div style="font-size:.78rem;color:var(--text-muted);text-align:center;margin-bottom:1rem;line-height:1.5">
        Conservez ce reçu. La facture officielle sera disponible après confirmation par M-Motors.
      </div>
      <div style="display:flex;gap:.75rem">
        <button class="btn btn-sm" style="flex:1;background:var(--bg);border:1px solid var(--border)" onclick="_printRecu()">🖨 Imprimer le reçu</button>
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="closeModal('modal-paiement');loadAll()">Fermer</button>
      </div>`;
  } catch(e) {
    document.getElementById('pay-submit-btn').disabled = false;
    alert.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// ── Reçu de soumission de paiement ───────────────────────────────────────────

function _printRecu() {
  const r = _lastReceipt;
  if (!r) return;
  const c = allContrats.find(x => x.id === r.contratId);
  const v = c?.vehicle_info;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${r.ref}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#1e293b;font-size:13px;padding:40px;max-width:480px;margin:0 auto}
    .brand{font-size:22px;font-weight:900;color:#1e3a5f;margin-bottom:4px}.brand span{color:#3b82f6}
    .title{font-size:16px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 6px}
    .ref{text-align:center;color:#64748b;font-size:11px;margin-bottom:24px;font-family:monospace}
    .icon{text-align:center;font-size:2.5rem;margin-bottom:8px}
    .status{text-align:center;color:#166534;font-weight:700;font-size:14px;margin-bottom:20px}
    .box{border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:16px}
    .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12.5px}
    .row:last-child{border-bottom:none}
    .row span:first-child{color:#64748b}
    .row strong{text-align:right}
    .note{font-size:10.5px;color:#94a3b8;text-align:center;line-height:1.6;margin-top:8px}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="brand">M<span>-</span>Motors</div>
  <div class="icon">✅</div>
  <div class="title">Reçu de paiement</div>
  <div class="ref">${r.ref}</div>
  <div class="status">Paiement soumis — en attente de confirmation M-Motors</div>
  <div class="box">
    <div class="row"><span>Véhicule</span><strong>${v ? v.brand+' '+v.model+' '+v.year : '—'}</strong></div>
    <div class="row"><span>Type de contrat</span><strong>${c?.type_display || '—'}</strong></div>
    <div class="row"><span>Montant</span><strong>${fmtPrice(c?.montant)}${c?.type==='location'?'/mois':''}</strong></div>
    <div class="row"><span>Mode de paiement</span><strong>${r.mode}</strong></div>
    <div class="row"><span>Référence client</span><strong style="font-family:monospace">${r.reference}</strong></div>
    <div class="row"><span>Date de soumission</span><strong>${new Date().toLocaleDateString('fr-FR')}</strong></div>
  </div>
  <div class="note">Ce document confirme la soumission de votre paiement.<br>La facture officielle sera disponible après validation par M-Motors.</div>
  <div class="footer">M-Motors SAS · Paris, France · Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

// ── Impression des documents ──────────────────────────────────────────────────

function printFacture(contratId) {
  const c  = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const cl = c.client_info;
  const v  = c.vehicle_info;
  const ref = `MM-${String(c.id).padStart(6,'0')}`;
  const fac = `FAC-${String(c.id).padStart(6,'0')}`;
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Facture ${fac}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#1e293b;font-size:14px;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
    .brand{font-size:26px;font-weight:900;color:#1e3a5f}.brand span{color:#3b82f6}
    .fac-title{font-size:22px;font-weight:700;color:#1e3a5f;text-align:right}
    .fac-ref{font-size:13px;color:#64748b;text-align:right;margin-top:4px}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px}
    .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 18px}
    .box-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;letter-spacing:.05em}
    .box p{font-size:13px;color:#334155;line-height:1.6}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#1e3a5f;color:#fff;padding:10px 14px;font-size:12px;text-align:left}
    td{padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155}
    .total-row td{font-weight:700;font-size:15px;background:#f0f9ff;color:#1e3a5f;border-top:2px solid #1e3a5f}
    .status-box{background:#dcfce7;border:1px solid #86efac;border-radius:6px;padding:12px 18px;margin:20px 0;display:flex;align-items:center;gap:10px}
    .status-box span{font-weight:700;color:#166534;font-size:13px}
    .footer{margin-top:36px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="header">
    <div><div class="brand">M<span>-</span>Motors</div><div style="font-size:12px;color:#64748b;margin-top:4px">Paris, France</div></div>
    <div><div class="fac-title">FACTURE</div><div class="fac-ref">${fac} · ${fmtDate(c.paiement_date||c.created_at)}</div></div>
  </div>
  <div class="parties">
    <div class="box"><div class="box-title">Émetteur</div><p><strong>M-Motors SAS</strong><br>Paris, France</p></div>
    <div class="box"><div class="box-title">Facturé à</div><p><strong>${cl ? cl.last_name + ' ' + cl.first_name : '—'}</strong><br>${cl ? cl.email : ''}</p></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Référence</th><th>Type</th><th>Montant HT</th><th>TVA 20%</th><th>TTC</th></tr></thead>
    <tbody><tr>
      <td>${v ? v.brand + ' ' + v.model + ' ' + v.year : 'Véhicule'}</td>
      <td>${ref}</td><td>${c.type_display}</td>
      <td>${fmtPrice(c.montant / 1.2)}</td>
      <td>${fmtPrice(c.montant - c.montant / 1.2)}</td>
      <td><strong>${fmtPrice(c.montant)}</strong></td>
    </tr></tbody>
    <tfoot><tr class="total-row"><td colspan="5">TOTAL TTC</td><td>${fmtPrice(c.montant)}${c.type === 'location' ? ' /mois' : ''}</td></tr></tfoot>
  </table>
  <div class="status-box">✅ <span>Paiement reçu le ${fmtDate(c.paiement_date)} — Mode : ${c.paiement_mode_display || c.paiement_mode}${c.paiement_reference ? ' · Réf. ' + c.paiement_reference : ''}</span></div>
  <div class="footer">M-Motors SAS · Paris, France<br>Cette facture constitue un document officiel.</div>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

function printContratClient(contratId) {
  const c = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const v = c.vehicle_info;
  const isLoc = c.type === 'location';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Mon contrat ${c.dossier_ref}</title>
    <style>
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#0f172a;margin:40px;line-height:1.6}
      h1{font-size:20px;font-weight:900;text-align:center;margin-bottom:4px;text-transform:uppercase}
      .sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:28px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      td,th{padding:7px 10px;border:1px solid #e2e8f0;font-size:12px}
      th{background:#f1f5f9;font-weight:700;text-align:left;width:40%}
      .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}
      .sig-box{border:1px solid #cbd5e1;border-radius:6px;padding:14px}
      .sig-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:8px}
      .sig-name{font-family:'Brush Script MT',cursive;font-size:22px;color:#1e3a5f;min-height:32px}
      .footer{margin-top:36px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
    </style></head><body>
    <h1>M-Motors — Mon contrat ${isLoc ? 'LLD' : 'Achat'}</h1>
    <div class="sub">${c.dossier_ref} · ${isLoc ? fmtPrice(c.montant)+'/mois' : fmtPrice(c.montant)+' TTC'}</div>
    <table>
      <tr><th>Véhicule</th><td>${v ? v.brand+' '+v.model+' '+v.year : '—'}</td></tr>
      <tr><th>Montant</th><td>${isLoc ? fmtPrice(c.montant)+'/mois' : fmtPrice(c.montant)+' TTC'}</td></tr>
      <tr><th>Date de début</th><td>${fmtDate(c.date_debut)}</td></tr>
      ${c.date_fin ? `<tr><th>Date de fin</th><td>${fmtDate(c.date_fin)}</td></tr>` : ''}
      ${c.paiement_mode ? `<tr><th>Règlement</th><td>${c.paiement_mode} · ${fmtDate(c.paiement_date)}</td></tr>` : ''}
      ${c.livraison_date ? `<tr><th>Remise du véhicule</th><td>${fmtDate(c.livraison_date)}</td></tr>` : ''}
    </table>
    <div class="sig-block">
      <div class="sig-box">
        <div class="sig-label">Ma signature</div>
        <div class="sig-name">${c.signature_nom || ''}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:6px">${c.signature_date ? fmtDate(c.signature_date) : ''}</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">M-Motors</div>
        ${c.signature_validee_at ? `<div style="color:#10b981;font-weight:700;font-size:12px">✓ Validé le ${fmtDate(c.signature_validee_at)}</div>` : ''}
        ${c.admin_remise_nom ? `<div style="margin-top:8px"><div class="sig-name">${c.admin_remise_nom}</div><div style="font-size:10px;color:#94a3b8">Remise le ${c.admin_remise_date ? fmtDate(c.admin_remise_date) : ''}</div></div>` : ''}
      </div>
    </div>
    <div class="footer">M-Motors · Document généré le ${new Date().toLocaleDateString('fr-FR')} — Conservez ce document.</div>
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

function printFactureMois(contratId, num, period, montant) {
  const c   = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const v   = c.vehicle_info;
  const u   = api.getUser();
  const nom = u ? u.last_name + ' ' + u.first_name : '';
  const ref = `FACT-${String(contratId).padStart(5,'0')}-${String(num).padStart(3,'0')}`;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Facture ${ref}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#0f172a;margin:0;padding:40px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:18px;margin-bottom:24px}
      .brand{font-size:22px;font-weight:900;color:#1e3a5f;letter-spacing:-.03em}.brand span{color:#3b82f6}
      .invoice-meta{text-align:right}.invoice-meta h2{font-size:16px;font-weight:800;margin:0 0 4px;text-transform:uppercase;color:#1e3a5f}.invoice-meta p{margin:0;font-size:11px;color:#64748b}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
      .party-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px}.party-box h4{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin:0 0 8px}.party-box p{margin:0;font-size:12px;line-height:1.6}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#1e3a5f;color:#fff;padding:9px 12px;font-size:11px;font-weight:700;text-align:left}
      tbody td{padding:9px 12px;font-size:12px;border-bottom:1px solid #e2e8f0}
      .total-row td{font-weight:800;font-size:13px;background:#f1f5f9;border-top:2px solid #1e3a5f}
      .badge{display:inline-block;padding:.2rem .7rem;border-radius:2rem;font-size:10px;font-weight:700}
      .paid{background:#dcfce7;color:#166534}.current{background:#fef9c3;color:#854d0e}
      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      <div><div class="brand">M<span>-</span>Motors</div><div style="font-size:11px;color:#64748b;margin-top:4px">Location Longue Durée</div></div>
      <div class="invoice-meta"><h2>Facture de loyer</h2><p>Réf : ${ref}</p><p>Contrat : ${c.dossier_ref}</p><p>Émise le : ${new Date().toLocaleDateString('fr-FR')}</p></div>
    </div>
    <div class="parties">
      <div class="party-box"><h4>Prestataire</h4><p><strong>M-Motors</strong></p></div>
      <div class="party-box"><h4>Client</h4><p><strong>${nom}</strong>${u?.email ? '<br>'+u.email : ''}</p></div>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Période</th><th>Qté</th><th>P.U. HT</th><th>TVA</th><th>TTC</th><th>Statut</th></tr></thead>
      <tbody><tr>
        <td>Loyer LLD — ${v ? v.brand+' '+v.model+' '+v.year : 'Véhicule'}<br><span style="font-size:11px;color:#64748b">${c.dossier_ref}</span></td>
        <td>${period}</td><td>1</td>
        <td>${fmtPrice(parseFloat(montant)/1.2)}</td><td>20%</td>
        <td><strong>${fmtPrice(montant)}</strong></td>
        <td><span class="badge ${num <= Math.round((new Date()-new Date(c.date_debut))/(30*86400000)) ? 'paid' : 'current'}">${num < Math.ceil((new Date()-new Date(c.date_debut))/(30*86400000)) ? '✓ Payé' : '→ En cours'}</span></td>
      </tr></tbody>
      <tfoot><tr class="total-row"><td colspan="5" style="text-align:right">Total TTC</td><td colspan="2">${fmtPrice(montant)}</td></tr></tfoot>
    </table>
    <div style="font-size:11px;color:#64748b;margin-bottom:8px">Dont TVA (20%) : ${fmtPrice((parseFloat(montant)-parseFloat(montant)/1.2).toFixed(2))}</div>
    <div class="footer">M-Motors · Document généré le ${new Date().toLocaleDateString('fr-FR')} — Ce document tient lieu de facture.</div>
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}
