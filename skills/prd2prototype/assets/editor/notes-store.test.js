const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const store = require('./notes-store');

test('说明保存：版本冲突、跨页保留、富文本及旧格式兼容', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prototype-notes-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'data/annotations.js'), "window.__ANNO__ = {overrides:{'old.id':'手改内容'}, additions:{}, removed:[], custom:{keep:true}};");
    const revision = store.read(dir).revision;
    const a = store.save(dir, {revision,pageKey:'a.html',overrides:{'a.global':'<table><tr><td>规则</td></tr></table>'},notes:[{id:'a.manual',title:'手工说明',body:'正文',target:{selector:'#button'}}]});
    assert.throws(() => store.save(dir, {revision,pageKey:'b.html',overrides:{},notes:[]}), e => e.status === 409);
    store.save(dir, {revision:a.revision,pageKey:'b.html',overrides:{'b.text':'B'},notes:[{id:'b.manual',body:'框选',target:{rect:{x:1,y:2,width:3,height:4}}}]});
    store.saveLegacy(dir, {overrides:{'old.id':'旧编辑器修改'},additions:{'a.list':[{id:'a.item',text:'新增'}]},removed:[]});
    const actual = store.read(dir).value;
    assert.equal(actual.notes['a.html'][0].body,'正文');
    assert.equal(actual.notes['b.html'][0].body,'框选');
    assert.equal(actual.overrides['a.global'],'<table><tr><td>规则</td></tr></table>');
    assert.equal(actual.overrides['old.id'],'旧编辑器修改');
    assert.equal(actual.overrides['b.text'],'B');
    assert.equal(actual.custom.keep,true);
    store.saveLegacy(dir, {overrides:{}, additions:{}, removed:['a.item']});
    assert.equal(store.read(dir).value.additions['a.list'].length,0);
    fs.writeFileSync(path.join(dir, 'data/annotations.js'), "window.__ANNO__ = {'legacy.id':'原始覆盖'};");
    store.saveLegacy(dir, {'new.id':'新的覆盖'});
    assert.equal(store.read(dir).value.overrides['legacy.id'],'原始覆盖');
    assert.equal(store.read(dir).value.overrides['new.id'],'新的覆盖');
    fs.writeFileSync(path.join(dir, 'data/annotations.js'), 'while(true) {}');
    assert.throws(() => store.read(dir), /timed out/);
  } finally { fs.rmSync(dir, {recursive:true,force:true}); }
});

test('HTTP 编辑会话、无 token 拒绝、来源校验、409 及落盘', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prototype-notes-http-'));
  const port = 49000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, [path.join(__dirname,'serve.js')], {env:{...process.env,PORT:String(port),IDLE_MS:'60000'},stdio:['ignore','pipe','pipe']});
  try {
    await new Promise((resolve,reject) => { child.stdout.once('data',resolve); child.once('error',reject); child.once('exit',code => reject(new Error('server exit '+code))); });
    const origin = 'http://127.0.0.1:'+port;
    const base = origin+'/p/'+Buffer.from(dir).toString('base64url')+'/';
    const session = await (await fetch(base+'notes-session')).json();
    assert.equal(session.editable,true); assert.equal(session.token.length,64);
    const payload = {token:session.token,revision:session.revision,pageKey:'index.html',overrides:{'global.rule':'手写规则'},notes:[{id:'manual.1',title:'手工',body:'新增说明',target:{anchor:'test'}}]};
    const post = (data, headers={}) => fetch(base+'save-notes',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(data)});
    assert.equal((await post({...payload,token:''})).status,403);
    assert.equal((await post(payload,{Origin:'https://example.com'})).status,403);
    assert.equal((await fetch(base+'notes-session',{headers:{Origin:'https://example.com'}})).status,403);
    assert.equal((await post(payload)).status,200);
    assert.equal((await post(payload)).status,409);
    const saved = store.read(dir).value;
    assert.equal(saved.notes['index.html'][0].body,'新增说明');
    const file = await (await fetch(base+'data/annotations.js')).text();
    assert.ok(file.includes('新增说明'));
    const legacy = await fetch(base+'save-annotations',{method:'POST',headers:{Origin:origin},body:JSON.stringify({overrides:{'global.rule':'旧编辑器'},additions:{},removed:[]})});
    assert.equal(legacy.status,200);
    assert.equal(store.read(dir).value.notes['index.html'].length,1);
    const newest = await (await fetch(base+'notes-session')).json();
    assert.notEqual(newest.revision,session.revision);
  } finally { child.kill(); fs.rmSync(dir,{recursive:true,force:true}); }
});
