/* =======================================================================
   Quantity Ledger — row emails

   Fires once, automatically, the moment all 25 cells in a row have a
   quantity entered. Uses EmailJS (client-side email API) so no server is
   needed — just a Service ID, Template ID and Public Key from an EmailJS
   account, set below.

   Needs the EmailJS CDN script loaded first (see the HTML), and loads
   after ledger-core.js because it initialises state from isRowComplete().
   Uses buildLedgerSnapshotHtml() from snapshot.js at send time.
======================================================================= */

/* ---------------------------------------------------------------------
   EmailJS configuration — fill these in from your EmailJS dashboard
   (emailjs.com → Email Services / Email Templates / Account → General).
   Until PUBLIC_KEY is set to a real value, row emails are skipped and a
   note is logged to the browser console instead of sending anything.
--------------------------------------------------------------------- */
const EMAILJS_SERVICE_ID  = 'service_0m0eo57';
const EMAILJS_TEMPLATE_ID = 'template_ddcvfcg';
const EMAILJS_PUBLIC_KEY  = 'hdaK9w6lEn-dri6Mp';
const NOTIFY_EMAIL = 'karobins117@gmail.com';
// Must exactly match the "Attachment" parameter name configured in the
// EmailJS template's Attachments tab (dashboard.emailjs.com/admin/templates).
const EMAILJS_ATTACHMENT_FIELD = 'ledger_file';

const emailjsReady = typeof emailjs !== 'undefined'
  && EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY';

if(emailjsReady){
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

/* ---------------------------------------------------------------------
   State
--------------------------------------------------------------------- */

// Tracks which rows have already had their "row complete" email sent, so a
// row doesn't re-send every time a value inside it is edited afterward.
// Rows that are already fully filled when a saved file is reloaded are
// marked as already-sent so re-opening a saved ledger doesn't re-email.
let rowEmailSent = Array.from({length: PAIR_ROWS}, (_, pr) => isRowComplete(pr));
let rowEmailStatus = Array.from({length: PAIR_ROWS}, () => ''); // '', 'sending', 'sent', 'error'

// A row was edited back to incomplete: make it eligible to email again.
function resetRowEmailState(pr){
  rowEmailSent[pr] = false;
  rowEmailStatus[pr] = '';
}

// Clear-all: nothing has been emailed any more.
function resetAllRowEmailState(){
  rowEmailSent = Array.from({length: PAIR_ROWS}, () => false);
  rowEmailStatus = Array.from({length: PAIR_ROWS}, () => '');
}

// Draws the little "mailing… / ✓ mailed / mail failed" note under a row
// total. Called by buildGrid() in ledger-core.js.
function renderRowMailStatus(el, status){
  if(status === 'sending'){
    el.textContent = 'mailing…';
    el.classList.add('sending');
  } else if(status === 'sent'){
    el.textContent = '✓ mailed';
    el.classList.add('sent');
  } else if(status === 'error'){
    el.textContent = 'mail failed';
    el.classList.add('error');
  }
}

/* ---------------------------------------------------------------------
   Sending
--------------------------------------------------------------------- */
function maybeEmailRow(pr){
  if(rowEmailSent[pr]) return;
  if(!isRowComplete(pr)) return;

  rowEmailSent[pr] = true;
  sendRowEmail(pr);
}

function formatRowDetails(pr){
  const lines = [];
  for(let c = 0; c < COLS; c++){
    lines.push(`#${refNumber(pr, c)}: ${data[pr][c]}`);
  }
  return lines.join('\n');
}

// Converts text to a base64 data: URI, the format EmailJS "Variable
// Attachment" template fields expect (as opposed to a raw File object,
// which is only for "Form File Attachment" / emailjs.sendForm()).
// Uses TextEncoder first so non-ASCII characters (emoji, em dashes, etc.
// used throughout this page) encode correctly instead of breaking btoa().
function toDataUri(text, mimeType){
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for(let i = 0; i < bytes.length; i++){
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function sendRowEmail(pr){
  const rowNumber = pr + 1;
  const refStart = refNumber(pr, 0);
  const refEnd = refNumber(pr, COLS - 1);
  const total = rowTotal(pr);

  const snapshotHtml = buildPrintableHTML();
  const snapshotDataUri = toDataUri(snapshotHtml, 'text/html');

  const templateParams = {
    to_email: NOTIFY_EMAIL,
    truck_number: truckInput.value || '(not set)',
    truck_unit: unitInput.value || '(not set)',
    row_number: rowNumber,
    ref_start: refStart,
    ref_end: refEnd,
    row_total: total,
    row_details: formatRowDetails(pr),
    [EMAILJS_ATTACHMENT_FIELD]: snapshotDataUri
  };

  if(!emailjsReady){
    console.warn(
      '[Quantity Ledger] EmailJS is not configured — row', rowNumber,
      'would have been emailed to', NOTIFY_EMAIL, 'with the full sheet attached',
      'Fill in EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY at the top of email.js to enable sending.',
      templateParams
    );
    rowEmailStatus[pr] = 'error';
    buildGrid();
    return;
  }

  rowEmailStatus[pr] = 'sending';
  buildGrid();

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => {
      rowEmailStatus[pr] = 'sent';
      buildGrid();
    })
    .catch((err) => {
      console.error('[Quantity Ledger] Row email failed for row', rowNumber, err);
      rowEmailStatus[pr] = 'error';
      rowEmailSent[pr] = false; // allow a retry later
      buildGrid();
    });
}
