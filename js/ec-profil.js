/** @file ec-profil.js — Profil client mise à jour, localStorage et renouvellement de contrat */

async function demanderRenouvellement(contratId) {
  const c = allContrats.find(x => x.id === contratId);
  if (!c) return;
  const v = c.vehicle_info;
  const nom = v ? v.brand + ' ' + v.model + ' ' + v.year : c.dossier_ref;
  if (!confirm(`Envoyer une demande de renouvellement pour ${nom} ?`)) return;
  try {
    await api.createSAVTicket(
      `Renouvellement de contrat — ${nom}`,
      `Bonjour,\n\nJe souhaite renouveler mon contrat de location (${c.dossier_ref}) pour le véhicule ${nom}.\n\nDate de fin actuelle : ${fmtDate(c.date_fin)}.\n\nMerci de me contacter pour discuter des modalités.`
    );
    toast('Demande de renouvellement envoyée. M-Motors vous contactera.', 'success');
    switchTab('sav', document.querySelector('[onclick*=sav]'));
  } catch(e) { toast(e.message, 'danger'); }
}

async function saveProfil() {
  const payload = {
    last_name:  document.getElementById('p-nom').value.trim(),
    first_name: document.getElementById('p-prenom').value.trim(),
    tel:        document.getElementById('p-tel').value.trim(),
  };
  try {
    await api.updateMe(payload);
    localStorage.setItem('mm_user', JSON.stringify({...api.getUser(),...payload}));
    document.getElementById('profil-alert').innerHTML='<div class="alert alert-success">Profil enregistré.</div>';
    setTimeout(()=>document.getElementById('profil-alert').innerHTML='',3000);
  } catch(e){document.getElementById('profil-alert').innerHTML=`<div class="alert alert-danger">${e.message}</div>`;}
}
