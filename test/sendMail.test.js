const assert = require('assert');
let called = false;
const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'nodemailer') {
    return {
      createTransport: () => ({
        sendMail: () => { called = true; return Promise.resolve(); }
      })
    };
  }
  if (request === 'express') {
    const fn = function() {
      return { use() {}, post() {}, get() {}, listen() {} };
    };
    fn.json = () => (req,res,next)=>{ if(next) next(); };
    fn.static = () => (req,res,next)=>{ if(next) next(); };
    return fn;
  }
  return originalLoad(request, parent, isMain);
};

process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_PASS = 'pass';

const { sendMail } = require('../server');

(async () => {
  await sendMail({ email: 'dest@example.com', name: 'Test', date: '2025-01-01', details: 'demo' });
  assert.strictEqual(called, true, 'sendMail should invoke transporter');
  console.log('sendMail test passed');
  Module._load = originalLoad;
})();
