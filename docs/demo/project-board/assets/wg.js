/* 网管原型本地交互。筛选、分页、日期计算等算法参考既有集管包，
   样式和导航由网管独立实现；交互模拟不等于现网行为证明。只读取当前 HTML 与用户选择的文件名；不访问业务接口。
   表格、日期控件和键盘行为属于原型实现，不能用于证明实际系统行为。 */
(function () {
  'use strict';
  const iconFile = new URL('icons.svg', document.currentScript?.src || location.href).href;
  const iconNames = {"首页": "home", "资产管理": "assets", "监控管理": "monitor", "通信管理": "communication", "运行管理": "operations", "安全管理": "security", "报表管理": "reports", "系统管理": "system"};
  function icon(name) { const id = iconNames[name] || name; return Object.values(iconNames).includes(id) ? `<svg class="wg-icon" aria-hidden="true"><use href="${iconFile}#${id}"></use></svg>` : ''; }
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const byId = id => document.getElementById(id);
  const tables = new WeakMap();
  const bound = new WeakMap();
  const previousFocus = new WeakMap();
  let tooltip;
  let unique = 0;
  function once(el, key, fn) {
    if (!el) return;
    let keys = bound.get(el);
    if (!keys) { keys = new Set(); bound.set(el, keys); }
    if (keys.has(key)) return;
    keys.add(key); fn(el);
  }
  function emit(el, name) { el.dispatchEvent(new Event(name, { bubbles: true })); }
  function closeSelect(box, restore = false) {
    const trigger = box.querySelector('.wg-select-trigger');
    const options = box.querySelector('.wg-select-options');
    if (options) options.hidden = true;
    if (trigger) { trigger.setAttribute('aria-expanded', 'false'); if (restore) trigger.focus(); }
  }
  function closeSelects(except) { all('.wg-select').forEach(box => { if (box !== except) closeSelect(box); }); }
  function openModal(id) {
    const modal = byId(id);
    if (!modal || modal.tagName !== 'DIALOG' || modal.open) return;
    previousFocus.set(modal, document.activeElement);
    modal.showModal();
  }
  function closeModal(id) { const modal = byId(id); if (modal && modal.open) modal.close(); }
  function tableState(table) {
    if (!tables.has(table)) tables.set(table, {
      rows: all('tbody > tr', table).filter(row => !row.hasAttribute('data-wg-empty')),
      page: 1, pageSize: Number(table.dataset.wgPageSize) || 20, sort: null, direction: 1
    });
    return tables.get(table);
  }
  function filtersFor(table) {
    const forms = all('form.wg-search').filter(form => form.dataset.wgTable === table.id);
    return forms.flatMap(form => {
      const dateInputs = all('[data-wg-date-start],[data-wg-date-end]', form);
      const dateNames = new Set(dateInputs.map(input => input.name));
      const basic = Array.from(new FormData(form).entries()).filter(([name, value]) => name && !dateNames.has(name) && String(value).trim()).map(([name, value]) => [name, String(value).trim().toLowerCase()]);
      dateInputs.forEach(input => {
        const field = input.closest('.wg-date-picker')?.dataset.wgDateField;
        if (field && input.value) basic.push([field, input.value, input.hasAttribute('data-wg-date-start') ? 'min' : 'max']);
      }); return basic;
    });
  }
  function filteredRows(table, state) {
    const filters = state.filters || [];
    let rows = state.rows.filter(row => filters.every(([name, value, operator]) => {
      const actual = name === 'q' ? row.textContent : row.getAttribute('data-' + name);
      if (operator) return actual != null && (operator === 'min' ? actual >= value : actual <= value);
      return actual != null && (name === 'q' ? actual.toLowerCase().includes(value) : actual.toLowerCase() === value);
    }));
    if (state.sort !== null) rows = rows.slice().sort((a, b) => {
      const av = a.cells[state.sort]?.getAttribute('data-wg-sort-value') ?? a.cells[state.sort]?.textContent.trim() ?? '';
      const bv = b.cells[state.sort]?.getAttribute('data-wg-sort-value') ?? b.cells[state.sort]?.textContent.trim() ?? '';
      return String(av).localeCompare(String(bv), 'zh-CN', { numeric: true }) * state.direction;
    });
    return rows;
  }
  function button(text, action, disabled = false) {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.disabled = disabled; el.addEventListener('click', action); return el;
  }
  function renderPager(pager, table, state, total, pages) {
    pager.replaceChildren();
    const totalEl = document.createElement('span'); totalEl.className = 'wg-page-total'; totalEl.textContent = `共 ${total} 条`; pager.append(totalEl);
    const size = document.createElement('select'); size.setAttribute('aria-label', '每页条数');
    [...new Set([10, 20, 50, 100, state.pageSize])].sort((a, b) => a - b).forEach(n => {
      const option = document.createElement('option'); option.value = String(n); option.textContent = `${n} 条/页`; option.selected = n === state.pageSize; size.append(option);
    });
    size.addEventListener('change', () => { state.pageSize = Number(size.value); state.page = 1; renderTable(table); }); pager.append(size);
    const go = n => { state.page = Math.max(1, Math.min(pages, n)); renderTable(table); };
    pager.append(button('‹', () => go(state.page - 1), state.page === 1));
    const numbers = new Set([1, pages]);
    for (let n = Math.max(1, state.page - 2); n <= Math.min(pages, state.page + 2); n++) numbers.add(n);
    let last = 0;
    [...numbers].sort((a, b) => a - b).forEach(n => {
      if (last && n > last + 1) { const dots = document.createElement('span'); dots.textContent = '…'; pager.append(dots); }
      const page = button(String(n), () => go(n)); page.setAttribute('aria-label', `第 ${n} 页`);
      if (n === state.page) page.setAttribute('aria-current', 'page'); pager.append(page); last = n;
    });
    pager.append(button('›', () => go(state.page + 1), state.page === pages));
    const jumpLabel = document.createElement('label'); jumpLabel.textContent = '前往 ';
    const jump = document.createElement('input'); jump.type = 'number'; jump.min = '1'; jump.max = String(pages); jump.value = String(state.page); jump.setAttribute('aria-label', '跳转页码');
    jump.addEventListener('change', () => { const n = Number(jump.value); go(Number.isFinite(n) ? Math.trunc(n) : 1); });
    jumpLabel.append(jump, ' 页'); pager.append(jumpLabel);
  }
  function renderTable(table) {
    const state = tableState(table), body = table.tBodies[0];
    if (!body) return;
    const rows = filteredRows(table, state), pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    state.page = Math.max(1, Math.min(state.page, pages));
    state.rows.forEach(row => { row.hidden = true; });
    rows.forEach(row => body.append(row));
    rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize).forEach(row => { row.hidden = false; });
    all('[data-wg-empty]', body).forEach(row => row.remove());
    if (!rows.length) {
      const empty = document.createElement('tr'); empty.dataset.wgEmpty = '';
      const cell = document.createElement('td'); cell.colSpan = table.tHead?.rows[0]?.cells.length || 1; cell.className = 'wg-table-empty'; cell.textContent = '暂无数据'; const hint = document.createElement('span'); hint.className = 'wg-empty-hint'; hint.textContent = '请调整查询条件后重试'; cell.append(hint); empty.append(cell); body.append(empty);
    }
    all('[data-wg-pagination]').filter(p => p.dataset.wgPagination === table.id).forEach(p => renderPager(p, table, state, rows.length, pages));
    table.dispatchEvent(new CustomEvent('wg:table-render', { bubbles: true, detail: { total: rows.length, page: state.page, pageSize: state.pageSize } }));
  }
  function initTable(table) {
    once(table, 'table', () => {
      tableState(table);
      all('th[data-wg-sort]', table).forEach(th => {
        th.tabIndex = 0; th.setAttribute('aria-sort', 'none');
        const sort = () => {
          const state = tableState(table), col = Number(th.dataset.wgSort);
          state.direction = state.sort === col ? -state.direction : 1; state.sort = col; state.page = 1;
          all('th[data-wg-sort]', table).forEach(t => t.setAttribute('aria-sort', t === th ? (state.direction === 1 ? 'ascending' : 'descending') : 'none')); renderTable(table);
        };
        th.addEventListener('click', sort); th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
      });
    });
    renderTable(table);
  }
  function initSelect(box) {
    once(box, 'select', () => {
      const trigger = box.querySelector('.wg-select-trigger'), panel = box.querySelector('.wg-select-options');
      if (!trigger || !panel) return;
      panel.id ||= 'wg-options-' + (++unique); panel.setAttribute('role', 'listbox');
      trigger.type = 'button'; trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false'); panel.hidden = true;
      const options = () => all('[data-wg-value]', panel).filter(el => !el.disabled);
      const open = (focus = false) => { closeSelects(box); panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); if (focus) (options().find(el => el.getAttribute('aria-selected') === 'true') || options()[0])?.focus(); };
      trigger.addEventListener('click', () => { if (panel.hidden) open(); else closeSelect(box); });
      trigger.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(true); } });
      all('[data-wg-value]', panel).forEach(option => {
        option.type = 'button'; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', option.getAttribute('aria-selected') || 'false');
        option.addEventListener('click', () => {
          if (option.disabled) return;
          const input = box.querySelector('input[type=hidden]');
          const label = trigger.querySelector('.wg-select-label');
          if (label) label.textContent = option.textContent.trim();
          else { const span = document.createElement('span'); span.className = 'wg-select-label'; span.textContent = option.textContent.trim(); trigger.replaceChildren(span); }
          box.dataset.value = option.dataset.wgValue;
          if (input) { input.value = option.dataset.wgValue; emit(input, 'change'); }
          options().forEach(el => el.setAttribute('aria-selected', String(el === option)));
          closeSelect(box, true); box.dispatchEvent(new CustomEvent('wg:select', { bubbles: true, detail: { value: option.dataset.wgValue } }));
        });
      });
      panel.addEventListener('keydown', e => {
        const items = options(), index = items.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSelect(box, true); }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[next]?.focus();
        }
      });
    });
  }
  function initTabs(group) {
    once(group, 'tabs', () => {
      const tabs = all('[data-wg-tab]', group); if (!tabs.length) return;
      group.setAttribute('role', 'tablist');
      const activate = tab => {
        tabs.forEach(t => {
          const active = t === tab, panel = byId(t.dataset.wgTab);
          t.classList.toggle('is-active', active); t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
          if (panel) { panel.hidden = !active; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', t.id); }
        });
      };
      tabs.forEach((tab, index) => {
        tab.id ||= 'wg-tab-' + (++unique); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', tab.dataset.wgTab);
        tab.addEventListener('click', () => activate(tab));
        tab.addEventListener('keydown', e => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          activate(tabs[next]); tabs[next].focus();
        });
      }); activate(tabs.find(t => t.classList.contains('is-active')) || tabs[0]);
    });
  }
  function initTree(tree) {
    all('[data-wg-tree-toggle]', tree).forEach(toggle => once(toggle, 'tree-toggle', () => {
      const node = toggle.closest('li'), children = node && Array.from(node.children).find(el => el.tagName === 'UL');
      if (!children) { toggle.disabled = true; toggle.style.visibility = 'hidden'; return; }
      toggle.type = 'button'; toggle.setAttribute('aria-label', '展开或收起'); toggle.setAttribute('aria-expanded', String(!children.hidden));
      toggle.addEventListener('click', () => { children.hidden = !children.hidden; toggle.setAttribute('aria-expanded', String(!children.hidden)); });
    }));
    all('[data-wg-tree-select]', tree).forEach(select => once(select, 'tree-select', () => {
      select.type = 'button'; select.addEventListener('click', () => {
        all('.wg-tree-node', tree).forEach(node => node.classList.remove('is-selected')); select.closest('.wg-tree-node')?.classList.add('is-selected');
        tree.dispatchEvent(new CustomEvent('wg:tree-select', { bubbles: true, detail: { value: select.dataset.wgTreeSelect || select.textContent.trim() } }));
      });
    }));
  }
  function filterTransfer(transfer) {
    all('[data-wg-transfer-side]', transfer).forEach(panel => {
      const query = panel.querySelector('[data-wg-transfer-search]')?.value.trim().toLowerCase() || '';
      all('.wg-transfer-item', panel).forEach(item => { item.hidden = !item.textContent.toLowerCase().includes(query); });
      const count = panel.querySelector('[data-wg-transfer-count]'); if (count) count.textContent = String(all('.wg-transfer-item', panel).length);
    });
  }
  function hideTooltip() { if (tooltip) tooltip.hidden = true; }
  function showTooltip(el) {
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'wg-tooltip'; tooltip.id = 'wg-tooltip'; tooltip.setAttribute('role', 'tooltip'); document.body.append(tooltip); }
    tooltip.textContent = el.dataset.wgTooltip; tooltip.hidden = false;
    const rect = el.getBoundingClientRect(), tipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, rect.left + rect.width / 2 - tipRect.width / 2)) + 'px';
    tooltip.style.top = (rect.top > tipRect.height + 12 ? rect.top - tipRect.height - 8 : rect.bottom + 8) + 'px';
  }
  function initDatePicker(picker) {
    once(picker, 'date-picker', () => {
      const trigger = picker.querySelector('.wg-date-trigger');
      const startInput = picker.querySelector('[data-wg-date-start]'), endInput = picker.querySelector('[data-wg-date-end]');
      if (!trigger || !startInput || !endInput) return;
      const panel = document.createElement('div'); panel.className = 'wg-date-popover'; panel.setAttribute('popover', 'auto'); panel.id = 'wg-date-' + (++unique); picker.append(panel);
      trigger.type = 'button'; trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
      const pad = n => String(n).padStart(2, '0');
      const dateString = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      let start = '', end = '', startTime = '00:00:00', endTime = '23:59:59', month = new Date();
      const updateLabel = () => { trigger.textContent = startInput.value && endInput.value ? `${startInput.value} 至 ${endInput.value}` : '开始时间　至　结束时间'; };
      const hide = () => { panel.hidePopover(); trigger.setAttribute('aria-expanded', 'false'); };
      const position = () => {
        const rect = trigger.getBoundingClientRect();
        panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 654)) + 'px';
        panel.style.top = Math.max(8, rect.bottom + 420 > window.innerHeight ? rect.top - 420 : rect.bottom + 8) + 'px';
      };
      function render() {
        panel.replaceChildren();
        const calendars = document.createElement('div'); calendars.className = 'wg-date-calendars';
        [0, 1].forEach(side => {
          const displayed = new Date(month.getFullYear(), month.getMonth() + side, 1);
          const calendar = document.createElement('div'); calendar.className = 'wg-date-calendar';
          const time = document.createElement('div'); time.className = 'wg-date-time';
          const date = document.createElement('input'); date.type = 'text'; date.placeholder = side ? '结束日期' : '开始日期'; date.value = side ? end : start; date.readOnly = true; date.setAttribute('aria-label', side ? '结束日期' : '开始日期');
          const clock = document.createElement('input'); clock.type = 'time'; clock.step = '1'; clock.value = side ? endTime : startTime; clock.setAttribute('aria-label', side ? '结束时间' : '开始时间');
          clock.addEventListener('input', () => { if (side) endTime = clock.value || '00:00:00'; else startTime = clock.value || '00:00:00'; }); time.append(date, clock); calendar.append(time);
          const head = document.createElement('div'); head.className = 'wg-date-month';
          const earlier = document.createElement('span'), later = document.createElement('span');
          const move = delta => { month = new Date(month.getFullYear(), month.getMonth() + delta, 1); render(); };
          if (!side) { earlier.append(button('«', () => move(-12)), button('‹', () => move(-1))); }
          if (side) { later.append(button('›', () => move(1)), button('»', () => move(12))); }
          const title = document.createElement('span'); title.textContent = `${displayed.getFullYear()} 年 ${displayed.getMonth() + 1} 月`; head.append(earlier, title, later); calendar.append(head);
          const grid = document.createElement('div'); grid.className = 'wg-date-grid';
          ['日', '一', '二', '三', '四', '五', '六'].forEach(day => { const label = document.createElement('span'); label.className = 'wg-date-week'; label.textContent = day; grid.append(label); });
          const offset = displayed.getDay();
          for (let index = 0; index < 42; index++) {
            const current = new Date(displayed.getFullYear(), displayed.getMonth(), index - offset + 1), value = dateString(current);
            const day = button('', () => {
              if (!start || end) { start = value; end = ''; } else if (value < start) { end = start; start = value; } else end = value;
              render();
            }); day.className = 'wg-date-day'; day.setAttribute('aria-label', value);
            const number = document.createElement('span'); number.textContent = String(current.getDate()); day.append(number);
            day.classList.toggle('is-muted', current.getMonth() !== displayed.getMonth()); day.classList.toggle('is-start', value === start); day.classList.toggle('is-end', value === end); day.classList.toggle('is-between', Boolean(start && end && value > start && value < end)); grid.append(day);
          }
          calendar.append(grid); calendars.append(calendar);
        }); panel.append(calendars);
        const footer = document.createElement('div'); footer.className = 'wg-date-footer';
        const error = document.createElement('span'); error.className = 'wg-date-error'; error.setAttribute('role', 'status');
        const clear = button('清空', () => { startInput.value = ''; endInput.value = ''; emit(startInput, 'change'); emit(endInput, 'change'); updateLabel(); hide(); trigger.focus(); }); clear.className = 'wg-btn wg-text';
        const confirm = button('确定', () => {
          const from = `${start} ${startTime}`, to = `${end} ${endTime}`;
          if (to < from) { error.textContent = '结束时间不能早于开始时间'; return; }
          startInput.value = from; endInput.value = to; emit(startInput, 'change'); emit(endInput, 'change'); updateLabel(); hide(); trigger.focus();
        }, !start || !end); confirm.className = 'wg-btn'; footer.append(error, clear, confirm); panel.append(footer);
      }
      trigger.addEventListener('click', () => {
        if (panel.matches(':popover-open')) { hide(); return; }
        start = startInput.value.slice(0, 10); end = endInput.value.slice(0, 10); startTime = startInput.value.slice(11) || '00:00:00'; endTime = endInput.value.slice(11) || '23:59:59';
        const parsed = start ? new Date(start + 'T00:00:00') : new Date(); month = Number.isNaN(parsed.valueOf()) ? new Date() : parsed; month = new Date(month.getFullYear(), month.getMonth(), 1);
        render(); position(); panel.showPopover(); trigger.setAttribute('aria-expanded', 'true');
      });
      panel.addEventListener('toggle', () => trigger.setAttribute('aria-expanded', String(panel.matches(':popover-open'))));
      picker.closest('form')?.addEventListener('reset', () => setTimeout(updateLabel, 0));
      updateLabel();
    });
  }
  function initNavigation(root) {
    const closeMenu = (control, restore = false) => {
      const menu = byId(control.dataset.wgMenu); if (!menu) return;
      menu.hidden = true; control.setAttribute('aria-expanded', 'false'); if (restore) control.focus();
    };
    all('[data-wg-menu]', root).forEach(control => once(control, 'mega-menu', () => {
      const menu = byId(control.dataset.wgMenu); if (!menu) return;
      control.setAttribute('aria-controls', menu.id); control.setAttribute('aria-expanded', 'false'); menu.hidden = true;
      const open = focus => {
        all('[data-wg-menu]').filter(el => el !== control).forEach(el => closeMenu(el));
        menu.hidden = false; control.setAttribute('aria-expanded', 'true');
        if (focus) menu.querySelector('a,button')?.focus();
      };
      control.addEventListener('click', () => { if (menu.hidden) open(false); else closeMenu(control); });
      control.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); open(true); } });
      menu.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(control, true); }
      });
      menu.addEventListener('click', e => { if (e.target.closest('a,.wg-menu-link')) closeMenu(control); });
    }));
    all('[data-wg-tabs-scroll]', root).forEach(control => once(control, 'tabs-scroll', () => control.addEventListener('click', () => { const list = control.closest('.wg-workspace-shell')?.querySelector('.wg-workspace-tabs'); list?.scrollBy({ left: Number(control.dataset.wgTabsScroll) * 300, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); })));
    all('.wg-workspace-tabs', root).forEach(group => once(group, 'workspace', () => {
      group.addEventListener('click', e => {
        const close = e.target.closest('[data-wg-tab-close]'); if (!close || !group.contains(close)) return;
        e.preventDefault(); e.stopPropagation(); const tab = close.closest('.wg-workspace-tab'); if (!tab) return;
        const tabs = all('.wg-workspace-tab', group); if (tabs.length <= 1) return;
        const index = tabs.indexOf(tab), next = tabs[index + 1] || tabs[index - 1];
        const active = tab.getAttribute('aria-current') === 'page' || tab.classList.contains('is-active');
        const panel = tab.dataset.wgWorkspacePanel && byId(tab.dataset.wgWorkspacePanel); if (panel) panel.hidden = true;
        tab.remove();
        if (active && next) {
          next.setAttribute('aria-current', 'page'); next.classList.add('is-active');
          const nextPanel = next.dataset.wgWorkspacePanel && byId(next.dataset.wgWorkspacePanel); if (nextPanel) nextPanel.hidden = false;
          next.focus();
          // 真实链接由浏览器导航；同页工作区切换使用 data-wg-workspace-panel。
          if (next.tagName === 'A' && next.getAttribute('href') && !next.getAttribute('href').startsWith('#')) next.click();
        }
        group.dispatchEvent(new CustomEvent('wg:workspace-close', { bubbles: true, detail: { id: tab.id || null } }));
      });
      all('[data-wg-workspace-panel]', group).forEach(tab => tab.addEventListener('click', e => {
        if (e.target.closest('[data-wg-tab-close]')) return;
        e.preventDefault();
        all('[data-wg-workspace-panel]', group).forEach(other => {
          const active = tab === other; other.classList.toggle('is-active', active); if (active) other.setAttribute('aria-current', 'page'); else other.removeAttribute('aria-current');
          const panel = byId(other.dataset.wgWorkspacePanel); if (panel) panel.hidden = !active;
        });
      }));
    }));
    once(document, 'menu-document', () => {
      document.addEventListener('click', e => {
        all('[data-wg-menu]').forEach(control => { const menu = byId(control.dataset.wgMenu); if (menu && !control.contains(e.target) && !menu.contains(e.target)) closeMenu(control); });
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') all('[data-wg-menu][aria-expanded=true]').forEach(control => closeMenu(control, true)); });
    });
  }
  function setColumn(table, index, visible) {
    if (!table || !Number.isInteger(index) || index < 0) return;
    // 显隐仅用于平面列表。分组表头需明确拆组规则，不能靠 cellIndex 改动。
    if (all('thead th[colspan],thead th[rowspan]', table).some(cell => cell.colSpan > 1 || cell.rowSpan > 1)) return;
    all('tr', table).forEach(row => { if (!row.hasAttribute('data-wg-empty') && row.cells[index]) row.cells[index].hidden = !visible; });
    const visibleCount = Array.from(table.tHead?.rows[0]?.cells || []).filter(cell => !cell.hidden).length;
    all('[data-wg-empty] td', table).forEach(cell => { cell.colSpan = Math.max(1, visibleCount); });
    table.dispatchEvent(new CustomEvent('wg:column-change', { bubbles: true, detail: { column: index, visible } }));
  }
  function initColumns(root) {
    all('[data-wg-columns-open]', root).forEach(control => once(control, 'columns-popover', () => {
      const panel = byId(control.dataset.wgColumnsOpen); if (!panel) return;
      const inputs = () => all('input[data-wg-column]', panel);
      const close = restore => { if (restore) inputs().forEach(input => { input.checked = input.dataset.wgApplied === 'true'; }); panel.hidden = true; control.setAttribute('aria-expanded', 'false'); };
      control.setAttribute('aria-controls', panel.id); control.setAttribute('aria-expanded', 'false'); panel.hidden = true;
      control.addEventListener('click', () => { if (!panel.hidden) close(true); else { inputs().forEach(input => { input.checked = input.dataset.wgApplied === 'true'; }); panel.hidden = false; control.setAttribute('aria-expanded', 'true'); } });
      panel.querySelector('[data-wg-columns-cancel]')?.addEventListener('click', () => { close(true); control.focus(); });
      panel.querySelector('[data-wg-columns-reset]')?.addEventListener('click', () => inputs().forEach(input => { input.checked = input.defaultChecked; }));
      panel.querySelector('[data-wg-columns-apply]')?.addEventListener('click', () => { inputs().forEach(input => { input.dataset.wgApplied = String(input.checked); emit(input, 'wg:columns-commit'); }); close(false); control.focus(); });
      panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); control.focus(); } });
      document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !control.contains(e.target)) close(true); });
    }));
    all('input[data-wg-column][data-wg-table]', root).forEach(input => once(input, 'columns', () => {
      const table = byId(input.dataset.wgTable); if (!table) return;
      const popover = input.closest('.wg-columns-popover');
      input.dataset.wgApplied = String(input.checked);
      const apply = () => setColumn(table, Number(input.dataset.wgColumn), popover ? input.dataset.wgApplied === 'true' : input.checked);
      if (!popover) input.addEventListener('change', apply);
      input.addEventListener('wg:columns-commit', apply); table.addEventListener('wg:table-render', apply); apply();
    }));
  }
  function init(root = document) {
    all('.wg-table:not([data-wg-static])', root).forEach(initTable);
    initNavigation(root);
    all("[data-wg-icon]", root).forEach(el => { el.innerHTML = icon(el.dataset.wgIcon); });
    initColumns(root);
    all('form.wg-search[data-wg-table]', root).forEach(form => once(form, 'search', () => {
      form.addEventListener('submit', e => { e.preventDefault(); const table = byId(form.dataset.wgTable); if (table) { const state = tableState(table); state.filters = filtersFor(table); state.page = 1; renderTable(table); } });
      form.addEventListener('reset', () => setTimeout(() => {
        all('.wg-select', form).forEach(box => {
          const input = box.querySelector('input[type=hidden]'), options = all('[data-wg-value]', box), value = input?.defaultValue || '';
          const match = options.find(el => el.dataset.wgValue === value);
          if (match) { const label = box.querySelector('.wg-select-label'); if (label) label.textContent = match.textContent.trim(); options.forEach(el => el.setAttribute('aria-selected', String(el === match))); }
          closeSelect(box);
        });
        const table = byId(form.dataset.wgTable); if (table) { const state = tableState(table); state.filters = filtersFor(table); state.page = 1; renderTable(table); }
      }, 0));
    }));
    all('[data-wg-toggle]', root).forEach(control => once(control, 'toggle', () => {
      const panel = byId(control.dataset.wgToggle); if (!panel) return;
      control.setAttribute('aria-controls', panel.id); control.setAttribute('aria-expanded', String(!panel.hidden));
      control.addEventListener('click', () => { panel.hidden = !panel.hidden; control.setAttribute('aria-expanded', String(!panel.hidden)); });
    }));
    all('.wg-select', root).forEach(initSelect);
    all('.wg-date-picker', root).forEach(initDatePicker);
    all('.wg-tabs,.wg-segments', root).forEach(initTabs);
    all('[data-wg-modal-open]', root).forEach(control => once(control, 'modal-open', () => control.addEventListener('click', () => openModal(control.dataset.wgModalOpen))));
    all('.wg-modal', root).forEach(modal => once(modal, 'modal', () => {
      modal.addEventListener('close', () => { const focus = previousFocus.get(modal); if (focus?.isConnected) focus.focus(); });
      all('[data-wg-modal-close]', modal).forEach(control => control.addEventListener('click', () => modal.close()));
    }));
    all('.wg-tree', root).forEach(initTree);
    all('[data-wg-tree-search]', root).forEach(input => once(input, 'tree-search', () => {
      const tree = byId(input.dataset.wgTreeSearch); if (!tree) return;
      const initial = new Map(all('ul', tree).map(ul => [ul, ul.hidden]));
      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        all('li', tree).forEach(li => { li.hidden = query ? !li.textContent.toLowerCase().includes(query) : false; });
        all('ul', tree).forEach(ul => { ul.hidden = query ? false : initial.get(ul) || false; });
        all('[data-wg-tree-toggle]', tree).forEach(toggle => { const ul = Array.from(toggle.closest('li').children).find(el => el.tagName === 'UL'); if (ul) toggle.setAttribute('aria-expanded', String(!ul.hidden)); });
      });
    }));
    all('.wg-transfer', root).forEach(transfer => once(transfer, 'transfer', () => {
      all('[data-wg-transfer-search]', transfer).forEach(input => input.addEventListener('input', () => filterTransfer(transfer)));
      all('[data-wg-transfer-move]', transfer).forEach(control => control.addEventListener('click', () => {
        const direction = control.dataset.wgTransferMove;
        const target = all('[data-wg-transfer-side]', transfer).find(panel => panel.dataset.wgTransferSide === direction);
        const source = all('[data-wg-transfer-side]', transfer).find(panel => panel.dataset.wgTransferSide !== direction);
        const list = target?.querySelector('.wg-transfer-list'); if (!source || !list) return;
        all('.wg-transfer-item', source).filter(item => !item.hidden && item.querySelector('input[type=checkbox]')?.checked && !item.querySelector('input[type=checkbox]')?.disabled).forEach(item => { item.querySelector('input').checked = false; list.append(item); });
        filterTransfer(transfer); emit(transfer, 'change');
      })); filterTransfer(transfer);
    }));
    all('.wg-upload input[type=file]', root).forEach(input => once(input, 'file', () => input.addEventListener('change', () => {
      const label = input.closest('.wg-upload').querySelector('[data-wg-file-name]'); if (label) label.textContent = Array.from(input.files || []).map(file => file.name).join('、') || '未选择文件';
    })));
    all('[data-wg-tooltip]', root).forEach(el => once(el, 'tooltip', () => {
      el.addEventListener('mouseenter', () => showTooltip(el)); el.addEventListener('mouseleave', hideTooltip); el.addEventListener('focus', () => showTooltip(el)); el.addEventListener('blur', hideTooltip);
    }));
  }
  function injectIcons() {
    if (byId('wg-icon-symbols')) return;
    const paths = {
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
      reset:'<path d="M5 8a8 8 0 1 1-1 7M5 3v5h5"/>',
      plus:'<path d="M12 4v16M4 12h16"/>',
      chevron:'<path d="m8 4 8 8-8 8"/>',
      close:'<path d="m5 5 14 14M19 5 5 19"/>',
      upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
      download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
      folder:'<path d="M3 6h7l2 3h9v11H3z"/>',
      file:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',
      check:'<path d="m4 12 5 5L20 6"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>'
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'wg-icon-symbols'; svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    // 图形是包内静态路径；不插入外部内容。
    svg.innerHTML = Object.entries(paths).map(([name, path]) => `<symbol id="wg-icon-${name}" viewBox="0 0 24 24">${path}</symbol>`).join(''); document.body.prepend(svg);
  }
  document.addEventListener('click', e => { if (!e.target.closest('.wg-select')) closeSelects(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const open = all('.wg-select').find(box => box.querySelector('.wg-select-trigger')?.getAttribute('aria-expanded') === 'true'); if (open) { e.preventDefault(); closeSelect(open, true); } hideTooltip(); } });
  document.addEventListener('scroll', hideTooltip, true);
  window.WG = { init, icon, setColumn(tableId, column, visible) { setColumn(byId(tableId), column, visible); }, refreshTable(id) { const table = byId(id); if (!table) return; const state = tableState(table); state.rows = all('tbody>tr', table).filter(row => !row.hasAttribute('data-wg-empty')); renderTable(table); }, openModal, closeModal };
  // 主题仅修改本地预览；URL 优先，存储不可用时仍可切换。
  function setTheme(value, updateURL = true) {
    const theme = value === 'blue' ? 'blue' : 'green';
    document.documentElement.dataset.wgTheme = theme;
    document.body.dataset.wgTheme = theme;
    all('[data-wg-theme-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wgThemeOption === theme)));
    try { localStorage.setItem('wg-prototype-theme', theme); } catch (_) {}
    if (updateURL) {
      try { const url = new URL(location.href); url.searchParams.set('theme', theme); history.replaceState(history.state, '', url); } catch (_) {}
    }
    // 显式携带主题，禁用本地存储时也能跨模板保持。
    all('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || !url.pathname.endsWith('.html')) return;
        url.searchParams.set('theme', theme); link.href = url.href;
      } catch (_) {}
    });
    return theme;
  }
  function initTheme() {
    setTheme(document.documentElement.dataset.wgTheme || 'green', false);
    all('[data-wg-theme-option]').forEach(button => once(button, 'theme', () => {
      button.addEventListener('click', () => setTheme(button.dataset.wgThemeOption));
    }));
  }
  window.WG.setTheme = setTheme;
  function start() { initTheme(); injectIcons(); init(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
