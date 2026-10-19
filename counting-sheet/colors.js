/* =======================================================================
   Quantity Ledger — colors

   The ten church colors. The color says WHICH CHURCH DELIVERED a box; the
   number in the cell says how many items were in it.

   The buttons above the grid choose the active church. Nothing can be
   entered until one is chosen, and every quantity entered afterwards takes
   that color until a different church is chosen. (Selecting a color never
   changes cells that are already filled.)

   This file holds the list of colors, those buttons, the total tiles under
   the grid, and the helpers the grid uses to color cells and add up each
   color. The buttons and tiles are built from COLOR_OPTIONS, so that list is
   the only place to change the names. Their look is in colors.css.

   Loaded after ledger-core.js.
======================================================================= */

/* ---------------------------------------------------------------------
   The colors. Order here is the order on screen.

   key  - stored in the saved ledger and used as the CSS class name
          (.color-KEY, .color-btn.KEY, .color-total-tile.KEY in colors.css,
          which use the --lKEY variables in tally-sheet.css).
          Do NOT change a key once ledgers have been saved with it, or
          those cells will lose their color.
   name - what people see. Safe to change at any time: put the real church
          names here when you have them.
--------------------------------------------------------------------- */
const COLOR_OPTIONS = [
  { key: 'softblue',    name: 'Grace Bible Church'  },
  { key: 'seagreen',    name: 'Santa Fe Trail Baptist Church'  },
  { key: 'sagegreen',   name: 'Centralia - First Baptist Church'  },
  { key: 'softsage',    name: 'Grandview Baptist Church'  },
  { key: 'goldensand',  name: 'Midway Heights Baptist Church'  },
  { key: 'warmapricot', name: 'Open Door Baptist Church'  },
  { key: 'terracotta',  name: 'Prairie Grove Baptist Church'  },
  { key: 'clay',        name: 'Harrisburg Christian Church'  },
  { key: 'lavendar',   name: 'Carpenter Street - Moberly'  },
  { key: 'softpink', name: 'Salisbury - First Baptist Church' }
];

const COLORS = COLOR_OPTIONS.map((o) => o.key);
const COLOR_NAMES = Object.fromEntries(COLOR_OPTIONS.map((o) => [o.key, o.name]));

function colorName(key){
  return COLOR_NAMES[key] || key;
}

/* ---------------------------------------------------------------------
   Build the church buttons (above the grid) and the total tiles (below it)
--------------------------------------------------------------------- */
const colorMarkBar = document.getElementById('colorMarkBar');
const colorTotalsEl = document.getElementById('colorTotals');
const colorButtonEls = {};

const colorCaption = document.createElement('div');
colorCaption.className = 'color-bar-caption';
colorCaption.textContent = 'Delivered by — pick a church before entering quantities; it stays selected until you pick another';
colorMarkBar.appendChild(colorCaption);

COLOR_OPTIONS.forEach(({key, name}) => {
  const btn = document.createElement('button');
  btn.className = 'color-btn ' + key;
  btn.id = key + 'Btn';
  btn.textContent = name;
  btn.title = 'Delivered by ' + name;
  btn.setAttribute('aria-pressed', 'false');
  btn.addEventListener('click', () => selectColor(key));
  colorMarkBar.appendChild(btn);
  colorButtonEls[key] = btn;

  const tile = document.createElement('div');
  tile.className = 'color-total-tile ' + key;
  const label = document.createElement('span');
  label.id = key + 'Label';
  label.textContent = name;
  const total = document.createElement('b');
  total.id = key + 'Total';
  total.textContent = '0';
  tile.appendChild(label);
  tile.appendChild(total);
  colorTotalsEl.appendChild(tile);
});

/* ---------------------------------------------------------------------
   Helpers used by the grid renderer
--------------------------------------------------------------------- */

// CSS class for a stored color value, or null for blank / unknown values
// (for example the old green / blue / yellow / pink marks from before the
// ten church colors — those cells simply show as uncolored).
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

/* ---------------------------------------------------------------------
   Choosing the active church
--------------------------------------------------------------------- */

// Show which church button is the active one.
function syncColorButtons(){
  COLORS.forEach((c) => {
    const on = c === activeColor;
    colorButtonEls[c].classList.toggle('active', on);
    colorButtonEls[c].setAttribute('aria-pressed', String(on));
  });
}

// Clicking the active church again keeps it active (it is a choice, not a
// switch), so it can't be switched off by accident mid-entry. Nothing in the
// ledger changes here, so there is nothing to auto-save.
function selectColor(key){
  activeColor = key;
  syncColorButtons();
  buildPad(); // enables the number pad (if a cell is selected) and the hint
}

// Kept because ledger-sync.js still calls this from applyState() after it
// loads a ledger. Colors are no longer switched on and off by selecting a
// cell, so the only thing that call needs now is to forget the active color.
function setColorButtonsDisabled(disabled){
  if(disabled) resetEntryMode();
}
