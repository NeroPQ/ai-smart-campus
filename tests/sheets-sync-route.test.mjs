import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const project = process.cwd();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'asc-sheets-sync-'));
const audience = '189645506328-tf5uhef31v3mfnbl9kake65aih9ro7gu.apps.googleusercontent.com';
const ownerEmail = 'phanthienquang11234@gmail.com';
const signingPair = await webcrypto.subtle.generateKey(
  {name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},
  true,
  ['sign','verify'],
);
const publicJwk = {...await webcrypto.subtle.exportKey('jwk',signingPair.publicKey),kid:'test-google-key',use:'sig',alg:'RS256'};
const now = Math.floor(Date.now()/1000);
const base64url = value => Buffer.from(value).toString('base64url');
async function identityToken(claimOverrides={}) {
  const header = base64url(JSON.stringify({alg:'RS256',typ:'JWT',kid:'test-google-key'}));
  const payload = base64url(JSON.stringify({iss:'https://accounts.google.com',aud:audience,sub:'110000000000000000001',email:ownerEmail,email_verified:true,iat:now-5,exp:now+300,...claimOverrides}));
  const signingInput = `${header}.${payload}`;
  const signature = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',signingPair.privateKey,new TextEncoder().encode(signingInput));
  return `${signingInput}.${Buffer.from(signature).toString('base64url')}`;
}
const rows = [
  {key:'live:ASC001',participant_id:'ASC001',is_qa:0,pre_score:2,post_score:4,feedback:JSON.stringify({rating:5,comment:'Useful'}),created_at:'2026-11-01T00:00:00.000Z',updated_at:'2026-11-01T01:00:00.000Z',access_hash:'must-not-leak',pre_answers:'secret'},
  {key:'qa:QA001',participant_id:'QA001',is_qa:1,pre_score:2,post_score:4,feedback:JSON.stringify({rating:4,comment:'Synthetic QA'}),created_at:'2026-11-02T00:00:00.000Z',updated_at:'2026-11-02T01:00:00.000Z',access_hash:'must-not-leak',pre_answers:'secret'},
  {key:'qa:QA002',participant_id:'QA002',is_qa:1,pre_score:4,post_score:5,feedback:null,created_at:'2026-11-03T00:00:00.000Z',updated_at:'2026-11-03T01:00:00.000Z',access_hash:'must-not-leak',pre_answers:'secret'},
];
const bundled = path.join(temp, 'route.mjs');
await build({entryPoints:[path.join(project,'app/api/evaluation/sheets-sync/route.ts')],outfile:bundled,bundle:true,platform:'node',format:'esm',alias:{'@':project},plugins:[{name:'mock-cloudflare-workers',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env-mock',namespace:'env-mock'}));b.onLoad({filter:/.*/,namespace:'env-mock'},()=>({contents:'export const env = globalThis.__TEST_ENV__;',loader:'js'}))}}]});

const bindings = {SHEETS_SYNC_TOKEN:'T'.repeat(48),ADMIN_EMAIL:ownerEmail, DB:{prepare(sql){assert.match(sql,/ORDER BY key LIMIT \?/);return {bind(cursor,limit){return {async all(){const selected=rows.filter(row=>row.key>(cursor||'')).slice(0,limit);return {results:selected}}}}}}}};
globalThis.__TEST_ENV__ = bindings;
const {POST} = await import(pathToFileURL(bundled).href);
const request = body => new Request('https://example.test/api/evaluation/sheets-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

for (const token of ['', 'wrong']) {
  const response=await POST(request({token,cursor:null,limit:2}));
  assert.equal(response.status,401);
  assert.equal(response.headers.get('cache-control'),'no-store, private');
}
assert.equal((await POST(new Request('https://example.test/api/evaluation/sheets-sync',{method:'POST'}))).status,415);

const first=await POST(request({token:bindings.SHEETS_SYNC_TOKEN,cursor:null,limit:2}));
assert.equal(first.status,200);
const firstBody=await first.json();
assert.deepEqual(firstBody.rows.map(row=>row.participantId),['ASC001','QA001']);
assert.equal(firstBody.rows[0].improvement,2);
assert.equal(firstBody.rows[0].rating,5);
assert.equal(firstBody.rows[0].isQa,false);
assert.equal(firstBody.rows[1].isQa,true);
assert.equal(firstBody.nextCursor,'qa:QA001');
assert.doesNotMatch(JSON.stringify(firstBody),/access_hash|pre_answers|must-not-leak|secret/);

const second=await POST(request({token:bindings.SHEETS_SYNC_TOKEN,cursor:firstBody.nextCursor,limit:2}));
assert.equal(second.status,200);
const secondBody=await second.json();
assert.deepEqual(secondBody.rows.map(row=>row.participantId),['QA002']);
assert.equal(secondBody.rows[0].improvement,1);
assert.equal(secondBody.rows[0].rating,null);
assert.equal(secondBody.rows[0].isQa,true);
assert.equal(secondBody.nextCursor,null);
assert.equal((await POST(request({token:bindings.SHEETS_SYNC_TOKEN,cursor:'x'.repeat(129),limit:1}))).status,400);

const previousFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(String(url),'https://www.googleapis.com/oauth2/v3/certs');
  assert.equal(options.redirect,'manual');
  return new Response(JSON.stringify({keys:[publicJwk]}),{status:200,headers:{'cache-control':'public, max-age=300'}});
};
try {
  const bearer = await identityToken();
  const bearerRequest = (jwt, body={cursor:null,limit:2}) => new Request('https://example.test/api/evaluation/sheets-sync',{
    method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${jwt}`},body:JSON.stringify(body),
  });
  const identityResponse = await POST(bearerRequest(bearer));
  assert.equal(identityResponse.status,200);
  assert.match(identityResponse.headers.get('cache-control'),/no-store/);
  assert.doesNotMatch(await identityResponse.clone().text(),new RegExp(bearer));
  assert.equal((await POST(bearerRequest('not-a-jwt',{token:bindings.SHEETS_SYNC_TOKEN,cursor:null,limit:1}))).status,401,
    'invalid bearer tokens must not downgrade to the legacy body secret');
  assert.equal((await POST(bearerRequest(await identityToken({email:'intruder@gmail.com'})))).status,401,
    'only the configured verified owner email is accepted');
  const savedOwner = bindings.ADMIN_EMAIL;
  delete bindings.ADMIN_EMAIL;
  assert.equal((await POST(bearerRequest(bearer))).status,401,'missing owner configuration fails closed');
  bindings.ADMIN_EMAIL = savedOwner;
} finally {
  globalThis.fetch = previousFetch;
}
console.log('PASS sheets sync shared-secret and Google ID-token auth, private headers, score/feedback projection, secret exclusion, QA flag, and keyset pagination');
await fs.rm(temp,{recursive:true,force:true});
