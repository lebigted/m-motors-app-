/** @file ec-contrats.js — Onglet Contrats espace client  stats, timeline workflow, actif/terminé, signatures */

// ── Statistiques ──────────────────────────────────────────────────────────────

function renderStats() {
  const actifs   = allContrats.filter(c => c.statut === 'actif').length;
  const pipeline = allContrats.filter(c => !['actif','termine','resilie'].includes(c.statut)).length;
  const enCours  = allDossiers.filter(d => d.status==='en_cours'||d.status==='soumis').length;
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-value" style="color:var(--success)">${actifs}</div><div class="stat-label">Contrat actif</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${pipeline}</div><div class="stat-label">Contrat en cours</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--warn)">${enCours}</div><div class="stat-label">En cours d'instruction</div></div>
    <div class="stat-card"><div class="stat-value">${allDossiers.length}</div><div class="stat-label">Dossier(s) au total</div></div>`;
}

// ── Liste des contrats ────────────────────────────────────────────────────────

function renderContrats() {
  const el = document.getElementById('contrats-content');
  if (!allContrats.length && !allDossiers.some(d => d.status === 'valide')) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon" style="opacity:.3">—</span>
      <h3>Aucun contrat</h3><p>Une fois votre dossier validé, M-Motors créera votre contrat ici.</p>
      <a href="../index.html" class="btn btn-primary mt-2">Parcourir les véhicules</a></div>`;
    return;
  }
  const cardsHTML = allContrats.map(c =>
    (c.statut === 'actif' || c.statut === 'termine') ? renderActiveVehicle(c) : renderContractCard(c)
  );
  const dossiersSansContrat = allDossiers.filter(d =>
    d.status === 'valide' && !allContrats.some(c => c.dossier === d.id)
  );
  const pendingHTML = dossiersSansContrat.map(d => {
    const v = d.vehicle_info;
    return `<div class="card" style="margin-bottom:1.25rem">
      <div class="card-body" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:var(--primary)">${v ? v.brand+' '+v.model+' '+v.year : '—'}</div>
          <div class="text-muted text-sm">${d.type_display}</div>
        </div>
        <div style="font-size:.85rem;color:var(--text-muted);font-style:italic">Contrat en préparation par M-Motors…</div>
      </div>
    </div>`;
  });
  el.innerHTML = [...cardsHTML, ...pendingHTML].join('') || '<p class="text-muted">Aucun contrat.</p>';
}

// ── Carte timeline (contrat en cours de workflow) ─────────────────────────────

function renderContractCard(c) {
  const v = c.vehicle_info;
  const PAST = (statuts) => statuts.includes(c.statut);
  const steps = [
    {
      label: 'Signature du contrat',
      done:   PAST(['signe','a_payer','paye','rdv_propose','rdv_confirme','reception_signee','actif','termine','resilie']),
      active: c.statut === 'a_signer',
      detail:    c.signature_nom
        ? `Signé par <strong>${c.signature_nom}</strong>${c.signature_date ? ' le ' + fmtDate(c.signature_date) : ''}`
        : null,
      subDetail: c.signature_validee_at
        ? `<span style="color:var(--success)">Validée par M-Motors le ${fmtDate(c.signature_validee_at)}</span>`
        : (c.statut === 'signe' ? '<span style="font-style:italic">Validation en cours par M-Motors…</span>' : null),
      action: c.statut === 'a_signer'
        ? `<button class="btn btn-primary btn-sm" style="margin-top:.6rem" onclick="openSignModal(${c.id})">Signer le contrat</button>`
        : null,
    },
    {
      label: 'Vérification M-Motors',
      done:   PAST(['a_payer','paye','rdv_propose','rdv_confirme','reception_signee','actif','termine','resilie']),
      active: c.statut === 'signe',
      detail:    c.signature_validee_at ? `Validée le ${fmtDate(c.signature_validee_at)}` : null,
      subDetail: null,
      action: c.statut === 'signe'
        ? `<span style="font-size:.8rem;color:var(--text-muted);font-style:italic;display:block;margin-top:.3rem">En attente de M-Motors…</span>`
        : null,
    },
    {
      label: 'Paiement',
      done:   PAST(['paye','rdv_propose','rdv_confirme','reception_signee','actif','termine','resilie']),
      active: c.statut === 'a_payer',
      detail: c.paiement_date
        ? `${c.paiement_mode_display || c.paiement_mode} · ${fmtDate(c.paiement_date)}${c.paiement_reference ? ' · réf. ' + c.paiement_reference : ''}`
        : (c.statut === 'a_payer' ? `Montant à régler : <strong>${fmtPrice(c.montant)}${c.type === 'location' ? '/mois' : ''}</strong>` : null),
      subDetail: c.paiement_verifie_at
        ? `<span style="color:var(--success)">Confirmé par M-Motors le ${fmtDate(c.paiement_verifie_at)}</span>`
        : null,
      action: c.statut === 'a_payer'
        ? `<div style="margin-top:.5rem">
             <button class="btn btn-primary btn-sm" onclick="openPaiementModal(${c.id},${c.dossier})">💳 Procéder au paiement</button>
           </div>`
        : (c.paiement_verifie_at
          ? `<button class="btn btn-sm" style="margin-top:.4rem;background:var(--bg);border:1px solid var(--border);color:var(--text);font-size:.78rem" onclick="printFacture(${c.id})">⬇ Télécharger la facture</button>`
          : null),
    },
    {
      label: 'Rendez-vous remise',
      done:   PAST(['rdv_confirme','reception_signee','actif','termine','resilie']),
      active: c.statut === 'rdv_propose',
      detail: c.rdv_date_confirmee
        ? `<strong>${fmtDate(c.rdv_date_confirmee)}</strong>${c.rdv_lieu ? ' — ' + c.rdv_lieu : ''}`
        : (c.rdv_dates_proposees?.length
            ? `${c.rdv_dates_proposees.length} date(s) proposée(s)${c.rdv_lieu ? ' · ' + c.rdv_lieu : ''}`
            : null),
      subDetail: null,
      action: c.statut === 'rdv_propose'
        ? `<button class="btn btn-primary btn-sm" style="margin-top:.6rem" onclick="openRDVModal(${c.id})">Choisir ma date</button>`
        : null,
    },
    {
      label: 'Votre signature de réception',
      done:   PAST(['reception_signee','actif','termine','resilie']),
      active: c.statut === 'rdv_confirme',
      detail: c.client_reception_nom
        ? `<span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1rem;color:#1e3a5f">${c.client_reception_nom}</span>`
          + (c.client_reception_date ? ` <span style="font-size:.75rem">· le ${fmtDate(c.client_reception_date)}</span>` : '')
        : (c.statut === 'rdv_confirme' && c.rdv_date_confirmee
            ? `RDV confirmé : <strong>${fmtDate(c.rdv_date_confirmee)}</strong>${c.rdv_lieu ? ' — ' + c.rdv_lieu : ''}`
            : null),
      subDetail: null,
      action: c.statut === 'rdv_confirme'
        ? `<div style="margin-top:.6rem">
             <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.5rem">À la récupération du véhicule, confirmez la remise en signant ci-dessous.</p>
             <button class="btn btn-primary btn-sm" onclick="openReceptionModal(${c.id})">Signer la réception</button>
           </div>`
        : null,
    },
    {
      label: 'Confirmation M-Motors',
      done:   PAST(['actif','termine','resilie']),
      active: c.statut === 'reception_signee',
      detail: c.admin_remise_nom
        ? `Remise confirmée par <strong>${c.admin_remise_nom}</strong>${c.livraison_date ? ' le ' + fmtDate(c.livraison_date) : ''}`
        : null,
      subDetail: null,
      action: c.statut === 'reception_signee'
        ? `<span style="font-size:.8rem;color:var(--text-muted);font-style:italic;display:block;margin-top:.3rem">Votre signature a été enregistrée. M-Motors finalise la remise…</span>`
        : null,
    },
  ];

  const timelineHTML = steps.map(s => {
    const opacity  = (s.done || s.active) ? '1' : '.4';
    const dotBg    = s.done ? 'var(--success)' : s.active ? 'var(--accent)' : 'var(--border)';
    const dotColor = (s.done || s.active) ? '#fff' : 'var(--text-muted)';
    const lblColor = s.active ? 'var(--primary)' : s.done ? 'var(--text)' : 'var(--text-muted)';
    const lblWeight = s.active ? '700' : '600';
    const commentaireHTML = (s.active && c.commentaire)
      ? `<div style="background:var(--accent-light);border-left:2px solid var(--accent);border-radius:0 .3rem .3rem 0;padding:.4rem .75rem;margin-top:.4rem;font-size:.8rem"><strong style="color:var(--accent)">M-Motors :</strong> ${c.commentaire}</div>`
      : '';
    return `<div style="display:flex;gap:.9rem;margin-bottom:.8rem;opacity:${opacity}">
      <div style="flex-shrink:0;padding-top:.12rem">
        <div style="width:22px;height:22px;border-radius:50%;background:${dotBg};color:${dotColor};display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:800">${s.done ? '✓' : ''}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.85rem;font-weight:${lblWeight};color:${lblColor}">${s.label}</div>
        ${s.detail    ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.15rem">${s.detail}</div>` : ''}
        ${s.subDetail ? `<div style="font-size:.75rem;margin-top:.1rem">${s.subDetail}</div>` : ''}
        ${commentaireHTML}
        ${s.action || ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="card" style="margin-bottom:1.25rem;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:.5rem">
      <div>
        <div style="font-weight:800;font-size:1rem;color:var(--primary)">${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</div>
        <div style="font-size:.78rem;color:var(--text-muted)">${c.type_display} · ${c.dossier_ref} · ${c.type === 'location' ? fmtPrice(c.montant) + '/mois' : fmtPrice(c.montant)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="background:var(--accent-light);color:var(--accent);border:1px solid #93c5fd;border-radius:2rem;padding:.2rem .75rem;font-size:.75rem;font-weight:700;white-space:nowrap">${c.statut_display}</span>
        ${c.signature_nom ? `<button class="btn btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text-muted);font-size:.75rem" onclick="printContratClient(${c.id})">⬇ PDF</button>` : ''}
      </div>
    </div>
    <div style="padding:1.25rem 1.5rem">${timelineHTML}</div>
  </div>`;
}

// ── Dashboard véhicule actif ──────────────────────────────────────────────────

function renderActiveVehicle(c) {
  const v       = c.vehicle_info;
  const isLoc   = c.type === 'location';
  const debut   = c.date_debut ? new Date(c.date_debut) : new Date();
  const fin     = c.date_fin   ? new Date(c.date_fin)   : new Date(debut.getTime()+36*30*24*3600000);
  const now     = new Date();
  const total   = Math.round((fin-debut)/(24*3600000));
  const elapsed = Math.max(0,Math.round((now-debut)/(24*3600000)));
  const pct     = Math.min(100,Math.round(elapsed/total*100));
  const nextPay = new Date(now.getFullYear(),now.getMonth()+1,1);
  const daysTo  = Math.round((nextPay-now)/(24*3600000));
  const km          = c.km_actuel || c.km_initial || 0;
  const kmParcourus = Math.max(0, (c.km_actuel || 0) - (c.km_initial || 0));
  const kmBudget    = Math.round((total / 365) * 15000);
  const kmPct       = kmBudget > 0 ? Math.min(120, Math.round(kmParcourus / kmBudget * 100)) : 0;
  const kmAlerte    = kmPct >= 100 ? 'danger' : kmPct >= 85 ? 'warn' : 'ok';

  let echeancierHTML = '';
  if (isLoc && c.date_fin) {
    const sched = [];
    let d = new Date(debut.getFullYear(), debut.getMonth(), 1);
    const finMois = new Date(fin.getFullYear(), fin.getMonth(), 1);
    let guard = 0;
    while (d <= finMois && guard++ < 120) {
      const isPast    = d < new Date(now.getFullYear(), now.getMonth(), 1);
      const isCurrent = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      sched.push({ date: new Date(d), isPast, isCurrent });
      d.setMonth(d.getMonth() + 1);
    }
    const rows = sched.map((r, i) => {
      const isPaid    = r.isPast && !r.isCurrent;
      const lbl       = isPaid ? '✓ Payé' : r.isCurrent ? '✓ Payé' : 'À venir';
      const color     = (isPaid || r.isCurrent) ? '#10b981' : '#94a3b8';
      const period    = r.date.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
      const dlBtn     = (isPaid || r.isCurrent)
        ? `<button onclick="printFactureMois(${c.id},${i+1},'${period}',${c.montant})"
             style="font-size:.7rem;padding:.2rem .6rem;border:1px solid #10b981;border-radius:.3rem;background:#f0fdf4;cursor:pointer;color:#166534;font-weight:600">⬇ Facture</button>`
        : '';
      return `<tr style="background:${r.isCurrent ? '#fef9ee' : ''}">
        <td style="padding:.45rem .7rem;font-size:.8rem;color:#94a3b8">${i+1}</td>
        <td style="padding:.45rem .7rem;font-size:.82rem">${period}</td>
        <td style="padding:.45rem .7rem;font-size:.82rem;font-weight:600">${fmtPrice(c.montant)}</td>
        <td style="padding:.45rem .7rem;font-size:.82rem;font-weight:700;color:${color}">${lbl}</td>
        <td style="padding:.45rem .7rem">${dlBtn}</td>
      </tr>`;
    }).join('');
    const totalPrix = (parseFloat(c.montant) * sched.length).toFixed(2);
    const daysLeft  = Math.round((fin - now) / 86400000);
    const nearEnd   = daysLeft <= 90;
    const renewHTML = nearEnd ? `
      <div style="margin-top:1rem;padding:.85rem 1rem;background:#fef3c7;border:1px solid #fde68a;border-radius:var(--radius-sm)">
        <div style="font-weight:700;font-size:.88rem;color:#92400e;margin-bottom:.3rem">
          ${daysLeft > 0 ? 'Fin de contrat dans ' + daysLeft + ' jour(s)' : 'Contrat arrivé à échéance'}
        </div>
        <div style="font-size:.82rem;color:#78350f;margin-bottom:.65rem">Souhaitez-vous renouveler votre location ?</div>
        <button class="btn btn-sm" style="background:#d97706;color:#fff;border:none;font-size:.82rem" onclick="demanderRenouvellement(${c.id})">
          Demander un renouvellement
        </button>
      </div>` : '';
    echeancierHTML = `<div class="card" style="margin-bottom:1rem"><div class="card-body">
      <div style="font-weight:700;color:var(--primary);margin-bottom:.85rem">Échéancier de paiement</div>
      <div style="overflow-y:auto;max-height:250px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--bg);position:sticky;top:0">
            <th style="padding:.45rem .7rem;font-size:.72rem;font-weight:700;text-align:left;color:var(--text-muted);border-bottom:1px solid var(--border)">N°</th>
            <th style="padding:.45rem .7rem;font-size:.72rem;font-weight:700;text-align:left;color:var(--text-muted);border-bottom:1px solid var(--border)">Période</th>
            <th style="padding:.45rem .7rem;font-size:.72rem;font-weight:700;text-align:left;color:var(--text-muted);border-bottom:1px solid var(--border)">Loyer</th>
            <th style="padding:.45rem .7rem;font-size:.72rem;font-weight:700;text-align:left;color:var(--text-muted);border-bottom:1px solid var(--border)">Statut</th>
            <th style="padding:.45rem .7rem;border-bottom:1px solid var(--border)"></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-top:.5rem">${sched.length} échéance(s) · Total : ${fmtPrice(totalPrix)}</div>
      ${renewHTML}
    </div></div>`;
  }

  return `
  <div class="vehicle-active-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
      <div>
        <div style="font-size:.75rem;opacity:.55;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">${isLoc?'Location en cours':'Véhicule acquis'}</div>
        <div style="font-size:1.5rem;font-weight:900;letter-spacing:-.02em">${v?v.brand+' '+v.model+' '+v.year:'Votre véhicule'}</div>
        <div style="opacity:.6;font-size:.88rem;margin-top:.2rem">${v?v.fuel+' · '+(v.color||''):''}</div>
      </div>
      ${isLoc?`<div style="text-align:right">
        <div style="font-size:1.6rem;font-weight:900">${fmtPrice(v?.monthly)}<span style="font-size:.85rem;font-weight:400;opacity:.7">/mois</span></div>
        <div style="font-size:.78rem;opacity:.6">Prochain paiement dans <strong style="color:#fff">${daysTo}j</strong></div>
      </div>`:''}
    </div>
    ${isLoc?`<div style="margin-bottom:1.25rem">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;opacity:.65;margin-bottom:.35rem">
        <span>Début : ${fmtDate(c.date_debut)}</span><span>${pct}% écoulé</span><span>Fin : ${fmtDate(c.date_fin)}</span>
      </div>
      <div class="payment-bar"><div class="payment-fill" style="width:${pct}%"></div></div>
      <div style="font-size:.75rem;opacity:.5;margin-top:.3rem">${elapsed}j écoulés sur ${total} · ${Math.max(0,total-elapsed)}j restants</div>
    </div>`:''}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
      <div style="background:rgba(255,255,255,.1);border-radius:.65rem;padding:.85rem;text-align:center">
        <div style="font-size:1.2rem;font-weight:800">${km.toLocaleString('fr-FR')}</div>
        <div style="font-size:.72rem;opacity:.55;margin-top:.15rem">Km actuels</div>
      </div>
      <div style="background:rgba(255,255,255,.1);border-radius:.65rem;padding:.85rem;text-align:center">
        <div style="font-size:1.2rem;font-weight:800">${daysTo}j</div>
        <div style="font-size:.72rem;opacity:.55;margin-top:.15rem">Prochain paiement</div>
      </div>
      <div style="background:rgba(255,255,255,.1);border-radius:.65rem;padding:.85rem;text-align:center">
        <div style="font-size:1.2rem;font-weight:800">${isLoc?Math.max(0,total-elapsed)+'j':'Acquis'}</div>
        <div style="font-size:.72rem;opacity:.55;margin-top:.15rem">${isLoc?'Avant fin':'Propriétaire'}</div>
      </div>
    </div>

    ${isLoc ? `
    <div style="margin-top:1.25rem;background:rgba(255,255,255,.1);border-radius:.65rem;padding:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;font-size:.82rem">
        <span style="opacity:.7">Forfait kilométrique</span>
        <span style="font-weight:700;color:${kmAlerte==='danger'?'#f87171':kmAlerte==='warn'?'#fbbf24':'#fff'}">${kmParcourus.toLocaleString('fr-FR')} / ${kmBudget.toLocaleString('fr-FR')} km</span>
      </div>
      <div style="background:rgba(255,255,255,.15);border-radius:2rem;height:8px;overflow:hidden">
        <div style="width:${Math.min(100,kmPct)}%;height:100%;border-radius:2rem;background:${kmAlerte==='danger'?'#f87171':kmAlerte==='warn'?'#fbbf24':'#34d399'};transition:width .5s ease"></div>
      </div>
      <div style="font-size:.75rem;opacity:.55;margin-top:.3rem">${kmPct}% du forfait utilisé · base 15 000 km/an</div>
      ${kmAlerte !== 'ok' ? `
      <div style="margin-top:.65rem;padding:.6rem .85rem;background:${kmAlerte==='danger'?'rgba(239,68,68,.25)':'rgba(245,158,11,.25)'};border:1px solid ${kmAlerte==='danger'?'rgba(239,68,68,.5)':'rgba(245,158,11,.5)'};border-radius:.4rem;font-size:.82rem;font-weight:600;color:${kmAlerte==='danger'?'#f87171':'#fbbf24'}">
        ${kmAlerte==='danger'
          ? '⚠ Kilométrage contractuel dépassé — contactez votre conseiller M-Motors.'
          : '⚠ Vous approchez de votre forfait kilométrique — pensez à contacter M-Motors.'}
      </div>` : ''}
    </div>` : ''}
  </div>

  <div class="card" style="margin-bottom:1rem"><div class="card-body">
    <div style="font-weight:700;color:var(--primary);margin-bottom:.85rem">Mettre à jour le kilométrage</div>
    <div style="display:flex;gap:.75rem;align-items:flex-end">
      <div class="form-group" style="flex:1;margin:0">
        <label class="form-label">Kilométrage actuel</label>
        <input class="form-input" type="number" id="km-input-${c.id}" value="${km}" min="${c.km_initial||0}"/>
      </div>
      <button class="btn btn-primary" onclick="updateKm(${c.id})">Mettre à jour</button>
    </div>
    <p class="form-help">Renseignez régulièrement pour anticiper les entretiens.</p>
  </div></div>

  ${echeancierHTML}

  ${v?`<div class="card" style="margin-bottom:1rem"><div class="card-body">
    <div style="font-weight:700;color:var(--primary);margin-bottom:.85rem">Services actifs</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem">
      ${[{ok:v.svc_assurance!==false,l:'Assurance tous risques',d:'Couverture complète'},
         {ok:v.svc_assistance!==false,l:'Assistance 24/7',d:'Partout en France'},
         {ok:v.svc_entretien!==false,l:'Entretien & SAV',d:'Pris en charge'},
         {ok:v.svc_ct!==false,l:'Contrôle technique',d:'Organisé par M-Motors'}]
        .filter(s=>s.ok).map(s=>`
        <div style="display:flex;align-items:flex-start;gap:.65rem;padding:.75rem;background:var(--success-light);border-radius:var(--radius-sm);border:1px solid #6ee7b7">
          <div style="width:22px;height:22px;background:var(--success);border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;flex-shrink:0">OK</div>
          <div><div style="font-weight:700;font-size:.85rem">${s.l}</div><div style="font-size:.75rem;color:var(--text-muted)">${s.d}</div></div>
        </div>`).join('')}
    </div>
  </div></div>`:''}

  <div class="card"><div class="card-body">
    <div style="font-weight:700;color:var(--primary);margin-bottom:.85rem">Historique des paiements</div>
    ${renderPayments(c)}
  </div></div>`;
}

// ── Historique des paiements ──────────────────────────────────────────────────

function renderPayments(c) {
  const monthly = parseFloat(c.vehicle_info?.monthly || c.montant || 0);
  const isLoc   = c.type === 'location';
  if (!isLoc || !c.date_debut) {
    if (!isLoc && c.paiement_date) return `<table class="data-table" style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">
      <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Statut</th></tr></thead>
      <tbody><tr>
        <td>${fmtDate(c.paiement_date)}</td>
        <td><strong>${fmtPrice(c.montant)}</strong></td>
        <td>${c.paiement_mode_display||c.paiement_mode||'—'}</td>
        <td><span class="status-badge status-valide" style="font-size:.73rem">Confirmé</span></td>
      </tr></tbody></table>`;
    return '<p class="text-sm text-muted">Aucun paiement enregistré.</p>';
  }
  const debut = new Date(c.date_debut);
  const now   = new Date();
  const rows  = [];
  let date = new Date(debut), n = 1;
  while (date <= now && n <= 36) {
    rows.push({ date: new Date(date), montant: monthly, n });
    date.setMonth(date.getMonth()+1); n++;
  }
  if (!rows.length) return '<p class="text-sm text-muted">Aucun paiement encore.</p>';
  return `<table class="data-table" style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">
    <thead><tr><th>#</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>
      <td>${r.n}</td><td>${r.date.toLocaleDateString('fr-FR')}</td>
      <td><strong>${fmtPrice(r.montant)}</strong></td>
      <td><span class="status-badge status-valide" style="font-size:.73rem">Payé</span></td>
    </tr>`).join('')}</tbody></table>`;
}

// ── Mise à jour kilométrage ───────────────────────────────────────────────────

async function updateKm(contratId) {
  const input = document.getElementById(`km-input-${contratId}`);
  const val   = parseInt(input.value);
  if (isNaN(val)||val<0) { toast('Kilométrage invalide.','warn'); return; }
  try {
    await api.updateContratKm(contratId, val);
    toast('Kilométrage mis à jour.','success');
    await loadAll();
  } catch(e) { toast(e.message,'danger'); }
}

// ── Modales de workflow ───────────────────────────────────────────────────────

function openSignModal(contratId) {
  currentContratId = contratId;
  const c = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const v = c.vehicle_info;
  const isLoc = c.type === 'location';
  const montant = isLoc ? fmtPrice(c.montant)+'/mois' : fmtPrice(c.montant);
  document.getElementById('modal-step-title').textContent = 'Signature électronique du contrat';
  document.getElementById('modal-step-content').innerHTML = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:.5rem;padding:1.25rem;max-height:170px;overflow-y:auto;font-size:.8rem;color:#475569;line-height:1.8;margin-bottom:1.25rem">
      <div style="font-weight:800;font-size:.88rem;color:#0f172a;margin-bottom:.75rem;text-transform:uppercase">Contrat M-Motors — ${c.dossier_ref}</div>
      <strong>Objet :</strong> ${isLoc
        ? `Location Longue Durée du véhicule ${v?.brand} ${v?.model} ${v?.year} — ${montant}. Services inclus : assurance, assistance 24/7, entretien, contrôle technique.`
        : `Vente du véhicule ${v?.brand} ${v?.model} ${v?.year} — ${montant} TTC.`}<br><br>
      <strong>Conditions :</strong> Le client reconnaît avoir pris connaissance des CGV M-Motors. Le transfert de propriété intervient au complet règlement. Données traitées conformément au RGPD.
    </div>
    <div class="form-group">
      <label class="form-label">Signature — Tapez votre nom complet <span style="color:var(--danger)">*</span></label>
      <input class="form-input" type="text" id="sign-nom"
        placeholder="${session.first_name} ${session.last_name}"
        style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.2rem;color:#1e3a5f"
        oninput="document.getElementById('sign-preview').textContent=this.value"/>
      <div id="sign-preview" style="margin-top:.5rem;padding:.6rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.4rem;min-height:40px;font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.25rem;color:#1e3a5f"></div>
    </div>
    <label style="display:flex;align-items:flex-start;gap:.75rem;font-size:.875rem;background:var(--accent-light);padding:.75rem;border-radius:.4rem">
      <input type="checkbox" id="sign-check" style="margin-top:.2rem;width:1rem;height:1rem;flex-shrink:0"/>
      <span>J'ai lu et j'accepte les Conditions Générales M-Motors. Cette signature électronique a valeur contractuelle.</span>
    </label>
    <div id="sign-alert" style="margin-top:.75rem"></div>`;
  document.getElementById('modal-step').classList.add('open');
}

function openReceptionModal(contratId) {
  currentContratId = contratId;
  const c = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const v = c.vehicle_info;
  document.getElementById('modal-step-title').textContent = 'Signature de réception du véhicule';
  document.getElementById('modal-step-content').innerHTML = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:.5rem;padding:1rem;font-size:.82rem;color:#475569;margin-bottom:1.25rem;line-height:1.7;max-height:140px;overflow-y:auto">
      <div style="font-weight:800;font-size:.88rem;color:#0f172a;margin-bottom:.5rem;text-transform:uppercase">Procès-verbal de remise — ${c.dossier_ref}</div>
      Je soussigné(e), reconnais avoir reçu le véhicule <strong>${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</strong>
      en bon état de fonctionnement, conformément au contrat ${c.type_display.toLowerCase()} signé.
      <br>Je confirme avoir pris connaissance des conditions et engagements contractuels.
    </div>
    <div class="form-group">
      <label class="form-label">Votre signature — Tapez votre nom complet <span style="color:var(--danger)">*</span></label>
      <input class="form-input" type="text" id="reception-nom"
        placeholder="${session.first_name} ${session.last_name}"
        style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.2rem;color:#1e3a5f"
        oninput="document.getElementById('reception-preview').textContent=this.value"/>
      <div id="reception-preview" style="margin-top:.5rem;padding:.6rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.4rem;min-height:40px;font-family:'Segoe Script','Brush Script MT',cursive;font-size:1.25rem;color:#1e3a5f"></div>
    </div>
    <label style="display:flex;align-items:flex-start;gap:.75rem;font-size:.875rem;background:var(--accent-light);padding:.75rem;border-radius:.4rem">
      <input type="checkbox" id="reception-check" style="margin-top:.2rem;width:1rem;height:1rem;flex-shrink:0"/>
      <span>Je certifie avoir réceptionné le véhicule en parfait état et en avoir pris possession ce jour.</span>
    </label>
    <div id="reception-alert" style="margin-top:.75rem"></div>`;
  document.getElementById('modal-step').classList.add('open');
}

function openRDVModal(contratId) {
  currentContratId = contratId;
  const c = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const dates = c.rdv_dates_proposees || [];
  document.getElementById('modal-step-title').textContent = 'Choisir votre date de remise des clés';
  document.getElementById('modal-step-content').innerHTML = `
    ${c.commentaire ? `<div class="alert alert-info" style="margin-bottom:1rem"><strong>Message M-Motors :</strong> ${c.commentaire}</div>` : ''}
    ${c.rdv_lieu ? `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.85rem 1rem;margin-bottom:1rem;font-size:.88rem">
      <strong>Lieu de remise :</strong> ${c.rdv_lieu}
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">Sélectionnez une date <span style="color:var(--danger)">*</span></label>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem">
        ${dates.map(d => `
          <label style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:all .2s"
                 onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor=document.getElementById('rdv-radio-${d}')?.checked?'var(--accent)':'var(--border)'">
            <input type="radio" name="rdv-date" id="rdv-radio-${d}" value="${d}" style="width:1rem;height:1rem;flex-shrink:0"/>
            <span style="font-weight:600;font-size:.95rem">${new Date(d).toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
          </label>`).join('')}
      </div>
    </div>
    <div id="rdv-alert" style="margin-top:.75rem"></div>`;
  document.getElementById('modal-step').classList.add('open');
}

async function confirmStep() {
  if (currentContratId) {
    const c = allContrats.find(x => x.id === currentContratId);
    if (!c) return;
    if (c.statut === 'a_signer') {
      const nom = document.getElementById('sign-nom')?.value?.trim();
      if (!nom) { toast('Veuillez saisir votre nom complet.', 'warn'); return; }
      const checked = document.getElementById('sign-check')?.checked;
      if (!checked) { toast('Veuillez accepter les Conditions Générales avant de signer.', 'warn'); return; }
      const btn = document.querySelector('#modal-step .btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Signature en cours…'; }
      try {
        await api.signerContrat(c.id, nom);
        toast('Contrat signé. M-Motors va vérifier votre signature.', 'success');
        closeModal('modal-step');
        await loadAll();
      } catch(e) {
        const alertEl = document.getElementById('sign-alert');
        if (alertEl) {
          alertEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
        } else {
          toast(e.message, 'danger');
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmer'; }
      }
    } else if (c.statut === 'rdv_propose') {
      const chosen = document.querySelector('input[name="rdv-date"]:checked')?.value;
      if (!chosen) { toast('Veuillez sélectionner une date.', 'warn'); return; }
      const btn = document.querySelector('#modal-step .btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Confirmation…'; }
      try {
        await api.confirmerRDVContrat(c.id, chosen);
        toast('Date confirmée. Rendez-vous le ' + new Date(chosen).toLocaleDateString('fr-FR') + '.', 'success');
        closeModal('modal-step');
        await loadAll();
      } catch(e) {
        const alertEl = document.getElementById('rdv-alert');
        if (alertEl) alertEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
        else toast(e.message, 'danger');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmer'; }
      }
    } else if (c.statut === 'rdv_confirme') {
      const nom = document.getElementById('reception-nom')?.value?.trim();
      if (!nom) { toast('Veuillez saisir votre nom complet.', 'warn'); return; }
      const btn = document.querySelector('#modal-step .btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Signature en cours…'; }
      try {
        await api.confirmerReceptionContrat(c.id, nom);
        toast('Réception signée. M-Motors va finaliser la remise.', 'success');
        closeModal('modal-step');
        await loadAll();
      } catch(e) {
        const alertEl = document.getElementById('reception-alert');
        if (alertEl) alertEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
        toast(e.message, 'danger');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmer'; }
      }
    }
  }
}
