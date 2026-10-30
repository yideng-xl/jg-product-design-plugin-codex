/* 产品 A 原型本地交互。只读取当前 HTML 与用户选择的文件名；不访问业务接口。
   表格、日期控件和键盘行为属于原型实现，不能用于证明实际系统行为。 */
(function () {
  'use strict';
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
    const trigger = box.querySelector('.jg-select-trigger');
    const options = box.querySelector('.jg-select-options');
    if (options) options.hidden = true;
    if (trigger) { trigger.setAttribute('aria-expanded', 'false'); if (restore) trigger.focus(); }
  }
  function closeSelects(except) { all('.jg-select').forEach(box => { if (box !== except) closeSelect(box); }); }
  function openModal(id) {
    const modal = byId(id);
    if (!modal || modal.tagName !== 'DIALOG' || modal.open) return;
    previousFocus.set(modal, document.activeElement);
    modal.showModal();
  }
  function closeModal(id) { const modal = byId(id); if (modal && modal.open) modal.close(); }
  function tableState(table) {
    if (!tables.has(table)) tables.set(table, {
      rows: all('tbody > tr', table).filter(row => !row.hasAttribute('data-jg-empty')),
      page: 1, pageSize: Number(table.dataset.jgPageSize) || 25, sort: null, direction: 1
    });
    return tables.get(table);
  }
  function filtersFor(table) {
    const forms = all('form.jg-search').filter(form => form.dataset.jgTable === table.id);
    return forms.flatMap(form => {
      const dateInputs = all('[data-jg-date-start],[data-jg-date-end]', form);
      const dateNames = new Set(dateInputs.map(input => input.name));
      const basic = Array.from(new FormData(form).entries()).filter(([name, value]) => name && !dateNames.has(name) && String(value).trim()).map(([name, value]) => [name, String(value).trim().toLowerCase()]);
      dateInputs.forEach(input => {
        const field = input.closest('.jg-date-picker')?.dataset.jgDateField;
        if (field && input.value) basic.push([field, input.value, input.hasAttribute('data-jg-date-start') ? 'min' : 'max']);
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
      const av = a.cells[state.sort]?.getAttribute('data-jg-sort-value') ?? a.cells[state.sort]?.textContent.trim() ?? '';
      const bv = b.cells[state.sort]?.getAttribute('data-jg-sort-value') ?? b.cells[state.sort]?.textContent.trim() ?? '';
      return String(av).localeCompare(String(bv), 'zh-CN', { numeric: true }) * state.direction;
    });
    return rows;
  }
  function button(text, action, disabled = false) {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.disabled = disabled; el.addEventListener('click', action); return el;
  }
  function renderPager(pager, table, state, total, pages) {
    pager.replaceChildren();
    const totalEl = document.createElement('span'); totalEl.className = 'jg-page-total'; totalEl.textContent = `共 ${total} 条`; pager.append(totalEl);
    const size = document.createElement('select'); size.setAttribute('aria-label', '每页条数');
    [...new Set([25, 50, 100, state.pageSize])].sort((a, b) => a - b).forEach(n => {
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
    all('[data-jg-empty]', body).forEach(row => row.remove());
    if (!rows.length) {
      const empty = document.createElement('tr'); empty.dataset.jgEmpty = '';
      const cell = document.createElement('td'); cell.colSpan = table.tHead?.rows[0]?.cells.length || 1; cell.className = 'jg-table-empty'; cell.textContent = '暂无数据'; empty.append(cell); body.append(empty);
    }
    all('[data-jg-pagination]').filter(p => p.dataset.jgPagination === table.id).forEach(p => renderPager(p, table, state, rows.length, pages));
    table.dispatchEvent(new CustomEvent('jg:table-render', { bubbles: true, detail: { total: rows.length, page: state.page, pageSize: state.pageSize } }));
  }
  function initTable(table) {
    once(table, 'table', () => {
      tableState(table);
      all('th[data-jg-sort]', table).forEach(th => {
        th.tabIndex = 0; th.setAttribute('aria-sort', 'none');
        const sort = () => {
          const state = tableState(table), col = Number(th.dataset.jgSort);
          state.direction = state.sort === col ? -state.direction : 1; state.sort = col; state.page = 1;
          all('th[data-jg-sort]', table).forEach(t => t.setAttribute('aria-sort', t === th ? (state.direction === 1 ? 'ascending' : 'descending') : 'none')); renderTable(table);
        };
        th.addEventListener('click', sort); th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
      });
    });
    renderTable(table);
  }
  function initSelect(box) {
    once(box, 'select', () => {
      const trigger = box.querySelector('.jg-select-trigger'), panel = box.querySelector('.jg-select-options');
      if (!trigger || !panel) return;
      panel.id ||= 'jg-options-' + (++unique); panel.setAttribute('role', 'listbox');
      trigger.type = 'button'; trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false'); panel.hidden = true;
      const options = () => all('[data-jg-value]', panel).filter(el => !el.disabled);
      const open = (focus = false) => { closeSelects(box); panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); if (focus) (options().find(el => el.getAttribute('aria-selected') === 'true') || options()[0])?.focus(); };
      trigger.addEventListener('click', () => { if (panel.hidden) open(); else closeSelect(box); });
      trigger.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(true); } });
      all('[data-jg-value]', panel).forEach(option => {
        option.type = 'button'; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', option.getAttribute('aria-selected') || 'false');
        option.addEventListener('click', () => {
          if (option.disabled) return;
          const input = box.querySelector('input[type=hidden]');
          const label = trigger.querySelector('.jg-select-label');
          if (label) label.textContent = option.textContent.trim();
          else { const span = document.createElement('span'); span.className = 'jg-select-label'; span.textContent = option.textContent.trim(); trigger.replaceChildren(span); }
          box.dataset.value = option.dataset.jgValue;
          if (input) { input.value = option.dataset.jgValue; emit(input, 'change'); }
          options().forEach(el => el.setAttribute('aria-selected', String(el === option)));
          closeSelect(box, true); box.dispatchEvent(new CustomEvent('jg:select', { bubbles: true, detail: { value: option.dataset.jgValue } }));
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
      const tabs = all('[data-jg-tab]', group); if (!tabs.length) return;
      group.setAttribute('role', 'tablist');
      const activate = tab => {
        tabs.forEach(t => {
          const active = t === tab, panel = byId(t.dataset.jgTab);
          t.classList.toggle('is-active', active); t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
          if (panel) { panel.hidden = !active; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', t.id); }
        });
      };
      tabs.forEach((tab, index) => {
        tab.id ||= 'jg-tab-' + (++unique); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', tab.dataset.jgTab);
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
    all('[data-jg-tree-toggle]', tree).forEach(toggle => once(toggle, 'tree-toggle', () => {
      const node = toggle.closest('li'), children = node && Array.from(node.children).find(el => el.tagName === 'UL');
      if (!children) { toggle.disabled = true; toggle.style.visibility = 'hidden'; return; }
      toggle.type = 'button'; toggle.setAttribute('aria-label', '展开或收起'); toggle.setAttribute('aria-expanded', String(!children.hidden));
      toggle.addEventListener('click', () => { children.hidden = !children.hidden; toggle.setAttribute('aria-expanded', String(!children.hidden)); });
    }));
    all('[data-jg-tree-select]', tree).forEach(select => once(select, 'tree-select', () => {
      select.type = 'button'; select.addEventListener('click', () => {
        all('.jg-tree-node', tree).forEach(node => node.classList.remove('is-selected')); select.closest('.jg-tree-node')?.classList.add('is-selected');
        tree.dispatchEvent(new CustomEvent('jg:tree-select', { bubbles: true, detail: { value: select.dataset.jgTreeSelect || select.textContent.trim() } }));
      });
    }));
  }
  function filterTransfer(transfer) {
    all('[data-jg-transfer-side]', transfer).forEach(panel => {
      const query = panel.querySelector('[data-jg-transfer-search]')?.value.trim().toLowerCase() || '';
      all('.jg-transfer-item', panel).forEach(item => { item.hidden = !item.textContent.toLowerCase().includes(query); });
      const count = panel.querySelector('[data-jg-transfer-count]'); if (count) count.textContent = String(all('.jg-transfer-item', panel).length);
    });
  }
  function hideTooltip() { if (tooltip) tooltip.hidden = true; }
  function showTooltip(el) {
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'jg-tooltip'; tooltip.id = 'jg-tooltip'; tooltip.setAttribute('role', 'tooltip'); document.body.append(tooltip); }
    tooltip.textContent = el.dataset.jgTooltip; tooltip.hidden = false;
    const rect = el.getBoundingClientRect(), tipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, rect.left + rect.width / 2 - tipRect.width / 2)) + 'px';
    tooltip.style.top = (rect.top > tipRect.height + 12 ? rect.top - tipRect.height - 8 : rect.bottom + 8) + 'px';
  }
  function initDatePicker(picker) {
    once(picker, 'date-picker', () => {
      const trigger = picker.querySelector('.jg-date-trigger');
      const startInput = picker.querySelector('[data-jg-date-start]'), endInput = picker.querySelector('[data-jg-date-end]');
      if (!trigger || !startInput || !endInput) return;
      const panel = document.createElement('div'); panel.className = 'jg-date-popover'; panel.setAttribute('popover', 'auto'); panel.id = 'jg-date-' + (++unique); picker.append(panel);
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
        const calendars = document.createElement('div'); calendars.className = 'jg-date-calendars';
        [0, 1].forEach(side => {
          const displayed = new Date(month.getFullYear(), month.getMonth() + side, 1);
          const calendar = document.createElement('div'); calendar.className = 'jg-date-calendar';
          const time = document.createElement('div'); time.className = 'jg-date-time';
          const date = document.createElement('input'); date.type = 'text'; date.placeholder = side ? '结束日期' : '开始日期'; date.value = side ? end : start; date.readOnly = true; date.setAttribute('aria-label', side ? '结束日期' : '开始日期');
          const clock = document.createElement('input'); clock.type = 'time'; clock.step = '1'; clock.value = side ? endTime : startTime; clock.setAttribute('aria-label', side ? '结束时间' : '开始时间');
          clock.addEventListener('input', () => { if (side) endTime = clock.value || '00:00:00'; else startTime = clock.value || '00:00:00'; }); time.append(date, clock); calendar.append(time);
          const head = document.createElement('div'); head.className = 'jg-date-month';
          const earlier = document.createElement('span'), later = document.createElement('span');
          const move = delta => { month = new Date(month.getFullYear(), month.getMonth() + delta, 1); render(); };
          if (!side) { earlier.append(button('«', () => move(-12)), button('‹', () => move(-1))); }
          if (side) { later.append(button('›', () => move(1)), button('»', () => move(12))); }
          const title = document.createElement('span'); title.textContent = `${displayed.getFullYear()} 年 ${displayed.getMonth() + 1} 月`; head.append(earlier, title, later); calendar.append(head);
          const grid = document.createElement('div'); grid.className = 'jg-date-grid';
          ['日', '一', '二', '三', '四', '五', '六'].forEach(day => { const label = document.createElement('span'); label.className = 'jg-date-week'; label.textContent = day; grid.append(label); });
          const offset = displayed.getDay();
          for (let index = 0; index < 42; index++) {
            const current = new Date(displayed.getFullYear(), displayed.getMonth(), index - offset + 1), value = dateString(current);
            const day = button('', () => {
              if (!start || end) { start = value; end = ''; } else if (value < start) { end = start; start = value; } else end = value;
              render();
            }); day.className = 'jg-date-day'; day.setAttribute('aria-label', value);
            const number = document.createElement('span'); number.textContent = String(current.getDate()); day.append(number);
            day.classList.toggle('is-muted', current.getMonth() !== displayed.getMonth()); day.classList.toggle('is-start', value === start); day.classList.toggle('is-end', value === end); day.classList.toggle('is-between', Boolean(start && end && value > start && value < end)); grid.append(day);
          }
          calendar.append(grid); calendars.append(calendar);
        }); panel.append(calendars);
        const footer = document.createElement('div'); footer.className = 'jg-date-footer';
        const error = document.createElement('span'); error.className = 'jg-date-error'; error.setAttribute('role', 'status');
        const clear = button('清空', () => { startInput.value = ''; endInput.value = ''; emit(startInput, 'change'); emit(endInput, 'change'); updateLabel(); hide(); trigger.focus(); }); clear.className = 'jg-btn jg-text';
        const confirm = button('确定', () => {
          const from = `${start} ${startTime}`, to = `${end} ${endTime}`;
          if (to < from) { error.textContent = '结束时间不能早于开始时间'; return; }
          startInput.value = from; endInput.value = to; emit(startInput, 'change'); emit(endInput, 'change'); updateLabel(); hide(); trigger.focus();
        }, !start || !end); confirm.className = 'jg-btn'; footer.append(error, clear, confirm); panel.append(footer);
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
  function init(root = document) {
    all('.jg-table', root).forEach(initTable);
    all('form.jg-search[data-jg-table]', root).forEach(form => once(form, 'search', () => {
      form.addEventListener('submit', e => { e.preventDefault(); const table = byId(form.dataset.jgTable); if (table) { const state = tableState(table); state.filters = filtersFor(table); state.page = 1; renderTable(table); } });
      form.addEventListener('reset', () => setTimeout(() => {
        all('.jg-select', form).forEach(box => {
          const input = box.querySelector('input[type=hidden]'), options = all('[data-jg-value]', box), value = input?.defaultValue || '';
          const match = options.find(el => el.dataset.jgValue === value);
          if (match) { const label = box.querySelector('.jg-select-label'); if (label) label.textContent = match.textContent.trim(); options.forEach(el => el.setAttribute('aria-selected', String(el === match))); }
          closeSelect(box);
        });
        const table = byId(form.dataset.jgTable); if (table) { const state = tableState(table); state.filters = filtersFor(table); state.page = 1; renderTable(table); }
      }, 0));
    }));
    all('[data-jg-toggle]', root).forEach(control => once(control, 'toggle', () => {
      const panel = byId(control.dataset.jgToggle); if (!panel) return;
      control.setAttribute('aria-controls', panel.id); control.setAttribute('aria-expanded', String(!panel.hidden));
      control.addEventListener('click', () => { panel.hidden = !panel.hidden; control.setAttribute('aria-expanded', String(!panel.hidden)); });
    }));
    all('.jg-select', root).forEach(initSelect);
    all('.jg-date-picker', root).forEach(initDatePicker);
    all('.jg-tabs,.jg-segments', root).forEach(initTabs);
    all('[data-jg-modal-open]', root).forEach(control => once(control, 'modal-open', () => control.addEventListener('click', () => openModal(control.dataset.jgModalOpen))));
    all('.jg-modal', root).forEach(modal => once(modal, 'modal', () => {
      modal.addEventListener('close', () => { const focus = previousFocus.get(modal); if (focus?.isConnected) focus.focus(); });
      all('[data-jg-modal-close]', modal).forEach(control => control.addEventListener('click', () => modal.close()));
    }));
    all('.jg-tree', root).forEach(initTree);
    all('[data-jg-tree-search]', root).forEach(input => once(input, 'tree-search', () => {
      const tree = byId(input.dataset.jgTreeSearch); if (!tree) return;
      const initial = new Map(all('ul', tree).map(ul => [ul, ul.hidden]));
      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        all('li', tree).forEach(li => { li.hidden = query ? !li.textContent.toLowerCase().includes(query) : false; });
        all('ul', tree).forEach(ul => { ul.hidden = query ? false : initial.get(ul) || false; });
        all('[data-jg-tree-toggle]', tree).forEach(toggle => { const ul = Array.from(toggle.closest('li').children).find(el => el.tagName === 'UL'); if (ul) toggle.setAttribute('aria-expanded', String(!ul.hidden)); });
      });
    }));
    all('.jg-transfer', root).forEach(transfer => once(transfer, 'transfer', () => {
      all('[data-jg-transfer-search]', transfer).forEach(input => input.addEventListener('input', () => filterTransfer(transfer)));
      all('[data-jg-transfer-move]', transfer).forEach(control => control.addEventListener('click', () => {
        const direction = control.dataset.jgTransferMove;
        const target = all('[data-jg-transfer-side]', transfer).find(panel => panel.dataset.jgTransferSide === direction);
        const source = all('[data-jg-transfer-side]', transfer).find(panel => panel.dataset.jgTransferSide !== direction);
        const list = target?.querySelector('.jg-transfer-list'); if (!source || !list) return;
        all('.jg-transfer-item', source).filter(item => !item.hidden && item.querySelector('input[type=checkbox]')?.checked && !item.querySelector('input[type=checkbox]')?.disabled).forEach(item => { item.querySelector('input').checked = false; list.append(item); });
        filterTransfer(transfer); emit(transfer, 'change');
      })); filterTransfer(transfer);
    }));
    all('.jg-upload input[type=file]', root).forEach(input => once(input, 'file', () => input.addEventListener('change', () => {
      const label = input.closest('.jg-upload').querySelector('[data-jg-file-name]'); if (label) label.textContent = Array.from(input.files || []).map(file => file.name).join('、') || '未选择文件';
    })));
    all('[data-jg-tooltip]', root).forEach(el => once(el, 'tooltip', () => {
      el.addEventListener('mouseenter', () => showTooltip(el)); el.addEventListener('mouseleave', hideTooltip); el.addEventListener('focus', () => showTooltip(el)); el.addEventListener('blur', hideTooltip);
    }));
  }
  function injectIcons() {
    if (byId('jg-icon-symbols')) return;
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
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'jg-icon-symbols'; svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    // 图形是包内静态路径；不插入外部内容。
    svg.innerHTML = Object.entries(paths).map(([name, path]) => `<symbol id="jg-icon-${name}" viewBox="0 0 24 24">${path}</symbol>`).join(''); document.body.prepend(svg);
  }
  document.addEventListener('click', e => { if (!e.target.closest('.jg-select')) closeSelects(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const open = all('.jg-select').find(box => box.querySelector('.jg-select-trigger')?.getAttribute('aria-expanded') === 'true'); if (open) { e.preventDefault(); closeSelect(open, true); } hideTooltip(); } });
  document.addEventListener('scroll', hideTooltip, true);
  window.JG = { init, refreshTable(id) { const table = byId(id); if (!table) return; const state = tableState(table); state.rows = all('tbody>tr', table).filter(row => !row.hasAttribute('data-jg-empty')); renderTable(table); }, openModal, closeModal };
  function start() { injectIcons(); init(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
