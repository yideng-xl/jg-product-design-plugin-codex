/* 原型说明：生成文字与用户覆盖分开；编辑能力由本地服务会话确认。 */
(() => {
  'use strict';
  function init() {
    if (!document.body.hasAttribute('data-prototype-notes') || document.getElementById('pn-shell')) return;
    const $ = (s, root = document) => root.querySelector(s);
    const all = (s, root = document) => [...root.querySelectorAll(s)];
    const find = s => { try { return s ? $(s) : null; } catch { return null; } };
    const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const pageKey = document.body.dataset.page || location.pathname.split('/').pop() || 'index';
    const pref = 'pn:' + location.pathname;
    const readPref = key => { try { return localStorage.getItem(pref + key); } catch { return null; } };
    const writePref = (key, value) => { try { localStorage.setItem(pref + key, value); } catch {} };
    let overlay = window.__ANNO__ || {};
    if (!overlay.overrides && !overlay.additions && !overlay.removed && !overlay.notes) overlay = { overrides: overlay };
    const getAnno = id => all('[data-anno-id]').find(e => e.dataset.annoId === id);
    (overlay.removed || []).forEach(id => { const el = getAnno(id); if (el) (el.closest('[data-anno-item]') || el).remove(); });
    Object.entries(overlay.overrides || {}).forEach(([id, value]) => { const el = getAnno(id); if (el) { if (el.hasAttribute('data-anno-rich')) el.innerHTML = value; else el.textContent = value; } });
    Object.entries(overlay.additions || {}).forEach(([id, items]) => {
      const box = all('[data-anno-container]').find(el => el.dataset.annoContainer === id);
      if (!box || !Array.isArray(items)) return;
      items.forEach(item => { if (getAnno(item.id)) return; const el = document.createElement('span'); el.className = 'dev-tag'; el.dataset.annoItem = ''; const text = document.createElement('span'); text.dataset.annoId = item.id; text.textContent = item.text; el.append(text); box.append(el); });
    });
    const shell = document.createElement('div'); shell.id = 'pn-shell';
    const product = document.createElement('main'); product.id = 'pn-product';
    [...document.body.children].forEach(el => { if (!['SCRIPT', 'LINK', 'STYLE'].includes(el.tagName)) product.append(el); });
    const rail = document.createElement('aside'); rail.id = 'pn-rail'; rail.setAttribute('aria-label', '原型说明');
    rail.innerHTML = '<header class="pn-heading"><strong>原型说明</strong><button type="button" id="pn-toggle">收起说明</button><div class="pn-actions"><button type="button" id="pn-add" hidden>＋ 添加说明</button><button type="button" id="pn-save" hidden>保存</button><button type="button" id="pn-undo" hidden>撤销删除</button></div><small id="pn-status" role="status">只读展示</small></header><div id="pn-cards"></div>';
    shell.append(product, rail); document.body.append(shell);
    const restore = document.createElement('button'); restore.id = 'pn-restore'; restore.textContent = '展开说明'; restore.hidden = true; document.body.append(restore);
    const toolbar = document.createElement('div'); toolbar.id = 'pn-mark-toolbar'; toolbar.hidden = true;
    toolbar.innerHTML = '<button type="button" id="pn-pick-element">点选控件</button><button type="button" id="pn-pick-region">框选区域</button><span id="pn-mark-hint"></span><button type="button" id="pn-cancel-mark">取消</button>'; document.body.append(toolbar);
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.id = 'pn-connections'; svg.innerHTML = '<path fill="none" stroke="#d89a24" stroke-width="2"/>'; document.body.append(svg);
    const cards = $('#pn-cards');
    const empty = document.createElement('p'); empty.className = 'pn-empty'; cards.append(empty);
    let session = null, pending = {}, saving = false, blocked = false, timer, version = 0, savedVersion = 0, active = '', lastDeleted = null;
    const manual = structuredClone(Array.isArray(overlay.notes?.[pageKey]) ? overlay.notes[pageKey] : []);
    const base = all('[data-anno-id][data-note-target]', product).map((el, i) => ({id:el.dataset.annoId, number:i+1, target:{selector:el.dataset.noteTarget}, scene:el.dataset.noteWhen || '', el}));
    const entries = [...base];
    const content = el => el.hasAttribute('data-anno-rich') ? el.innerHTML : el.innerText;
    function status(text) { $('#pn-status').textContent = text; }
    function dirty() { return version !== savedVersion || Object.keys(pending).length > 0; }
    function schedule() { status('有修改 · 等待保存'); clearTimeout(timer); timer = setTimeout(save, 650); }
    async function save() {
      clearTimeout(timer); if (!session || saving || blocked || !dirty()) return;
      const batch = {...pending}, batchVersion = version; pending = {}; saving = true; status('正在保存…');
      try {
        const response = await fetch('save-notes', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:session.token, revision:session.revision, overrides:batch, notes:manual, pageKey})});
        const result = await response.json();
        if (!response.ok || !result.ok) { if (response.status === 409) blocked = true; throw new Error(result.error || '保存失败'); }
        session.revision = result.revision; savedVersion = batchVersion; status('已保存到本地');
      } catch (error) { pending = {...batch, ...pending}; status(blocked ? '文件已被其他页面修改，请保留当前内容并重新打开后合并' : '保存失败：' + error.message); saving = false; return; }
      saving = false; if (dirty()) save();
    }
    function editable(el, callback) {
      if (el.dataset.pnBound) return;
      el.dataset.pnBound = '1'; el.contentEditable = el.hasAttribute('data-anno-rich') ? 'true' : 'plaintext-only';
      el.addEventListener('input', () => { callback(); schedule(); requestDraw(); });
      el.addEventListener('click', e => { if (e.target.closest('a')) e.preventDefault(); });
    }
    function makeCard(note) {
      const card = document.createElement('article'); card.className = 'pn-card'; card.dataset.noteId = note.id;
      const label = document.createElement('div'); label.className = 'pn-card-label'; label.textContent = note.number + ' · ' + (note.el ? '功能说明' : note.target?.rect ? '手工说明 · 区域' : '手工说明 · 控件'); card.append(label);
      if (note.el) { note.el.classList.add('pn-note-content'); card.append(note.el); }
      else {
        for (const field of ['title','body']) { const el = document.createElement('div'); el.className = 'pn-note-' + field; el.setAttribute('aria-label','说明 '+note.number+(field === 'title' ? ' 标题' : ' 正文')); el.textContent = note[field] || ''; card.append(el); if (session) { el.setAttribute('role','textbox'); editable(el, () => { note[field] = el.innerText; version++; }); } }
      }
      const locate = document.createElement('button'); locate.type = 'button'; locate.textContent = '↗ 定位页面元素'; locate.className = 'pn-locate'; locate.onclick = () => select(note.id, true); card.append(locate);
      if (!note.el && session) { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'pn-delete'; remove.textContent = '删除说明'; remove.onclick = () => { note.deleted = true; lastDeleted = note; version++; $('#pn-undo').hidden = false; rebuildManual(); schedule(); }; card.append(remove); }
      const warning = document.createElement('small'); warning.className = 'pn-missing'; warning.textContent = '关联控件暂不可见，说明已保留。'; card.append(warning);
      card.addEventListener('click', () => select(note.id)); cards.append(card); note.card = card;
    }
    base.forEach(note => {
      const tip = note.el.closest('.proto-tip'); makeCard(note);
      if (tip && !tip.querySelector('.pt-pop-item')) { tip.querySelector('.pt-pop')?.remove(); tip.querySelectorAll('.chg-bang').forEach(el => el.remove()); }
    });
    function rebuildManual() {
      entries.splice(base.length); all('.pn-card',cards).filter(card => !base.some(n => n.card === card)).forEach(card => card.remove());
      manual.forEach((note,i) => { if (!note.number) note.number = base.length+i+1; });
      manual.filter(n => !n.deleted).forEach(note => { entries.push(note); makeCard(note); }); refresh();
    }
    function scene() {
      const overlays = all('[role="dialog"], .modal-mask, .modal-overlay, .drawer-mask, .drawer-overlay, .jg-modal-mask, .jg-drawer-mask', product).filter(visible);
      const el = overlays.at(-1); return el ? marker.selector(el) : '';
    }
    function toggle(collapsed) { shell.classList.toggle('pn-collapsed',collapsed); restore.hidden = !collapsed; writePref(':rail', collapsed ? '0' : '1'); requestDraw(); }
    function select(id, scroll = false) { active = id; entries.forEach(n => n.card.classList.toggle('pn-selected',n.id === id)); const note = entries.find(n => n.id === id); if (scroll && note) marker.find(note)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'}); requestDraw(); }
    let frame = 0;
    function requestDraw() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); }
    function refresh() {
      const current = scene();
      entries.forEach(note => { note.card.hidden = !!note.deleted || (note.scene ? !visible(find(note.scene)) : !!current); $('.pn-missing',note.card).hidden = visible(marker.find(note)); });
      empty.hidden = entries.some(n => !n.card.hidden); empty.textContent = session ? '当前页面暂无局部说明，可点击“＋ 添加说明”点选控件或框选区域。' : '当前页面暂无局部说明';
      if (!entries.some(n => n.id === active && !n.card.hidden)) active = entries.find(n => !n.card.hidden)?.id || '';
      entries.forEach(n => n.card.classList.toggle('pn-selected',n.id === active)); requestDraw();
    }
    function draw() {
      const shown = entries.filter(n => !n.card.hidden); marker.render(shell.classList.contains('pn-collapsed') ? [] : shown, active);
      const note = shown.find(n => n.id === active), a = note && marker.rect(note), b = note?.card.getBoundingClientRect(), p = product.getBoundingClientRect(), c = cards.getBoundingClientRect();
      const hide = shell.classList.contains('pn-collapsed') || !a || !b || a.bottom < p.top || a.top > p.bottom || b.top < c.top || b.top > c.bottom;
      svg.style.display = hide ? 'none' : '';
      if (!hide) { const x = Math.min(a.right,p.right), y = Math.max(p.top,Math.min(p.bottom,a.top+a.height/2)), end = b.top+24, gap = Math.max(30,(b.left-x)*.55); $('path',svg).setAttribute('d',`M ${x} ${y} C ${x+gap} ${y}, ${b.left-gap} ${end}, ${b.left} ${end}`); }
    }
    const marker = window.createPrototypeMarker({getScene:scene, onCreate(target) {
      if (!session) return;
      const note = {id:'manual-'+crypto.randomUUID(), number:Math.max(base.length,...manual.map(n => n.number || 0))+1, title:'补充说明',body:'',target,scene:scene()}; manual.push(note); version++; active = note.id; toggle(false); rebuildManual(); schedule(); note.card.scrollIntoView({block:'nearest'}); $('.pn-note-body',note.card).focus();
    }, onSelect(id) { toggle(false); select(id); entries.find(n => n.id === id)?.card.scrollIntoView({block:'nearest',behavior:'smooth'}); }});
    $('#pn-add').onclick = () => marker.begin(); $('#pn-save').onclick = save;
    $('#pn-undo').onclick = () => { if (!lastDeleted) return; lastDeleted.deleted = false; version++; active = lastDeleted.id; lastDeleted = null; $('#pn-undo').hidden = true; rebuildManual(); schedule(); };
    $('#pn-toggle').onclick = () => toggle(true); restore.onclick = () => toggle(false); toggle(readPref(':rail') === '0');
    all('.proto-note',product).forEach((box,i) => {
      const header = document.createElement('div'); header.className = 'pn-global-heading';
      const title = document.createElement('strong'); title.textContent = '原型设计说明';
      const button = document.createElement('button'); button.type = 'button';
      const body = document.createElement('div'); body.className = 'pn-global-body'; while (box.firstChild) body.append(box.firstChild);
      const update = hidden => { body.hidden = hidden; button.textContent = hidden ? '展开说明' : '隐藏说明'; button.setAttribute('aria-expanded',String(!hidden)); writePref(':global:'+i,hidden ? '0':'1'); requestDraw(); };
      button.onclick = () => update(!body.hidden); header.append(title,button); box.append(header,body); update(readPref(':global:'+i) === '0');
    });
    rebuildManual();
    document.addEventListener('scroll',requestDraw,true); window.addEventListener('resize',requestDraw);
    // 只观察业务视口；右栏和绘制层的变化不会触发自身重复刷新。
    new MutationObserver(refresh).observe(product,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','open','aria-hidden']});
    new ResizeObserver(requestDraw).observe(product);
    window.addEventListener('beforeunload',event => { if (saving || dirty()) {event.preventDefault(); event.returnValue='';} });
    window.PrototypeNotes = {refresh, save, get pageKey(){return pageKey;}};
    (async () => {
      if (location.protocol === 'file:' || !['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname)) return;
      try {
        const response = await fetch('notes-session',{cache:'no-store'}); if (!response.ok) return;
        const result = await response.json(); if (!result.editable || !result.token) return; session = result;
        $('#pn-add').hidden = false; $('#pn-save').hidden = false; document.body.classList.add('pn-editable'); status('本地可编辑 · 修改后自动保存');
        all('[data-anno-id]').forEach(el => editable(el, () => { pending[el.dataset.annoId] = content(el); })); rebuildManual();
        setInterval(() => fetch('ping').catch(() => {}),3000);
      } catch { /* 静态托管保持只读。 */ }
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
