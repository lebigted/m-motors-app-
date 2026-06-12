/** @file dossier.js Formulaire de dépôt de dossier client en 5 étapes*/

const session = requireAuth();
if (!session) throw new Error('redirect');
renderNav('');

// ── État du formulaire ────────────────────────────────────────────────────────

let selectedVehicleId = null;

let selectedVehicle   = null;

let loadedVehicles    = [];

const uploadedFiles   = {};

const requiredDocs = [
  { key:'cni',     label:"Pièce d'identité (CNI ou Passeport)" },
  { key:'permis',  label:"Permis de conduire" },
  { key:'revenus', label:"Justificatifs de revenus (3 derniers bulletins)" },
  { key:'rib',     label:"RIB" },
];

const docTypeMap = { cni:'cni', permis:'permis', revenus:'revenus', rib:'rib' };

// ── Étape 1 — Sélection du véhicule ──────────────────────────────────────────

async function loadVehicles() {
  const el = document.getElementById('vehicle-selection');
  showSpinner(el, 'Chargement des véhicules…');
  try {
    const data  = await api.getVehicles({ status: 'disponible' });
    loadedVehicles = (data.results || []).filter(v => v.status === 'disponible');
    const urlVid = new URLSearchParams(window.location.search).get('vid');

    el.innerHTML = `<div class="grid-3" style="margin-bottom:1rem">
      ${loadedVehicles.map(v => `
        <div class="card" id="vcard-${v.id}" onclick="selectVehicle(${v.id})" style="cursor:pointer">
          <div class="card-img" style="height:160px">
            ${v.photo_url
              ? `<img src="${v.photo_url}" alt="${v.brand} ${v.model}" onerror="this.parentElement.innerHTML='<span>${v.brand.slice(0,3).toUpperCase()}</span>'"/>`
              : `<span>${v.brand.slice(0,3).toUpperCase()}</span>`
            }
          </div>
          <div class="card-body">
            <span class="card-tag tag-${v.type}">${v.type_display}</span>
            <div class="card-title" style="font-size:.95rem">${v.brand} ${v.model} ${v.year}</div>
            <div class="card-meta"><span>${v.fuel}</span><span>${(v.km||0).toLocaleString('fr-FR')} km</span></div>
            <div class="card-price" style="font-size:1.1rem">
              ${v.type === 'location' ? fmtPrice(v.monthly) + '<span style="font-size:.78rem;color:var(--muted)">/mois</span>' : fmtPrice(v.price)}
            </div>
          </div>
        </div>`).join('')}
    </div>`;

    if (urlVid) selectVehicle(urlVid);
  } catch (e) {
    showError(el, `Erreur : ${e.message}`);
  }
}

function selectVehicle(id) {
  selectedVehicleId = parseInt(id);
  selectedVehicle   = loadedVehicles.find(v => v.id == id) || null;

  document.querySelectorAll('[id^="vcard-"]').forEach(c => c.style.outline = '');
  const card = document.getElementById(`vcard-${id}`);
  if (card) card.style.outline = '3px solid var(--accent)';

  if (!selectedVehicle) return;
  const v = selectedVehicle;
  document.getElementById('vehicle-selected-msg').textContent =
    `${v.brand} ${v.model} ${v.year} — ${v.type === 'location' ? fmtPrice(v.monthly) + '/mois (LLD)' : fmtPrice(v.price) + ' (achat)'}`;
  document.getElementById('selected-vehicle-info').classList.remove('hidden');
}

// ── Étape 4 — Documents ───────────────────────────────────────────────────────

function renderDocSections() {
  document.getElementById('doc-sections').innerHTML = requiredDocs.map(doc => `
    <div class="form-group">
      <label class="form-label">${doc.label} <span style="color:var(--danger)">*</span></label>
      <div class="upload-zone" id="zone-${doc.key}" onclick="document.getElementById('file-${doc.key}').click()">
        <input type="file" id="file-${doc.key}" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFile('${doc.key}', this)"/>
        <p>Cliquez ou déposez votre fichier ici</p>
        <p style="font-size:.78rem">PDF, JPG, PNG — max 5 Mo</p>
        <div id="zone-status-${doc.key}"></div>
      </div>
    </div>`).join('');
}

function handleFile(key, input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('Fichier trop volumineux (max 5 Mo)'); return; }
  uploadedFiles[key] = file;
  const zone = document.getElementById(`zone-${key}`);
  zone.style.background   = 'var(--success-light)';
  zone.style.borderColor  = 'var(--success)';
  document.getElementById(`zone-status-${key}`).innerHTML =
    `<strong style="color:var(--success)">${file.name}</strong>`;
}

// ── Options LLD ───────────────────────────────────────────────────────────────

let selectedOptions = [];

// ── Navigation entre étapes ───────────────────────────────────────────────────

function goStep(n) {
  if (n === 2 && !selectedVehicleId) { alert('Veuillez sélectionner un véhicule.'); return; }
  if (n === 3) renderServicesStep();
  if (n === 5) {
    const missing = requiredDocs.filter(d => !uploadedFiles[d.key]).map(d => d.label);
    if (missing.length) {
      document.getElementById('step4-alert').innerHTML =
        `<div class="alert alert-warn">Documents manquants : ${missing.join(', ')}</div>`;
      return;
    }
    buildRecap();
  }
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('hidden', i !== n);
  }
  document.querySelectorAll('.step-indicator').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Étape 3 — Services LLD ────────────────────────────────────────────────────

function renderServicesStep() {
  const v = selectedVehicle;
  const el = document.getElementById('services-recap');
  if (!v || v.type !== 'location') {
    el.innerHTML = `<div class="alert alert-info">Ce véhicule est proposé à l'achat — aucun service d'abonnement ne s'applique.</div>`;
    return;
  }
  const svcList = [
    { key:'svc_assurance',  label:'Assurance tous risques' },
    { key:'svc_assistance', label:'Assistance dépannage 24/7' },
    { key:'svc_entretien',  label:'Entretien & SAV' },
    { key:'svc_ct',         label:'Contrôle technique' },
  ];
  const inclus  = svcList.filter(s => v[s.key] !== false);
  const options = v.svc_options || [];

  el.innerHTML = `
    <div class="alert alert-success" style="margin-bottom:1.25rem">
      Ces services sont <strong>inclus dans votre mensualité</strong> sans frais supplémentaires.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.5rem">
      ${inclus.map(s => `
        <div style="display:flex;align-items:center;gap:.75rem;background:var(--success-light);border:1px solid #6ee7b7;border-radius:var(--radius-sm);padding:.75rem 1rem">
          <span style="width:20px;height:20px;background:var(--success);border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">OK</span>
          <span style="font-weight:600;font-size:.9rem">${s.label}</span>
        </div>`).join('')}
    </div>
    ${options.length ? `
      <div style="margin-bottom:1rem">
        <div style="font-weight:700;color:var(--primary);margin-bottom:.75rem;font-size:.92rem">Options disponibles (en supplément mensuel)</div>
        <div style="display:flex;flex-direction:column;gap:.5rem">
          ${options.map((o, i) => `
            <label style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer">
              <input type="checkbox" value="${i}" onchange="toggleOption(${i})" style="width:1.1rem;height:1.1rem;flex-shrink:0"/>
              <span style="flex:1;font-weight:500">${o.nom}</span>
              <span style="font-weight:700;color:var(--accent)">+${o.prix} €/mois</span>
            </label>`).join('')}
        </div>
        <p class="form-help" style="margin-top:.5rem">Ces options s'ajoutent à votre loyer mensuel.</p>
      </div>` : ''}`;
}

function toggleOption(idx) {
  const v = selectedVehicle;
  if (!v?.svc_options) return;
  const opt = v.svc_options[idx];
  const pos = selectedOptions.findIndex(o => o.nom === opt.nom);
  if (pos >= 0) selectedOptions.splice(pos, 1);
  else selectedOptions.push(opt);
}

// ── Étape 5 — Récapitulatif et soumission ────────────────────────────────────

function buildRecap() {
  const v = selectedVehicle;
  document.getElementById('recap-content').innerHTML = `
    <table class="data-table" style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border)">
      <tr><td style="font-weight:600;width:180px;background:var(--bg)">Véhicule</td>
          <td>${v ? v.brand + ' ' + v.model + ' ' + v.year + ' — ' + v.type_display : '—'}</td></tr>
      <tr><td style="font-weight:600;background:var(--bg)">Nom</td>
          <td>${document.getElementById('d-nom').value} ${document.getElementById('d-prenom').value}</td></tr>
      <tr><td style="font-weight:600;background:var(--bg)">Revenus</td>
          <td>${document.getElementById('d-revenus').value ? fmtPrice(parseFloat(document.getElementById('d-revenus').value)) + '/mois' : '—'}</td></tr>
      <tr><td style="font-weight:600;background:var(--bg)">Situation</td>
          <td>${document.getElementById('d-situation').value || '—'}</td></tr>
      <tr><td style="font-weight:600;background:var(--bg)">Documents</td>
          <td>${Object.values(uploadedFiles).map(f => f.name).join(', ')}</td></tr>
    </table>`;
}

async function submitDossier() {
  if (!document.getElementById('confirm-exact').checked) {
    document.getElementById('submit-alert').innerHTML = '<div class="alert alert-warn">Veuillez cocher la case de certification.</div>';
    return;
  }
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours…';
  document.getElementById('submit-alert').innerHTML = '';

  try {
    const dossier = await api.createDossier({
      vehicle:   selectedVehicleId,
      type:      selectedVehicle.type,
      revenus:   parseFloat(document.getElementById('d-revenus').value) || null,
      situation: document.getElementById('d-situation').value,
      message:   document.getElementById('d-message').value,
    });

    for (const [key, file] of Object.entries(uploadedFiles)) {
      await api.uploadDocument(dossier.id, docTypeMap[key], file);
    }

    for (let i = 1; i <= 5; i++) { const el = document.getElementById(`step-${i}`); if(el) el.classList.add('hidden'); }
    document.getElementById('step-confirm').classList.remove('hidden');
    document.getElementById('confirm-ref').textContent = `Référence dossier : MM-${String(dossier.id).padStart(6,'0')}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (e) {
    document.getElementById('submit-alert').innerHTML = `<div class="alert alert-danger">Erreur : ${e.message}</div>`;
    btn.disabled = false;
    btn.textContent = 'Soumettre mon dossier';
  }
}

// ── Initialisation ────────────────────────────────────────────────────────────

// Pré-remplissage des champs personnels depuis la session active
document.getElementById('d-nom').value    = session.last_name  || '';
document.getElementById('d-prenom').value = session.first_name || '';
document.getElementById('d-email').value  = session.email      || '';

loadVehicles();
renderDocSections();
