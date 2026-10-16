/* =======================================================================
   Quantity Ledger — colors

   Everything about marking cells with a color: the list of colors, the
   "Mark <color>" buttons, the editable color names / total labels, and the
   helpers the grid uses to apply a color class and total up each color.

   Loaded after ledger-core.js. Note that the HTML (buttons, name inputs,
   total tiles) and tally-sheet.css (.color-green etc.) still have the four
   colors written out by hand; COLORS below drives the JS side.
======================================================================= */

const COLORS = ['green', 'blue', 'yellow', 'pink'];

// Kept as individual globals too, because ledger-sync.js refers to them.
const greenBtn = document.getElementById('greenBtn');
const blueBtn = document.getElementById('blueBtn');
const yellowBtn = document.getElementById('yellowBtn');
const pinkBtn = document.getElementById('pinkBtn');
const colorButtons = [greenBtn, blueBtn, yellowBtn, pinkBtn];

const colorLabelEls = {
  green: document.getElementById('greenLabel'),
  blue: document.getElementById('blueLabel'),
  yellow: document.getElementById('yellowLabel'),
  pink: document.getElementById('pinkLabel')
};
const colorDefaultLabels = {
  green: 'Green cells total',
  blue: 'Blue cells total',
  yellow: 'Yellow cells total',
  pink: 'Pink cells total'
};

/* ---------------------------------------------------------------------
   Helpers used by the grid renderer
--------------------------------------------------------------------- */

// CSS class for a stored color value, or null for blank / unknown values.
function colorClassFor(cl){
  return COLORS.includes(cl) ? 'color-' + cl : null;
}

function newColorCounts(){
  return Object.fromEntries(COLORS.map((c) => [c, 0]));
}

// Adds a cell's quantity to its color's running total (no-op if uncolored).
function addToColorCount(counts, cl, val){
  if(cl in counts) counts[cl] += (val ?? 0);
}

function renderColorTotals(counts){
  COLORS.forEach((c) => {
    document.getElementById(c + 'Total').textContent = counts[c];
  });
}

function setColorButtonsDisabled(disabled){
  colorButtons.forEach((btn) => { btn.disabled = disabled; });
}

/* ---------------------------------------------------------------------
   Marking cells
--------------------------------------------------------------------- */
function toggleColor(c){
  if(!selected) return;
  const {pr, c: col} = selected;
  const applied = color[pr][col] !== c;
  color[pr][col] = applied ? c : null;

  if(applied){
    advanceSelection();
  }

  buildGrid();
  buildPad();
  scheduleAutoSave();
}

greenBtn.addEventListener('click', () => toggleColor('green'));
blueBtn.addEventListener('click', () => toggleColor('blue'));
yellowBtn.addEventListener('click', () => toggleColor('yellow'));
pinkBtn.addEventListener('click', () => toggleColor('pink'));

/* ---------------------------------------------------------------------
   Color names (the text boxes under each button) -> total tile labels
--------------------------------------------------------------------- */
COLORS.forEach((c) => {
  const input = document.getElementById(c + 'Name');
  input.addEventListener('input', () => {
    const name = input.value.trim();
    colorLabelEls[c].textContent = name ? name : colorDefaultLabels[c];
    scheduleAutoSave();
  });
});

// Restores color names from a saved snapshot (window.__SAVED_STATE__).
// Called once by init.js.
function applySavedColorNames(){
  if(!(SAVED && SAVED.names)) return;
  COLORS.forEach((c) => {
    const name = SAVED.names[c];
    if(name){
      document.getElementById(c + 'Name').value = name;
      colorLabelEls[c].textContent = name;
    }
  });
}
