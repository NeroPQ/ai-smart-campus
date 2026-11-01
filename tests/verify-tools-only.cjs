const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(html, /assessment\.(js|css)|feedback\.js|learning-evaluation|feedback-form|data-quiz|lesson-card/);
for (const asset of ['assessment.js', 'assessment.css', 'feedback.js']) assert.equal(fs.existsSync(path.join(root, asset)), false);
for (const src of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))[^" ]*"/g)) assert.ok(fs.existsSync(path.join(root, src[1])), src[1]);
const nodes = [];
class Element {
  constructor(tag='div', id='') { this.tagName=tag; this.id=id; this.children=[]; this.dataset={}; this.attributes={}; this.style={}; this.handlers={}; this.className=''; this.hidden=false; nodes.push(this); this.classList={remove(){}, toggle(){}}; }
  append(...items) { for (const item of items) { item.parentElement=this; this.children.push(item); } }
  replaceChildren(...items) { this.children=[]; this.append(...items); }
  after(item) { this.parentElement.append(item); }
  setAttribute(k,v) { this.attributes[k]=String(v); }
  getAttribute(k) { return this.attributes[k]; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(k,fn) { this.handlers[k]=fn; }
  click() { this.handlers.click?.({target:this}); }
  focus() { this.focused=true; }
  scrollIntoView() {}
  matches(s) { return s==='[data-screen]' ? this.dataset.screen!==undefined : s==='[data-nav]' ? Boolean(this.dataset.nav) : s.startsWith('.') ? this.className.split(' ').includes(s.slice(1)) : s.split(/,\s*/).includes(this.tagName); }
  closest(s) { return this.matches(s) ? this : this.parentElement?.closest(s); }
  querySelectorAll(s) { return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
}
const main=new Element('main','main');
const nav=new Element('nav','site-nav');
const menu=new Element('button'); menu.className='menu-toggle';
const skip=new Element('a'); skip.className='skip-link';
for (const id of ['home','disclosure','prompts','scanner','checker']) {
  const screen=new Element('section',id);screen.dataset.screen=''; main.append(screen);
  const heading=new Element('h1');screen.append(heading);
  const link=new Element('a');link.dataset.nav=id;nav.append(link);
}
const find=id=>nodes.find(n=>n.id===id);
for (const [id,screen] of [['toolkit-disclosure','disclosure'],['toolkit-prompts','prompts'],['toolkit-scanner','scanner']]) {const mount=new Element('div',id);mount.append(new Element('h1'));find(screen).append(mount);}
const card=new Element('article');card.className='scenario-card';find('checker').append(card);
for(const id of ['scenario-step','scenario-category','scenario-title','scenario-prompt','answer-options','scenario-result','scenario-prev','scenario-next','scenario-feedback','scenario-progress-fill','scenario-percent']) card.append(new Element('div',id));
const document={getElementById:find,createElement:tag=>new Element(tag),createTextNode:text=>{const n=new Element('#text');n.textContent=text;return n;},querySelector:s=>nodes.find(n=>n.matches(s)),querySelectorAll:s=>nodes.filter(n=>n.matches(s)),addEventListener(){}};
const handlers={};
const window={location:{hash:'#toolkit-prompts'},AISmartCampusPersona:require('../dist/checker-persona.js'),addEventListener:(k,fn)=>handlers[k]=fn,scrollTo(){},matchMedia:()=>({matches:true})};
vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{document,window,requestAnimationFrame:fn=>fn()});
function route(hash,expected) {window.location.hash=hash;handlers.hashchange();assert.deepEqual(nodes.filter(n=>n.dataset.screen!==undefined&&!n.hidden).map(n=>n.id),[expected]);assert.equal(nav.children.find(n=>n.dataset.nav===expected).attributes['aria-current'],'page');}
route('#toolkit-prompts','prompts');route('#toolkit-disclosure','disclosure');route('#toolkit-scanner','scanner');route('#toolkit-survival','scanner');route('#survival','scanner');route('#checker','checker');route('#learn','prompts');route('#guideline','disclosure');route('#about','home');route('#%broken','home');
route('#checker','checker');
for(let i=0;i<10;i++){find('answer-options').querySelectorAll('button')[0].click();find('scenario-next').click();}
assert.equal(find('checker-summary').hidden,false);
assert.ok(find('checker-summary').querySelectorAll('h3').some(n=>n.textContent==='Kiến Trúc Sư Tỉnh Táo'));
assert.ok(find('checker-summary').querySelectorAll('span').some(n=>n.textContent==='10/10 lựa chọn Appropriate trong lượt này'));
console.log('PASS tool-only assets, deep links, legacy routes, malformed hash and complete Checker-to-Persona flow');
