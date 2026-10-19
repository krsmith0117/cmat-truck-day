/* =======================================================================
   Quantity Ledger — printing and the emailed page

   buildPrintableHtml() makes the email attachment: a read-only, fully
   styled copy of the ledger as it looks right now. It carries no scripts
   and no controls, and its CSS is copied into the file itself, so it looks
   right when opened from an email with nothing else next to it.

   (Save still uses buildLedgerSnapshotHtml() in snapshot.js, which keeps
   the page editable but needs the site's .js and .css files beside it.)

   Loaded after snapshot.js. Styling for the printed page and for the
   static copy is in print.css.
======================================================================= */

// Interactive bits and app-status text that mean nothing in a static copy.
const STATIC_REMOVE_SELECTORS = [
  '.ledger-sync',      // cloud sync controls in the header
  '.pad-col',          // number pad
   '.qty-dock',         // docked quantity bar
  '.color-mark-bar',   // "Mark green" etc. buttons and their name boxes
  '.grid-actions',     // clear all / lock
  '.action-bar',       // Save / Print
  '.hint',             // "select a blank cell to begin"
  '.row-mail-status'   // "mailing… / mailed / mail failed"
];

/* Reads the page's stylesheets back as an ordered list of
   {css} (rules copied in) or {href} (couldn't be read, so link it by its
   full address instead). Copying works for stylesheets served from the
   same site, e.g. GitHub Pages. A stylesheet the browser won't let a page
   read — opened straight from disk, or on another site — falls back to a
   link, so the attachment is then only fully styled while online. */
function collectStylesheets(){
  const parts = [];
  for(const sheet of document.styleSheets){
    const node = sheet.ownerNode;
    if(node && node.tagName === 'STYLE'){
      parts.push({css: node.textContent});
      continue;
    }
    try{
      parts.push({css: Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')});
    } catch(err){
      if(sheet.href){
        console.warn('[Quantity Ledger] could not copy styles from', sheet.href, '- linking instead');
        parts.push({href: sheet.href});
      }
    }
  }
  return parts;
}

/* The tally prints on its own page, so label it with the truck / unit.
   print.css shows data-print-label next to the "Tally" heading (print only). */
function setPrintLabel(rootEl){
  const body = rootEl.querySelector('#tallyBody');
  const panel = body ? body.closest('.panel') : null;
  const title = panel ? panel.querySelector('.panel-title') : null;
  if(!title) return null;

  const parts = [];
  if(truckInput.value) parts.push('Truck ' + truckInput.value);
  if(unitInput.value) parts.push('Unit ' + unitInput.value);
  if(parts.length) title.setAttribute('data-print-label', parts.join(' · '));
  else title.removeAttribute('data-print-label');
  return title;
}

function buildPrintableHtml(){
  const root = document.documentElement.cloneNode(true);
  root.classList.add('static-snapshot');

  // A picture of the ledger, not the app: no scripts, no controls.
  root.querySelectorAll('script').forEach((n) => n.remove());
  root.querySelectorAll(STATIC_REMOVE_SELECTORS.join(',')).forEach((n) => n.remove());

  setPrintLabel(root);

  // Don't show whichever cell happened to be selected.
  root.querySelectorAll('.cell.selected').forEach((c) => c.classList.remove('selected'));

  // Typed input values aren't part of the HTML, so write them out as text.
  [truckInput, unitInput].forEach((live) => {
    const el = root.querySelector('#' + live.id);
    if(!el) return;
    const span = document.createElement('span');
    span.className = el.className;
    span.textContent = live.value || '–';
    el.replaceWith(span);
  });

  // Swap the linked stylesheets for copies of their rules.
  const head = root.querySelector('head');
  head.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => n.remove());
  collectStylesheets().forEach((part) => {
    if(part.css !== undefined){
      const style = document.createElement('style');
      style.textContent = part.css;
      head.appendChild(style);
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = part.href;
      head.appendChild(link);
    }
  });

  return '<!DOCTYPE html>\n' + root.outerHTML;
}

/* ---------------------------------------------------------------------
   Print button. The selected cell is drawn dark on screen; take that
   highlight off while printing so the cell prints as it really is.
--------------------------------------------------------------------- */
let selectionHiddenForPrint = null;

window.addEventListener('beforeprint', () => {
  // Some browsers fire beforeprint more than once before afterprint; don't
  // lose track of the cell we already un-highlighted.
  if(selectionHiddenForPrint) return;
  selectionHiddenForPrint = document.querySelector('.cell.selected');
  if(selectionHiddenForPrint) selectionHiddenForPrint.classList.remove('selected');
  setPrintLabel(document);
});

window.addEventListener('afterprint', () => {
  if(selectionHiddenForPrint && selectionHiddenForPrint.isConnected){
    selectionHiddenForPrint.classList.add('selected');
  }
  selectionHiddenForPrint = null;
  const title = setPrintLabel(document);
  if(title) title.removeAttribute('data-print-label');
});

document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});
