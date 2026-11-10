/** @OnlyCurrentDoc */
/**
 * AI Smart Campus → Google Sheets synchronizer.
 * Bind this project to the evaluation spreadsheet. The endpoint authenticates
 * the Google account that owns this Apps Script project via an OIDC ID token.
 */
const DEFAULT_SYNC_URL = 'https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/api/evaluation/sheets-sync';
const SYNC_HEADERS = [
  'Participant ID', 'Pre-test /5', 'Post-test /5', 'Thay đổi điểm',
  'Hữu ích /5', 'Góp ý', 'Tạo lúc (UTC)', 'Cập nhật lúc (UTC)'
];
const STUDENT_TAB = 'Sinh viên';
const QA_TAB = 'QA - Dữ liệu thử';
const PAGE_SIZE = 200;
const MAX_PAGES_PER_RUN = 25;

/** Install one five-minute sync trigger. Run manually after setting properties. */
function setupSync() {
  const config = syncConfig_();
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Bind this Apps Script project to the evaluation spreadsheet first.');
  [STUDENT_TAB, QA_TAB].forEach(function(name) {
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('Missing sheet tab: ' + name);
    ensureHeader_(sheet);
  });
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAll') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncAll').timeBased().everyMinutes(5).create();
  return 'Sync configured for ' + config.url;
}

/** Fetch all current records and upsert them into their student/QA tabs. */
function syncAll() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return 'Another sync is already running.';
  try {
    const config = syncConfig_();
    const book = SpreadsheetApp.getActiveSpreadsheet();
    if (!book) throw new Error('No active spreadsheet. Bind this script to the target sheet.');
    let cursor = null;
    let pageCount = 0;
    let recordCount = 0;
    const seen = {};
    do {
      pageCount++;
      const page = fetchPage_(config, cursor);
      // Allow one empty look-ahead page so exactly 5,000 rows can finish when
      // the endpoint emits a cursor for every full page.
      if (pageCount > MAX_PAGES_PER_RUN && page.rows.length) {
        throw new Error('More than ' + (MAX_PAGES_PER_RUN * PAGE_SIZE) + ' records; increase MAX_PAGES_PER_RUN before syncing.');
      }
      if (page.rows.length) recordCount += page.rows.length;
      upsertPage_(book, page.rows);
      cursor = page.nextCursor;
      if (cursor !== null) {
        if (typeof cursor !== 'string' || !cursor || seen[cursor]) throw new Error('Invalid or repeated page cursor.');
        seen[cursor] = true;
      }
    } while (cursor !== null);
    return 'Sync complete (' + recordCount + ' record(s), ' + pageCount + ' page request(s)).';
  } finally {
    lock.releaseLock();
  }
}

function syncConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = (props.getProperty('SHEETS_SYNC_URL') || DEFAULT_SYNC_URL).trim();
  if (!/^https:\/\/[^\s]+\/api\/evaluation\/sheets-sync\/?$/.test(url)) {
    throw new Error('Set SHEETS_SYNC_URL to the HTTPS evaluation sync endpoint in Script Properties.');
  }
  const normalizedUrl = url.replace(/\/$/, '');
  if (normalizedUrl !== DEFAULT_SYNC_URL) {
    throw new Error('SHEETS_SYNC_URL must match the approved AI Smart Campus sync endpoint.');
  }
  const identityToken = ScriptApp.getIdentityToken();
  if (typeof identityToken !== 'string' || identityToken.length < 100 || identityToken.length > 16384) {
    throw new Error('Google identity token unavailable. Run setupSync and grant the requested Google account scopes.');
  }
  return {url: normalizedUrl, identityToken: identityToken};
}

function fetchPage_(config, cursor) {
  const response = UrlFetchApp.fetch(config.url, {
    method: 'post',
    contentType: 'application/json',
    headers: {Authorization: 'Bearer ' + config.identityToken},
    payload: JSON.stringify({cursor: cursor, limit: PAGE_SIZE}),
    muteHttpExceptions: true,
    followRedirects: false
  });
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) throw new Error('Sync endpoint returned HTTP ' + status + '.');
  let data;
  try { data = JSON.parse(text); } catch (_) { throw new Error('Sync endpoint returned invalid JSON.'); }
  if (!data || !Array.isArray(data.rows) || !(data.nextCursor === null || typeof data.nextCursor === 'string')) {
    throw new Error('Sync endpoint response did not match the expected rows/nextCursor format.');
  }
  data.rows.forEach(validateRow_);
  return data;
}

function validateRow_(row) {
  if (!row || typeof row !== 'object' || typeof row.participantId !== 'string' || !row.participantId.trim() || typeof row.isQa !== 'boolean') {
    throw new Error('Sync response contains an invalid participant record.');
  }
  [['preScore', 0, 5], ['postScore', 0, 5], ['improvement', -5, 5], ['rating', 1, 5]].forEach(function(rule) {
    const key = rule[0];
    if (row[key] !== null && row[key] !== undefined && (!Number.isInteger(row[key]) || row[key] < rule[1] || row[key] > rule[2])) {
      throw new Error('Sync response contains an invalid ' + key + '.');
    }
  });
  ['comment', 'createdAt', 'updatedAt'].forEach(function(key) {
    if (row[key] !== null && row[key] !== undefined && typeof row[key] !== 'string') throw new Error('Sync response contains an invalid ' + key + '.');
  });
  if (row.comment && row.comment.length > 500) throw new Error('Sync response comment is too long.');
}

function upsertPage_(book, rows) {
  const studentRows = [];
  const qaRows = [];
  rows.forEach(function(row) { (row.isQa ? qaRows : studentRows).push(sheetValues_(row)); });
  if (studentRows.length) upsert_(book.getSheetByName(STUDENT_TAB), studentRows);
  if (qaRows.length) upsert_(book.getSheetByName(QA_TAB), qaRows);
}

function sheetValues_(row) {
  return [
    safeText_(row.participantId),
    nullableNumber_(row.preScore),
    nullableNumber_(row.postScore),
    nullableNumber_(row.improvement),
    nullableNumber_(row.rating),
    safeText_(row.comment || ''),
    safeText_(row.createdAt || ''),
    safeText_(row.updatedAt || '')
  ];
}

function safeText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function nullableNumber_(value) { return value == null ? '' : value; }

function ensureHeader_(sheet) {
  const existing = sheet.getRange(1, 1, 1, SYNC_HEADERS.length).getValues()[0];
  const populated = existing.some(function(value) { return value !== '' && value !== null; });
  if (!populated) {
    sheet.getRange(1, 1, 1, SYNC_HEADERS.length).setValues([SYNC_HEADERS]);
    return;
  }
  if (SYNC_HEADERS.some(function(value, index) { return existing[index] !== value; })) {
    throw new Error('Unexpected header row in tab "' + sheet.getName() + '"; refusing to overwrite it.');
  }
}

function upsert_(sheet, incomingRows) {
  if (!sheet) throw new Error('Expected destination tab is missing.');
  ensureHeader_(sheet);
  const lastRow = sheet.getLastRow();
  const positions = {};
  if (lastRow >= 2) {
    const existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    existingIds.forEach(function(values, index) {
      const id = String(values[0] || '').trim();
      if (!id) return;
      if (Object.prototype.hasOwnProperty.call(positions, id)) throw new Error('Duplicate Participant ID in tab "' + sheet.getName() + '": ' + id);
      positions[id] = index + 2;
    });
  }
  const updates = [];
  const inserts = [];
  incomingRows.forEach(function(values) {
    const id = String(values[0]);
    if (Object.prototype.hasOwnProperty.call(positions, id)) updates.push({row: positions[id], values: values});
    else {
      positions[id] = lastRow + inserts.length + 1;
      inserts.push(values);
    }
  });
  updates.forEach(function(update) { sheet.getRange(update.row, 1, 1, SYNC_HEADERS.length).setValues([update.values]); });
  if (inserts.length) {
    const neededLastRow = lastRow + inserts.length;
    if (neededLastRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), neededLastRow - sheet.getMaxRows());
    sheet.getRange(lastRow + 1, 1, inserts.length, SYNC_HEADERS.length).setValues(inserts);
  }
}
