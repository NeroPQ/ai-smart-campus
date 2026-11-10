import assert from 'node:assert/strict';
const base = process.env.EVAL_TEST_URL || 'http://127.0.0.1:8777';
async function request(body) {
  const res = await fetch(base+'/api/evaluation', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const result = await res.json(); return {status:res.status,result};
}
const sessions=[];
for (const data of [
  {id:'QA001',pre:[1,2,1,1,0],post:[2,0,1,2,1],expected:[2,4]},
  {id:'QA002',pre:[1,2,0,2,0],post:[2,0,1,2,0],expected:[4,5]},
]) {
  const created=await request({action:'register',id:data.id,qa:true,consent:true});
  assert.equal(created.status,201,JSON.stringify(created));
  assert.equal(created.result.questions.length,5);
  assert.doesNotMatch(JSON.stringify(created.result.questions),/"correct"|"explanation"/);
  const session={id:data.id,qa:true,token:created.result.token}; sessions.push(session);
  const duplicate=await request({action:'register',id:data.id,qa:true,consent:true}); assert.equal(duplicate.status,409);
  const premature=await request({...session,action:'post',answers:data.post}); assert.equal(premature.status,409);
  const wrong=await request({...session,token:'0'.repeat(64),action:'state'}); assert.equal(wrong.status,403);
  const pre=await request({...session,action:'pre',answers:data.pre}); assert.equal(pre.status,200); assert.equal(pre.result.attempt.preScore,data.expected[0]);
  const again=await request({...session,action:'pre',answers:data.pre}); assert.equal(again.status,409);
  for (const lesson of [1,2,3]) {const done=await request({...session,action:'lesson',lesson});assert.equal(done.status,200);}
  const ready=await request({...session,action:'state'});assert.equal(ready.result.questions.length,5);assert.doesNotMatch(JSON.stringify(ready.result.questions),/"correct"|"explanation"/);
  const post=await request({...session,action:'post',answers:data.post});assert.equal(post.status,200);assert.equal(post.result.attempt.postScore,data.expected[1]);
  const feedback=await request({...session,action:'feedback',rating:4,comment:'QA synthetic only'});assert.equal(feedback.status,200);assert.equal(feedback.result.attempt.feedbackDone,true);
}
for (const session of sessions) {const state=await request({...session,action:'state'});assert.equal(state.result.attempt.id,session.id);}
const publicExport=await fetch(base+'/api/evaluation/export?qa=1');assert.equal(publicExport.status,403);
const spoofedExport=await fetch(base+'/api/evaluation/export?qa=1',{headers:{'oai-authenticated-user-email':'seedy@sites.test','oai-authenticated-user-id':'spoof'}});assert.equal(spoofedExport.status,403);
const auth=await fetch(base+'/signin-with-chatgpt?return_to=%2Fevaluate',{redirect:'manual'});const cookie=auth.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie,'local mock sign-in must supply a cookie');
const exportResult=await fetch(base+'/api/evaluation/export?qa=1',{headers:{cookie}});assert.equal(exportResult.status,200,await exportResult.clone().text());
const csv=await exportResult.text();assert.match(csv,/QA001.*2,4,2/);assert.match(csv,/QA002.*4,5,1/);assert.doesNotMatch(csv,new RegExp(sessions[0].token));
const sheetExport=await fetch(base+'/api/evaluation/export?qa=1&format=sheet',{headers:{cookie}});
assert.equal(sheetExport.status,200);
const sheetCsv=await sheetExport.text();
assert.match(sheetCsv,/"Participant ID","Pre-test \/5","Post-test \/5","Thay đổi điểm","Hữu ích \/5","Góp ý","Tạo lúc \(UTC\)","Cập nhật lúc \(UTC\)"/);
assert.match(sheetCsv,/QA001.*2,4,2/);assert.doesNotMatch(sheetCsv,new RegExp(sessions[0].token));
const live=await fetch(base+'/api/evaluation/export',{headers:{cookie}});assert.doesNotMatch(await live.text(),/QA001|QA002/);
console.log('PASS local QA001/QA002 flow, score pairing, QA isolation and administrator-only export');
