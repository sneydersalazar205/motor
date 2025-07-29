const assert = require('assert');
let called = false;
const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'nodemailer') {
    return { createTransport: () => ({ sendMail: () => Promise.resolve() }) };
  }
  if (request === 'express') {
    const fn = function() { return { use() {}, post() {}, get() {}, patch() {}, listen() {} }; };
    fn.json = () => (req,res,next)=>{ if(next) next(); };
    fn.static = () => (req,res,next)=>{ if(next) next(); };
    return fn;
  }
  return originalLoad(request, parent, isMain);
};

const { hasConflict } = require('../server');

const list = [
  { date: '2025-01-01T18:00', status: 'pending' },
  { date: '2025-01-02T20:00', status: 'confirmed' }
];

assert.strictEqual(hasConflict(list, '2025-01-01T19:00'), true, 'should detect overlap');
assert.strictEqual(hasConflict(list, '2025-01-01T21:00'), false, 'should allow later time');
console.log('conflict test passed');
Module._load = originalLoad;
