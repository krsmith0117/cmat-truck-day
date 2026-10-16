/* =======================================================================
   Quantity Ledger — startup

   First render. Runs after ledger-core.js, colors.js, email.js and
   snapshot.js are all loaded (buildGrid() needs the color and email
   helpers), and before ledger-sync.js, so a cloud load applies on top of
   an already-rendered page.
======================================================================= */
buildGrid();
buildPad();
buildTally();
applySavedColorNames();
