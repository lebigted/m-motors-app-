/** @file bo-vehicules.js — Parc véhicules : liste, filtres, modal création/édition, upload photo. */

// ── Véhicules ────────────────────────────────────────────

async function loadVehicles() {
  const tbody   = document.getElementById('vehicles-tbody');
  const search  = document.getElementById('search-v').value.toLowerCase();
  const typeF   = document.getElementById('filter-type-bo').value;
  const statusF = document.getElementById('filter-status-bo').value;
  try {
    const params = {};
    if (typeF)   params.type   = typeF;
    if (statusF) params.status = statusF;
    if (search)  params.search = search;
    const data = await api.getVehicles(params);
    let list = data.results || [];

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Aucun véhicule trouvé.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(v => `
      <tr>
        <td>
          ${v.photo_url
            ? `<img src="${v.photo_url}" class="vehicle-thumb" alt="${v.brand} ${v.model}"/>`
            : `<div class="vehicle-thumb-placeholder">${v.brand.slice(0,3).toUpperCase()}</div>`}
        </td>
        <td>
          <strong>${v.brand} ${v.model}</strong><br>
          <span class="text-muted text-sm">${v.year} · ${v.color||'—'} · ${v.doors} p.</span>
        </td>
        <td>${v.fuel}<br><span class="text-muted text-sm">${(v.km||0).toLocaleString('fr-FR')} km</span></td>
        <td><span class="card-tag tag-${v.type}">${v.type_display}</span></td>
        <td><strong>${v.type==='location' ? fmtPrice(v.monthly)+'/mois' : fmtPrice(v.price)}</strong></td>
        <td>
          <select class="form-select" style="font-size:.8rem;padding:.3rem .5rem" onchange="changeStatus(${v.id}, this.value)">
            <option value="disponible" ${v.status==='disponible'?'selected':''}>Disponible</option>
            <option value="reserve"    ${v.status==='reserve'   ?'selected':''}>Réservé</option>
            <option value="vendu"      ${v.status==='vendu'     ?'selected':''}>Vendu</option>
          </select>
        </td>
        <td>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="editVehicle(${v.id})">Modifier</button>
            <button class="btn btn-outline btn-sm"   onclick="toggleType(${v.id})"
              title="Basculer vers ${v.type==='achat'?'Location':'Achat'}">
              ${v.type==='achat' ? 'Loc.' : 'Achat'}
            </button>
            <button class="btn btn-danger btn-sm"    onclick="removeVehicle(${v.id})">Sup.</button>
          </div>
        </td>
      </tr>`).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger);padding:1rem">${e.message}</td></tr>`; }
}

async function changeStatus(id, newStatus) {
  try {
    await api.updateVehicleStatus(id, newStatus);
    toast('Statut mis à jour.', 'success');
    loadStats();
  } catch(e) { toast(e.message, 'danger'); }
}


// ── Modal véhicule ────────────────────────────────────────

function togglePricing() {
  const mode = document.getElementById('v-type').value;
  document.getElementById('price-achat-group').classList.toggle('hidden', mode !== 'achat');
  document.getElementById('price-location-group').classList.toggle('hidden', mode !== 'location');
  // Services : toujours visibles, juste désactivés si achat
  const svcGroup = document.getElementById('services-group');
  const isLoc = mode === 'location';
  svcGroup.style.opacity = isLoc ? '1' : '0.4';
  svcGroup.style.pointerEvents = isLoc ? 'auto' : 'none';
  svcGroup.querySelector('#services-header-note').textContent = isLoc
    ? 'Services inclus dans l\'abonnement Location LLD'
    : 'Services LLD — disponibles uniquement pour les véhicules en location';
}

let optionsList = [];

function addOption(nom = '', prix = '') {
  const idx = optionsList.length;
  optionsList.push({ nom, prix });
  renderOptions();
}

function removeOption(idx) {
  optionsList.splice(idx, 1);
  renderOptions();
}

function renderOptions() {
  const el = document.getElementById('options-list');
  if (!optionsList.length) { el.innerHTML = '<p class="text-sm text-muted">Aucune option ajoutée.</p>'; return; }
  el.innerHTML = optionsList.map((o, i) => `
    <div style="display:flex;gap:.5rem;align-items:center">
      <input class="form-input" type="text"   value="${o.nom}"  placeholder="Nom de l'option (ex: GPS)"  oninput="optionsList[${i}].nom=this.value"  style="flex:2"/>
      <input class="form-input" type="number" value="${o.prix}" placeholder="Prix €/mois"                oninput="optionsList[${i}].prix=parseFloat(this.value)||0" style="flex:1;max-width:110px"/>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeOption(${i})">X</button>
    </div>`).join('');
}

function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const url  = URL.createObjectURL(file);
  document.getElementById('photo-preview-wrap').innerHTML =
    `<img src="${url}" class="photo-preview" onclick="document.getElementById('v-photo').click()" title="Cliquez pour changer"/>`;
}

function openVehicleModal(v = null) {
  document.getElementById('modal-vehicle-alert').innerHTML = '';
  document.getElementById('v-photo').value = '';
  document.getElementById('modal-vehicle-title').textContent = v ? 'Modifier le véhicule' : 'Ajouter un véhicule';
  document.getElementById('v-id').value      = v?.id      || '';
  document.getElementById('v-brand').value   = v?.brand   || 'Renault';
  document.getElementById('v-model').value   = v?.model   || '';
  document.getElementById('v-year').value    = v?.year    || new Date().getFullYear();
  document.getElementById('v-km').value      = v?.km      || 0;
  document.getElementById('v-fuel').value    = v?.fuel    || 'Essence';
  document.getElementById('v-color').value   = v?.color   || '';
  document.getElementById('v-type').value    = v?.type    || 'achat';
  document.getElementById('v-status').value  = v?.status  || 'disponible';
  document.getElementById('v-price').value   = v?.price   || '';
  document.getElementById('v-monthly').value = v?.monthly || '';
  // Services
  document.getElementById('svc-assurance').checked  = v?.svc_assurance  ?? true;
  document.getElementById('svc-assistance').checked = v?.svc_assistance ?? true;
  document.getElementById('svc-entretien').checked  = v?.svc_entretien  ?? true;
  document.getElementById('svc-ct').checked         = v?.svc_ct         ?? true;
  optionsList = v?.svc_options ? [...v.svc_options] : [];
  renderOptions();
  document.getElementById('photo-preview-wrap').innerHTML = v?.photo_url
    ? `<img src="${v.photo_url}" class="photo-preview" onclick="document.getElementById('v-photo').click()" title="Cliquez pour changer"/>`
    : `<div class="photo-placeholder" onclick="document.getElementById('v-photo').click()">Cliquez pour ajouter une photo (JPG, PNG)</div>`;
  togglePricing();
  document.getElementById('modal-vehicle').classList.add('open');
}

async function editVehicle(id) {
  try {
    const v = await api.getVehicle(id);
    openVehicleModal(v);
  } catch(e) { toast(e.message, 'danger'); }
}

async function saveVehicle() {
  const type    = document.getElementById('v-type').value;
  const price   = parseFloat(document.getElementById('v-price').value)   || null;
  const monthly = parseFloat(document.getElementById('v-monthly').value) || null;
  const model   = document.getElementById('v-model').value.trim();
  const year    = parseInt(document.getElementById('v-year').value);
  const alertEl = document.getElementById('modal-vehicle-alert');

  if (!model || !year) { alertEl.innerHTML = '<div class="alert alert-warn">Modèle et année sont requis.</div>'; return; }
  if (type === 'achat'    && !price)   { alertEl.innerHTML = '<div class="alert alert-warn">Entrez un prix de vente.</div>'; return; }
  if (type === 'location' && !monthly) { alertEl.innerHTML = '<div class="alert alert-warn">Entrez un loyer mensuel.</div>'; return; }

  const btn = document.getElementById('btn-save-vehicle');
  btn.disabled = true; btn.textContent = 'Enregistrement…';

  // Utiliser FormData pour supporter la photo
  const form = new FormData();
  form.append('brand',   document.getElementById('v-brand').value);
  form.append('model',   model);
  form.append('year',    year);
  form.append('km',      parseInt(document.getElementById('v-km').value) || 0);
  form.append('fuel',    document.getElementById('v-fuel').value);
  form.append('color',   document.getElementById('v-color').value);
  form.append('type',    type);
  form.append('status',  document.getElementById('v-status').value);
  if (type === 'achat')    form.append('price',   price);
  if (type === 'location') form.append('monthly', monthly);
  // Services LLD
  if (type === 'location') {
    form.append('svc_assurance',  document.getElementById('svc-assurance').checked);
    form.append('svc_assistance', document.getElementById('svc-assistance').checked);
    form.append('svc_entretien',  document.getElementById('svc-entretien').checked);
    form.append('svc_ct',         document.getElementById('svc-ct').checked);
    form.append('svc_options',    JSON.stringify(optionsList.filter(o => o.nom)));
  }
  const photoFile = document.getElementById('v-photo').files[0];
  if (photoFile) form.append('photo', photoFile);

  const vid = document.getElementById('v-id').value;
  try {
    const method = vid ? 'PATCH' : 'POST';
    const url    = vid ? `/vehicles/${vid}/` : '/vehicles/';
    const res    = await fetch(`http://127.0.0.1:8000/api${url}`, {
      method, headers: { Authorization: `Bearer ${api.getToken()}` }, body: form,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(Object.values(e).flat().join(' ')); }
    closeModals();
    toast(vid ? 'Véhicule modifié.' : 'Véhicule ajouté.', 'success');
    loadVehicles(); loadStats();
  } catch(e) {
    alertEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer';
  }
}

async function removeVehicle(id) {
  if (!confirm('Supprimer définitivement ce véhicule ?')) return;
  try { await api.deleteVehicle(id); toast('Véhicule supprimé.', 'success'); loadVehicles(); loadStats(); }
  catch(e) { toast(e.message, 'danger'); }
}

async function toggleType(id) {
  try {
    const v = await api.toggleVehicleType(id);
    toast(`Basculé en mode ${v.type_display}.`, 'info');
    loadVehicles();
  } catch(e) { toast(e.message, 'danger'); }
}
