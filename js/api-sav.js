/** @file api-sav.js — Endpoints tickets SAV et messagerie SAV. */
Object.assign(api, {

  async getSAVTickets() {
    return this._req('/sav/', { headers: this._headers(true) });
  },

  async getSAVMessages(ticketId) {
    return this._req(`/sav/${ticketId}/messages/`, { headers: this._headers(true) });
  },

  async sendSAVMessage(ticketId, contenu) {
    return this._req(`/sav/${ticketId}/messages/`, {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify({ contenu }),
    });
  },

  async createSAVTicket(sujet, description) {
    return this._req('/sav/', {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify({ sujet, description }),
    });
  },

  async traiterSAVTicket(id, statut, reponse = '') {
    return this._req(`/sav/${id}/traiter/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ statut, reponse }),
    });
  },

  async cloturerSAVTicket(id) {
    return this._req(`/sav/${id}/cloturer/`, {
      method: 'PATCH',
      headers: this._headers(true),
    });
  },
});
