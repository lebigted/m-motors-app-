/** @file login.js — Page connexion/inscription : validation, redirection post-login, raccourci Entrée. */

renderNav('');
// Redirige immédiatement si déjà authentifié
if (api.getToken()) window.location.href = '../index.html';

// ── Utilitaires UI ────────────────────────────────────────────────────────────

function showTab(name) {
  document.getElementById('tab-login').classList.toggle('hidden', name !== 'login');
  document.getElementById('tab-register').classList.toggle('hidden', name !== 'register');
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && name === 'login') || (i === 1 && name === 'register')));
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = loading ? 'Chargement…' : (btnId === 'btn-login' ? 'Se connecter' : 'Créer mon compte');
}

function showAlert(id, msg, type = 'danger') {
  document.getElementById(id).innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

// ── Authentification ─────────────────────────────────────────────────────────

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAlert('login-alert', '️ Veuillez remplir tous les champs.', 'warn'); return; }

  setLoading('btn-login', true);
  try {
    const user = await api.login(email, password);
    const redirect = sessionStorage.getItem('redirect_after_login') ||
                     (user.role === 'admin' ? 'backoffice.html' : 'espace-client.html');
    sessionStorage.removeItem('redirect_after_login');
    window.location.href = redirect;
  } catch (e) {
    showAlert('login-alert', ` ${e.message}`);
    setLoading('btn-login', false);
  }
}

// ── Inscription ───────────────────────────────────────────────────────────────

async function doRegister() {
  const nom      = document.getElementById('reg-nom').value.trim();
  const prenom   = document.getElementById('reg-prenom').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const tel      = document.getElementById('reg-tel').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const rgpd     = document.getElementById('reg-rgpd').checked;

  if (!nom || !prenom || !email || !password) { showAlert('register-alert', '️ Remplissez tous les champs.', 'warn'); return; }
  if (password.length < 6)  { showAlert('register-alert', '️ Mot de passe trop court (6 min).', 'warn'); return; }
  if (password !== password2) { showAlert('register-alert', ' Les mots de passe ne correspondent pas.'); return; }
  if (!rgpd) { showAlert('register-alert', '️ Acceptez la politique de confidentialité.', 'warn'); return; }

  setLoading('btn-register', true);
  try {
    await api.register({ first_name: prenom, last_name: nom, email, tel, password, password2 });
    window.location.href = 'espace-client.html';
  } catch (e) {
    showAlert('register-alert', ` ${e.message}`);
    setLoading('btn-register', false);
  }
}

// ── Raccourci clavier ─────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  document.getElementById('tab-login').classList.contains('hidden') ? doRegister() : doLogin();
});

// ── Réinitialisation du mot de passe ─────────────────────────────────────────

let _resetUid = '';

function openResetModal() {
  const m = document.getElementById('modal-reset');
  m.style.display = 'flex';
  document.getElementById('reset-step1').style.display = '';
  document.getElementById('reset-step2').style.display = 'none';
  document.getElementById('reset-alert1').innerHTML = '';
  document.getElementById('reset-email').value = '';
  _resetUid = '';
}

function closeResetModal() {
  document.getElementById('modal-reset').style.display = 'none';
}

async function doResetRequest() {
  const email = document.getElementById('reset-email').value.trim();
  if (!email) { document.getElementById('reset-alert1').innerHTML = '<div class="alert alert-warn">Veuillez saisir votre adresse e-mail.</div>'; return; }

  const btn = document.getElementById('btn-reset1');
  btn.disabled = true; btn.textContent = 'Envoi…';
  try {
    const data = await api.passwordResetRequest(email);
    _resetUid = data.uid || '';
    document.getElementById('reset-step1').style.display = 'none';
    document.getElementById('reset-step2').style.display = '';
    document.getElementById('reset-alert2').innerHTML = '';
    document.getElementById('reset-token').value = data.token || '';
    document.getElementById('reset-debug-info').innerHTML =
      '<strong>Mode démo</strong> — code pré-rempli automatiquement. En production, il serait envoyé par e-mail.';
  } catch (e) {
    document.getElementById('reset-alert1').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Envoyer';
  }
}

async function doResetConfirm() {
  const token = document.getElementById('reset-token').value.trim();
  const pw1   = document.getElementById('reset-pw1').value;
  const pw2   = document.getElementById('reset-pw2').value;
  if (!token)       { document.getElementById('reset-alert2').innerHTML = '<div class="alert alert-warn">Saisissez le code.</div>'; return; }
  if (pw1.length < 6) { document.getElementById('reset-alert2').innerHTML = '<div class="alert alert-warn">Mot de passe trop court (6 min).</div>'; return; }
  if (pw1 !== pw2)  { document.getElementById('reset-alert2').innerHTML = '<div class="alert alert-danger">Les mots de passe ne correspondent pas.</div>'; return; }

  const btn = document.getElementById('btn-reset2');
  btn.disabled = true; btn.textContent = 'Réinitialisation…';
  try {
    await api.passwordResetConfirm(_resetUid, token, pw1);
    closeResetModal();
    showAlert('login-alert', 'Mot de passe réinitialisé. Vous pouvez vous connecter.', 'success');
  } catch (e) {
    document.getElementById('reset-alert2').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Réinitialiser';
  }
}
