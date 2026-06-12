/** @file api-dossiers.js — Endpoints dossiers, clients et messagerie. */
Object.assign(api, {

  async getDossiers(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''))
    ).toString();
    return this._req(`/dossiers/${q ? '?' + q : ''}`, { headers: this._headers(true) });
  },

  async getMyDossiers() {
    return this._req('/dossiers/?mine=true', { headers: this._headers(true) });
  },

  async getDossier(id) {
    return this._req(`/dossiers/${id}/`, { headers: this._headers(true) });
  },

  async createDossier(data) {
    return this._req('/dossiers/', {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify(data),
    });
  },

  async decideDossier(id, status, motif = '') {
    return this._req(`/dossiers/${id}/decision/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ status, motif }),
    });
  },

  async getClients() {
    return this._req('/auth/clients/', { headers: this._headers(true) });
  },

  async deleteDossier(id) {
    return this._req(`/dossiers/${id}/`, {
      method: 'DELETE',
      headers: this._headers(true),
    });
  },

  async archiveDossier(id) {
    return this._req(`/dossiers/${id}/archive/`, {
      method: 'PATCH',
      headers: this._headers(true),
    });
  },
});
