/** @file bo-clients.js — Liste clients, filtre, et drawer de fiche avec historique contrats*/

// ── Fiches clients ────────────────────────────────────────

let allClients = [];

async function loadClients() {
  const tbody = document.getElementById('clients-tbody');
  try {
    const data = await api.getClients();
    allClients = Array.isArray(data) ? data : (data.results || []);
    renderClientsTable(allClients);
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--danger);padding:1rem">Erreur : ${e.message}</td></tr>`;
  }
}

function filterClients() {
  const q = document.getElementById('search-client').value.toLowerCase();
  renderClientsTable(q
    ? allClients.filter(c => `${c.last_name} ${c.first_name} ${c.email}`.toLowerCase().includes(q))
    : allClients);
}

function renderClientsTable(list) {
  const tbody = document.getElementById('clients-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--muted)">Aucun client.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(c => `
    <tr style="cursor:pointer" onclick="openClientDrawer(${c.id})">
      <td>
        <div style="display:flex;align-items:center;gap:.75rem">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;flex-shrink:0">
            ${(c.first_name?.[0]||'')+(c.last_name?.[0]||'')}
          </div>
          <div>
            <div style="font-weight:600">${c.last_name} ${c.first_name}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">#${c.id}</div>
          </div>
        </div>
      </td>
      <td style="font-size:.85rem">${c.email}</td>
      <td style="font-size:.85rem">${c.tel||'—'}</td>
      <td style="font-size:.82rem">${c.date_joined ? fmtDate(c.date_joined) : '—'}</td>
      <td><span style="font-weight:700">${c.nb_dossiers||0}</span></td>
      <td><span style="color:var(--success);font-weight:700">${c.nb_valides||0}</span></td>
      <td><span style="color:var(--accent);font-weight:700">${c.nb_contrats||0}</span></td>
      <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openClientDrawer(${c.id})">Voir la fiche</button></td>
    </tr>`).join('');
}

// ── Drawer fiche client ───────────────────────────────────

async function openClientDrawer(clientId) {
  const overlay = document.getElementById('client-drawer-overlay');
  const drawer  = document.getElementById('client-drawer');
  const content = document.getElementById('client-drawer-content');
  overlay.style.display = 'block';
  drawer.style.display  = 'block';
  content.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted)">Chargement…</div>`;

  try {
    const client = allClients.find(c => c.id === clientId);
    if (!client) throw new Error('Client introuvable');

    const [dData, cData] = await Promise.all([
      api.getDossiers({ client_id: clientId, archived: 'all' }),
      api.getContrats({ client_id: clientId }).catch(() => ({ results: [] })),
    ]);
    const dossiers = dData.results || [];
    const contrats = cData.results || [];

    const actifs   = dossiers.filter(d => !d.archived);
    const archives = dossiers.filter(d => d.archived);
    const ca       = contrats.reduce((s,c) => s + parseFloat(c.montant||0), 0);

    const initials = (client.first_name?.[0]||'') + (client.last_name?.[0]||'');
    content.innerHTML = `

      <!-- Header client -->
      <div style="background:linear-gradient(135deg,var(--primary),#1d4ed8);color:#fff;padding:2rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900">${initials}</div>
            <div>
              <div style="font-size:1.4rem;font-weight:900;letter-spacing:-.02em">${client.last_name} ${client.first_name}</div>
              <div style="opacity:.65;font-size:.88rem;margin-top:.2rem">${client.email}</div>
              ${client.tel ? `<div style="opacity:.5;font-size:.82rem">${client.tel}</div>` : ''}
            </div>
          </div>
          <button onclick="closeClientDrawer()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">&times;</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.5rem">
          <div style="background:rgba(255,255,255,.1);border-radius:.5rem;padding:.75rem;text-align:center">
            <div style="font-size:1.4rem;font-weight:900">${dossiers.length}</div>
            <div style="font-size:.7rem;opacity:.6;text-transform:uppercase;letter-spacing:.05em">Dossiers</div>
          </div>
          <div style="background:rgba(255,255,255,.1);border-radius:.5rem;padding:.75rem;text-align:center">
            <div style="font-size:1.4rem;font-weight:900;color:#6ee7b7">${dossiers.filter(d=>d.status==='valide').length}</div>
            <div style="font-size:.7rem;opacity:.6;text-transform:uppercase;letter-spacing:.05em">Validés</div>
          </div>
          <div style="background:rgba(255,255,255,.1);border-radius:.5rem;padding:.75rem;text-align:center">
            <div style="font-size:1.4rem;font-weight:900;color:#93c5fd">${contrats.length}</div>
            <div style="font-size:.7rem;opacity:.6;text-transform:uppercase;letter-spacing:.05em">Contrats</div>
          </div>
          <div style="background:rgba(255,255,255,.1);border-radius:.5rem;padding:.75rem;text-align:center">
            <div style="font-size:1.1rem;font-weight:900">${fmtPrice(ca)}</div>
            <div style="font-size:.7rem;opacity:.6;text-transform:uppercase;letter-spacing:.05em">CA Généré</div>
          </div>
        </div>
      </div>

      <!-- Infos compte -->
      <div style="padding:1.5rem;border-bottom:1px solid var(--border)">
        <div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem">Informations du compte</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.875rem">
          <div style="color:var(--text-muted)">Inscrit le</div><div style="font-weight:600">${fmtDate(client.date_joined)}</div>
          <div style="color:var(--text-muted)">Rôle</div><div>${client.role === 'admin' ? '<span class="card-tag" style="background:#fef3c7;color:#92400e">Admin</span>' : '<span class="card-tag tag-disponible">Client</span>'}</div>
          <div style="color:var(--text-muted)">Email</div><div><a href="mailto:${client.email}" style="color:var(--accent)">${client.email}</a></div>
          <div style="color:var(--text-muted)">Téléphone</div><div>${client.tel||'—'}</div>
        </div>
      </div>

      <!-- Dossiers actifs -->
      <div style="padding:1.5rem;border-bottom:1px solid var(--border)">
        <div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem">
          Dossiers actifs (${actifs.length})
        </div>
        ${actifs.length ? actifs.map(d => {
          const v = d.vehicle_info;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.65rem .85rem;border:1px solid var(--border);border-radius:.5rem;margin-bottom:.5rem;font-size:.875rem">
            <div>
              <div style="font-weight:700">MM-${String(d.id).padStart(6,'0')} — ${v?v.brand+' '+v.model:d.vehicle}</div>
              <div style="font-size:.78rem;color:var(--text-muted)">${d.type_display} · ${fmtDate(d.created_at)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem">
              ${fmtStatus(d.status)}
              <button class="btn btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text-muted);font-size:.72rem"
                onclick="doArchiveDossierFromDrawer(${d.id}, ${clientId})">Archiver</button>
            </div>
          </div>`;
        }).join('') : '<p class="text-muted text-sm">Aucun dossier actif.</p>'}
      </div>

      <!-- Contrats -->
      ${contrats.length ? `
      <div style="padding:1.5rem;border-bottom:1px solid var(--border)">
        <div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem">
          Contrats & suivi (${contrats.length})
        </div>
        ${contrats.map(c => {
          const v = c.vehicle_info;
          const isLoc = c.type === 'location';
          const WFLOW = {
            a_signer:    { label:'En attente de signature', color:'#f59e0b' },
            signe:       { label:'Signé', color:'#3b82f6' },
            a_payer:     { label:'En attente de paiement', color:'#8b5cf6' },
            paye:        { label:'Payé', color:'#10b981' },
            rdv_propose: { label:'RDV proposé', color:'#0ea5e9' },
            rdv_confirme:{ label:'RDV confirmé', color:'#6366f1' },
            actif:       { label:'Actif', color:'#22c55e' },
            termine:     { label:'Terminé', color:'#6b7280' },
            resilie:     { label:'Résilié', color:'#ef4444' },
          };
          const wf = WFLOW[c.statut] || { label: c.statut_display, color: '#6b7280' };
          const steps = [
            {
              done: !!c.signature_nom,
              label: 'Signature',
              icon: '✍️',
              content: c.signature_nom ? [
                `Signataire : <strong>${c.signature_nom}</strong>`,
                c.signature_date ? `Le ${fmtDate(c.signature_date)}` : '',
                c.signature_validee_at ? `<span style="color:var(--success);font-size:.78rem">✓ Validée par M-Motors le ${fmtDate(c.signature_validee_at)}</span>` : '<span style="color:var(--text-muted);font-size:.78rem">En attente de validation admin</span>',
              ].filter(Boolean).join('<br>') : null,
            },
            {
              done: !!c.paiement_date,
              label: 'Paiement',
              icon: '💳',
              content: c.paiement_date ? [
                `Mode : <strong>${c.paiement_mode_display||c.paiement_mode||'—'}</strong>`,
                `Date : <strong>${fmtDate(c.paiement_date)}</strong>`,
                c.paiement_reference ? `Référence : <strong>${c.paiement_reference}</strong>` : '',
                c.paiement_verifie_at ? `<span style="color:var(--success);font-size:.78rem">✓ Vérifié le ${fmtDate(c.paiement_verifie_at)}</span>` : '<span style="color:var(--text-muted);font-size:.78rem">En attente de vérification</span>',
              ].filter(Boolean).join('<br>') : null,
            },
            {
              done: !!c.rdv_date_confirmee,
              label: 'RDV remise',
              icon: '📅',
              content: (c.rdv_dates_proposees?.length || c.rdv_date_confirmee) ? [
                c.rdv_dates_proposees?.length ? `Proposé : ${c.rdv_dates_proposees.map(d=>fmtDate(d)).join(', ')}` : '',
                c.rdv_date_confirmee ? `<strong>Confirmé : ${fmtDate(c.rdv_date_confirmee)}</strong>` : '<span style="color:var(--text-muted);font-size:.78rem">En attente de confirmation client</span>',
                c.rdv_lieu ? `Lieu : ${c.rdv_lieu}` : '',
              ].filter(Boolean).join('<br>') : null,
            },
            {
              done: !!c.livraison_date,
              label: 'Remise',
              icon: '🔑',
              content: c.livraison_date ? `Remis le <strong>${fmtDate(c.livraison_date)}</strong>` : null,
            },
          ];
          const nbMoisEcoules = isLoc ? Math.max(0, Math.round((new Date()-new Date(c.date_debut))/(30*24*3600000))) : 1;
          const totalPaye = parseFloat(c.montant||0) * nbMoisEcoules;
          return `<div style="border:1px solid var(--border);border-radius:.65rem;overflow:hidden;margin-bottom:1rem">
            <!-- En-tête contrat -->
            <div style="padding:.85rem 1rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
              <div>
                <strong style="font-size:.9rem">${v?v.brand+' '+v.model+' '+v.year:'Véhicule'}</strong>
                <span style="font-size:.75rem;background:#f1f5f9;border:1px solid var(--border);padding:.1rem .45rem;border-radius:.25rem;margin-left:.4rem">${c.type_display}</span>
                <div style="font-size:.75rem;color:var(--text-muted);margin-top:.2rem">${c.dossier_ref||'—'} · ${isLoc?fmtPrice(c.montant)+'/mois':fmtPrice(c.montant)}</div>
              </div>
              <span style="font-size:.75rem;font-weight:700;background:${wf.color}20;color:${wf.color};padding:.25rem .65rem;border-radius:2rem;border:1px solid ${wf.color}40">${wf.label}</span>
            </div>
            <!-- Étapes workflow -->
            <div style="padding:.85rem 1rem">
              ${steps.map(s => `
                <div style="display:flex;gap:.75rem;margin-bottom:.7rem;align-items:flex-start">
                  <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;background:${s.done?'var(--success)':'var(--bg)'};color:${s.done?'#fff':'var(--text-muted)'};border:2px solid ${s.done?'var(--success)':'var(--border)'}">${s.done?'✓':s.icon}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:.78rem;font-weight:700;color:${s.done?'var(--text)':'var(--text-muted)'}">${s.label}</div>
                    ${s.content ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.15rem;line-height:1.5">${s.content}</div>` : `<div style="font-size:.75rem;color:var(--text-muted);font-style:italic">—</div>`}
                  </div>
                </div>`).join('')}
              <!-- Commentaire client visible -->
              ${c.commentaire ? `<div style="margin-top:.5rem;padding:.6rem .85rem;background:#eff6ff;border-left:3px solid var(--accent);border-radius:.35rem;font-size:.8rem;color:var(--text-muted)"><span style="font-weight:700;color:var(--accent)">Message → client :</span> ${c.commentaire}</div>` : ''}
              ${c.notes_admin ? `<div style="margin-top:.4rem;padding:.6rem .85rem;background:#fef9c3;border-left:3px solid #eab308;border-radius:.35rem;font-size:.8rem;color:var(--text-muted)"><span style="font-weight:700;color:#854d0e">Notes internes :</span> ${c.notes_admin}</div>` : ''}
            </div>
            <!-- Km + total si actif -->
            ${c.statut === 'actif' || c.livraison_date ? `
            <div style="padding:.65rem 1rem;background:var(--bg);border-top:1px solid var(--border);display:flex;gap:1.5rem;font-size:.8rem">
              <div><span style="color:var(--text-muted)">Km :</span> <strong>${(c.km_actuel||0).toLocaleString('fr-FR')} km</strong></div>
              ${isLoc ? `<div><span style="color:var(--text-muted)">Paiements :</span> <strong>${nbMoisEcoules} mois</strong></div>` : ''}
              <div><span style="color:var(--text-muted)">Total perçu :</span> <strong style="color:var(--success)">${fmtPrice(totalPaye)}</strong></div>
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}

      <!-- Dossiers archivés -->
      ${archives.length ? `
      <div style="padding:1.5rem">
        <div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem">
          Dossiers archivés (${archives.length})
        </div>
        ${archives.map(d => {
          const v = d.vehicle_info;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem .85rem;background:var(--bg);border-radius:.45rem;margin-bottom:.4rem;font-size:.82rem;opacity:.7">
            <div>
              <span style="font-weight:600">MM-${String(d.id).padStart(6,'0')}</span>
              <span style="color:var(--text-muted);margin-left:.4rem">${v?v.brand+' '+v.model:''} · ${fmtDate(d.created_at)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:.4rem">
              ${fmtStatus(d.status)}
              <span style="font-size:.7rem;background:#f1f5f9;border:1px solid var(--border);padding:.1rem .45rem;border-radius:.25rem;color:var(--text-muted)">Archivé</span>
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}
    `;
  } catch(e) {
    content.innerHTML = `<div style="padding:2rem"><div class="alert alert-danger">${e.message}</div></div>`;
  }
}

async function doArchiveDossierFromDrawer(dossierId, clientId) {
  try {
    await api.archiveDossier(dossierId);
    toast('Dossier archivé.', 'info');
    openClientDrawer(clientId);
    loadDossiers();
  } catch(e) { toast(e.message, 'danger'); }
}

function closeClientDrawer() {
  document.getElementById('client-drawer-overlay').style.display = 'none';
  document.getElementById('client-drawer').style.display         = 'none';
}
