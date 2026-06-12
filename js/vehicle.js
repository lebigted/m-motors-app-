/** @file vehicle.js — Fiche véhicule : caractéristiques, simulateur LLD et simulateur achat (4,9 %). */

renderNav('');

// ── Chargement de la fiche véhicule ──────────────────────────────────────────

async function loadVehicle() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = '../index.html'; return; }

  try {
    const v        = await api.getVehicle(id);
    const isLoc    = v.type === 'location';
    const loggedIn = !!api.getToken();

    document.title = `M-Motors | ${v.brand} ${v.model} ${v.year}`;

    const imgWrap = document.getElementById('vehicle-img-wrap');
    if (v.photo_url) {
      imgWrap.innerHTML = `<img src="${v.photo_url}" class="vehicle-img" alt="${v.brand} ${v.model}"/>`;
    } else {
      imgWrap.innerHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e3a5f,#2563eb);display:flex;align-items:center;justify-content:center;font-size:5rem;color:rgba(255,255,255,.2);font-weight:800">${v.brand.slice(0,3).toUpperCase()}</div>`;
    }

    document.getElementById('vehicle-content').innerHTML = `
      <nav style="font-size:.85rem;color:var(--muted);margin-bottom:1.5rem">
        <a href="../index.html" style="color:var(--accent)">Accueil</a> /
        <a href="../index.html" style="color:var(--accent)">Véhicules</a> /
        ${v.brand} ${v.model}
      </nav>

      <div class="vehicle-info-grid">
        <div>
          <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem">
            <h1 style="font-size:1.8rem;font-weight:800;color:var(--primary)">${v.brand} ${v.model} ${v.year}</h1>
            <span class="card-tag tag-${v.type}">${v.type_display}</span>
            <span class="card-tag tag-${v.status}">${v.status_display}</span>
          </div>

          <div class="card" style="margin-bottom:1.5rem">
            <div class="card-body">
              <h3 style="font-weight:700;color:var(--primary);margin-bottom:1rem">Caractéristiques</h3>
              <div class="info-row"><span class="info-label">Marque</span><span class="info-value">${v.brand}</span></div>
              <div class="info-row"><span class="info-label">Modèle</span><span class="info-value">${v.model}</span></div>
              <div class="info-row"><span class="info-label">Année</span><span class="info-value">${v.year}</span></div>
              <div class="info-row"><span class="info-label">Kilométrage</span><span class="info-value">${(v.km||0).toLocaleString('fr-FR')} km</span></div>
              <div class="info-row"><span class="info-label">Carburant</span><span class="info-value">${v.fuel}</span></div>
              <div class="info-row"><span class="info-label">Couleur</span><span class="info-value">${v.color||'—'}</span></div>
              <div class="info-row"><span class="info-label">Portes</span><span class="info-value">${v.doors}</span></div>
              <div class="info-row"><span class="info-label">Mode</span><span class="info-value">${v.type_display}</span></div>
              <div class="info-row"><span class="info-label">Disponibilité</span><span class="info-value">${v.status_display}</span></div>
            </div>
          </div>

          ${isLoc ? `
          <div class="card">
            <div class="card-body">
              <h3 style="font-weight:700;color:var(--primary);margin-bottom:.75rem">Services inclus dans l'abonnement</h3>
              <div style="display:flex;flex-wrap:wrap;gap:.25rem">
                <span class="doc-chip" style="background:var(--success-light);color:var(--success)">Assurance tous risques</span>
                <span class="doc-chip" style="background:var(--success-light);color:var(--success)">Assistance 24h/24</span>
                <span class="doc-chip" style="background:var(--success-light);color:var(--success)">Entretien & SAV</span>
                <span class="doc-chip" style="background:var(--success-light);color:var(--success)">Contrôle technique</span>
                <span class="doc-chip" style="background:var(--success-light);color:var(--success)">Option d'achat</span>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:1.5rem">
            <div class="card-body">
              <h3 style="font-weight:700;color:var(--primary);margin-bottom:1rem">Simulateur de coût LLD</h3>
              <div class="form-group">
                <label class="form-label">Durée du contrat</label>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                  ${[24,36,48,60].map(m => `<button class="btn btn-sm" id="sim-dur-${m}"
                    onclick="simSetDuree(${m}, ${v.monthly})"
                    style="border:1.5px solid var(--border);background:var(--white)">${m} mois</button>`).join('')}
                </div>
              </div>
              <div style="background:var(--bg);border-radius:var(--radius-sm);padding:1rem;margin-top:.75rem">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
                  <div style="text-align:center;padding:.75rem;background:var(--white);border-radius:var(--radius-sm);border:1px solid var(--border)">
                    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.25rem">Loyer mensuel</div>
                    <div style="font-size:1.4rem;font-weight:800;color:var(--accent)" id="sim-mensuel">${fmtPrice(v.monthly)}</div>
                  </div>
                  <div style="text-align:center;padding:.75rem;background:var(--white);border-radius:var(--radius-sm);border:1px solid var(--border)">
                    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.25rem">Coût total</div>
                    <div style="font-size:1.4rem;font-weight:800;color:var(--primary)" id="sim-total">${fmtPrice(v.monthly * 36)}</div>
                  </div>
                </div>
                <div style="margin-top:.75rem;font-size:.78rem;color:var(--text-muted);text-align:center" id="sim-detail">
                  36 mois · 15 000 km/an inclus · Services compris
                </div>
              </div>
            </div>
          </div>` : `

          <div class="card" style="margin-top:1.5rem">
            <div class="card-body">
              <h3 style="font-weight:700;color:var(--primary);margin-bottom:1rem">Simulateur de financement</h3>
              <div class="form-group">
                <label class="form-label">Apport initial : <strong id="sim-apport-val">0 €</strong></label>
                <input type="range" id="sim-apport" min="0" max="${Math.round(v.price * 0.5)}" step="500" value="0"
                  style="width:100%;accent-color:var(--accent)"
                  oninput="simUpdateAchat(${v.price})"/>
              </div>
              <div class="form-group">
                <label class="form-label">Durée de remboursement</label>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                  ${[12,24,36,48,60].map(m => `<button class="btn btn-sm" id="sim-dur-${m}"
                    onclick="simSetAchatDuree(${m}, ${v.price})"
                    style="border:1.5px solid var(--border);background:var(--white)">${m} mois</button>`).join('')}
                </div>
              </div>
              <div style="background:var(--bg);border-radius:var(--radius-sm);padding:1rem;margin-top:.75rem">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.65rem">
                  <div style="text-align:center;padding:.65rem;background:var(--white);border-radius:var(--radius-sm);border:1px solid var(--border)">
                    <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.2rem">Mensualité</div>
                    <div style="font-size:1.2rem;font-weight:800;color:var(--accent)" id="sim-mens">—</div>
                  </div>
                  <div style="text-align:center;padding:.65rem;background:var(--white);border-radius:var(--radius-sm);border:1px solid var(--border)">
                    <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.2rem">Coût crédit</div>
                    <div style="font-size:1.2rem;font-weight:800;color:var(--warn)" id="sim-cout">—</div>
                  </div>
                  <div style="text-align:center;padding:.65rem;background:var(--white);border-radius:var(--radius-sm);border:1px solid var(--border)">
                    <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.2rem">Total payé</div>
                    <div style="font-size:1.2rem;font-weight:800;color:var(--primary)" id="sim-total-a">—</div>
                  </div>
                </div>
                <div style="margin-top:.65rem;font-size:.75rem;color:var(--text-muted);text-align:center" id="sim-taux-info">Taux fixe indicatif 4,9 % — hors assurance emprunteur</div>
              </div>
            </div>
          </div>`}
        </div>

        <div class="price-box">
          ${isLoc ? `
            <div class="price-sub">Loyer mensuel</div>
            <div class="price-main">${fmtPrice(v.monthly)}<span style="font-size:1rem;font-weight:400">/mois</span></div>
            <div class="price-sub" style="margin-bottom:1.5rem">Tout inclus · Sans apport</div>
          ` : `
            <div class="price-sub">Prix de vente</div>
            <div class="price-main">${fmtPrice(v.price)}</div>
            <div class="price-sub" style="margin-bottom:1.5rem">TTC · Financement possible</div>
          `}
          ${v.status === 'disponible'
            ? (loggedIn
                ? `<a href="dossier.html?vid=${v.id}" class="btn btn-primary btn-full btn-lg" style="background:#fff;color:var(--primary)">
                     Déposer un dossier
                   </a>
                   <p style="font-size:.78rem;opacity:.7;margin-top:.75rem">Dossier 100% en ligne · Réponse sous 48h</p>`
                : `<a href="login.html" class="btn btn-primary btn-full btn-lg" style="background:#fff;color:var(--primary)">
                     Se connecter pour postuler
                   </a>`)
            : `<div class="alert alert-warn" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff">
                 Ce véhicule n'est plus disponible.
               </div>`}

          <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,.2)">
            <div style="font-size:.82rem;opacity:.7;margin-bottom:.5rem">Des questions ?</div>
            <a href="tel:+33123456789" style="color:#fff;font-weight:600;font-size:.95rem">01 23 45 67 89</a>
          </div>
        </div>
      </div>`;

    if (isLoc) {
      simSetDuree(36, v.monthly);
    } else {
      simSetAchatDuree(36, v.price);
      simUpdateAchat(v.price);
    }
  } catch(e) {
    document.getElementById('vehicle-content').innerHTML =
      `<div class="alert alert-danger">Erreur : ${e.message}</div>`;
  }
}

// ── Simulateur LLD ────────────────────────────────────────────────────────────

let _simDureeLLD = 36;

function simSetDuree(mois, mensuel) {
  _simDureeLLD = mois;
  [24,36,48,60].forEach(m => {
    const b = document.getElementById('sim-dur-'+m);
    if (b) { b.style.background = m===mois?'var(--accent)':'var(--white)'; b.style.color = m===mois?'#fff':''; b.style.borderColor = m===mois?'var(--accent)':'var(--border)'; }
  });
  const total = mensuel * mois;
  document.getElementById('sim-mensuel').textContent = fmtPrice(mensuel);
  document.getElementById('sim-total').textContent   = fmtPrice(total);
  document.getElementById('sim-detail').textContent  = `${mois} mois · 15 000 km/an inclus · Services compris`;
}

// ── Simulateur achat (crédit) ─────────────────────────────────────────────────

let _simDureeAchat = 36;

const TAUX_ANNUEL = 0.049;

function simCalcAchat(prixNet, mois) {
  if (mois === 0) return { mensualite: prixNet, cout: 0, total: prixNet };
  const tauxMensuel = TAUX_ANNUEL / 12;
  const mensualite  = prixNet * (tauxMensuel * Math.pow(1+tauxMensuel, mois)) / (Math.pow(1+tauxMensuel, mois) - 1);
  const total       = mensualite * mois;
  return { mensualite: Math.round(mensualite), cout: Math.round(total - prixNet), total: Math.round(total) };
}

function simUpdateAchat(prix) {
  const apport   = parseInt(document.getElementById('sim-apport').value) || 0;
  document.getElementById('sim-apport-val').textContent = fmtPrice(apport);
  const prixNet  = Math.max(0, prix - apport);
  const r        = simCalcAchat(prixNet, _simDureeAchat);
  document.getElementById('sim-mens').textContent    = fmtPrice(r.mensualite) + '/mois';
  document.getElementById('sim-cout').textContent    = fmtPrice(r.cout);
  document.getElementById('sim-total-a').textContent = fmtPrice(r.total);
}

function simSetAchatDuree(mois, prix) {
  _simDureeAchat = mois;
  [12,24,36,48,60].forEach(m => {
    const b = document.getElementById('sim-dur-'+m);
    if (b) { b.style.background = m===mois?'var(--accent)':'var(--white)'; b.style.color = m===mois?'#fff':''; b.style.borderColor = m===mois?'var(--accent)':'var(--border)'; }
  });
  simUpdateAchat(prix);
}

loadVehicle();
