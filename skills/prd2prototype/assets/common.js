/* =============================================================================
   common.js — 通用设计系统 · 交互层(配合 common.css)
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
})();
