/** @file bo-dossiers.js Instruction des dossiers, export CSV, archives et décision admin*/

// ── Dossiers ─────────────────────────────────────────────

async function loadDossiers() {
  const tbody  = document.getElementById('dossiers-tbody');
  const search = document.getElementById('search-d').value.toLowerCase();
  const sF     = document.getElementById('filter-dossier-status').value;
  const tF     = document.getElementById('filter-dossier-type').value;
  try {
    const params = {};
    if (sF) params.status = sF;
    if (tF) params.type   = tF;
    const data    = await api.getDossiers(params);
    let dossiers  = data.results || [];
    allDossiers   = dossiers;

    // Filtre texte client-side
    if (search) {
      dossiers = dossiers.filter(d => {
        const c = d.client_info;
        const v = d.vehicle_info;
        return (c && (c.last_name + ' ' + c.first_name + ' ' + c.email).toLowerCase().includes(search))
            || (v && (v.brand + ' ' + v.model).toLowerCase().includes(search));
      });
    }

    if (!dossiers.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--muted)">Aucun dossier.</td></tr>`;
      return;
    }
    tbody.innerHTML = dossiers.map(d => {
      const c = d.client_info;
      const v = d.vehicle_info;
      return `<tr>
        <td style="font-family:monospace;font-size:.8rem">MM-${String(d.id).padStart(6,'0')}</td>
        <td>
          <strong>${c ? c.last_name + ' ' + c.first_name : '#' + d.client}</strong><br>
          <span class="text-muted text-sm">${c ? c.email : ''}</span>
        </td>
        <td>${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</td>
        <td><span class="card-tag tag-${d.type}">${d.type_display}</span></td>
        <td>${d.revenus ? fmtPrice(d.revenus) + '/mois' : '—'}</td>
        <td style="font-size:.82rem">${fmtDate(d.created_at)}</td>
        <td>
          ${(d.documents||[]).map(doc =>
            `<span class="doc-chip">${doc.fichier_url
              ? `<a href="${doc.fichier_url}" target="_blank">${doc.type_doc_display}</a>`
              : doc.type_doc_display}</span>`
          ).join('') || '<span class="text-muted text-sm">—</span>'}
        </td>
        <td>${fmtStatus(d.status)}</td>
        <td>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            ${d.status !== 'valide'
              ? `<button class="btn btn-primary btn-sm" onclick="openDossierModal(${d.id})">Instruire</button>`
              : `<button class="btn btn-success btn-sm" onclick="openCreateContratModal(${d.id})" style="background:var(--success);border-color:var(--success)">Créer contrat</button>
                 <button class="btn btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text)" onclick="openDossierModal(${d.id})">Consulter</button>`
            }
            <button class="btn btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text-muted)"
              onclick="doArchiveDossier(${d.id}, this)" title="Archiver ce dossier">
              Archive
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="9" style="color:var(--danger);padding:1rem">${e.message}</td></tr>`; }
}

// ── Export CSV ───────────────────────────────────────────

function exportCSV() {
  if (!allDossiers.length) { toast('Aucun dossier à exporter.', 'warn'); return; }
  const header = ['Reference','Client','Email','Vehicule','Type','Revenus','Situation','Statut','Date'];
  const rows   = allDossiers.map(d => {
    const c = d.client_info;
    const v = d.vehicle_info;
    return [
      `MM-${String(d.id).padStart(6,'0')}`,
      c ? c.last_name + ' ' + c.first_name : d.client,
      c ? c.email : '',
      v ? v.brand + ' ' + v.model + ' ' + v.year : d.vehicle,
      d.type_display,
      d.revenus || '',
      d.situation || '',
      d.status,
      d.created_at ? d.created_at.slice(0,10) : '',
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(';');
  });
  const csv  = [header.join(';'), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'mmotors_dossiers.csv' });
  a.click();
  URL.revokeObjectURL(url);
  toast(`${allDossiers.length} dossier(s) exporté(s).`, 'success');
}


// ── Modal dossier ─────────────────────────────────────────

async function openDossierModal(id) {
  currentDossierId        = id;
  currentDossierVehicleId = null;
  document.getElementById('d-motif').value = '';
  document.getElementById('modal-dossier-alert').innerHTML = '';
  document.getElementById('modal-dossier-recap').innerHTML = '<p class="text-muted">Chargement…</p>';
  document.getElementById('modal-dossier').classList.add('open');
  try {
    const d = await api.getDossier(id);
    const c = d.client_info;
    const v = d.vehicle_info;
    currentDossierVehicleId = d.vehicle;
    document.getElementById('d-motif').value = d.motif || '';
    document.getElementById('modal-dossier-recap').innerHTML = `
      <table class="data-table" style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:1rem">
        <tr><td style="font-weight:600;background:var(--bg);width:140px">Référence</td><td>MM-${String(d.id).padStart(6,'0')}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Client</td>
            <td>${c ? `<strong>${c.last_name} ${c.first_name}</strong> — ${c.email}` : '—'}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Véhicule</td>
            <td>${v ? v.brand + ' ' + v.model + ' ' + v.year + ' (' + v.type_display + ')' : '—'}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Type</td><td>${d.type_display}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Revenus</td><td>${d.revenus ? fmtPrice(d.revenus) + '/mois' : '—'}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Situation</td><td>${d.situation || '—'}</td></tr>
        ${d.message ? `<tr><td style="font-weight:600;background:var(--bg)">Message</td><td>${d.message}</td></tr>` : ''}
        <tr><td style="font-weight:600;background:var(--bg)">Statut actuel</td><td>${fmtStatus(d.status)}</td></tr>
        <tr><td style="font-weight:600;background:var(--bg)">Documents</td>
            <td>${(d.documents||[]).map(doc =>
              `<span class="doc-chip">${doc.fichier_url
                ? `<a href="${doc.fichier_url}" target="_blank">${doc.type_doc_display}</a>`
                : doc.type_doc_display}</span>`
            ).join('') || '<span class="text-muted">Aucun document</span>'}</td></tr>
      </table>`;
  } catch(e) {
    document.getElementById('modal-dossier-recap').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function decideDossier(status) {
  const motif = document.getElementById('d-motif').value.trim();
  if (status === 'refuse' && !motif) {
    document.getElementById('modal-dossier-alert').innerHTML = '<div class="alert alert-warn">Un motif est obligatoire pour un refus.</div>';
    return;
  }
  try {
    await api.decideDossier(currentDossierId, status, motif);
    // Mise à jour automatique du statut véhicule
    if (currentDossierVehicleId) {
      if (status === 'valide') {
        api.updateVehicleStatus(currentDossierVehicleId, 'reserve').catch(() => {});
      } else if (status === 'refuse') {
        api.updateVehicleStatus(currentDossierVehicleId, 'disponible').catch(() => {});
      }
    }
    const labels = { en_cours: 'mis en cours', valide: 'validé', refuse: 'refusé' };
    toast(`Dossier ${labels[status] || status}.`, status === 'valide' ? 'success' : status === 'refuse' ? 'danger' : 'info');
    closeModals();
    loadDossiers(); loadStats();
  } catch(e) {
    document.getElementById('modal-dossier-alert').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}


// ── Archives ──────────────────────────────────────────────

async function loadArchives() {
  const tbody  = document.getElementById('archives-tbody');
  const search = document.getElementById('search-arc').value.toLowerCase();
  const sF     = document.getElementById('filter-arc-status').value;
  const tF     = document.getElementById('filter-arc-type').value;
  try {
    const params = { archived: 'true' };
    if (sF) params.status = sF;
    if (tF) params.type   = tF;
    const data     = await api.getDossiers(params);
    let dossiers   = data.results || [];

    const badge = document.getElementById('archives-badge');
    badge.textContent   = dossiers.length;
    badge.style.display = dossiers.length ? 'inline' : 'none';

    if (search) {
      dossiers = dossiers.filter(d => {
        const c = d.client_info;
        const v = d.vehicle_info;
        return (c && (c.last_name + ' ' + c.first_name + ' ' + c.email).toLowerCase().includes(search))
            || (v && (v.brand + ' ' + v.model).toLowerCase().includes(search));
      });
    }

    if (!dossiers.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--muted)">Aucun dossier archivé.</td></tr>`;
      return;
    }

    tbody.innerHTML = dossiers.map(d => {
      const c = d.client_info;
      const v = d.vehicle_info;
      return `<tr style="opacity:.8;background:#f8fafc">
        <td style="font-family:monospace;font-size:.8rem">MM-${String(d.id).padStart(6,'0')}</td>
        <td>
          <strong>${c ? c.last_name + ' ' + c.first_name : '#' + d.client}</strong><br>
          <span class="text-muted text-sm">${c ? c.email : ''}</span>
        </td>
        <td>${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}</td>
        <td><span class="card-tag tag-${d.type}">${d.type_display}</span></td>
        <td>${d.revenus ? fmtPrice(d.revenus) + '/mois' : '—'}</td>
        <td style="font-size:.82rem">${fmtDate(d.created_at)}</td>
        <td>
          ${(d.documents||[]).map(doc =>
            `<span class="doc-chip">${doc.fichier_url
              ? `<a href="${doc.fichier_url}" target="_blank">${doc.type_doc_display}</a>`
              : doc.type_doc_display}</span>`
          ).join('') || '<span class="text-muted text-sm">—</span>'}
        </td>
        <td>
          ${fmtStatus(d.status)}
          <span style="display:block;margin-top:.25rem;font-size:.7rem;background:#f1f5f9;border:1px solid var(--border);padding:.1rem .4rem;border-radius:.25rem;color:var(--text-muted);width:fit-content">Archivé</span>
        </td>
        <td>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            <button class="btn btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text-muted)"
              onclick="doDesarchiver(${d.id})">Désarchiver</button>
            <button class="btn btn-sm" style="background:#fee2e2;border:1px solid #fca5a5;color:var(--danger)"
              onclick="doSupprimerDossier(${d.id})">Supprimer</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--danger);padding:1rem">${e.message}</td></tr>`;
  }
}

async function doDesarchiver(id) {
  try {
    const res = await api.archiveDossier(id);
    toast(res.detail || 'Désarchivé.', 'info');
    loadArchives(); loadDossiers(); loadStats();
  } catch(e) { toast(e.message, 'danger'); }
}

async function doSupprimerDossier(id) {
  if (!confirm('Supprimer définitivement ce dossier (et son contrat associé) ?')) return;
  try {
    await api.deleteDossier(id);
    toast('Dossier supprimé.', 'success');
    loadArchives(); loadDossiers(); loadStats();
  } catch(e) { toast(e.message, 'danger'); }
}


// ── Archive dossier (admin) ───────────────────────────────

async function doArchiveDossier(id, btn) {
  try {
    const res = await api.archiveDossier(id);
    toast(res.detail || 'Archivé.', 'info');
    loadDossiers(); loadStats();
  } catch(e) { toast(e.message, 'danger'); }
}
