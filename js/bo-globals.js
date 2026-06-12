/** @file bo-globals.js — Session admin, nav, variables partagées entre les modules bo-*/

if (!requireAdmin()) throw new Error('redirect');
renderNav('backoffice');

let currentDossierId    = null;

let currentDossierVehicleId = null;

let allDossiers         = [];
