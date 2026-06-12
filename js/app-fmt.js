/** @file app-fmt.js — Fonctions de formatage (prix, date, statut) et composant carte véhicule*/

function fmtPrice(v) {
  if (v === null || v === undefined) return '—';
  return parseFloat(v).toLocaleString('fr-FR') + ' €';
}

function fmtStatus(status) {
  const map = {
    soumis:   ['', 'Soumis',                  'status-soumis'],
    en_cours: ['', "En cours d'instruction",   'status-en_cours'],
    valide:   ['', 'Validé',                   'status-valide'],
    refuse:   ['', 'Refusé',                   'status-refuse'],
  };
  const [icon, label, cls] = map[status] || ['?', status, ''];
  return `<span class="status-badge ${cls}">${icon} ${label}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
}

function vehicleEmoji(fuel) {
  return fuel === 'Hybride' ? 'HYB' : fuel === 'Électrique' ? 'EV' : 'VH';
}

function vehicleCard(v) {
  const isLoc    = v.type === 'location';
  const priceHtml = isLoc
    ? `<div class="card-price">${fmtPrice(v.monthly)} <span>/mois</span></div>`
    : `<div class="card-price">${fmtPrice(v.price)}</div>`;
  const loggedIn = !!api.getToken();

  // Affichage photo ou initiales de la marque en fallback
  const imgHtml = v.photo_url
    ? `<div class="card-img"><img src="${v.photo_url}" alt="${v.brand} ${v.model}" onerror="this.parentElement.innerHTML='<span>${v.brand.slice(0,3).toUpperCase()}</span>'"/></div>`
    : `<div class="card-img"><span>${v.brand.slice(0,3).toUpperCase()}</span></div>`;

  return `
  <div class="card">
    <a href="${_p('vehicle.html')}?id=${v.id}" style="text-decoration:none;color:inherit">${imgHtml}</a>
    <div class="card-body">
      <span class="card-tag tag-${v.type}">${isLoc ? 'Location LLD' : 'Achat'}</span>
      <span class="card-tag tag-${v.status}" style="margin-left:.25rem">${v.status_display || v.status}</span>
      <a href="${_p('vehicle.html')}?id=${v.id}" style="text-decoration:none">
        <div class="card-title">${v.brand} ${v.model} ${v.year}</div>
      </a>
      <div class="card-meta">
        <span>${v.fuel}</span>
        <span>${v.km ? v.km.toLocaleString('fr-FR') + ' km' : '—'}</span>
        <span>${v.color || '—'}</span>
      </div>
      ${priceHtml}
      ${isLoc ? `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem">
        ${v.svc_assurance  !== false ? '<span style="font-size:.7rem;background:#d1fae5;color:#065f46;padding:.15rem .55rem;border-radius:2rem;font-weight:600">Assurance</span>' : ''}
        ${v.svc_assistance !== false ? '<span style="font-size:.7rem;background:#d1fae5;color:#065f46;padding:.15rem .55rem;border-radius:2rem;font-weight:600">Assistance 24/7</span>' : ''}
        ${v.svc_entretien  !== false ? '<span style="font-size:.7rem;background:#d1fae5;color:#065f46;padding:.15rem .55rem;border-radius:2rem;font-weight:600">Entretien</span>' : ''}
        ${v.svc_ct         !== false ? '<span style="font-size:.7rem;background:#d1fae5;color:#065f46;padding:.15rem .55rem;border-radius:2rem;font-weight:600">CT inclus</span>' : ''}
        ${(v.svc_options||[]).length ? `<span style="font-size:.7rem;background:#dbeafe;color:#1d4ed8;padding:.15rem .55rem;border-radius:2rem;font-weight:600">+${v.svc_options.length} option(s)</span>` : ''}
      </div>` : ''}
    </div>
    <div class="card-footer">
      <a href="${_p('vehicle.html')}?id=${v.id}" class="btn btn-secondary btn-sm">Voir la fiche</a>
      ${loggedIn
        ? `<a href="${_p('dossier.html')}?vid=${v.id}" class="btn btn-primary btn-sm">Déposer un dossier</a>`
        : `<button class="btn btn-primary btn-sm" onclick="redirectLogin()">Déposer un dossier</button>`
      }
    </div>
  </div>`;
}
