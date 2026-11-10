import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const props = new Map([
  ['SHEETS_SYNC_URL', 'https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/api/evaluation/sheets-sync'],
]);
const identityToken = 'x'.repeat(200);

class Range {
  constructor(sheet, row, col, rows, cols) { Object.assign(this, {sheet, row, col, rows, cols}); }
  getValues() { return this.values(false); }
  getDisplayValues() { return this.values(true); }
  values(display) {
    return Array.from({length:this.rows}, (_,ri) => Array.from({length:this.cols}, (_,ci) => {
      const value = this.sheet.cells[this.row + ri - 1]?.[this.col + ci - 1] ?? '';
      return display ? String(value) : value;
    }));
  }
  setValues(matrix) {
    matrix.forEach((row,ri) => row.forEach((value,ci) => {
      const r = this.row + ri - 1, c = this.col + ci - 1;
      this.sheet.cells[r] ||= [];
      this.sheet.cells[r][c] = value;
    }));
  }
}

class Sheet {
  constructor(name) { this.name = name; this.cells = []; this.maxRows = 1000; }
  getName() { return this.name; }
  getRange(...args) {
    if (typeof args[0] === 'string') throw Error('A1 addressing is not used in this test.');
    return new Range(this, ...args);
  }
  getLastRow() {
    for (let i=this.cells.length-1;i>=0;i--) if (this.cells[i]?.some(v=>v!==''&&v!==null&&v!==undefined)) return i+1;
    return 0;
  }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter(after, count) { this.maxRows += count; }
}

const student = new Sheet('Sinh viên');
const qa = new Sheet('QA - Dữ liệu thử');
const sheets = new Map([[student.name,student],[qa.name,qa]]);
let failPageTwo = false;
let seenRequests = 0;
const ctx = {
  console,
  PropertiesService: {getScriptProperties:()=>({getProperty:key=>props.get(key)||null,setProperty:(key,val)=>props.set(key,val),deleteProperty:key=>props.delete(key)})},
  SpreadsheetApp: {getActiveSpreadsheet:()=>({getSheetByName:name=>sheets.get(name)})},
  LockService: {getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  ScriptApp: {getIdentityToken:()=>identityToken},
  UrlFetchApp: {fetch:(url,opts)=>{
    assert.equal(url,'https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/api/evaluation/sheets-sync');
    const body=JSON.parse(opts.payload);
    assert.equal(opts.headers.Authorization,'Bearer '+identityToken);
    assert.equal(Object.hasOwn(body,'token'),false,'identity token must not be copied into the request body');
    seenRequests++;
    if (body.cursor === null) return response({rows:[
      {participantId:'STU001',isQa:false,preScore:4,postScore:2,improvement:-2,rating:null,comment:null,createdAt:'2026-11-10T00:00:00Z',updatedAt:'2026-11-10T00:00:00Z'},
      {participantId:'QA001',isQa:true,preScore:2,postScore:4,improvement:2,rating:5,comment:'=-1+IMPORTXML("x")',createdAt:'2026-11-10T00:00:00Z',updatedAt:'2026-11-10T00:01:00Z'},
    ],nextCursor:'cursor-1'});
    if (failPageTwo) return response({error:'temporary'},503);
    assert.equal(body.cursor,'cursor-1');
    return response({rows:[{participantId:'STU001',isQa:false,preScore:4,postScore:3,improvement:-1,rating:4,comment:'updated',createdAt:'2026-11-10T00:00:00Z',updatedAt:'2026-11-10T00:02:00Z'}],nextCursor:null});
  }}
};
function response(data,status=200) { return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(data)}; }
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('./Code.gs', import.meta.url),'utf8'),ctx);

// The production endpoint is the default and is the only permitted destination
// for the Google identity bearer token.
props.delete('SHEETS_SYNC_URL');
assert.equal(ctx.syncConfig_().url,'https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/api/evaluation/sheets-sync');
props.set('SHEETS_SYNC_URL','https://attacker.example/api/evaluation/sheets-sync');
assert.throws(()=>ctx.syncConfig_(),/approved AI Smart Campus sync endpoint/i,'rejects URL changes that could receive the identity bearer token');
props.set('SHEETS_SYNC_URL','https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/api/evaluation/sheets-sync');
ctx.ScriptApp.getIdentityToken=()=>null;
assert.throws(()=>ctx.syncConfig_(),/identity token unavailable/i);
ctx.ScriptApp.getIdentityToken=()=>identityToken;

// Full sync updates a matching ID, keeps QA isolated, and stores formula-like
// feedback as literal text. A valid negative pre/post improvement is accepted.
assert.match(ctx.syncAll(), /3 record/);
assert.equal(student.getLastRow(), 2);
assert.equal(qa.getLastRow(), 2);
assert.equal(student.cells[1][0],'STU001');
assert.equal(student.cells[1][3],-1);
assert.equal(student.cells[1][5],'updated');
assert.equal(qa.cells[1][0],'QA001');
assert.equal(qa.cells[1][5],"'=-1+IMPORTXML(\"x\")");

// A partial failure leaves prior durable writes intact; retry is idempotent.
failPageTwo = true;
assert.throws(()=>ctx.syncAll(),/HTTP 503/);
assert.equal(student.getLastRow(),2);
failPageTwo = false;
ctx.syncAll();
assert.equal(student.getLastRow(),2);
assert.equal(qa.getLastRow(),2);

assert.throws(()=>ctx.validateRow_({participantId:'BAD',isQa:false,preScore:3,postScore:4,improvement:1,rating:0,comment:'',createdAt:'',updatedAt:''}),/rating/);
assert.equal(ctx.safeText_('=SUM(A1:A2)'),"'=SUM(A1:A2)");
console.log('Apps Script sync smoke tests passed (OIDC identity header, production default URL, no body secret).');
