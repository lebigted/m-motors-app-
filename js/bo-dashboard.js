/** @file bo-dashboard.js  KPIs, actions requises et graphiques Chart.js du tableau de bord admin*/

// ── Stats ───────────────────────────────────────────────

async function loadStats() {
  try {
    const [vData, dData] = await Promise.all([api.getVehicles({ page_size: 1000 }), api.getDossiers()]);
    const vehicles = vData.results || [];
    const dossiers = dData.results || [];
    allDossiers    = dossiers;

    const vLoc    = vehicles.filter(v => v.type === 'location').length;
    const vAchat  = vehicles.filter(v => v.type === 'achat').length;
    const vDispo  = vehicles.filter(v => v.status === 'disponible').length;
    const dSoumis = dossiers.filter(d => d.status === 'soumis').length;
    const dCours  = dossiers.filter(d => d.status === 'en_cours').length;
    const dVal    = dossiers.filter(d => d.status === 'valide').length;
    const dRef    = dossiers.filter(d => d.status === 'refuse').length;
    const totalD  = dossiers.length || 1;

    document.getElementById('bo-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${vehicles.length}</div>
        <div class="stat-label">Véhicules catalogue</div>
        <div class="stat-sub">${vDispo} disponibles</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(vDispo/Math.max(vehicles.length,1)*100)}%;background:var(--success)"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${vLoc}</div>
        <div class="stat-label">En Location LLD</div>
        <div class="stat-sub">${vAchat} en vente</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(vLoc/Math.max(vehicles.length,1)*100)}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--warn)">${dSoumis + dCours}</div>
        <div class="stat-label">Dossiers à instruire</div>
        <div class="stat-sub">${dSoumis} soumis · ${dCours} en cours</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round((dSoumis+dCours)/totalD*100)}%;background:var(--warn)"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--success)">${dVal}</div>
        <div class="stat-label">Dossiers validés</div>
        <div class="stat-sub">${dRef} refusé(s)</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(dVal/totalD*100)}%;background:var(--success)"></div></div>
      </div>`;
  } catch(e) { console.error(e); }
}


// ── Actions requises partagé dashboard + onglet contrats ──

const ACTIONS_META = {
  signe:       { label: 'Valider la signature',   icon: '✍️', color: '#3b82f6', action: 'valider_signature' },
  a_payer:     { label: 'Confirmer le paiement',  icon: '💳', color: '#8b5cf6', action: 'valider_paiement'  },
  paye:        { label: 'Proposer un RDV remise', icon: '📅', color: '#0ea5e9', action: 'proposer_rdv'      },
  rdv_confirme:{ label: 'Confirmer la remise',    icon: '🔑', color: '#10b981', action: 'livrer'            },
};

function renderActionsRequises() {
  const pending = allContrats.filter(c => ACTIONS_META[c.statut]);

  // Badge sur l'onglet
  const badge = document.getElementById('actions-badge');
  if (badge) {
    badge.textContent   = pending.length;
    badge.style.display = pending.length ? 'inline' : 'none';
  }

  const html = pending.length
    ? `<div style="background:#fff;border:2px solid var(--warn);border-radius:var(--radius);padding:1.25rem 1.5rem">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1rem">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--warn);flex-shrink:0"></div>
          <span style="font-weight:800;font-size:.95rem;color:var(--primary)">Actions requises (${pending.length})</span>
          <span style="font-size:.8rem;color:var(--text-muted)">— Ces contrats attendent votre intervention</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          ${pending.map(c => {
            const m  = ACTIONS_META[c.statut];
            const cl = c.client_info;
            const v  = c.vehicle_info;
            const hint = c.statut === 'signe' && c.signature_nom
              ? ` · signé par <em>${c.signature_nom}</em>`
              : c.statut === 'rdv_confirme' && c.rdv_date_confirmee
                ? ` · RDV le ${fmtDate(c.rdv_date_confirmee)}`
                : c.statut === 'a_payer'
                  ? ` · montant ${fmtPrice(c.montant)}${c.type === 'location' ? '/mois' : ''}`
                  : c.statut === 'paye' && c.paiement_date
                    ? ` · paiement reçu le ${fmtDate(c.paiement_date)}`
                    : '';
            return `<div style="display:flex;align-items:center;gap:1rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem 1rem;flex-wrap:wrap">
              <div style="width:34px;height:34px;border-radius:50%;background:${m.color}18;border:2px solid ${m.color}44;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">${m.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:.88rem;color:var(--primary)">${m.label}</div>
                <div style="font-size:.78rem;color:var(--text-muted)">
                  <strong>${c.dossier_ref}</strong> · ${cl ? cl.last_name + ' ' + cl.first_name : '—'} · ${v ? v.brand + ' ' + v.model + ' ' + v.year : '—'}${hint}
                </div>
              </div>
              <button class="btn btn-sm btn-primary" style="flex-shrink:0;background:${m.color};border-color:${m.color}"
                onclick="openContratAction('${m.action}', ${c.id})">${m.label}</button>
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Injecte dans le dashboard et dans l'onglet contrats
  ['actions-requises', 'actions-requises-contrats'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML      = html;
    el.style.display  = pending.length ? 'block' : 'none';
  });
}

// ── Dashboard ─────────────────────────────────────────────

function bar(val, total, color) {
  const pct = total ? Math.round(val / total * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.65rem">
    <div style="flex:1;background:var(--border);border-radius:3px;height:10px;overflow:hidden">
      <div style="width:${pct}%;background:${color};height:100%;border-radius:3px;transition:width .5s ease"></div>
    </div>
    <span style="font-size:.82rem;font-weight:700;min-width:28px;text-align:right">${val}</span>
    <span style="font-size:.75rem;color:var(--text-muted);min-width:28px">${pct}%</span>
  </div>`;
}

async function loadDashboard() {
  try {
    const [vData, dData, cData, arcData] = await Promise.all([
      api.getVehicles({ page_size: 1000 }),
      api.getDossiers(),
      api.getContrats().catch(() => ({ results: [] })),
      api.getDossiers({ archived: 'true' }).catch(() => ({ results: [] })),
    ]);
    const vehicles  = vData.results  || [];
    const dossiers  = dData.results  || [];
    const dArchives = (arcData.results || []).length;
    // Met à jour allContrats pour que les modales d'action fonctionnent depuis le dashboard
    allContrats = cData.results || [];

    // ── Bloc "Actions requises" ──────────────────────────────
    renderActionsRequises();

    // KPIs
    const dispo   = vehicles.filter(v => v.status === 'disponible').length;
    const reserve = vehicles.filter(v => v.status === 'reserve').length;
    const vendu   = vehicles.filter(v => v.status === 'vendu').length;
    const attente = dossiers.filter(d => d.status === 'soumis' || d.status === 'en_cours').length;
    const valides = dossiers.filter(d => d.status === 'valide').length;
    const caLLD   = vehicles
      .filter(v => v.type === 'location' && v.status === 'vendu' && v.monthly)
      .reduce((s, v) => s + parseFloat(v.monthly), 0);

    document.getElementById('kpi-dispo').textContent    = dispo;
    document.getElementById('kpi-reserve').textContent  = reserve;
    document.getElementById('kpi-vendu').textContent    = vendu;
    document.getElementById('kpi-attente').textContent  = attente;
    document.getElementById('kpi-valides').textContent  = valides;
    document.getElementById('kpi-ca').textContent       = caLLD ? caLLD.toLocaleString('fr-FR') + ' €' : '0 €';
    document.getElementById('kpi-archives').textContent = dArchives;

    // ── Chart.js Répartition parc
    const vLoc  = vehicles.filter(v => v.type === 'location').length;
    const vAcht = vehicles.filter(v => v.type === 'achat').length;
    if (window._chartParc) window._chartParc.destroy();
    window._chartParc = new Chart(document.getElementById('parc-chart'), {
      type: 'doughnut',
      data: {
        labels: ['Location LLD', 'Achat', 'Disponibles', 'Réservés', 'Vendus/Loués'],
        datasets: [{
          data: [vLoc, vAcht, dispo, reserve, vendu],
          backgroundColor: ['#3b82f6','#10b981','#34d399','#f59e0b','#94a3b8'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label} : ${ctx.parsed} véhicule(s)` } },
        },
        cutout: '62%',
      },
    });

    // ── Chart.js : Pipeline dossiers Bar horizontal
    const dSoumis  = dossiers.filter(d => d.status === 'soumis').length;
    const dCours   = dossiers.filter(d => d.status === 'en_cours').length;
    const dVal     = dossiers.filter(d => d.status === 'valide').length;
    const dRef     = dossiers.filter(d => d.status === 'refuse').length;
    const txVal    = dossiers.length ? Math.round(dVal / dossiers.length * 100) : 0;
    if (window._chartPipeline) window._chartPipeline.destroy();
    window._chartPipeline = new Chart(document.getElementById('pipeline-chart'), {
      type: 'bar',
      data: {
        labels: ['Soumis', 'En cours', 'Validés', 'Refusés', 'Archivés'],
        datasets: [{
          label: 'Dossiers',
          data: [dSoumis, dCours, dVal, dRef, dArchives],
          backgroundColor: ['#94a3b8','#f59e0b','#10b981','#ef4444','#64748b'],
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} dossier(s)` } },
          title: { display: true, text: `${dossiers.length} dossiers · Taux validation ${txVal}%`, font: { size: 11 }, color: '#64748b', padding: { bottom: 8 } },
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { stepSize: 1, font: { size: 11 } } },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });

    // Véhicules réservés
    const reserved = vehicles.filter(v => v.status === 'reserve');
    document.getElementById('reserve-count').textContent = `(${reserved.length})`;
    document.getElementById('reserved-list').innerHTML = reserved.length
      ? reserved.map(v => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600;font-size:.88rem">${v.brand} ${v.model} ${v.year}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${v.type_display} · ${v.type==='location' ? fmtPrice(v.monthly)+'/mois' : fmtPrice(v.price)}</div>
          </div>
          <span class="card-tag tag-reserve">Réservé</span>
        </div>`).join('')
      : '<p class="text-muted text-sm">Aucun véhicule réservé.</p>';

    // Derniers dossiers
    const recent = [...dossiers].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    document.getElementById('recent-dossiers').innerHTML = recent.length
      ? recent.map(d => {
          const c = d.client_info;
          const v = d.vehicle_info;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:.88rem">${c ? c.last_name+' '+c.first_name : '#'+d.client}</div>
              <div style="font-size:.78rem;color:var(--text-muted)">${v ? v.brand+' '+v.model : '—'} · ${fmtDate(d.created_at)}</div>
            </div>
            ${fmtStatus(d.status)}
          </div>`;
        }).join('')
      : '<p class="text-muted text-sm">Aucun dossier récent.</p>';

  } catch(e) { console.error('Dashboard error:', e); }
}
