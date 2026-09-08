#!/usr/bin/env python3
"""Add a searchable deployment inventory to the existing offline delivery map."""
import argparse
import html
import json
import re
from pathlib import Path

CSS = r'''<style id="delivery-style">
.delivery-overview,.delivery-panel{margin:20px 24px;background:#fff;border:1px solid #dde5ee;border-radius:12px;padding:20px;color:#24364b}
.delivery-overview{display:flex;align-items:center;gap:28px;flex-wrap:wrap}.delivery-overview strong{font-size:26px;color:#1e4976;margin-right:7px}.delivery-overview a{margin-left:auto;color:#175cab;font-weight:600}
.delivery-panel h2{margin:0 0 8px;font-size:22px}.delivery-help{color:#586a7e;font-size:13px;line-height:1.7;margin:8px 0 16px}.delivery-filters{display:flex;flex-wrap:wrap;gap:12px;padding:16px 0}
.delivery-filters label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#52677e}.delivery-filters select,.delivery-filters input,.delivery-panel button{font:inherit;border:1px solid #becbd9;background:#fff;color:#24364b;border-radius:6px;padding:8px 10px;min-height:38px}.delivery-filters input{width:250px}.delivery-filters select{max-width:200px}.delivery-panel button{cursor:pointer}.delivery-panel button:hover{background:#edf4fc}.delivery-panel :focus-visible{outline:3px solid #2879ce;outline-offset:2px}
.delivery-table-wrap{overflow:auto;max-height:560px;border:1px solid #dce5ef;border-radius:8px}.delivery-table{border-collapse:separate;border-spacing:0;width:100%;min-width:1390px;font-size:13px}.delivery-table th{background:#edf3f9;position:sticky;top:0;z-index:1;color:#354e6a;text-align:left;white-space:nowrap}.delivery-table td,.delivery-table th{padding:12px;border-bottom:1px solid #e2e9f0;vertical-align:top;line-height:1.6}.delivery-table tbody tr:hover{background:#f6f9fd}.delivery-table td:first-child{min-width:160px}.delivery-table td small{display:block;color:#61768c}.delivery-table .missing{color:#876314;background:#fff7dc;border-radius:4px;padding:2px 5px;white-space:nowrap}.delivery-pill{display:inline-block;border:1px solid #d8e2ec;border-radius:5px;padding:2px 7px;white-space:nowrap}.delivery-table details{max-width:320px;min-width:155px}.delivery-table summary{cursor:pointer;color:#175cab}.delivery-table dl{margin:8px 0;overflow-wrap:anywhere}.delivery-table dt{font-weight:600;margin-top:8px}.delivery-table dd{margin:2px 0}.delivery-footer{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between;margin-top:12px;color:#52677e;font-size:13px}.delivery-distributions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-top:16px}.delivery-distribution{padding:14px;background:#f5f8fc;border:1px solid #e0e7ef;border-radius:8px}.delivery-distribution h3{margin:0 0 12px;font-size:14px}.delivery-distribution button{display:flex;width:100%;justify-content:space-between;gap:8px;text-align:left;font-size:12px;margin:6px 0;overflow-wrap:anywhere}.delivery-distribution button b{white-space:nowrap}.delivery-distribution .bar{height:3px;background:#327fb8;border-radius:2px}.delivery-clear{align-self:end}.delivery-sources{font-size:12px;line-height:1.7;color:#62748a;margin:14px 0 0}
@media(max-width:900px){.delivery-distributions{grid-template-columns:repeat(2,minmax(0,1fr))}.delivery-panel,.delivery-overview{margin:12px;padding:14px}.delivery-overview{gap:14px}.delivery-filters label{max-width:100%}.delivery-filters input{max-width:100%}}
</style>'''

PANEL = r'''<section class="delivery-panel" id="sec-delivery" aria-labelledby="delivery-title">
<h2 id="delivery-title">交付环境明细</h2>
<p class="delivery-help">按交付点查看部署方案和软件环境。合并项目的阶段、状态会分别显示在关联交付点上；环境字段只取本交付点的记录。空白字段标为“待补收”。版本、方案保留原表写法。</p>
<div class="delivery-filters" id="deliveryFilters"></div>
<div class="delivery-footer"><span id="deliveryResult" role="status" aria-live="polite"></span><button id="deliveryExport">导出当前筛选 CSV</button></div>
<div class="delivery-table-wrap" tabindex="0" aria-label="交付环境明细，可横向滚动"><table class="delivery-table"><thead><tr><th scope="col">交付点 / 地区</th><th scope="col">交付阶段 / 状态</th><th scope="col">部署方式</th><th scope="col">部署方案</th><th scope="col">集管版本</th><th scope="col">操作系统</th><th scope="col">Redis 版本</th><th scope="col">数据库及版本</th><th scope="col">环境更新时间</th><th scope="col">原表信息</th></tr></thead><tbody id="deliveryRows"></tbody></table></div>
<div class="delivery-footer"><span>原表状态单独展示，包括暂停、进行中、实施完成；地图三色规则保持原口径。</span><div><button id="deliveryPrev">上一页</button> <span id="deliveryPage"></span> <button id="deliveryNext">下一页</button></div></div>
<details><summary style="cursor:pointer;margin-top:20px">环境分布 · 按当前筛选的交付点计数</summary><p class="delivery-help">点击某个值可筛选明细。分母为当前筛选交付点，空白计入待补收。多种部署方式、版本描述保持一条原始记录，不拆分统计。</p><div class="delivery-distributions" id="deliveryDistributions"></div></details>
<p class="delivery-sources" id="deliverySources"></p>
</section>'''

JS = r'''<script>
(() => {
const data = JSON.parse(document.getElementById('delivery-data').textContent);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const missing = '待补收';
const val = v => v ? esc(v) : '<span class="missing">待补收</span>';
const fields = [['region','地区'],['status','交付状态'],['method','部署方式'],['scheme','部署方案'],['version','集管版本'],['os','操作系统'],['redis','Redis 版本'],['database','数据库及版本']];
const core = fields.filter(([k])=>['scheme','version','os','redis','database'].includes(k));
const controls = {};
const filters = document.getElementById('deliveryFilters');
filters.innerHTML = '<label>搜索项目或环境<input id="deliverySearch" type="search" placeholder="客户、内核、版本等"></label>';
fields.forEach(([k,label])=>{
 const el=document.createElement('label');el.textContent=label;
 const s=document.createElement('select');s.id='delivery-'+k;s.setAttribute('aria-label',label);s.innerHTML='<option value="">全部</option>';
 [...new Set(data.records.map(r=>r[k]||missing))].sort((a,b)=>a.localeCompare(b,'zh-CN')).forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o)});
 el.appendChild(s);filters.appendChild(el);controls[k]=s;s.addEventListener('change',()=>{page=1;render()});
});
const quality=document.createElement('label');quality.innerHTML='信息完整度<select id="deliveryQuality"><option value="">全部</option><option value="missing">5 项重点字段有缺项</option><option value="unregistered">环境表未登记</option><option value="complete">5 项重点字段已填写</option><option value="notes">原表信息需确认</option></select>';filters.appendChild(quality);
const reset=document.createElement('button');reset.className='delivery-clear';reset.textContent='清空筛选';filters.appendChild(reset);
let page=1, rows=[];const size=25;
document.getElementById('deliverySearch').addEventListener('input',()=>{page=1;render()});
document.getElementById('deliveryQuality').addEventListener('change',()=>{page=1;render()});
reset.onclick=()=>{Object.values(controls).forEach(c=>c.value='');document.getElementById('deliverySearch').value='';document.getElementById('deliveryQuality').value='';page=1;render()};
function render(){
 const q=document.getElementById('deliverySearch').value.trim().toLowerCase(),quality=document.getElementById('deliveryQuality').value;
 rows=data.records.filter(r=>fields.every(([k])=>!controls[k].value || (r[k]||missing)===controls[k].value) && (!q || Object.values(r).join(' ').toLowerCase().includes(q)) && (!quality || (quality==='missing'&&r.missing.length) || (quality==='unregistered'&&!r.inventoryRow) || (quality==='complete'&&!r.missing.length) || (quality==='notes'&&r.notes.some(n=>n.includes('待确认')))));
 const pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages);
 document.getElementById('deliveryResult').textContent=`${rows.length} / ${data.siteCount} 个交付点 · 关联 ${new Set(rows.map(r=>r.projectKey)).size} 个进度项目 · ${rows.filter(r=>r.missing.length).length} 个交付点有重点字段待补收`;
 document.getElementById('deliveryRows').innerHTML=rows.slice((page-1)*size,page*size).map(r=>`<tr><td><b>${esc(r.site)}</b><small>${esc(r.region)}${r.combinedProgress?' · 合并项目':''}</small></td><td>${val(r.stage)}<br><span class="delivery-pill">${esc(r.status||missing)}</span></td>${['method','scheme','version','os','redis','database'].map(k=>`<td>${val(r[k])}</td>`).join('')}<td>${val(r.updatedAt)}</td><td><details><summary>来源与补充信息</summary><dl><dt>进度表项目</dt><dd>${esc(r.projectKey)} · 第 ${r.progressRow} 行</dd><dt>环境表交付点</dt><dd>${r.inventoryRow?esc(r.inventorySite)+' · 第 '+r.inventoryRow+' 行':'未登记'}</dd><dt>系统内核版本（原文）</dt><dd>${val(r.kernel)}</dd><dt>加固及主机防火墙（原文）</dt><dd>${val(r.hardening)}</dd><dt>待补收字段</dt><dd>${esc(r.missing.join('、')||'5 项重点字段均已填写')}</dd>${r.notes.map(n=>`<dd>${esc(n)}</dd>`).join('')}</dl></details></td></tr>`).join('') || '<tr><td colspan="10">没有符合条件的交付点。可调整筛选或点击“清空筛选”。</td></tr>';
 document.getElementById('deliveryPage').textContent=`${page} / ${pages} 页 · 每页 ${size} 条`;
 document.getElementById('deliveryPrev').disabled=page===1;document.getElementById('deliveryNext').disabled=page===pages;
 const dist=document.getElementById('deliveryDistributions');dist.innerHTML='';
 core.forEach(([k,label])=>{const counts={};rows.forEach(r=>{const v=r[k]||missing;counts[v]=(counts[v]||0)+1});const card=document.createElement('div');card.className='delivery-distribution';card.innerHTML=`<h3>${label}</h3>`;Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([v,n])=>{const btn=document.createElement('button');btn.innerHTML=`<span>${esc(v)}</span><b>${n} · ${Math.round(100*n/rows.length)}%</b>`;btn.onclick=()=>{controls[k].value=v;page=1;render()};card.appendChild(btn);const bar=document.createElement('div');bar.className='bar';bar.style.width=`${100*n/rows.length}%`;card.appendChild(bar)});dist.appendChild(card)});
}
document.getElementById('deliveryPrev').onclick=()=>{page--;render()};document.getElementById('deliveryNext').onclick=()=>{page++;render()};
document.getElementById('deliverySources').textContent=`进度：${data.sources.progress.file} / ${data.sources.progress.sheet}（${data.progressMonth}）；环境：${data.sources.inventory.file} / ${data.sources.inventory.sheet}，表内最后修改时间最大值 ${data.inventoryLatestUpdate||missing}。环境字段反映原表登记情况，各行时间不同。`;
document.getElementById('deliveryExport').onclick=()=>{
 const cols=[['site','交付点'],['projectKey','进度项目'],['stage','交付阶段'],...fields.filter(([k])=>k!=='region'),['kernel','系统内核版本'],['hardening','加固及主机防火墙'],['updatedAt','环境更新时间'],['progressRow','进度表行号'],['inventoryRow','环境表行号']];
 const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 const csv=[cols.map(([,label])=>quote(label)).join(','),...rows.map(r=>cols.map(([k])=>quote(r[k]??missing)).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='集管交付环境-'+data.progressMonth+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
render();
})();
</script>'''


def enrich(content, data):
    # Repeated calls replace the same blocks, never append duplicates.
    for key in ['style', 'overview', 'panel', 'script']:
        content = re.sub(r'<!-- delivery-' + key + r'-start -->.*?<!-- delivery-' + key + r'-end -->', '', content, flags=re.S)
    def block(key, value):
        return f'<!-- delivery-{key}-start -->{value}<!-- delivery-{key}-end -->'
    overview = f'''<div class="delivery-overview"><span><strong>{data['projectCount']}</strong>进度项目</span><span><strong>{data['siteCount']}</strong>交付点</span><span><strong>{data['completeCoreCount']}</strong>交付点已填齐 5 项环境字段</span><span><strong>{data['siteCount']-data['completeCoreCount']}</strong>交付点待补收</span><a href="#sec-delivery">查看部署方案与版本明细 ↓</a></div>'''
    content = (block('style', CSS) + '</head>').join(content.rsplit('</head>', 1))
    content = content.replace('<div class="three-col">', block('overview', overview) + '<div class="three-col">', 1)
    content = content.replace('<div class="notes-section">', block('panel', PANEL) + '<div class="notes-section">', 1)
    encoded = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    content = (block('script', '<script type="application/json" id="delivery-data">' + encoded + '</script>' + JS) + '</body>').join(content.rsplit('</body>', 1))
    for required in ['delivery-title', 'delivery-overview', 'delivery-data']:
        if required not in content:
            raise ValueError('地图模板缺少交付明细插入位置：' + required)
    return content


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html', required=True, type=Path)
    parser.add_argument('--data', required=True, type=Path)
    args = parser.parse_args()
    result = enrich(args.html.read_text(encoding='utf-8'), json.loads(args.data.read_text(encoding='utf-8')))
    args.html.write_text(result, encoding='utf-8')
