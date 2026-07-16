/* =============================================================================
   common.js — 通用设计系统 · 交互层(配合 common-Codex.css)
   给复合组件提供「能点」的最小交互:Select / TreeSelect / Tree / 多选单选开关 /
   弹窗 Modal / 通用 active 切换 / 主题切换。
   用法:页面底部引入本文件即可,基于类名 + data-* 约定自动绑定,无需逐个写脚本。
   适用场景:HTML 原型评审(交互为演示性质,数据为 mock)。
   ============================================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 自定义 Select:单选回填关闭 / 多选打标签 ---------- */
  $(".select-box").forEach(function (box) {
    var trig = box.querySelector(".select-trigger");
    var multiple = box.hasAttribute("data-multiple");
    if (!trig) return;
    trig.addEventListener("click", function (e) { e.stopPropagation(); toggleOpen(box); });
    $(".select-dropdown .item", box).forEach(function (it) {
      it.addEventListener("click", function (e) {
        e.stopPropagation();
        if (it.classList.contains("disabled")) return;
        if (multiple) {
          it.classList.toggle("selected");
          renderTags(trig, $(".select-dropdown .item.selected", box));
        } else {
          $(".select-dropdown .item", box).forEach(function (x) { x.classList.remove("selected"); });
          it.classList.add("selected");
          setText(trig, it.textContent.trim());
          box.classList.remove("open");
        }
      });
    });
  });
  function renderTags(trig, items) {
    var holder = trig.querySelector(".tags") || trig;
    if (!items.length) { setText(trig, trig.getAttribute("data-placeholder") || "请选择"); trig.classList.add("is-placeholder"); ensureCaret(trig); return; }
    trig.classList.remove("is-placeholder");
    var html = '<span class="tags">' + items.map(function (i) { return '<span class="val">' + i.textContent.trim() + "</span>"; }).join("") + "</span>";
    trig.innerHTML = html + '<span class="caret">▾</span>';
  }
  function setText(trig, t) {
    var caret = trig.querySelector(".caret");
    trig.textContent = t;
    trig.classList.remove("is-placeholder");
    if (caret) trig.appendChild(caret); else ensureCaret(trig);
  }
  function ensureCaret(trig) { if (!trig.querySelector(".caret")) { var c = document.createElement("span"); c.className = "caret"; c.textContent = "▾"; trig.appendChild(c); } }

  /* ---------- TreeSelect:开合 + 选节点回填 ---------- */
  $(".treeselect").forEach(function (ts) {
    var trig = ts.querySelector(".ts-trigger");
    if (trig) trig.addEventListener("click", function (e) { e.stopPropagation(); toggleOpen(ts); });
    bindTree(ts, function (node) {
      var label = node.getAttribute("data-label") || node.textContent.trim();
      var txt = ts.querySelector(".ts-trigger .ts-text") || ts.querySelector(".ts-trigger");
      if (txt) { var caret = ts.querySelector(".ts-trigger .caret"); txt.textContent = label; if (caret && txt === ts.querySelector(".ts-trigger")) txt.appendChild(caret); }
      ts.classList.remove("open");
    });
  });

  /* ---------- 独立 Tree:展开/收起 + 选中 + 勾选树 ---------- */
  $(".tree").forEach(function (tree) { if (!tree.closest(".treeselect")) bindTree(tree, null); });

  function bindTree(scope, onSelect) {
    $(".node", scope).forEach(function (node) {
      node.addEventListener("click", function (e) {
        e.stopPropagation();
        // 点箭头:展开/收起
        if (e.target.classList.contains("arrow")) {
          node.classList.toggle("open");
          var ch = node.nextElementSibling;
          if (ch && ch.classList.contains("children")) ch.style.display = node.classList.contains("open") ? "" : "none";
          return;
        }
        // 勾选树:点 checkbox 切换
        if (e.target.classList.contains("tcb") || e.target.closest(".tcb")) {
          node.classList.toggle("checked"); node.classList.remove("indeterminate");
          return;
        }
        // 普通选中(仅限当前这棵 .tree)
        var tree = node.closest(".tree");
        $(".node", tree).forEach(function (x) { x.classList.remove("selected"); });
        node.classList.add("selected");
        if (onSelect) onSelect(node);
      });
    });
  }

  /* ---------- 多选 / 单选 / 开关 ---------- */
  $(".checkbox:not(.disabled)").forEach(function (c) {
    c.addEventListener("click", function () { c.classList.remove("indeterminate"); c.classList.toggle("checked"); });
  });
  $(".radio:not(.disabled)").forEach(function (r) {
    r.addEventListener("click", function () {
      var group = r.closest("[data-radio-group]") || r.parentElement;
      $(".radio", group).forEach(function (x) { x.classList.remove("checked"); });
      r.classList.add("checked");
    });
  });
  $(".switch:not(.disabled)").forEach(function (s) { s.addEventListener("click", function () { s.classList.toggle("on"); }); });

  /* ---------- 弹窗 Modal:打开 / 关闭 / 遮罩点击关闭 ---------- */
  window.openModal = function (id) { var m = document.getElementById(id); if (m) m.style.display = "flex"; };
  window.closeModal = function (id) { var m = document.getElementById(id); if (m) m.style.display = "none"; };
  $("[data-modal-open]").forEach(function (b) { b.addEventListener("click", function () { window.openModal(b.getAttribute("data-modal-open")); }); });
  $(".modal-mask").forEach(function (mask) {
    mask.addEventListener("click", function (e) { if (e.target === mask) mask.style.display = "none"; });
    $("[data-modal-close]", mask).forEach(function (b) { b.addEventListener("click", function () { mask.style.display = "none"; }); });
  });

  /* ---------- 通用「点击切换选中」(tabs / 分段 / 切换 / 分页 / 菜单 / 锚点 / 日历) ---------- */
  var groups = [
    [".tab-cards", ".tab", "active"], [".tab-bar", ".tab", "active"],
    [".segmented", ".seg", "active"], [".toggle-tabs", ".toggle", "active"],
    [".radio-group", ".opt", "active"], [".pagination", ".pg", "active"],
    [".history-tabs", ".h-tab", "active"], [".sub-menu", ".menu-item", "active"],
    [".top-nav", ".nav-item", "active"], [".anchor", ".a-link", "active"],
    [".dropdown-menu", ".item", "selected"], [".calendar .cal-grid", ".day", "selected"]
  ];
  groups.forEach(function (g) {
    $(g[0]).forEach(function (w) {
      if (w.closest(".select-box") || w.closest(".treeselect")) return; // 这些下拉由 Select 逻辑管
      w.addEventListener("click", function (e) {
        var it = e.target.closest(g[1]);
        if (!it || !w.contains(it) || it.classList.contains("disabled") || it.classList.contains("muted")) return;
        $(g[1], w).forEach(function (x) { x.classList.remove("active", "selected"); });
        it.classList.add(g[2]);
      });
    });
  });

  /* ---------- 外部点击:关闭所有打开的下拉 ---------- */
  document.addEventListener("click", function () {
    $(".select-box.open, .treeselect.open").forEach(function (b) { b.classList.remove("open"); });
  });
  function toggleOpen(box) {
    var wasOpen = box.classList.contains("open");
    $(".select-box.open, .treeselect.open").forEach(function (b) { b.classList.remove("open"); });
    if (!wasOpen) box.classList.add("open");
  }

  /* ---------- 主题切换按钮(可选,带 data-theme-toggle) ---------- */
  $("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.body.classList.toggle("theme-dark");
      b.textContent = document.body.classList.contains("theme-dark") ? "切换浅色" : "切换深色";
    });
  });
/* ---------- 侧滑面板 Drawer:右侧抽屉,开/关/遮罩关闭 ---------- */
  window.openDrawer = function (id) { var d = document.getElementById(id); if (d) d.classList.add("open"); };
  window.closeDrawer = function (id) { var d = document.getElementById(id); if (d) d.classList.remove("open"); };
  $("[data-drawer-open]").forEach(function (b) { b.addEventListener("click", function () { window.openDrawer(b.getAttribute("data-drawer-open")); }); });
  $(".drawer-mask").forEach(function (mask) {
    mask.addEventListener("click", function (e) { if (e.target === mask) mask.classList.remove("open"); });
    $("[data-drawer-close]", mask).forEach(function (b) { b.addEventListener("click", function () { mask.classList.remove("open"); }); });
  });

  /* ---------- 需求便签 .proto-tip:点徽标开合;点弹层内部不关(留给选中复制);点外部才关 ---------- */
  $(".proto-tip .chg-badge").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var tip = b.closest(".proto-tip"), wasOpen = tip.classList.contains("open");
      $(".proto-tip.open").forEach(function (x) { x.classList.remove("open"); });
      if (!wasOpen) tip.classList.add("open");
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".pt-pop")) return; // 点在弹层内部(复制需求文字)不关闭
    $(".proto-tip.open").forEach(function (tip) { tip.classList.remove("open"); });
  });
})();

/* =============================================================================
   编辑态 + 覆盖层(prd2prototype skill:需求标签 / 原型说明 手改回写)
   -----------------------------------------------------------------------------
   目的:产品通过本地编辑器(localhost 服务)在页面上直接改「需求标签 / 原型说明」文字、
        加删标签,改动自动写进覆盖层文件 data/annotations.js;file:// 直接双击 = 纯看只读,
        发布到 GitLab(内网域名)后也只读、无任何编辑入口。
   判据:hostname 是 localhost → 可编辑(有本地服务能写文件);file:// 与内网域名 → 只读。
   结构约定(做原型时写死,别让脚本自动编号):
     · 文本载体带 data-anno-id="页面前缀.tag-3";富文本(如原型说明整块)另加 data-anno-rich
     · 可增删的标签:外层 chip 带 data-anno-item,所在容器带 data-anno-container="页面前缀.tags"
   覆盖层数据(window.__ANNO__,来自 data/annotations.js,须在本文件之前引用):
     { overrides:{id:文字}, additions:{容器id:[{id,text}]}, removed:[id] }
   铁律:data-anno-id 只增不改不复用;annotations.js 产品所有,生成 / 改原型时不覆写。
   ============================================================================= */
(function () {
  "use strict";
  var HOST = location.hostname;
  // 只有通过本地编辑器(localhost 服务)打开才可编辑;file:// 直接双击 = 纯看,内网域名 = 发布,都只读
  var EDITABLE = HOST === "localhost" || HOST === "127.0.0.1" || HOST === "::1";
  var $ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var q = function (id) { return document.querySelector('[data-anno-id="' + String(id).replace(/"/g, '\\"') + '"]'); };
  var qc = function (id) { return document.querySelector('[data-anno-container="' + String(id).replace(/"/g, '\\"') + '"]'); };

  var ANNO = (window.__ANNO__ && typeof window.__ANNO__ === "object") ? window.__ANNO__ : {};
  if (!ANNO.overrides && !ANNO.additions && !ANNO.removed) ANNO = { overrides: ANNO }; // 兼容平铺 {id:text}
  ANNO.overrides = ANNO.overrides || {};
  ANNO.additions = ANNO.additions || {};
  ANNO.removed = ANNO.removed || [];

  var DRAFT_KEY = "proto:draft:" + location.pathname;
  var MODE_KEY = "proto:editMode";
  var defaults = {};      // id -> overlay 前的原始内容(本地导出比对用)
  var removedSet = {};

  function isRich(el) { return el.hasAttribute("data-anno-rich"); }
  function getContent(el) { return isRich(el) ? el.innerHTML : (el.textContent || "").trim(); }
  function setContent(el, v) { if (isRich(el)) el.innerHTML = v; else el.textContent = v; }

  // 1) overlay 前先抓默认值(HTML 生成层的原文)
  $("[data-anno-id]").forEach(function (el) {
    if (!el.hasAttribute("data-anno-added")) defaults[el.getAttribute("data-anno-id")] = getContent(el);
  });

  applyAnno(ANNO); // 一律以 data/annotations.js(生成层 + 覆盖层)为准

  function applyAnno(data) {
    data = data || {};
    (data.removed || []).forEach(function (id) {
      removedSet[id] = 1;
      var el = q(id), wrap = el && el.closest("[data-anno-item]");
      if (wrap) wrap.remove(); else if (el) el.remove();
    });
    var ov = data.overrides || {};
    Object.keys(ov).forEach(function (id) { var el = q(id); if (el) setContent(el, ov[id]); });
    var ad = data.additions || {};
    Object.keys(ad).forEach(function (cid) {
      var box = qc(cid); if (!box) return;
      (ad[cid] || []).forEach(function (item) { if (!q(item.id)) box.appendChild(makeChip(item.id, item.text)); });
    });
  }

  function makeChip(id, text) {
    var chip = document.createElement("span");
    chip.className = "dev-tag"; chip.setAttribute("data-anno-item", ""); chip.setAttribute("data-anno-added", "");
    var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = true;
    var a = document.createElement("a"); a.href = "#"; a.setAttribute("data-anno-id", id);
    a.setAttribute("data-anno-added", ""); a.textContent = text || "新标签";
    chip.appendChild(cb); chip.appendChild(a);
    return chip;
  }

  // ---- 以下只在本地编辑器(localhost)生效;file:// 与内网域名到此为止(纯只读覆盖) ----
  if (!EDITABLE) return;

  // 心跳:让本地编辑器服务知道页面还开着;所有编辑页/控制页都关掉后,服务因无心跳自动停(见 serve.js 看门狗)。
  // 注意:不在这里 sendBeacon("bye")——否则关掉一个原型标签会连带停掉整个服务(控制页可能还开着要选下一个)。
  setInterval(function () { fetch("ping").catch(function () {}); }, 3000);

  var HELP_URL = "https://yideng-xl.github.io/jg-product-design-plugin-codex/"; // 使用说明(GitHub Pages),按实际地址改
  var bar = document.createElement("div");
  bar.id = "anno-bar"; bar.className = "anno-bar";
  bar.innerHTML =
    '<label class="anno-switch"><input type="checkbox" id="anno-toggle"> 编辑态</label>' +
    '<span id="anno-hint" class="anno-hint">改动自动写入文件</span>' +
    '<a class="anno-help" href="' + HELP_URL + '" target="_blank" rel="noopener">使用说明</a>';
  document.body.appendChild(bar);
  var toggle = bar.querySelector("#anno-toggle");
  var hint = bar.querySelector("#anno-hint");

  toggle.addEventListener("change", function () {
    if (toggle.checked) enterEdit(); else exitEdit();
    try { localStorage.setItem(MODE_KEY, toggle.checked ? "1" : "0"); } catch (e) {}
  });
  var savedMode = null; try { savedMode = localStorage.getItem(MODE_KEY); } catch (e) {}
  if (savedMode === "1") { toggle.checked = true; enterEdit(); }

  var saveTimer = null;
  function persist() { clearTimeout(saveTimer); hint.textContent = "保存中…"; saveTimer = setTimeout(pushSave, 400); }
  function nowTime() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()); }
  function pushSave() {
    var payload = JSON.stringify(collect());
    try { localStorage.setItem(DRAFT_KEY, payload); } catch (e) {} // 本地备份,服务写失败也不丢
    fetch("save-annotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }) // 相对路径,服务据此反推是哪个原型
      .then(function (r) { hint.textContent = r.ok ? ("已保存 " + nowTime()) : ("保存失败:" + r.status); })
      .catch(function () { hint.textContent = "保存失败:本地编辑器没在运行?"; });
  }

  function onInput() { persist(); }
  function enterEdit() {
    document.body.classList.add("edit-mode");
    $("[data-anno-id]").forEach(function (el) { el.setAttribute("contenteditable", "true"); el.addEventListener("input", onInput); });
    $("[data-anno-item]").forEach(injectX);
    $("[data-anno-container]").forEach(injectPlus);
  }
  function exitEdit() {
    document.body.classList.remove("edit-mode");
    $("[data-anno-id]").forEach(function (el) { el.removeAttribute("contenteditable"); el.removeEventListener("input", onInput); });
    $(".anno-x, .anno-add").forEach(function (b) { b.remove(); });
    pushSave(); // 退出编辑态兜底存一次
  }
  function injectX(item) {
    if (item.querySelector(".anno-x")) return;
    var x = document.createElement("span");
    x.className = "anno-x"; x.setAttribute("contenteditable", "false"); x.textContent = "×"; x.title = "删除此标签";
    x.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var a = item.querySelector("[data-anno-id]"), id = a && a.getAttribute("data-anno-id");
      if (a && !a.hasAttribute("data-anno-added") && id) removedSet[id] = 1; // 原件删除记 removed
      item.remove(); persist();
    });
    item.appendChild(x);
  }
  function injectPlus(box) {
    if (box.querySelector(".anno-add")) return;
    var cid = box.getAttribute("data-anno-container");
    var plus = document.createElement("button");
    plus.type = "button"; plus.className = "anno-add"; plus.setAttribute("contenteditable", "false"); plus.textContent = "+ 标签";
    plus.addEventListener("click", function () {
      var id = cid + ".add-" + Date.now().toString(36);
      var chip = makeChip(id, "新标签");
      box.insertBefore(chip, plus);
      var a = chip.querySelector("[data-anno-id]");
      a.setAttribute("contenteditable", "true"); a.addEventListener("input", onInput);
      injectX(chip); persist(); a.focus();
    });
    box.appendChild(plus);
  }

  function collect() {
    var ov = {}, ad = {}, rm = Object.keys(removedSet);
    $("[data-anno-id]").forEach(function (el) {
      var id = el.getAttribute("data-anno-id"), cur = getContent(el);
      if (el.hasAttribute("data-anno-added")) {
        var box = el.closest("[data-anno-container]"); if (!box) return;
        var cid = box.getAttribute("data-anno-container");
        (ad[cid] = ad[cid] || []).push({ id: id, text: cur });
      } else if (defaults[id] !== undefined && cur !== defaults[id]) {
        ov[id] = cur;
      }
    });
    return { overrides: ov, additions: ad, removed: rm };
  }
})();
