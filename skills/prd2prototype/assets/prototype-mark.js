/* 点选和框选只负责定位，说明内容与保存交由现有卡片编辑器处理。 */
window.createPrototypeMarker = function ({ getScene, onCreate, onSelect }) {
  const product = document.querySelector('#pn-product');
  const toolbar = document.querySelector('#pn-mark-toolbar');
  const hover = document.createElement('div'); hover.id = 'pn-mark-hover'; hover.hidden = true;
  const layer = document.createElement('div'); layer.id = 'pn-markers';
  document.body.append(hover, layer);
  let mode = null, start = null, suppressUntil = 0;
  const selector = el => {
    if (el === product) return '#pn-product';
    const parts = [];
    while (el && el !== product) {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      if (el.dataset.markKey) { parts.unshift('[data-mark-key="' + CSS.escape(el.dataset.markKey) + '"]'); break; }
      const tag = el.tagName.toLowerCase();
      const siblings = [...el.parentElement.children].filter(e => e.tagName === el.tagName);
      parts.unshift(tag + ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')'); el = el.parentElement;
    }
    return parts.join(' > ') || '#pn-product';
  };
  const find = note => {
    try { return note.target ? (note.target.selector === '#pn-product' ? product : product.querySelector(note.target.selector)) : product.querySelector(`[data-anchor="${note.anchor}"]`); } catch { return null; }
  };
  const boxMetrics = el => {
    const a = el.getBoundingClientRect(), style = getComputedStyle(el);
    const sx = /(auto|scroll)/.test(style.overflowX), sy = /(auto|scroll)/.test(style.overflowY);
    return {left:a.left-(sx ? el.scrollLeft : 0), top:a.top-(sy ? el.scrollTop : 0),width:sx ? el.scrollWidth : a.width,height:sy ? el.scrollHeight : a.height};
  };
  const rect = note => {
    const el = find(note); if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return null;
    const r = note.target?.rect, a = r ? boxMetrics(el) : el.getBoundingClientRect();
    return r ? { left:a.left + a.width*r.x, top:a.top + a.height*r.y, width:a.width*r.w, height:a.height*r.h, right:a.left+a.width*(r.x+r.w), bottom:a.top+a.height*(r.y+r.h) } : a;
  };
  const showBox = r => { hover.hidden = false; Object.assign(hover.style, { left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px' }); };
  function stop() {
    if (start && product.hasPointerCapture(start.pointerId)) product.releasePointerCapture(start.pointerId);
    mode = null; start = null; toolbar.hidden = true; layer.style.visibility = ''; hover.hidden = true; product.classList.remove('mark-selecting');
  }
  function begin(next = 'element') {
    mode = next; start = null; toolbar.hidden = false; layer.style.visibility = 'hidden'; product.classList.add('mark-selecting');
    document.querySelector('#pn-pick-element').classList.toggle('chosen', next === 'element');
    document.querySelector('#pn-pick-region').classList.toggle('chosen', next === 'region');
    document.querySelector('#pn-mark-hint').textContent = next === 'element' ? '点击左侧控件，再到右侧填写说明' : '在左侧按住拖动，框选需要说明的区域';
  }
  function candidate(el) {
    if (el.closest('.pin')) el = el.closest('.pin').parentElement;
    return el.closest('button,input,textarea,select,td,th,label,h1,h2,p') || el;
  }
  product.addEventListener('pointerdown', event => {
    if (!mode || event.button !== 0) return;
    event.preventDefault(); event.stopImmediatePropagation();
    let scope = product; try { scope = getScene() ? product.querySelector(getScene()) || product : product; } catch {}
    if (!scope.contains(event.target)) return;
    start = { x:event.clientX, y:event.clientY, el:candidate(event.target), pointerId:event.pointerId, scope };
    product.setPointerCapture(event.pointerId);
  }, true);
  product.addEventListener('pointermove', event => {
    if (!mode) return;
    if (mode === 'element') {
      if (!start && product.contains(event.target)) showBox(candidate(event.target).getBoundingClientRect());
    } else if (start) {
      const b = start.scope.getBoundingClientRect();
      const x = Math.max(b.left, Math.min(b.right, event.clientX)), y = Math.max(b.top, Math.min(b.bottom, event.clientY));
      showBox({ left:Math.min(start.x,x), top:Math.min(start.y,y), width:Math.abs(start.x-x), height:Math.abs(start.y-y) });
    }
  }, true);
  product.addEventListener('pointerup', event => {
    if (!mode || !start) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressUntil = Date.now()+450;
    let el = start.el, target;
    if (mode === 'element') target = { selector:selector(el) };
    else {
      const bounds = start.scope.getBoundingClientRect();
      const x = Math.max(bounds.left,Math.min(bounds.right,event.clientX)), y = Math.max(bounds.top,Math.min(bounds.bottom,event.clientY));
      const r = { left:Math.min(start.x,x),top:Math.min(start.y,y),right:Math.max(start.x,x),bottom:Math.max(start.y,y) };
      if (r.right-r.left < 10 || r.bottom-r.top < 10) { start = null; hover.hidden = true; return; }
      while (el !== start.scope) {
        const a = el.getBoundingClientRect();
        if (a.left <= r.left && a.top <= r.top && a.right >= r.right && a.bottom >= r.bottom) break;
        el = el.parentElement;
      }
      // 跨越多个控件时绑定共同容器，并记录容器内的相对区域。
      const a = boxMetrics(el); a.right = a.left + a.width; a.bottom = a.top + a.height;
      const left = Math.max(a.left,r.left), top = Math.max(a.top,r.top), right = Math.min(a.right,r.right), bottom = Math.min(a.bottom,r.bottom);
      if (right <= left || bottom <= top) { stop(); return; }
      target = { selector:selector(el), rect:{ x:(left-a.left)/a.width,y:(top-a.top)/a.height,w:(right-left)/a.width,h:(bottom-top)/a.height } };
    }
    stop(); onCreate(target);
  }, true);
  product.addEventListener('click', event => {
    if (mode || Date.now()<suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && mode) { event.preventDefault(); event.stopImmediatePropagation(); stop(); } }, true);
  product.addEventListener('pointercancel', stop);
  document.querySelector('#pn-pick-element').onclick = () => begin('element');
  document.querySelector('#pn-pick-region').onclick = () => begin('region');
  document.querySelector('#pn-cancel-mark').onclick = stop;
  return {
    begin, stop, find, rect, selector,
    render(notes, active) {
      layer.replaceChildren();
      const p = product.getBoundingClientRect();
      for (const note of notes.filter(n => n.target && !n.deleted)) {
        const r = rect(note); if (!r) continue;
        const el = find(note);
        let left=Math.max(r.left,p.left),top=Math.max(r.top,p.top),right=Math.min(r.right,p.right),bottom=Math.min(r.bottom,p.bottom);
        for (let parent=el.parentElement; parent && parent!==product; parent=parent.parentElement) {
          const style=getComputedStyle(parent), b=parent.getBoundingClientRect();
          if (/(auto|scroll|hidden)/.test(style.overflowX)) {left=Math.max(left,b.left);right=Math.min(right,b.right);}
          if (/(auto|scroll|hidden)/.test(style.overflowY)) {top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}
        }
        if (right-left<2 || bottom-top<2) continue;
        const box=document.createElement('div');box.className='manual-area'+(note.id===active?' selected':'');
        Object.assign(box.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
        const pin=document.createElement('button');pin.className='manual-pin';pin.textContent=note.number;pin.setAttribute('aria-label','定位手工说明 '+note.number);pin.onclick=()=>onSelect(note.id);
        box.append(pin);layer.append(box);
      }
    }
  };
};
