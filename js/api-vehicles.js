/** @file api-vehicles.js — Endpoints catalogue véhicules. */
Object.assign(api, {

  async getVehicles(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''))
    ).toString();
    return this._req(`/vehicles/${q ? '?' + q : ''}`);
  },

  async getVehicle(id) {
    return this._req(`/vehicles/${id}/`);
  },

  async createVehicle(data) {
    return this._req('/vehicles/', {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify(data),
    });
  },

  async updateVehicle(id, data) {
    return this._req(`/vehicles/${id}/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify(data),
    });
  },

  async deleteVehicle(id) {
    return this._req(`/vehicles/${id}/`, {
      method: 'DELETE',
      headers: this._headers(true),
    });
  },

  async toggleVehicleType(id) {
    return this._req(`/vehicles/${id}/toggle-type/`, {
      method: 'PATCH',
      headers: this._headers(true),
    });
  },

  async updateVehicleStatus(id, status) {
    return this._req(`/vehicles/${id}/status/`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ status }),
    });
  },
});
