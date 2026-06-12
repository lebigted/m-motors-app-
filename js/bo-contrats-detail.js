/** @file bo-contrats-detail.js  Modal détail contrat, impression PDF/facture, création contrat */

// ── Modal détail (lecture) ────────────────────────────────

function openContratDetailModal(contratId) {
  const c = allContrats.find(x => x.id === contratId);
  if (!c) { toast('Contrat introuvable. Rechargez la liste.', 'warn'); return; }

  const meta  = WORKFLOW_META[c.statut] || { color: '#64748b', label: c.statut };
  const cl    = c.client_info;
  const v     = c.vehicle_info;
  const isLoc = c.type === 'location';

  const steps = [
    {
      done: !!c.signature_date,
      label: 'Signature du contrat',
      content: c.signature_date
        ? `Signé par <strong>${c.signature_nom || '—'}</strong> le ${fmtDate(c.signature_date)}`
          + (c.signature_validee_at ? ' &nbsp;<span style="color:var(--success)">· validée ✓</span>' : '')
        : null,
    },
    {
      done: !!c.paiement_date,
      label: 'Paiement',
      content: c.paiement_date
        ? `${c.paiement_mode || '—'} · ${fmtDate(c.paiement_date)}`
          + (c.paiement_reference ? ` · réf. <em>${c.paiement_reference}</em>` : '')
          + (c.paiement_verifie_at ? ` <span style="color:var(--success)">· confirmé ✓</span>` : '')
        : (c.statut === 'a_payer' ? '<span id="cd-pay-msg-inline" style="color:var(--text-muted);font-style:italic">Chargement…</span>' : null),
    },
    {
      done: !!c.rdv_date_confirmee,
      label: 'RDV remise',
      content: (c.rdv_dates_proposees?.length || c.rdv_date_confirmee)
        ? [
            c.rdv_dates_proposees?.length ? `Proposé : ${c.rdv_dates_proposees.map(d => fmtDate(d)).join(', ')}` : '',
            c.rdv_date_confirmee
              ? `<strong>Confirmé : ${fmtDate(c.rdv_date_confirmee)}</strong>`
              : '<span style="color:var(--text-muted);font-size:.78rem">En attente client</span>',
            c.rdv_lieu ? `Lieu : ${c.rdv_lieu}` : '',
          ].filter(Boolean).join('<br>')
        : null,
    },
    {
      done: !!c.client_reception_nom,
      label: 'Réception — signature client',
      content: c.client_reception_nom
        ? `<span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.1rem;color:#1e3a5f">${c.client_reception_nom}</span>`
          + (c.client_reception_date ? `<br><span style="font-size:.75rem">Signé le ${fmtDate(c.client_reception_date)}</span>` : '')
        : null,
    },
    {
      done: !!c.admin_remise_nom,
      label: 'Remise — signature M-Motors',
      content: c.admin_remise_nom
        ? `<span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.1rem;color:#1e3a5f">${c.admin_remise_nom}</span>`
          + (c.admin_remise_date ? `<br><span style="font-size:.75rem">Signé le ${fmtDate(c.admin_remise_date)}</span>` : '')
          + (c.livraison_date ? `<br><span style="font-size:.75rem;color:var(--success)">Véhicule remis le <strong>${fmtDate(c.livraison_date)}</strong></span>` : '')
        : null,
    },
  ];

  document.getElementById('modal-cd-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
      <div>
        <div style="font-family:monospace;font-size:1rem;font-weight:900;color:var(--primary)">${c.dossier_ref}</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem">Créé le ${fmtDate(c.created_at)}</div>
      </div>
      <span style="background:${meta.color}18;color:${meta.color};border:1px solid ${meta.color}44;border-radius:2rem;padding:.25rem .75rem;font-size:.8rem;font-weight:700">${meta.label}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:1rem">
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem">
        <div style="font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:.35rem">Client</div>
        <div style="font-weight:700">${cl ? cl.last_name + ' ' + cl.first_name : '—'}</div>
        <div style="font-size:.78rem;color:var(--text-muted)">${cl?.email || ''}</div>
        ${cl?.tel ? `<div style="font-size:.78rem;color:var(--text-muted)">${cl.tel}</div>` : ''}
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem">
        <div style="font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:.35rem">Véhicule</div>
        <div style="font-weight:700">${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</div>
        <div style="font-size:.78rem;color:var(--text-muted)">${v?.fuel || ''} · ${isLoc ? fmtPrice(c.montant) + '/mois' : fmtPrice(c.montant)}</div>
        <span class="card-tag tag-${c.type}" style="font-size:.7rem">${c.type_display}</span>
      </div>
    </div>

    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.85rem 1rem;margin-bottom:.75rem">
      <div style="font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:.75rem">Historique des étapes</div>
      ${steps.map(s => `
        <div style="display:flex;gap:.75rem;margin-bottom:.7rem;align-items:flex-start">
          <div style="width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:800;
            background:${s.done ? 'var(--success)' : 'var(--bg)'};color:${s.done ? '#fff' : 'var(--text-muted)'};
            border:2px solid ${s.done ? 'var(--success)' : 'var(--border)'}">${s.done ? '✓' : '○'}</div>
          <div>
            <div style="font-size:.8rem;font-weight:700;color:${s.done ? 'var(--text)' : 'var(--text-muted)'}">${s.label}</div>
            ${s.content
              ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.15rem;line-height:1.5">${s.content}</div>`
              : `<div style="font-size:.75rem;color:var(--text-muted);font-style:italic">—</div>`}
          </div>
        </div>`).join('')}
    </div>

    <div id="cd-recu-paiement" style="display:none;margin-bottom:.75rem"></div>

    ${c.commentaire ? `<div style="padding:.6rem .85rem;background:#eff6ff;border-left:3px solid var(--accent);border-radius:.35rem;font-size:.82rem;margin-bottom:.5rem"><span style="font-weight:700;color:var(--accent)">Message client :</span> ${c.commentaire}</div>` : ''}
    ${c.notes_admin ? `<div style="padding:.6rem .85rem;background:#fef9c3;border-left:3px solid #eab308;border-radius:.35rem;font-size:.82rem;margin-bottom:.5rem"><span style="font-weight:700;color:#854d0e">Notes internes :</span> ${c.notes_admin}</div>` : ''}

    <div style="display:flex;flex-wrap:wrap;gap:.5rem .75rem;font-size:.8rem;color:var(--text-muted);padding:.4rem 0;margin-bottom:.75rem">
      ${c.date_debut ? `<span>Début : <strong>${fmtDate(c.date_debut)}</strong></span>` : ''}
      ${c.date_fin   ? `<span>· Fin : <strong>${fmtDate(c.date_fin)}</strong></span>` : ''}
      <span>${c.date_debut ? '·' : ''} Km initial : <strong>${(c.km_initial || 0).toLocaleString('fr-FR')}</strong></span>
      ${c.km_actuel  ? `<span>· Km actuel : <strong>${c.km_actuel.toLocaleString('fr-FR')}</strong></span>` : ''}
    </div>

    ${c.signature_nom ? `
    <div style="border:2px solid #1e3a5f;border-radius:.5rem;padding:1.25rem;background:#fff;font-size:.82rem;line-height:1.7">
      <div style="text-align:center;margin-bottom:1rem">
        <div style="font-size:1.05rem;font-weight:900;color:#1e3a5f;text-transform:uppercase;letter-spacing:.05em">M-Motors — Contrat ${c.type_display}</div>
        <div style="font-family:monospace;font-size:.78rem;color:#64748b;margin-top:.2rem">${c.dossier_ref} · Créé le ${fmtDate(c.created_at)}</div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:.75rem 0"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem 1rem;margin-bottom:.75rem">
        <div><span style="font-weight:700;color:#475569">Client :</span> ${cl ? cl.last_name + ' ' + cl.first_name : '—'}</div>
        <div><span style="font-weight:700;color:#475569">Email :</span> ${cl?.email || '—'}</div>
        <div><span style="font-weight:700;color:#475569">Véhicule :</span> ${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</div>
        <div><span style="font-weight:700;color:#475569">Carburant :</span> ${v?.fuel || '—'}</div>
        <div><span style="font-weight:700;color:#475569">Montant :</span> ${isLoc ? fmtPrice(c.montant) + '/mois' : fmtPrice(c.montant)}</div>
        <div><span style="font-weight:700;color:#475569">Durée :</span> ${c.date_debut ? fmtDate(c.date_debut) : '—'}${c.date_fin ? ' → ' + fmtDate(c.date_fin) : ''}</div>
      </div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:.75rem 0"/>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:.5rem">
        <div style="text-align:center">
          <div style="font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:.4rem">Signature client</div>
          <div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.3rem;color:#1e3a5f;min-height:40px;border-bottom:1px solid #94a3b8;padding-bottom:.25rem">${c.signature_nom}</div>
          <div style="font-size:.7rem;color:#94a3b8;margin-top:.25rem">${c.signature_date ? fmtDate(c.signature_date) : ''}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:.4rem">Cachet M-Motors</div>
          <div style="font-size:.82rem;color:#1e3a5f;min-height:40px;border-bottom:1px solid #94a3b8;padding-bottom:.25rem;display:flex;align-items:center;justify-content:center">
            ${c.signature_validee_at
              ? `<span style="color:var(--success);font-weight:700">✓ Validé le ${fmtDate(c.signature_validee_at)}</span>`
              : '<span style="color:var(--text-muted);font-style:italic">En attente</span>'}
          </div>
        </div>
      </div>
      ${(c.client_reception_nom || c.admin_remise_nom) ? `
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:.75rem 0"/>
      <div style="font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:.5rem;text-align:center">Procès-verbal de remise des clés</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <div style="text-align:center">
          <div style="font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:.4rem">Réception (client)</div>
          <div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.2rem;color:#1e3a5f;min-height:36px;border-bottom:1px solid #94a3b8;padding-bottom:.2rem">${c.client_reception_nom || ''}</div>
          <div style="font-size:.7rem;color:#94a3b8;margin-top:.2rem">${c.client_reception_date ? fmtDate(c.client_reception_date) : ''}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:.4rem">Remise (M-Motors)</div>
          <div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.2rem;color:#1e3a5f;min-height:36px;border-bottom:1px solid #94a3b8;padding-bottom:.2rem">${c.admin_remise_nom || ''}</div>
          <div style="font-size:.7rem;color:#94a3b8;margin-top:.2rem">${c.admin_remise_date ? fmtDate(c.admin_remise_date) : ''}</div>
        </div>
      </div>` : ''}
    </div>` : ''}
  `;

  const dossierId = c.dossier;
  document.getElementById('modal-cd-content').insertAdjacentHTML('beforeend',
    `<div style="margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
       <div style="display:flex;gap:.5rem;flex-wrap:wrap">
         <button class="btn btn-secondary btn-sm" onclick="printContrat(${c.id})">⬇ Contrat PDF</button>
         ${c.paiement_verifie_at ? `<button class="btn btn-sm" style="background:#f0fdf4;border:1px solid #86efac;color:#166534" onclick="printFactureAdmin(${c.id})">⬇ Facture</button>` : ''}
       </div>
       <button class="btn btn-outline btn-sm" onclick="closeModals();switchTab('tchat',document.querySelector('[onclick*=tchat]'));openTchatConversation(${dossierId})">Messagerie client</button>
     </div>`
  );

  closeModals();
  document.getElementById('modal-contrat-detail').classList.add('open');

  // Charge le reçu de soumission client depuis la messagerie
  const STATUTS_PAY = ['a_payer','paye','rdv_propose','rdv_confirme','reception_signee','actif','termine','resilie'];
  if (STATUTS_PAY.includes(c.statut)) {
    api.getMessages(c.dossier).then(msgs => {
      const payMsg = (Array.isArray(msgs) ? msgs : msgs?.results || [])
        .slice().reverse()
        .find(m => m.contenu?.startsWith('Paiement effectué'));

      const inlineEl = document.getElementById('cd-pay-msg-inline');
      const blocEl   = document.getElementById('cd-recu-paiement');

      if (!payMsg) {
        if (inlineEl) inlineEl.textContent = 'Aucune déclaration de paiement trouvée.';
        return;
      }

      // Extrait les champs du message formaté
      const txt   = payMsg.contenu.replace(' Merci de valider la réception.', '');
      const mMode = txt.match(/Mode\s*:\s*([^·]+)/)?.[1]?.trim() || '—';
      const mRef  = txt.match(/Référence\s*:\s*([^·]+)/)?.[1]?.trim() || '—';
      const mMont = txt.match(/Montant\s*:\s*([^.]+)/)?.[1]?.trim() || '—';
      const mDate = payMsg.created_at ? fmtDate(payMsg.created_at) : '—';

      // Met à jour l'étape inline dans la timeline
      if (inlineEl) {
        inlineEl.outerHTML = `<span style="color:var(--text-muted)">${mMode} · réf. <em>${mRef}</em> · déclaré le ${mDate}</span>`;
      }

      // Affiche le bloc reçu complet
      if (blocEl) {
        blocEl.style.display = '';
        blocEl.innerHTML = `
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:var(--radius-sm);padding:1rem 1.1rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;padding-bottom:.55rem;border-bottom:1px solid #bbf7d0">
              <div style="display:flex;align-items:center;gap:.5rem">
                <span style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#166534">Reçu soumis par le client</span>
              </div>
              <span style="font-size:.7rem;color:#4ade80;font-family:monospace">RCT-${String(c.id).padStart(6,'0')}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem .75rem;font-size:.82rem">
              <div><span style="color:#4ade80;font-weight:600">Mode</span><br><strong style="color:#166534">${mMode}</strong></div>
              <div><span style="color:#4ade80;font-weight:600">Référence</span><br><strong style="color:#166534;font-family:monospace">${mRef}</strong></div>
              <div><span style="color:#4ade80;font-weight:600">Montant déclaré</span><br><strong style="color:#166534">${mMont}</strong></div>
              <div><span style="color:#4ade80;font-weight:600">Date de soumission</span><br><strong style="color:#166534">${mDate}</strong></div>
            </div>
            ${!c.paiement_verifie_at ? `<div style="margin-top:.65rem;padding:.5rem .75rem;background:#dcfce7;border-radius:.35rem;font-size:.78rem;color:#166534;font-weight:600">
              En attente de confirmation admin — utilisez "Confirmer le paiement" pour valider ce règlement.
            </div>` : `<div style="margin-top:.65rem;font-size:.78rem;color:#166534;font-weight:600">✓ Paiement confirmé le ${fmtDate(c.paiement_verifie_at)}</div>`}
          </div>`;
      }
    }).catch(() => {
      const inlineEl = document.getElementById('cd-pay-msg-inline');
      if (inlineEl) inlineEl.textContent = '';
    });
  }
}

// ── Impression facture ────────────────────────────────────

function printFactureAdmin(contratId) {
  const c  = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const cl  = c.client_info;
  const v   = c.vehicle_info;
  const ref = `MM-${String(c.id).padStart(6,'0')}`;
  const fac = `FAC-${String(c.id).padStart(6,'0')}`;
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Facture ${fac}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#1e293b;font-size:14px;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
    .brand{font-size:26px;font-weight:900;color:#1e3a5f}
    .brand span{color:#3b82f6}
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
    <thead><tr><th>Description</th><th>Référence contrat</th><th>Type</th><th>Montant HT</th><th>TVA 20%</th><th>Montant TTC</th></tr></thead>
    <tbody>
      <tr>
        <td>${v ? v.brand + ' ' + v.model + ' ' + v.year : 'Véhicule'}<br><span style="font-size:11px;color:#94a3b8">${c.type === 'location' ? 'Location LLD' : 'Achat'}</span></td>
        <td>${ref}</td><td>${c.type_display}</td>
        <td>${fmtPrice(c.montant / 1.2)}</td><td>${fmtPrice(c.montant - c.montant / 1.2)}</td>
        <td><strong>${fmtPrice(c.montant)}</strong></td>
      </tr>
    </tbody>
    <tfoot><tr class="total-row"><td colspan="5">TOTAL TTC</td><td>${fmtPrice(c.montant)}${c.type === 'location' ? ' /mois' : ''}</td></tr></tfoot>
  </table>
  <div class="status-box">✅ <span>Paiement reçu le ${fmtDate(c.paiement_date)} — Mode : ${c.paiement_mode_display || c.paiement_mode}${c.paiement_reference ? ' · Réf. ' + c.paiement_reference : ''}${c.paiement_verifie_at ? ' · Vérifié le ' + fmtDate(c.paiement_verifie_at) : ''}</span></div>
  <div class="footer">M-Motors SAS · Paris, France<br>Cette facture constitue un document officiel. Conservez-la pour vos archives.</div>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

// ── Impression contrat ────────────────────────────────────

function printContrat(contratId) {
  const c   = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const cl    = c.client_info;
  const v     = c.vehicle_info;
  const isLoc = c.type === 'location';
  const win   = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Contrat ${c.dossier_ref}</title>
    <style>
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#0f172a;margin:40px;line-height:1.6}
      h1{font-size:20px;font-weight:900;text-align:center;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
      .sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:28px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      td,th{padding:7px 10px;border:1px solid #e2e8f0;font-size:12px}
      th{background:#f1f5f9;font-weight:700;text-align:left;width:40%}
      .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:30px}
      .sig-box{border:1px solid #cbd5e1;border-radius:6px;padding:16px;min-height:100px}
      .sig-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:10px}
      .sig-name{font-family:'Brush Script MT',cursive;font-size:22px;color:#1e3a5f;min-height:34px}
      .sig-date{font-size:10px;color:#94a3b8;margin-top:6px}
      .stamp{border:2px solid #10b981;color:#10b981;padding:4px 12px;border-radius:4px;font-weight:700;font-size:11px;display:inline-block}
      .footer{margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
      @media print{body{margin:20px}}
    </style></head><body>
    <h1>M-Motors — Contrat ${isLoc ? 'Location LLD' : 'Vente'}</h1>
    <div class="sub">${c.dossier_ref} · Créé le ${fmtDate(c.created_at)}</div>
    <table>
      <tr><th>Client</th><td>${cl ? cl.last_name + ' ' + cl.first_name : '—'}</td></tr>
      <tr><th>Email</th><td>${cl?.email || '—'}</td></tr>
      ${cl?.tel ? `<tr><th>Téléphone</th><td>${cl.tel}</td></tr>` : ''}
      <tr><th>Véhicule</th><td>${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</td></tr>
      <tr><th>Carburant</th><td>${v?.fuel || '—'}</td></tr>
      <tr><th>Kilométrage initial</th><td>${(c.km_initial||0).toLocaleString('fr-FR')} km</td></tr>
      <tr><th>Montant</th><td>${isLoc ? fmtPrice(c.montant) + '/mois' : fmtPrice(c.montant) + ' TTC'}</td></tr>
      <tr><th>Date de début</th><td>${fmtDate(c.date_debut)}</td></tr>
      ${c.date_fin ? `<tr><th>Date de fin</th><td>${fmtDate(c.date_fin)}</td></tr>` : ''}
      ${c.paiement_mode ? `<tr><th>Paiement</th><td>${c.paiement_mode} · ${fmtDate(c.paiement_date)}${c.paiement_reference ? ' · réf. ' + c.paiement_reference : ''}</td></tr>` : ''}
      ${c.livraison_date ? `<tr><th>Date de remise</th><td>${fmtDate(c.livraison_date)}</td></tr>` : ''}
    </table>
    <div class="sig-block">
      <div class="sig-box">
        <div class="sig-label">Signature client</div>
        <div class="sig-name">${c.signature_nom || ''}</div>
        <div class="sig-date">${c.signature_date ? 'Signé le ' + fmtDate(c.signature_date) : ''}</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Cachet M-Motors</div>
        ${c.signature_validee_at ? `<div class="stamp">✓ Validé le ${fmtDate(c.signature_validee_at)}</div>` : '<div style="color:#94a3b8;font-size:11px;font-style:italic">En attente</div>'}
      </div>
    </div>
    ${(c.client_reception_nom || c.admin_remise_nom) ? `
    <div style="margin-top:24px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:10px">Procès-verbal de remise des clés</div>
    <div class="sig-block">
      <div class="sig-box">
        <div class="sig-label">Réception (client)</div>
        <div class="sig-name">${c.client_reception_nom || ''}</div>
        <div class="sig-date">${c.client_reception_date ? fmtDate(c.client_reception_date) : ''}</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Remise (M-Motors)</div>
        <div class="sig-name">${c.admin_remise_nom || ''}</div>
        <div class="sig-date">${c.admin_remise_date ? fmtDate(c.admin_remise_date) : ''}</div>
      </div>
    </div>` : ''}
    <div class="footer">M-Motors · Spécialiste véhicules d'occasion depuis 1987 · Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

// ── Créer contrat depuis un dossier validé ────────────────

let createContratDossierId = null;

async function openCreateContratModal(dossierId) {
  createContratDossierId = dossierId;
  document.getElementById('cc-alert').innerHTML = '';
  document.getElementById('cc-notes').value = '';

  try {
    const d     = await api.getDossier(dossierId);
    const v     = d.vehicle_info;
    const isLoc = d.type === 'location';
    const today = new Date().toISOString().slice(0, 10);

    document.getElementById('cc-montant').value = isLoc ? (v?.monthly || '') : (v?.price || '');
    document.getElementById('cc-montant-help').textContent = isLoc
      ? `Loyer mensuel LLD — véhicule affiché à ${v?.monthly ? fmtPrice(v.monthly) + '/mois' : '—'}`
      : `Prix de vente — véhicule affiché à ${v?.price ? fmtPrice(v.price) : '—'}`;
    document.getElementById('cc-km').value    = v?.km || 0;
    document.getElementById('cc-debut').value = today;
    document.getElementById('cc-fin').value   = isLoc
      ? new Date(new Date(today).setMonth(new Date(today).getMonth() + 36)).toISOString().slice(0, 10)
      : '';
    document.getElementById('cc-fin-group').style.display = isLoc ? '' : 'none';

    const cl = d.client_info;
    document.getElementById('cc-recap').innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.85rem 1rem;font-size:.875rem">
        <div style="font-weight:700;color:var(--primary)">MM-${String(d.id).padStart(6,'0')} — ${cl ? cl.last_name + ' ' + cl.first_name : '—'}</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-top:.25rem">
          ${v ? v.brand + ' ' + v.model + ' ' + v.year + ' · ' + (v.fuel || '') : '—'}
          · <span class="card-tag tag-${d.type}" style="font-size:.72rem">${d.type_display}</span>
        </div>
      </div>`;

    closeModals();
    document.getElementById('modal-create-contrat').classList.add('open');
  } catch(e) {
    toast(e.message, 'danger');
  }
}

async function doCreateContrat() {
  const montant = parseFloat(document.getElementById('cc-montant').value);
  const km      = parseInt(document.getElementById('cc-km').value) || 0;
  const debut   = document.getElementById('cc-debut').value;
  const fin     = document.getElementById('cc-fin').value;
  const notes   = document.getElementById('cc-notes').value;
  const alertEl = document.getElementById('cc-alert');

  if (!montant || montant <= 0) {
    alertEl.innerHTML = '<div class="alert alert-warn">Le montant est obligatoire.</div>'; return;
  }
  if (!debut) {
    alertEl.innerHTML = '<div class="alert alert-warn">La date de début est obligatoire.</div>'; return;
  }

  const d = allDossiers.find(x => x.id === createContratDossierId);
  if (!d) { alertEl.innerHTML = '<div class="alert alert-danger">Dossier introuvable.</div>'; return; }

  const payload = {
    dossier:     d.id,
    vehicle:     d.vehicle,
    type:        d.type,
    montant,
    date_debut:  debut,
    km_initial:  km,
    notes_admin: notes,
  };
  if (fin) payload.date_fin = fin;

  const btn = document.getElementById('btn-cc');
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    await api.createContrat(payload);
    toast('Contrat créé. Le client peut maintenant signer.', 'success');
    closeModals(); loadDossiers(); loadContrats(); loadDashboard();
  } catch(e) {
    alertEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Créer le contrat';
  }
}
