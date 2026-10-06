/* =======================================================================
   Quantity Ledger — cloud sync module

   Talks to the Lambda + API Gateway described in DEPLOY.md to read/write
   a ledger's state as a JSON file in S3. Loaded via <script src="ledger-
   sync.js"> AFTER the page's main inline script, so everything it needs
   (data, color, buildGrid, truckInput, colorLabelEls, scheduleAutoSave
   being *called* from the main script, etc.) already exists as globals
   by the time this file runs.
========================================================================= */

/* ---------------------------------------------------------------------
   Configuration. Point API_BASE at your API Gateway Invoke URL from the
   Lambda deployment (see DEPLOY.md). Leave as-is and cloud sync is
   simply skipped, with a note in the UI and console.
--------------------------------------------------------------------- */
const API_BASE = 'https://1vchxsghce.execute-api.us-east-1.amazonaws.com';
const cloudSyncReady = API_BASE && !API_BASE.includes('YOUR-API-ID');
const AUTOSAVE_DELAY_MS = 1500;

/* ---------------------------------------------------------------------
   Elements
--------------------------------------------------------------------- */
const ledgerSelect = document.getElementById('ledgerSelect');
const newLedgerNameInput = document.getElementById('newLedgerName');
const loadLedgerBtn = document.getElementById('loadLedgerBtn');
const syncBtn = document.getElementById('syncBtn');
const syncStatusEl = document.getElementById('syncStatus');

const NEW_LEDGER_VALUE = '__new__';

/* ---------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------- */
function currentLedgerName(){
  if(ledgerSelect.value === NEW_LEDGER_VALUE){
    return newLedgerNameInput.value.trim();
  }
  return ledgerSelect.value.trim();
}

function setSyncStatus(kind, text){
  syncStatusEl.className = 'sync-status' + (kind ? ' ' + kind : '');
  syncStatusEl.textContent = text;
}

function collectState(){
  return {
    data,
    color,
    names: {
      green: document.getElementById('greenName').value,
      blue: document.getElementById('blueName').value,
      yellow: document.getElementById('yellowName').value,
      pink: document.getElementById('pinkName').value
    },
    truck: truckInput.value,
    truckUnit: unitInput.value
  };
}

function applyState(state){
  data = state.data || Array.from({length: PAIR_ROWS}, () => Array(COLS).fill(null));
  color = state.color || Array.from({length: PAIR_ROWS}, () => Array(COLS).fill(null));

  truckInput.value = state.truck || '';
  unitInput.value = state.truckUnit || '';

  ['green', 'blue', 'yellow', 'pink'].forEach((c) => {
    const name = state.names ? state.names[c] : '';
    const input = document.getElementById(c + 'Name');
    input.value = name || '';
    colorLabelEls[c].textContent = name ? name : colorDefaultLabels[c];
  });

  rowEmailSent = Array.from({length: PAIR_ROWS}, (_, pr) => isRowComplete(pr));
  rowEmailStatus = Array.from({length: PAIR_ROWS}, () => '');
  selected = null;
  selectedReadout.textContent = 'No cell selected';
  gridHint.textContent = 'select a blank cell to begin';
  deleteBtn.disabled = true;
  greenBtn.disabled = true;
  blueBtn.disabled = true;
  yellowBtn.disabled = true;
  pinkBtn.disabled = true;

  buildGrid();
  buildPad();
  buildTally();
}

/* ---------------------------------------------------------------------
   Dropdown population — GET /ledgers lists every saved ledger name.
--------------------------------------------------------------------- */
async function populateLedgerList(selectName){
  if(!cloudSyncReady) return;

  let names = [];
  try{
    const res = await fetch(`${API_BASE}/ledgers`);
    if(res.ok){
      const body = await res.json();
      names = body.ledgers || [];
    }
  } catch(err){
    console.error('[Quantity Ledger] could not list ledgers', err);
  }

  // If we're about to select a name that isn't in the list yet (e.g. a
  // brand new ledger that hasn't been saved), include it anyway so the
  // dropdown reflects what's selected.
  if(selectName && !names.includes(selectName)){
    names = [selectName, ...names];
  }
  names.sort((a, b) => a.localeCompare(b));

  ledgerSelect.innerHTML = '';
  const newOpt = document.createElement('option');
  newOpt.value = NEW_LEDGER_VALUE;
  newOpt.textContent = '+ New ledger…';
  ledgerSelect.appendChild(newOpt);

  names.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    ledgerSelect.appendChild(opt);
  });

  if(selectName && names.includes(selectName)){
    ledgerSelect.value = selectName;
    newLedgerNameInput.style.display = 'none';
  } else {
    ledgerSelect.value = NEW_LEDGER_VALUE;
    newLedgerNameInput.style.display = '';
  }
}

/* ---------------------------------------------------------------------
   Load / save
--------------------------------------------------------------------- */
async function loadLedger(name){
  if(!cloudSyncReady){
    setSyncStatus('error', 'cloud sync not configured');
    return;
  }
  if(!name){
    setSyncStatus('error', 'enter a ledger name');
    return;
  }

  setSyncStatus('saving', 'loading…');
  try{
    const res = await fetch(`${API_BASE}/ledgers/${encodeURIComponent(name)}`);
    if(res.status === 404){
      // brand new ledger name — start blank, this is not an error
      applyState({});
      setSyncStatus('saved', 'new ledger — not yet saved');
      return;
    }
    if(!res.ok) throw new Error(`load failed (${res.status})`);
    const state = await res.json();
    applyState(state);
    setSyncStatus('saved', 'loaded ✓');
  } catch(err){
    console.error('[Quantity Ledger] load failed', err);
    setSyncStatus('error', 'load failed');
  }
}

async function saveLedger(){
  const name = currentLedgerName();
  if(!cloudSyncReady){
    setSyncStatus('error', 'cloud sync not configured');
    return;
  }
  if(!name){
    setSyncStatus('error', 'enter a ledger name');
    return;
  }

  setSyncStatus('saving', 'saving…');
  try{
    const res = await fetch(`${API_BASE}/ledgers/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectState())
    });
    if(!res.ok) throw new Error(`save failed (${res.status})`);
    const now = new Date();
    setSyncStatus('saved', 'synced ' + now.toLocaleTimeString());

    // refresh the dropdown so a newly-created ledger shows up in it
    await populateLedgerList(name);
  } catch(err){
    console.error('[Quantity Ledger] save failed', err);
    setSyncStatus('error', 'save failed — will retry');
  }
}

let autoSaveTimer = null;
function scheduleAutoSave(){
  if(!cloudSyncReady || !currentLedgerName()) return;
  setSyncStatus('saving', 'pending save…');
  if(autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    saveLedger();
  }, AUTOSAVE_DELAY_MS);
}

/* ---------------------------------------------------------------------
   Wiring
--------------------------------------------------------------------- */
ledgerSelect.addEventListener('change', () => {
  if(ledgerSelect.value === NEW_LEDGER_VALUE){
    newLedgerNameInput.style.display = '';
    newLedgerNameInput.value = '';
    newLedgerNameInput.focus();
    setSyncStatus('', 'not loaded');
    return;
  }

  newLedgerNameInput.style.display = 'none';
  const name = ledgerSelect.value;
  loadLedger(name);

  const url = new URL(window.location.href);
  url.searchParams.set('ledger', name);
  window.history.replaceState({}, '', url);
});

loadLedgerBtn.addEventListener('click', () => {
  const name = currentLedgerName();
  loadLedger(name);
  if(name){
    const url = new URL(window.location.href);
    url.searchParams.set('ledger', name);
    window.history.replaceState({}, '', url);
  }
});

newLedgerNameInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') loadLedgerBtn.click();
});

syncBtn.addEventListener('click', () => saveLedger());

/* ---------------------------------------------------------------------
   Startup: populate the dropdown, then honor ?ledger=NAME in the URL.
--------------------------------------------------------------------- */
if(!cloudSyncReady){
  setSyncStatus('', 'cloud sync not configured');
} else {
  const urlLedger = new URL(window.location.href).searchParams.get('ledger');
  populateLedgerList(urlLedger || null).then(() => {
    if(urlLedger){
      loadLedger(urlLedger);
    } else {
      setSyncStatus('', 'not loaded');
    }
  });
}
