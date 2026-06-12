/** @file bo-contrats.js  État, chargement et rendu du tableau des contrats */

// ── État ──────────────────────────────────────────────────

let allContrats = [];
let currentContratId = null;

const WORKFLOW_META = {
  'a_signer':         { color: '#f59e0b', label: '1/7 — Att. signature',        adminAction: null,               clientAction: true  },
  'signe':            { color: '#3b82f6', label: '2/7 — Signé (à valider)',     adminAction: 'valider_signature',clientAction: false },
  'a_payer':          { color: '#f59e0b', label: '3/7 — Att. paiement',         adminAction: 'valider_paiement', clientAction: false },
  'paye':             { color: '#3b82f6', label: '4/7 — Payé (RDV)',            adminAction: 'proposer_rdv',     clientAction: false },
  'rdv_propose':      { color: '#8b5cf6', label: '5/7 — RDV proposé',           adminAction: null,               clientAction: true  },
  'rdv_confirme':     { color: '#0ea5e9', label: '6/7 — Att. réception client', adminAction: null,               clientAction: true  },
  'reception_signee': { color: '#10b981', label: '7/7 — Réception signée',      adminAction: 'livrer',           clientAction: false },
  'actif':            { color: '#10b981', label: 'Actif',                        adminAction: null,               clientAction: false },
  'termine':          { color: '#94a3b8', label: 'Terminé',                      adminAction: null,               clientAction: false },
  'resilie':          { color: '#ef4444', label: 'Résilié',                      adminAction: null,               clientAction: false },
};

const ADMIN_ACTION_LABELS = {
  'valider_signature': 'Valider signature',
  'valider_paiement':  'Valider paiement',
  'proposer_rdv':      'Proposer RDV',
  'livrer':            'Confirmer remise',
};

// ── Chargement ────────────────────────────────────────────

async function loadContrats() {
  const tbody = document.getElementById('contrats-tbody');
  try {
    const data   = await api.getContrats();
    allContrats  = data.results || [];
    renderContratsTable(allContrats);
    renderActionsRequises();

    const actifs   = allContrats.filter(c => c.statut === 'actif');
    const pipeline = allContrats.filter(c => !['actif','termine','resilie'].includes(c.statut));
    const lld      = actifs.filter(c => c.type === 'location');
    const ca       = lld.reduce((s, c) => s + parseFloat(c.montant||0), 0);
    const kmMoy    = actifs.length
      ? Math.round(actifs.reduce((s,c) => s + Math.max(0,(c.km_actuel||0)-(c.km_initial||0)),0) / actifs.length)
      : 0;

    document.getElementById('ck-pipeline').textContent = pipeline.length;
    document.getElementById('ck-actifs').textContent   = actifs.length;
    document.getElementById('ck-lld').textContent      = lld.length;
    document.getElementById('ck-ca').textContent       = fmtPrice(ca);
    document.getElementById('ck-km').textContent       = kmMoy.toLocaleString('fr-FR')+' km';

    const badge = document.getElementById('contrats-badge');
    const total  = pipeline.length + actifs.length;
    badge.textContent   = total;
    badge.style.display = total ? 'inline' : 'none';

  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger);padding:1rem">Erreur : ${e.message}</td></tr>`;
  }
}

// ── Filtre ────────────────────────────────────────────────

function filterContrats() {
  const search  = document.getElementById('search-contrat').value.toLowerCase();
  const typeF   = document.getElementById('filter-contrat-type').value;
  const statutF = document.getElementById('filter-contrat-statut').value;
  let list = allContrats;
  if (typeF)   list = list.filter(c => c.type === typeF);
  if (statutF) list = list.filter(c => c.statut === statutF);
  if (search)  list = list.filter(c => {
    const cl = c.client_info;
    const v  = c.vehicle_info;
    return `${cl?.last_name} ${cl?.first_name} ${cl?.email} ${v?.brand} ${v?.model}`.toLowerCase().includes(search);
  });
  renderContratsTable(list);
}

// ── Rendu tableau ─────────────────────────────────────────

function renderContratsTable(list) {
  const tbody = document.getElementById('contrats-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Aucun contrat.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(c => {
    const cl   = c.client_info;
    const v    = c.vehicle_info;
    const meta = WORKFLOW_META[c.statut] || { color: '#94a3b8', label: c.statut, adminAction: null };

    const chips = [];
    if (c.signature_nom) {
      chips.push(`<div style="font-size:.75rem;margin-bottom:.2rem">
        <span style="color:var(--success);font-weight:700">✓ Sig :</span>
        <span style="color:var(--text-muted)"> ${c.signature_nom}${c.signature_date ? ' · ' + fmtDate(c.signature_date) : ''}</span>
        ${c.signature_validee_at ? `<span style="color:var(--success)"> · validée ✓</span>` : `<span style="color:var(--warn)"> · à valider</span>`}
      </div>`);
    }
    if (c.paiement_date) {
      chips.push(`<div style="font-size:.75rem;margin-bottom:.2rem">
        <span style="color:var(--success);font-weight:700">✓ Pay :</span>
        <span style="color:var(--text-muted)"> ${c.paiement_mode_display || c.paiement_mode} · ${fmtDate(c.paiement_date)}</span>
        ${c.paiement_reference ? `<span style="color:var(--text-muted)"> · ${c.paiement_reference}</span>` : ''}
        ${c.paiement_verifie_at ? `<span style="color:var(--success)"> · confirmé ✓</span>` : `<span style="color:var(--warn)"> · à vérifier</span>`}
      </div>`);
    }
    if (c.rdv_dates_proposees?.length || c.rdv_date_confirmee) {
      if (c.rdv_date_confirmee) {
        chips.push(`<div style="font-size:.75rem;margin-bottom:.2rem">
          <span style="color:var(--success);font-weight:700">✓ RDV :</span>
          <span style="color:var(--text-muted)"> ${fmtDate(c.rdv_date_confirmee)}${c.rdv_lieu ? ' · ' + c.rdv_lieu : ''}</span>
        </div>`);
      } else {
        chips.push(`<div style="font-size:.75rem;margin-bottom:.2rem">
          <span style="color:var(--accent);font-weight:700">RDV :</span>
          <span style="color:var(--text-muted)"> ${c.rdv_dates_proposees.length} date(s) proposée(s) · att. client</span>
        </div>`);
      }
    }
    if (c.livraison_date) {
      chips.push(`<div style="font-size:.75rem">
        <span style="color:var(--success);font-weight:700">✓ Remis :</span>
        <span style="color:var(--text-muted)"> ${fmtDate(c.livraison_date)}</span>
      </div>`);
    }
    const suiviCell = chips.length ? chips.join('') : `<span style="color:var(--text-muted);font-size:.78rem;font-style:italic">—</span>`;

    const btnVoir = `<button class="btn btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text);font-size:.78rem" onclick="openContratDetailModal(${c.id})">Voir</button>`;
    let actionCell = btnVoir;
    if (meta.adminAction) {
      actionCell = `<div style="display:flex;flex-direction:column;gap:.3rem">
                      <button class="btn btn-primary btn-sm" onclick="openContratAction('${meta.adminAction}', ${c.id})">
                        ${ADMIN_ACTION_LABELS[meta.adminAction]}
                      </button>
                      ${btnVoir}
                    </div>`;
    } else if (meta.clientAction) {
      actionCell = `<div style="display:flex;flex-direction:column;gap:.3rem">
                      <span style="font-size:.78rem;color:var(--text-muted);font-style:italic">Att. client</span>
                      ${btnVoir}
                    </div>`;
    }

    return `<tr>
      <td>
        <div style="font-family:monospace;font-size:.8rem;font-weight:700;color:var(--primary)">${c.dossier_ref}</div>
        <div style="font-weight:600;font-size:.85rem;margin-top:.2rem">${cl ? cl.last_name + ' ' + cl.first_name : '—'}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${cl?.email || ''}</div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-top:.1rem">${fmtDate(c.created_at)}</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:.85rem">${v ? v.brand + ' ' + v.model : '—'}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${v?.year || ''} · ${v?.fuel || ''}</div>
      </td>
      <td>
        <span class="card-tag tag-${c.type}">${c.type_display}</span>
        <div style="font-weight:700;font-size:.88rem;margin-top:.3rem">${c.type === 'location' ? fmtPrice(c.montant) + '/mois' : fmtPrice(c.montant)}</div>
      </td>
      <td>
        <span style="display:inline-block;background:${meta.color}18;color:${meta.color};border:1px solid ${meta.color}44;
              border-radius:var(--radius-sm);padding:.2rem .6rem;font-size:.75rem;font-weight:700;white-space:nowrap">
          ${meta.label}
        </span>
      </td>
      <td style="min-width:200px">${suiviCell}</td>
      <td style="max-width:160px">
        ${c.commentaire
          ? `<div style="font-size:.78rem;color:var(--accent);background:var(--accent-light);border-radius:.3rem;padding:.3rem .5rem;border-left:2px solid var(--accent)">${c.commentaire}</div>`
          : `<span style="color:var(--text-muted);font-size:.78rem">—</span>`}
      </td>
      <td>${actionCell}</td>
    </tr>`;
  }).join('');
}
