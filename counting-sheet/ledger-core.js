/* =======================================================================
   Quantity Ledger — core

   Constants, state, grid / pad / tally rendering, cell selection and
   editing, truck/unit inputs, and the lock + clear-all controls.

   Load order matters (classic scripts sharing globals):
     ledger-core.js -> colors.js -> email.js -> snapshot.js
     -> init.js -> ledger-sync.js
   Nothing here *runs* anything from the later files at load time; it only
   calls them (colors / email / scheduleAutoSave) in response to clicks and
   once init.js does the first render.
======================================================================= */

const COLS = 25;
const PAIR_ROWS = 14; // 14 numbered rows * 25 cols = 350
const MIN_Q = 3, MAX_Q = 23;

const SAVED = window.__SAVED_STATE__ || null;

// data[pairRow][col] holds the entered quantity (or null) for the blank cell
// beneath reference number (pairRow*COLS + col + 1)
let data = SAVED ? SAVED.data : Array.from({length: PAIR_ROWS}, () => Array(COLS).fill(null));
let color = SAVED ? SAVED.color : Array.from({length: PAIR_ROWS}, () => Array(COLS).fill(null)); // null | color name (see colors.js)
let selected = null; // {pr, c}

const gridEl = document.getElementById('grid');
const padEl = document.getElementById('pad');
const tallyBody = document.getElementById('tallyBody');
const totalCountEl = document.getElementById('totalCount');
const totalProductEl = document.getElementById('totalProduct');
const selectedReadout = document.getElementById('selectedReadout');
const gridHint = document.getElementById('gridHint');
const deleteBtn = document.getElementById('deleteBtn');
const truckInput = document.getElementById('truckNumber');
const unitInput = document.getElementById('truckUnit');

truckInput.value = (SAVED && SAVED.truck) ? SAVED.truck : '';
truckInput.addEventListener('input', () => {
  // keep it to a single digit
  truckInput.value = truckInput.value.replace(/[^0-9]/g, '').slice(0, 1);
  scheduleAutoSave();
});

unitInput.value = (SAVED && SAVED.truckUnit) ? SAVED.truckUnit : '';
unitInput.addEventListener('input', () => {
  // keep it to at most 6 digits
  unitInput.value = unitInput.value.replace(/[^0-9]/g, '').slice(0, 6);
  scheduleAutoSave();
});

/* ---------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------- */
function refNumber(pr, c){
  return pr * COLS + c + 1;
}

function isRowComplete(pr){
  for(let c = 0; c < COLS; c++){
    if(data[pr][c] === null) return false;
  }
  return true;
}

function rowTotal(pr){
  let sum = 0;
  for(let c = 0; c < COLS; c++){
    sum += data[pr][c] ?? 0;
  }
  return sum;
}

/* ---------------------------------------------------------------------
   Rendering
--------------------------------------------------------------------- */
function buildPad(){
  padEl.innerHTML = '';
  for(let q = MAX_Q; q >= MIN_Q; q--){
    const btn = document.createElement('button');
    btn.className = 'pad-btn';
    btn.textContent = q;
    btn.disabled = !selected;
    btn.addEventListener('click', () => setSelectedValue(q));
    padEl.appendChild(btn);
  }
}

function buildGrid(){
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 30px) 44px`;
  gridEl.innerHTML = '';

  let grand = 0;
  const colorCounts = newColorCounts();

  for(let pr = 0; pr < PAIR_ROWS; pr++){
    for(let c = 0; c < COLS; c++){
      const block = document.createElement('div');
      block.className = 'pairblock';

      const ref = document.createElement('div');
      ref.className = 'refcell';
      ref.textContent = refNumber(pr, c);
      block.appendChild(ref);

      const cell = document.createElement('div');
      cell.className = 'cell';
      const val = data[pr][c];
      if(val !== null){
        cell.textContent = val;
        cell.classList.add('filled');
      }
      const cl = color[pr][c];
      const colorClass = colorClassFor(cl);
      if(colorClass) cell.classList.add(colorClass);
      if(selected && selected.pr === pr && selected.c === c){
        cell.classList.add('selected');
      }
      cell.addEventListener('click', () => selectCell(pr, c));
      block.appendChild(cell);

      gridEl.appendChild(block);

      addToColorCount(colorCounts, cl, val);
    }

    // row total cell at the end of the row
    const rt = rowTotal(pr);
    grand += rt;

    const totalBlock = document.createElement('div');
    totalBlock.className = 'rowtotal-block';

    const totalLabel = document.createElement('div');
    totalLabel.className = 'rowtotal-label';
    totalLabel.textContent = 'Total';
    totalBlock.appendChild(totalLabel);

    const totalCell = document.createElement('div');
    totalCell.className = 'rowtotal-cell';
    totalCell.textContent = rt;
    totalBlock.appendChild(totalCell);

    const mailStatus = document.createElement('div');
    mailStatus.className = 'row-mail-status';
    renderRowMailStatus(mailStatus, rowEmailStatus[pr]);
    totalBlock.appendChild(mailStatus);

    gridEl.appendChild(totalBlock);
  }

  document.getElementById('grandTotal').textContent = grand;
  renderColorTotals(colorCounts);
}

function buildTally(){
  tallyBody.innerHTML = '';
  let totalCount = 0, totalProduct = 0;
  for(let q = MIN_Q; q <= MAX_Q; q++){
    let count = 0;
    for(let pr = 0; pr < PAIR_ROWS; pr++){
      for(let c = 0; c < COLS; c++){
        if(data[pr][c] === q) count++;
      }
    }
    const product = q * count;
    totalCount += count;
    totalProduct += product;

    const tr = document.createElement('tr');
    if(count === 0) tr.classList.add('zero');
    tr.innerHTML = `<td>${q}</td><td>${count}</td><td>${product}</td>`;
    tallyBody.appendChild(tr);
  }
  totalCountEl.textContent = totalCount;
  totalProductEl.textContent = totalProduct;
}

/* ---------------------------------------------------------------------
   Selection and editing
--------------------------------------------------------------------- */
function selectCell(pr, c){
  selected = {pr, c};
  const n = refNumber(pr, c);
  gridHint.textContent = 'cell selected — tap a quantity';
  selectedReadout.innerHTML = `Selected: <b>#${n}</b> — value: <b>${data[pr][c] ?? '—'}</b>`;
  deleteBtn.disabled = data[pr][c] === null;
  setColorButtonsDisabled(false);
  buildGrid();
  buildPad();
}

function advanceSelection(){
  let {pr, c} = selected;
  c++;
  if(c >= COLS){
    c = 0;
    pr++;
  }
  if(pr < PAIR_ROWS){
    selected = {pr, c};
    const n = refNumber(pr, c);
    gridHint.textContent = 'cell selected — tap a quantity';
    selectedReadout.innerHTML = `Selected: <b>#${n}</b> — value: <b>${data[pr][c] ?? '—'}</b>`;
    deleteBtn.disabled = data[pr][c] === null;
  } else {
    // reached the end of the grid
    gridHint.textContent = 'end of grid reached';
    selectedReadout.textContent = 'No cell selected';
    deleteBtn.disabled = true;
    setColorButtonsDisabled(true);
    selected = null;
  }
}

function setSelectedValue(q){
  if(!selected) return;
  const {pr} = selected;
  data[selected.pr][selected.c] = q;

  advanceSelection();

  buildGrid();
  buildPad();
  buildTally();

  maybeEmailRow(pr);
  scheduleAutoSave();
}

function deleteSelected(){
  if(!selected) return;
  const {pr} = selected;
  data[selected.pr][selected.c] = null;
  const n = refNumber(selected.pr, selected.c);
  selectedReadout.innerHTML = `Selected: <b>#${n}</b> — value: <b>—</b>`;
  deleteBtn.disabled = true;
  // row is no longer complete, so it's eligible to email again once refilled
  resetRowEmailState(pr);
  buildGrid();
  buildTally();
  scheduleAutoSave();
}

deleteBtn.addEventListener('click', deleteSelected);

/* ---------------------------------------------------------------------
   Lock + clear all
--------------------------------------------------------------------- */
let clearLocked = true;
const lockToggle = document.getElementById('lockToggle');

lockToggle.addEventListener('click', () => {
  clearLocked = !clearLocked;
  if(clearLocked){
    lockToggle.textContent = '🔒 Locked';
    lockToggle.classList.remove('unlocked');
    lockToggle.classList.add('locked');
  } else {
    lockToggle.textContent = '🔓 Unlocked';
    lockToggle.classList.remove('locked');
    lockToggle.classList.add('unlocked');
  }
});

document.getElementById('clearAll').addEventListener('click', () => {
  if(clearLocked){
    alert('Clear All Entries is locked. Tap the lock button to unlock it first.');
    return;
  }
  if(!confirm('Are you sure you want to clear all entries?')){
    return;
  }
  data = Array.from({length: PAIR_ROWS}, () => Array(COLS).fill(null));
  color = Array.from({length: PAIR_ROWS}, () => Array(COLS).fill(null));
  resetAllRowEmailState();
  selected = null;
  selectedReadout.textContent = 'No cell selected';
  gridHint.textContent = 'select a blank cell to begin';
  deleteBtn.disabled = true;
  setColorButtonsDisabled(true);
  buildGrid();
  buildPad();
  buildTally();
  scheduleAutoSave();
});
