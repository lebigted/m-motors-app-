/** @file api-auth.js — Endpoints authentification et profil. */
Object.assign(api, {

  async login(email, password) {
    const data = await this._req('/auth/login/', {
      method: 'POST',
      headers: this._headers(false),
      body: JSON.stringify({ email, password }),
    });
    this._saveAuth(data);
    return data.user;
  },

  async register(payload) {
    const data = await this._req('/auth/register/', {
      method: 'POST',
      headers: this._headers(false),
      body: JSON.stringify(payload),
    });
    this._saveAuth(data);
    return data.user;
  },

  async me() {
    return this._req('/auth/me/', { headers: this._headers(true) });
  },

  async updateMe(payload) {
    return this._req('/auth/me/', {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify(payload),
    });
  },

  // ── Réinitialisation du mot de passe ────────────────────────────────────────

  async passwordResetRequest(email) {
    return this._req('/auth/password-reset/', {
      method: 'POST',
      headers: this._headers(false),
      body: JSON.stringify({ email }),
    });
  },

  async passwordResetConfirm(uid, token, new_password) {
    return this._req('/auth/password-reset/confirm/', {
      method: 'POST',
      headers: this._headers(false),
      body: JSON.stringify({ uid, token, new_password }),
    });
  },
});
