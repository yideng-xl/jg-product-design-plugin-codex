#!/usr/bin/env python3
"""Fail-closed technical bid checks and bounded structural repair.

repair INPUT --output OUTPUT --report JSON
audit INPUT --config JSON --report JSON [--pdf PDF --images JSON]
run INPUT --config JSON --output OUTPUT --work-dir DIR --renderer render_docx.py
"""
import argparse
from collections import Counter, defaultdict
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt


def text(e):
    return ''.join(t.text or '' for t in e.iter(qn('w:t')))


def write_json(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2))


def digest(path):
    return sha256(Path(path).read_bytes()).hexdigest()


def geography(value):
    """Extract a place only from a customer/project expression, not arbitrary prose."""
    values = set()
    for match in re.finditer(r'(?:国网|国网公司)([\u4e00-\u9fff]{2,12}?)(?:省电力|市电力|电力|供电)', value):
        region = match.group(1)
        values.add(region)
        # Province + city constructions are split by a province found elsewhere in the same record.
        for province in re.findall(r'([\u4e00-\u9fff]{2,3})省', value):
            if region.startswith(province) and len(region) > len(province):
                values.add(region[len(province):])
    return values


def blacklist(config):
    evidence = defaultdict(set)
    allowed = config.get('target', {}).get('allowed_entities', []) + config.get('target', {}).get('project_names', [])
    province = config.get('target', {}).get('region', '')
    for path in config.get('historical_paths', []):
        p = Path(path)
        parts = p.parts
        for i, part in enumerate(parts):
            if part == '定稿':
                for parent in parts[max(0, i-2):i]:
                    name = re.sub(r'[省市]$', '', parent)
                    if re.fullmatch(r'[\u4e00-\u9fff]{2,6}', name) and not re.search(r'产品|资料|售前|附件', name):
                        evidence[name].add('history_path')
        for token in geography(p.stem):
            evidence[token].add('history_filename')
    counts = Counter()
    for path in config.get('history_text_files', []):
        value = Path(path).read_text()
        for entity in geography(value):
            counts[entity] += value.count(entity)
    for entity, count in counts.items():
        if count >= config.get('entity_frequency', 3):
            evidence[entity].add('frequent_customer_entity')
    for row in config.get('goods_records', []):
        if row.get('included', True):
            continue
        values = ' '.join(str(v) for k, v in row.items() if k != 'included')
        for code in re.findall(r'\b[A-Z]{1,8}\d{2,12}\b', values):
            evidence[code].add('excluded_package')
        for entity in geography(values):
            if province and entity.startswith(province):
                entity = entity[len(province):]
            if entity:
                evidence[entity].add('excluded_project')
    # Allow only positive target facts and supplier identifiers; never a blanket report-wide waiver.
    return {k: sorted(v) for k, v in evidence.items() if len(k) >= 2 and
            not any(k in a for a in allowed) and k != province}


def clean_ghost_columns(table, threshold=200):
    """Fold grid-only slivers into neighbours; retain every real cell and merge boundary.

    A narrow column with its own nonempty cell is not deleted. It is widened to
    the threshold and paid for by the largest column, preserving data and spans.
    """
    changes = []
    grid = table._tbl.tblGrid
    if grid is None:
        return changes
    for index in reversed(range(len(grid))):
        width = int(grid[index].get(qn('w:w'), '0'))
        if width >= threshold or len(grid) < 2:
            continue
        boundaries = set()
        for row in table.rows:
            cursor = row.grid_cols_before
            for tc in row._tr.tc_lst:
                span = tc.grid_span
                if cursor == index and span == 1 and text(tc).strip():
                    boundaries.add(index)
                cursor += span
        if boundaries:
            donor = max(range(len(grid)), key=lambda j: int(grid[j].get(qn('w:w'))))
            delta = threshold - width
            if donor == index or int(grid[donor].get(qn('w:w'))) - delta < threshold:
                continue
            grid[donor].set(qn('w:w'), str(int(grid[donor].get(qn('w:w')))-delta))
            grid[index].set(qn('w:w'), str(threshold));changes.append({'widened': index})
            continue
        neighbour = index-1 if index else 1
        grid[neighbour].set(qn('w:w'), str(int(grid[neighbour].get(qn('w:w')))+width))
        for row in table.rows:
            cursor = row.grid_cols_before
            spans=sum(tc.grid_span for tc in row._tr.tc_lst)
            # Omitted leading/trailing grid slots are part of the row's geometry too.
            for side, covered in [('Before',index<cursor),('After',index>=cursor+spans)]:
                if not covered:continue
                prop=row._tr.get_or_add_trPr();node=prop.find(qn('w:grid'+side))
                count=int(node.get(qn('w:val'),'0')) if node is not None else 0
                if count:
                    if count==1:
                        prop.remove(node)
                        width_node=prop.find(qn('w:w'+side))
                        if width_node is not None:prop.remove(width_node)
                    else:node.set(qn('w:val'),str(count-1))
            for tc in list(row._tr.tc_lst):
                span = tc.grid_span
                if cursor <= index < cursor+span:
                    if span == 1:
                        row._tr.remove(tc)
                    else:
                        tc.grid_span = span-1
                cursor += span
        grid.remove(grid[index]);changes.append({'folded': index, 'twip': width})
    normalize_cell_widths(table)
    return changes


def normalize_cell_widths(table):
    """Synchronize tcW and omission widths with the final grid, without changing merges."""
    widths=[int(g.get(qn('w:w'),'0')) for g in table._tbl.tblGrid]
    for tr in table._tbl.tr_lst:
        prop=tr.get_or_add_trPr();before=prop.find(qn('w:gridBefore'));after=prop.find(qn('w:gridAfter'))
        lead=int(before.get(qn('w:val'),'0')) if before is not None else 0
        tail=int(after.get(qn('w:val'),'0')) if after is not None else 0
        for side,count,slots in [('Before',lead,widths[:lead]),('After',tail,widths[len(widths)-tail:] if tail else [])]:
            node=prop.find(qn('w:w'+side));grid_node=prop.find(qn('w:grid'+side))
            if not count:
                for e in [node,grid_node]:
                    if e is not None:prop.remove(e)
            else:
                if node is None:node=OxmlElement('w:w'+side);prop.append(node)
                node.set(qn('w:w'),str(sum(slots)));node.set(qn('w:type'),'dxa')
        cursor=lead
        for tc in tr.tc_lst:
            node=tc.get_or_add_tcPr().find(qn('w:tcW'))
            if node is None:node=OxmlElement('w:tcW');tc.get_or_add_tcPr().append(node)
            node.set(qn('w:w'),str(sum(widths[cursor:cursor+tc.grid_span])));node.set(qn('w:type'),'dxa')
            cursor+=tc.grid_span


def repair(input_path, output_path, report_path=None):
    if Path(input_path).resolve() == Path(output_path).resolve():
        raise ValueError('输入与输出必须不同，禁止覆盖原稿')
    d = Document(input_path);changes = []
    for ti, table in enumerate(d.tables):
        changes.extend({'table': ti, **x} for x in clean_ghost_columns(table))
        grid=table._tbl.tblGrid
        if grid is not None:
            for j,col in enumerate(grid):
                width=int(col.get(qn('w:w')))
                if width<600:
                    donor=max(range(len(grid)),key=lambda k:int(grid[k].get(qn('w:w'))))
                    delta=600-width
                    if int(grid[donor].get(qn('w:w')))-delta>=600:
                        grid[donor].set(qn('w:w'),str(int(grid[donor].get(qn('w:w')))-delta));col.set(qn('w:w'),'600')
        normalize_cell_widths(table)
        for row in table.rows:
            for h in row._tr.xpath('./w:trPr/w:tblHeader'):
                h.getparent().remove(h)
            for k in row._tr.xpath('.//w:keepNext'):
                k.getparent().remove(k)
            for p in row._tr.xpath('.//w:p'):
                # Neutralize inherited keepNext as well as removing direct XML.
                from docx.text.paragraph import Paragraph
                pp = Paragraph(p, d);pp.paragraph_format.keep_with_next = False
                pp.paragraph_format.keep_together = False
                # The contract requires no keepNext nodes inside tables; use a table-body style.
                if 'BidTableBody' not in d.styles:
                    from docx.enum.style import WD_STYLE_TYPE
                    s = d.styles.add_style('BidTableBody', WD_STYLE_TYPE.PARAGRAPH)
                    s.base_style = d.styles['Normal'];s.paragraph_format.keep_with_next = False
                pp.style = d.styles['BidTableBody']
                for k in p.xpath('./w:pPr/w:keepNext'):k.getparent().remove(k)
            for cell in row.cells:
                if cell.text.strip() in {'序号','单位','数量','名称','型号','制造商','原产地'}:
                    for p in cell.paragraphs:
                        p.paragraph_format.left_indent=Pt(0);p.paragraph_format.right_indent=Pt(0)
                        for r in p.runs:r.font.size=Pt(9)
                    if cell._tc.tcPr.find(qn('w:noWrap')) is None:cell._tc.tcPr.append(OxmlElement('w:noWrap'))
            for h in row._tr.xpath('./w:trPr/w:trHeight'):
                if h.get(qn('w:hRule')) == 'exact':h.set(qn('w:hRule'), 'atLeast')
        if table.rows:
            h = OxmlElement('w:tblHeader');table.rows[0]._tr.get_or_add_trPr().append(h)
            # Balance short Chinese labels, including a single orphan character after a long line.
            seen=set()
            header_rows=[row for i,row in enumerate(table.rows[:4]) if i==0 or any(c.text.strip()=='序号' for c in row.cells)]
            for c in [cell for row in header_rows for cell in row.cells]:
                if id(c._tc) in seen:continue
                seen.add(id(c._tc))
                label=re.sub(r'\s+','',c.text)
                if re.fullmatch(r'[\u4e00-\u9fff/（）()、，,：:]{2,24}',label):
                    import math
                    usable=max(18,c.width.pt-10) if c.width else 50
                    size=9 if usable/9>=3 else 8
                    capacity=max(2,int(usable/size))
                    lines=max(1,math.ceil(len(label)/capacity))
                    base,remainder=divmod(len(label),lines)
                    if base>=2:
                        chunks=[];offset=0
                        for i in range(lines):
                            length=base+(i<remainder);chunks.append(label[offset:offset+length]);offset+=length
                        c.text='\n'.join(chunks)
                    for p in c.paragraphs:
                        p.paragraph_format.left_indent = Pt(0);p.paragraph_format.right_indent = Pt(0)
                        p.paragraph_format.first_line_indent=Pt(0)
                        p.paragraph_format.line_spacing=1
                        p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(0)
                        for r in p.runs:r.font.size = Pt(size)
        changes.append({'table': ti, 'headers': 'row0_only', 'keepNext': 0})
    body = d.element.body
    for p in list(body):
        if p.tag != qn('w:p'):
            continue
        if not text(p).strip() and not p.xpath('.//w:drawing|.//w:pict|.//w:sectPr|.//w:fldChar'):
            for br in p.xpath('.//w:br[@w:type="page"]'):br.getparent().remove(br)
            body.remove(p);changes.append({'empty_placeholder_paragraph_removed': True})
    for i, e in enumerate(list(body)):
        if e.tag != qn('w:tbl'):
            continue
        # Bind the heading + format caption + metadata to the first row, not the entire table.
        cursor = e.getprevious();bound = 0
        while cursor is not None and cursor.tag == qn('w:p') and bound < 3:
            from docx.text.paragraph import Paragraph
            p = Paragraph(cursor, d)
            if not p.text.strip() or len(p.text) > 230:break
            p.paragraph_format.keep_with_next = True;cursor = cursor.getprevious();bound += 1
    # Normalize list-tab stops; inherited distant tabs otherwise create a large gap after markers.
    for p in d.paragraphs:
        if p._p.xpath('./w:pPr/w:numPr') and not p.style.name.startswith('Heading'):
            p.paragraph_format.tab_stops.clear_all()
            p.paragraph_format.tab_stops.add_tab_stop(Pt(24))
            if len(p.text) < 70:p.paragraph_format.keep_with_next = True
    output = Path(output_path);output.parent.mkdir(parents=True, exist_ok=True);d.save(output)
    result = {'changes': changes, 'input_sha256': digest(input_path), 'output_sha256': digest(output)}
    if report_path:write_json(report_path, result)
    return result


def audit_docx(input_path, config):
    d = Document(input_path);errors = []
    from lxml import etree
    chunks=[]
    for part in d.part.package.parts:
        name=str(part.partname)
        if re.search(r'/word/(?:document|header\d*|footer\d*|comments|footnotes|endnotes)\.xml$',name):
            root=etree.fromstring(part.blob)
            chunks.extend(text(p) for p in root.iter(qn('w:p')))
    whole='\n'.join(chunks)
    for value in chunks:
        if '`' in value or re.search(r'^\s*(?:#{1,6}\s+|-\s+)',value):
            errors.append({'code':'markdown_residue','text':value[:160]})
    for pattern in config.get("unverified_performance_patterns",[]):
        if re.search(pattern,whole):errors.append({"code":"unverified_performance","pattern":pattern})
    for value in chunks:
        if re.search(r"质保|保修|无负偏差|负的技术偏差",value) and re.search(r"需确认|待核|暂不能|暂按",value):
            errors.append({"code":"unresolved_commitment","text":value[:160]})
    if config.get("require_ref_indexes",True):
        bookmarks=set(d.element.xpath(".//w:bookmarkStart/@w:name"))
        for p in d.element.xpath(".//w:p"):
            if "【索引" not in text(p):continue
            fields=p.xpath(".//w:instrText")
            refs=[m.group(1) for f in fields if (m:=re.search(r"\bREF\s+(\S+)",f.text or ""))]
            if not refs or any(name not in bookmarks for name in refs):
                errors.append({"code":"invalid_reference_index","text":text(p)[:160]})
    black = blacklist(config)
    for token, evidence in black.items():
        if token in whole:errors.append({'code': 'old_entity', 'token': token, 'evidence': evidence, 'count': whole.count(token)})
    for ti, table in enumerate(d.tables):
        widths = [int(x.get(qn('w:w'), '0')) for x in table._tbl.tblGrid]
        for ri,tr in enumerate(table._tbl.tr_lst):
            prop=tr.trPr
            offset=lambda name:int(prop.find(qn('w:'+name)).get(qn('w:val'),'0')) if prop is not None and prop.find(qn('w:'+name)) is not None else 0
            before,after=offset('gridBefore'),offset('gridAfter')
            for side,count,slots in [('Before',before,widths[:before]),('After',after,widths[len(widths)-after:] if after else [])]:
                node=prop.find(qn('w:w'+side)) if prop is not None else None
                actual=int(node.get(qn('w:w'),'0')) if node is not None else 0
                if actual!=sum(slots):
                    errors.append({'code':'row_omission_width_mismatch','table':ti,'row':ri,'side':side,'actual':actual,'expected':sum(slots)})
            span_total=sum(tc.grid_span for tc in tr.tc_lst)
            if before+span_total+after!=len(widths):
                errors.append({'code':'table_grid_mismatch','table':ti,'row':ri,'before':before,'spans':span_total,'after':after,'columns':len(widths)})
            cursor=before
            for ci,tc in enumerate(tr.tc_lst):
                node=tc.tcPr.find(qn('w:tcW')) if tc.tcPr is not None else None
                actual=int(node.get(qn('w:w'),'0')) if node is not None else None
                expected=sum(widths[cursor:cursor+tc.grid_span])
                if actual!=expected:
                    errors.append({'code':'cell_width_mismatch','table':ti,'row':ri,'cell':ci,'actual':actual,'expected':expected})
                cursor+=tc.grid_span
        if '技术规范或评分要求标题' in text(table._tbl) and not any('REF ' in (x.text or '') for x in table._tbl.xpath('.//w:instrText')):
            errors.append({'code':'plain_scoring_index','table':ti})
        for j, width in enumerate(widths):
            if width < 200:errors.append({'code': 'ghost_column', 'table': ti, 'column': j, 'twip': width})
        for ri, row in enumerate(table.rows):
            if ri and row._tr.xpath('./w:trPr/w:tblHeader'):errors.append({'code': 'nonfirst_header', 'table': ti, 'row': ri})
        if table._tbl.xpath('.//w:keepNext'):errors.append({'code': 'table_keep_next', 'table': ti})
        # Unknowns may remain in a separately delivered issues file, never guarantee cells or a declaration.
        value = text(table._tbl)
        if re.search(r'保证值|投标人.*响应|无负偏差|投标文件响应', value) and re.search(r'需确认|待核|暂不能判定', value):
            errors.append({'code': 'unresolved_guarantee', 'table': ti})
    bom = config.get('bom', {})
    if re.search(r'弱化|默认',str(bom.get('operating_terminals',''))):
        for ti,table in enumerate(d.tables):
            for ri,row in enumerate(table.rows):
                values=[text(tc) for tc in row._tr.tc_lst]
                if any(v.strip()=='设备结构' for v in values):
                    response=values[-1]
                    if '默认满足' not in response or re.search(r'机箱|终端型号|终端清单|带四个操作终端',response):
                        errors.append({'code':'operating_terminals','table':ti,'row':ri,'response':response[:160]})
        normative=False
        for p in d.paragraphs:
            if p.text.strip().endswith('规范应答'):normative=True
            elif p.style.name in ['Heading 1','Heading 2','Heading 3']:normative=False
            if not normative and re.search(r'带\s*四\s*个操作终端|配置\s*四\s*个操作终端',p.text):
                errors.append({'code':'operating_terminals','text':p.text[:160]})
    if config.get('hardware_required', False):
        missing = [k for k in ['items', 'supply_boundary', 'operating_terminals', 'evidence'] if not bom.get(k)]
        missing += ["items."+k for k in ["server","cpu","memory","storage","network","power","os","database"] if not bom.get("items",{}).get(k)]
        if not bom.get('approved') or missing or bom.get('unresolved'):
            errors.append({'code': 'bom_preflight', 'missing': missing, 'unresolved': bom.get('unresolved', [])})
        for title in ['对项目的理解', '系统技术方案', '功能设计方案', '本项目硬件配置与供货边界']:
            if title not in whole:errors.append({'code': 'missing_hardware_skeleton', 'title': title})
    for row in config.get('goods_records', []):
        if not row.get('included', True):continue
        for key, value in row.items():
            if re.search(r'是否|编码|电压|采购申请|租赁', key) and str(value).strip():
                if key not in whole or str(value) not in whole:
                    errors.append({'code': 'goods_special_field', 'project': row.get('项目名称'), 'field': key, 'value': value})
    warranty = str(config.get('warranty_years', ''))
    terms = re.findall(r'(?:质保|保修)[^。；\n]{0,18}?([一二三四五六七八九十\d]+)年', whole)
    terms += re.findall(r'([一二三四五六七八九十\d]+)年(?:免费)?(?:质保|保修)',whole)
    canonical = {'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'}
    years = set(canonical.get(t,t) for t in terms)
    if not warranty or years != {warranty}:errors.append({'code': 'warranty_not_unique', 'observed': sorted(years), 'expected': warranty})
    if re.search(r'质保.{0,15}(需确认|暂按)|需确认.{0,15}质保', whole):errors.append({'code': 'unresolved_warranty'})
    in_special = False;responses = []
    for p in d.paragraphs:
        if '专用技术规范应答' in p.text:in_special = True;continue
        if in_special and p.style.name in ['Heading 1', 'Heading 2', 'Heading 3']:in_special = False
        if in_special and p.text.startswith('【应答'):
            response = re.sub(r'【索引[^】]*】', '', p.text)
            responses.append(response)
            if not re.search(r'\d+\.\d+\.\d+',p.text):errors.append({'code': 'imprecise_special_index', 'text': p.text[:120]})
    repeated = [x for x,n in Counter(responses).items() if n>1]
    if repeated:errors.append({'code': 'duplicate_special_answer', 'answers': repeated})
    for ti, table in enumerate(d.tables):
        if '投标人响应值' not in text(table._tbl):continue
        vals = [row.cells[-1].text.strip() for row in table.rows[1:]]
        if vals and all(v.startswith('详见') for v in vals):errors.append({'code': 'all_see_elsewhere', 'table':ti})
    for title in config.get('scoring_sections', []):
        found = False
        for p in d.paragraphs:
            if p.text.strip() == title:
                e = p._p.getnext()
                while e is not None and e.tag == qn('w:p') and not text(e).strip():e=e.getnext()
                if e is not None and e.tag == qn('w:tbl'):found = True
        if not found:errors.append({'code': 'missing_scoring_index', 'title':title})
    return {'blacklist': black, 'errors': errors, 'docx_sha256': digest(input_path)}


def audit_render(pdf_path, figures=None, expected_tables=None):
    import pdfplumber
    errors, image_boxes, words_by_page, table_pages = [], [], [], []
    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages,1):
            words=page.extract_words();words_by_page.append(words)
            body_words=[w for w in words if w["bottom"]>60 and w["top"]<page.height-60]
            body_images=[im for im in page.images if im["bottom"]>60 and im["top"]<page.height-60]
            if not body_words and not body_images:errors.append({'code':'blank_page','page':page_no})
            # Every real ruled table boundary is tested against header text positions.
            tables=page.find_tables();ruled_tables=list(tables)
            # Three-line tables have no vertical rules; text-aligned columns still form a real table.
            tables += page.find_tables({"vertical_strategy":"text","horizontal_strategy":"lines","min_words_vertical":1})
            table_pages.append(tables)
            seen_header_boxes=set()
            for table in tables:
                cells=table.cells if expected_tables is not None else (table.rows[0].cells if table.rows else [])
                for cell in cells:
                    if not cell or tuple(cell) in seen_header_boxes:continue
                    seen_header_boxes.add(tuple(cell));lines=defaultdict(list)
                    for word in words:
                        if cell[0]-1<=word['x0']<cell[2] and cell[1]-1<=word['top']<cell[3]:
                            lines[round(word['top'])].append(word['text'])
                    values=[''.join(v) for v in lines.values()]
                    known_header=expected_tables is None or re.sub(r'\s+','',''.join(values)) in expected_tables
                    if known_header and len(values)>1 and any(re.fullmatch(r'[\u4e00-\u9fff]',v) for v in values):
                        errors.append({'code':'single_character_header_wrap','page':page_no,'text':'/'.join(values)})
            # Three-line tables can be over-segmented by text-aligned pseudo-columns.
            # Independently join vertically aligned fragments against real DOCX header labels.
            if expected_tables:
                starts=defaultdict(list);aligned=defaultdict(list)
                for word in words:
                    if word['text']:starts[word['text'][0]].append(word)
                    aligned[round(word['x0'])].append(word)
                for label in expected_tables:
                    if not re.fullmatch(r'[\u4e00-\u9fff、，/（）()]{2,24}',label):continue
                    for first in starts.get(label[0],[]):
                        if first['text']==label or not label.startswith(first['text']):continue
                        fragments=[first['text']];last=first['top']
                        near=sorted([w for x in range(round(first['x0'])-2,round(first['x0'])+3) for w in aligned.get(x,[])],key=lambda w:w['top'])
                        for nxt in near:
                            if abs(nxt['x0']-first['x0'])>2 or not 3<nxt['top']-last<36:continue
                            candidate=''.join(fragments)+nxt['text']
                            if not label.startswith(candidate):continue
                            fragments.append(nxt['text']);last=nxt['top']
                            if candidate==label:
                                if any(re.fullmatch(r'[\u4e00-\u9fff]',v) for v in fragments):
                                    errors.append({'code':'single_character_header_wrap','page':page_no,'text':'/'.join(fragments)})
                                break
            for im in sorted(page.images,key=lambda x:(x['top'],x['x0'])):
                preceding=[w['bottom'] for w in words if w['bottom']<=im['top']+1 and w['bottom']>55]
                preceding += [other['bottom'] for other in page.images if other is not im and other['bottom']<=im['top']+1]
                preceding += [t.bbox[3] for t in tables if t.bbox[3]<=im['top']+1]
                previous=max(preceding,default=60)
                gap=max(0,im['top']-previous)/max(1,page.height-120)
                image_boxes.append({'page':page_no,'x0':im['x0'],'top':im['top'],'width_cm':im['width']*2.54/72,
                                    'height_cm':im['height']*2.54/72,'pre_image_whitespace_ratio':gap})
        # Format caption + project metadata are a title-table block; carrying them over must include a table row.
        for i, words in enumerate(words_by_page[:-1]):
            value=''.join(w['text'] for w in words)
            if ('（格式）' in value or '(格式)' in value) and '项目名称' in value and not table_pages[i] and table_pages[i+1]:
                errors.append({'code':'title_table_split','page':i+1,'table_page':i+2})
    records = deepcopy(figures.get('figures',[])) if figures else []
    if figures and len(records)!=len(image_boxes):errors.append({'code':'figure_render_mapping','expected':len(records),'actual':len(image_boxes)})
    if len(records)==len(image_boxes):
        groups=defaultdict(list)
        for rec,box in zip(records,image_boxes):
            rec.update(box);rec['rendered_width_cm']=box['width_cm']
            if rec['kind'] in ('模块功能','弹窗'):groups[rec['section']].append(rec)
        for values in groups.values():
            median=sorted(x['width_cm'] for x in values)[len(values)//2]
            for rec in values:
                rec['width_deviation']=abs(rec['width_cm']-median)/median
                if rec['width_deviation']>.05:errors.append({'code':'figure_width_deviation','id':rec['id'],'deviation':rec['width_deviation']})
                if rec['pre_image_whitespace_ratio']>.30:errors.append({'code':'figure_preceding_whitespace','id':rec['id'],'page':rec['page'],'ratio':rec['pre_image_whitespace_ratio']})
                if rec['width_cm']>14.25 or rec['height_cm']>7.45:errors.append({'code':'figure_bounding_box','id':rec['id']})
    return {'pages':len(words_by_page),'errors':errors,'figures':records,'image_boxes':image_boxes}


def audit(input_path,config,report_path,pdf=None,images=None):
    result=audit_docx(input_path,config)
    figure_report=json.loads(Path(images).read_text()) if images else None
    if figure_report:
        result['errors'] += figure_report.get('errors',[])
        if figure_report.get('docx_sha256')!=digest(input_path):result['errors'].append({'code':'stale_figure_manifest'})
        d=Document(input_path)
        for rec in figure_report.get('figures',[]):
            rel=d.part.rels.get(rec['relationship_id'])
            if not rel or sha256(rel.target_part.blob).hexdigest()!=rec['sha256']:
                result['errors'].append({'code':'figure_hash_mismatch','id':rec['id']})
    elif config.get('require_image_audit',True):result['errors'].append({'code':'missing_image_audit'})
    if pdf:
        result['pdf_sha256']=digest(pdf)
        document=Document(input_path);header_labels=set()
        for table in document.tables:
            for ri,row in enumerate(table.rows[:4]):
                if ri==0 or any(c.text.strip()=="序号" for c in row.cells):
                    header_labels.update(re.sub(r"\s+","",c.text) for c in row.cells if not re.match(r"\s*项目(?:名称|单位)\s*[：:]",c.text))
        result['render']=audit_render(pdf,figure_report,header_labels)
        result['errors']+=result['render']['errors']
    else:result['errors'].append({'code':'missing_render_audit'})
    result['status']='failed' if result['errors'] else 'passed'
    if figure_report and pdf:
        figure_report["figures"]=result["render"]["figures"]
        figure_report["status"]=result["status"]
        figure_report["render_errors"]=result["render"]["errors"]
        write_json(images,figure_report)
    write_json(report_path,result);return result


def run(args):
    from bid_images import apply
    config=json.loads(Path(args.config).read_text());work=Path(args.work_dir);work.mkdir(parents=True,exist_ok=True)
    source=Path(args.input)
    preflight=audit_docx(source,config)
    blocked=[e for e in preflight['errors'] if e['code']=='bom_preflight']
    if blocked:
        write_json(work/'gate.json',{'status':'failed','stage':'hardware_preflight','errors':blocked,'blacklist':preflight['blacklist']})
        return 2
    # The candidate remains reviewable even when a semantic preflight blocks final acceptance.
    repair(source,work/'clean.docx',work/'repair.json')
    apply(work/'clean.docx',work/'candidate.docx',work/'images.json',config.get('image_policy',{}),work/'figures')
    for attempt in range(1,args.max_attempts+1):
        render_dir=work/f'render-{attempt}'
        completed=subprocess.run([sys.executable,args.renderer,str(work/'candidate.docx'),'--output_dir',str(render_dir),'--emit_pdf','--dpi','100'],check=False)
        pdf=render_dir/'candidate.pdf'
        if completed.returncode or not pdf.exists():
            write_json(work/'gate.json',{'status':'failed','errors':[{'code':'render_failed','returncode':completed.returncode}]});return 2
        result=audit(work/'candidate.docx',config,work/'gate.json',pdf,work/'images.json')
        if result['status']=='passed':
            shutil.copy2(work/'candidate.docx',args.output)
            shutil.copy2(pdf,Path(args.output).with_suffix(".pdf"))
            return 0
        fixable={'blank_page','title_table_split','single_character_header_wrap','nonfirst_header','table_keep_next','ghost_column','table_grid_mismatch','cell_width_mismatch','row_omission_width_mismatch'}
        if not all(e['code'] in fixable for e in result['errors']) or attempt==args.max_attempts:break
        repair(work/'candidate.docx',work/'retry.docx',work/f'repair-{attempt}.json')
        shutil.move(work/'retry.docx',work/'candidate.docx')
        manifest=json.loads((work/'images.json').read_text());manifest['docx_sha256']=digest(work/'candidate.docx');write_json(work/'images.json',manifest)
    # Never promote a failing candidate to the requested deliverable or lower thresholds to get green.
    return 2


def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='mode',required=True)
    for mode in ['repair','audit','run']:
        s=sub.add_parser(mode);s.add_argument('input');s.add_argument('--output',required=mode!='audit')
        s.add_argument('--report',required=mode in ['audit','repair']);s.add_argument('--config',required=mode!='repair')
        if mode=='audit':s.add_argument('--pdf');s.add_argument('--images')
        if mode=='run':s.add_argument('--work-dir',required=True);s.add_argument('--renderer',required=True);s.add_argument('--max-attempts',type=int,choices=[1,2,3],default=3)
    a=p.parse_args()
    if a.mode=='repair':repair(a.input,a.output,a.report);return 0
    if a.mode=='run':return run(a)
    result=audit(a.input,json.loads(Path(a.config).read_text()),a.report,a.pdf,a.images)
    print(json.dumps({'status':result['status'],'errors':result['errors']},ensure_ascii=False));return 2 if result['errors'] else 0


if __name__=='__main__':
    raise SystemExit(main())
