/* =======================================================================
   Quantity Ledger — snapshot, Save and Print

   buildLedgerSnapshotHtml() is shared by the Save button below and by the
   row-complete email attachment in email.js.
======================================================================= */

/* Builds a full snapshot of the ledger as it currently stands — the same
   "save to HTML" format the Save button produces, with all entered
   quantities/colors baked in as window.__SAVED_STATE__ so opening the file
   reloads exactly this state.

   NOTE: the snapshot is the page's own HTML, so it links to the same
   external files (tally-sheet.css and the .js files) by relative path.
   Opened from somewhere those files aren't, it will be missing them. */
function buildLedgerSnapshotHtml(){
  const names = Object.fromEntries(
    COLORS.map((c) => [c, document.getElementById(c + 'Name').value])
  );
  const truck = truckInput.value;
  const truckUnit = unitInput.value;
  const stateJson = JSON.stringify({data, color, names, truck, truckUnit});
  const stateScript = '<script>window.__SAVED_STATE__ = ' + stateJson + ';<\/script>\n';
  return '<!DOCTYPE html>\n' + document.documentElement.outerHTML.replace('<head>', '<head>\n' + stateScript);
}

function triggerDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('saveBtn').addEventListener('click', () => {
  let filename = prompt('Name this file:', 'quantity-ledger-saved');
  if(filename === null) return; // user cancelled

  filename = filename.trim();
  if(filename === '') filename = 'quantity-ledger-saved';
  // strip characters that aren't safe in filenames, and any existing extension
  filename = filename.replace(/\.html?$/i, '').replace(/[\\/:*?"<>|]/g, '');
  if(filename === '') filename = 'quantity-ledger-saved';

  const fullHtml = buildLedgerSnapshotHtml();
  const blob = new Blob([fullHtml], {type: 'text/html'});
  triggerDownload(blob, filename + '.html');
});

document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});
