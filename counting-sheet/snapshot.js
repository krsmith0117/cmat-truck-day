/* =======================================================================
   Quantity Ledger — Save

   buildLedgerSnapshotHtml() builds the editable snapshot the Save button
   downloads. (The email attachment and the Print button are in print.js.)
======================================================================= */

/* Builds a full snapshot of the ledger as it currently stands — the same
   "save to HTML" format the Save button produces, with all entered
   quantities/colors baked in as window.__SAVED_STATE__ so opening the file
   reloads exactly this state.

      NOTE: the snapshot is the page's own HTML, so it links to the same
   external files (the .css and .js files) by relative path. It is meant to
   be opened with those files beside it; for a standalone, fully styled
   copy see buildPrintableHtml() in print.js. */
function buildLedgerSnapshotHtml(){
  const truck = truckInput.value;
  const truckUnit = unitInput.value;
  const stateJson = JSON.stringify({data, color, truck, truckUnit});
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
