/** @file api-contrats.js — Workflow contrats : signatures, paiement, RDV, remise, messagerie. */
Object.assign(api, {

  async getContrats(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''))
    ).toString();
    return this._req(`/contrats/${q ? '?' + q : ''}`, { headers: this._headers(true) });
  },

  async createContrat(data) {
    return this._req('/contrats/', {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify(data),
    });
  },

  async updateContratKm(id, km) {
    return this._req(`/contrats/${id}/km/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ km_actuel: km }),
    });
  },

  // ── Étapes workflow (côté client) ─────────────────────────────────────────

  async signerContrat(id, signature_nom) {
    return this._req(`/contrats/${id}/signer/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ signature_nom }),
    });
  },

  async confirmerReceptionContrat(id, client_reception_nom) {
    return this._req(`/contrats/${id}/confirmer_reception/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ client_reception_nom }),
    });
  },

  async confirmerRDVContrat(id, rdv_date_confirmee) {
    return this._req(`/contrats/${id}/confirmer_rdv/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ rdv_date_confirmee }),
    });
  },

  // ── Étapes workflow (côté admin) ──────────────────────────────────────────

  async validerSignatureContrat(id, { notes_admin = '', commentaire = '' } = {}) {
    return this._req(`/contrats/${id}/valider_signature/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ notes_admin, commentaire }),
    });
  },

  async validerPaiementContrat(id, payload) {
    return this._req(`/contrats/${id}/valider_paiement/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify(payload),
    });
  },

  async proposerRDVContrat(id, payload) {
    return this._req(`/contrats/${id}/proposer_rdv/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify(payload),
    });
  },

  async livrerContrat(id, payload) {
    return this._req(`/contrats/${id}/livrer/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify(payload),
    });
  },

  // ── Messagerie dossier ────────────────────────────────────────────────────

  async getMessages(dossierId) {
    return this._req(`/dossiers/${dossierId}/messages/`, { headers: this._headers(true) });
  },

  async sendMessage(dossierId, contenu) {
    return this._req(`/dossiers/${dossierId}/messages/`, {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify({ contenu }),
    });
  },

  // ── Documents ─────────────────────────────────────────────────────────────

  async uploadDocument(dossierId, typeDoc, file) {
    const form = new FormData();
    form.append('type_doc', typeDoc);
    form.append('fichier',  file);
    const res = await fetch(`${API_BASE}/dossiers/${dossierId}/documents/`, {
      method:  'POST',
      // Content-Type omis intentionnellement : le navigateur le définit avec le boundary multipart
      headers: { Authorization: `Bearer ${this.getToken()}` },
      body:    form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.detail || err.fichier?.[0] || err.type_doc?.[0] || JSON.stringify(err);
      throw new Error(`Upload échoué (${res.status}) : ${msg}`);
    }
    return res.json();
  },
});
