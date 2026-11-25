/**
 * Oxygen Lounge — bookings to Google Sheet.
 * Paste into Extensions → Apps Script of the bookings Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 */
const SHEET_NAME = "Bookings";
const HEADERS = ["Received", "Name", "Phone", "Date", "Time", "Guests", "Notes", "Status"];

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.botcheck === "true" || p.botcheck === "on") return out({ ok: true });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    const clean = (v) => String(v || "").slice(0, 500).replace(/^[=+\-@]/, "'$&");
    sh.appendRow([new Date(), clean(p.Name), clean(p.Phone), clean(p.Date), clean(p.Time), clean(p.Guests), clean(p.Notes), "New"]);
    return out({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return out({ ok: true, service: "Oxygen Lounge bookings" }); }

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
