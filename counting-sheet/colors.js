/* =======================================================================
   Quantity Ledger — colors

   The ten church colors: the list below, the "Mark" buttons above the
   grid, the total tiles under it, and the helpers the grid uses to color
   cells and add up each color.

   The buttons and tiles are built from COLOR_OPTIONS, so this list is the
   only place to change the names. Their look is in colors.css.

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
  { key: 'deepteal',    name: 'Church 1'  },
  { key: 'seagreen',    name: 'Church 2'  },
  { key: 'sagegreen',   name: 'Church 3'  },
  { key: 'softsage',    name: 'Church 4'  },
  { key: 'goldensand',  name: 'Church 5'  },
  { key: 'warmapricot', name: 'Church 6'  },
  { key: 'terracotta',  name: 'Church 7'  },
  { key: 'clay',        name: 'Church 8'  },
  { key: 'warmivory',   name: 'Church 9'  },
  { key: 'dustyindigo', name: 'Church 10' }
];

const COLORS = COLOR_OPTIONS.map((o) => o.key);

/* ---------------------------------------------------------------------
   Build the Mark buttons (above the grid) and the total tiles (below it)
--------------------------------------------------------------------- */
const colorMarkBar = document.getElementById('colorMarkBar');
const colorTotalsEl = document.getElementById('colorTotals');
const colorButtonEls = {};

COLOR_OPTIONS.forEach(({key, name}) => {
  const btn = document.createElement('button');
  btn.className = 'color-btn ' + key;
  btn.id = key + 'Btn';
  btn.disabled = true; // enabled once a cell is selected
  btn.textContent = name;
  btn.title = 'Mark the selected cell: ' + name;
  btn.addEventListener('click', () => toggleColor(key));
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

function setColorButtonsDisabled(disabled){
  COLORS.forEach((c) => { colorButtonEls[c].disabled = disabled; });
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
