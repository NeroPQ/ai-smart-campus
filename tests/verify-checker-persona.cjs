const assert = require('node:assert/strict');
const { getCard } = require('../public/checker-persona.js');
for (const score of [0, 4]) assert.equal(getCard(score).kind, 'sleepwalker');
for (const score of [5, 7]) assert.equal(getCard(score).kind, 'sprinter');
for (const score of [8, 10]) assert.equal(getCard(score).kind, 'architect');
for (const invalid of [-1, 11, 5.5, NaN, '8', null]) assert.equal(getCard(invalid), null);
for (let score = 0; score <= 10; score++) {
  const card = getCard(score);
  assert.match(card.href, /^#/);
  assert.doesNotMatch(card.description, /vi phạm Điều|chắc chắn|tính cách/);
}
console.log('PASS Persona thresholds 4/5 and 7/8, invalid counts, and practice-only wording');
