"""Synthetic, observable bid regressions: dirty XML, customer leaks, and UI/evidence images."""
import importlib.util
from io import BytesIO
from pathlib import Path
import sys
import tempfile
import unittest

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches
from PIL import Image, ImageDraw

SCRIPTS = Path(__file__).resolve().parents[1]/'skills/write-technical-bid/scripts'
sys.path.insert(0,str(SCRIPTS))
import bid_gate
import bid_images


class BidGates(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)

    def test_repair_retains_data_removes_ghost_grid_and_nonfirst_headers(self):
        d=Document();t=d.add_table(rows=3,cols=3)
        for g,w in zip(t._tbl.tblGrid,[600,72,2000]):g.set(qn('w:w'),str(w))
        for i,row in enumerate(t.rows):
            row.cells[0].text=str(i);row.cells[2].text=f'不可丢失数据{i}'
            row._tr.get_or_add_trPr().append(OxmlElement('w:tblHeader'))
            for c in row.cells:c.paragraphs[0].paragraph_format.keep_with_next=True
        p=d.add_paragraph();p.add_run().add_break(__import__('docx').enum.text.WD_BREAK.PAGE)
        a=self.root/'a.docx';b=self.root/'b.docx';d.save(a)
        bid_gate.repair(a,b);out=Document(b)
        self.assertEqual(len(out.tables[0].columns),2)
        self.assertEqual(len(out.tables[0]._tbl.xpath('.//w:tblHeader')),1)
        self.assertEqual(out.tables[0]._tbl.xpath('.//w:keepNext'),[])
        self.assertEqual(out.element.xpath('.//w:br[@w:type="page"]'),[])
        for i in range(3):self.assertIn(f'不可丢失数据{i}',bid_gate.text(out.tables[0]._tbl))
        bid_gate.repair(b,self.root/'c.docx')
        self.assertEqual(bid_gate.text(Document(b).element),bid_gate.text(Document(self.root/'c.docx').element))

    def test_dynamic_blacklist_and_bom_fail_without_hardcoded_project(self):
        config={'historical_paths':['/参考/旧城甲/定稿/参考.docx'],
                'goods_records':[{'included':False,'项目名称':'国网旧城乙供电公司工程','包号':'YY200'}],
                'target':{'region':'新地区','project_names':['新地区项目'],'allowed_entities':[]},
                'hardware_required':True,'bom':{'approved':False},'warranty_years':3}
        d=Document();d.add_paragraph('致：旧城甲电力公司；YY200；质保三年')
        a=self.root/'a.docx';d.save(a)
        result=bid_gate.audit_docx(a,config)
        self.assertIn('旧城甲',result['blacklist']);self.assertIn('YY200',result['blacklist'])
        self.assertTrue(any(x['code']=='old_entity' for x in result['errors']))
        self.assertTrue(any(x['code']=='bom_preflight' for x in result['errors']))

    def test_duplicate_special_answers_and_unresolved_guarantee_block(self):
        d=Document();d.add_heading('专用技术规范应答',4)
        d.add_paragraph('【应答：】同一段内容。详见相关章节。')
        d.add_paragraph('【应答：】同一段内容。详见相关章节。')
        d.add_paragraph('售后质保范围仍需确认；接入≥1000台。')
        t=d.add_table(rows=2,cols=2);t.cell(0,0).text='投标人保证值';t.cell(1,1).text='【需确认】型号'
        a=self.root/'a.docx';d.save(a)
        codes={x['code'] for x in bid_gate.audit_docx(a,{'warranty_years':3,'unverified_performance_patterns':[r'≥1000台']})['errors']}
        self.assertTrue({'duplicate_special_answer','imprecise_special_index','unresolved_guarantee','unresolved_commitment','unverified_performance'}.issubset(codes))

    def test_ui_crops_but_evidence_bytes_unchanged_and_widths_match(self):
        ui=Image.new('RGB',(1000,600),'white');dr=ImageDraw.Draw(ui)
        dr.rectangle((0,0,999,29),fill=(0,160,125));dr.rectangle((0,30,134,599),fill=(245,245,245))
        dr.line((135,30,135,599),fill=(140,140,140),width=2);dr.rectangle((170,100,950,500),outline='black')
        proof=Image.new('RGB',(300,450),'white');ImageDraw.Draw(proof).ellipse((80,80,200,200),outline='red',width=4)
        d=Document();d.add_heading('模块甲',4)
        for im in [ui,ui.resize((1000,650)),proof]:
            b=BytesIO();im.save(b,format='PNG');d.add_paragraph().add_run().add_picture(BytesIO(b.getvalue()),width=Inches(5))
        a=self.root/'a.docx';b=self.root/'b.docx';d.save(a)
        result=bid_images.apply(a,b,self.root/'images.json')
        self.assertEqual(result['errors'],[])
        uis=[r for r in result['figures'] if r['kind'] in ('模块功能','弹窗')]
        self.assertEqual(len(uis),2)
        self.assertAlmostEqual(uis[0]['display_width_cm'],uis[1]['display_width_cm'])
        self.assertTrue(all(not r['residual_menu'] for r in uis))
        rec=result['figures'][-1];self.assertEqual(rec['kind'],'非界面')
        self.assertEqual(rec['sha256'],rec['original_sha256'])
        self.assertTrue(all(r['display_height_cm']<=7.4 for r in uis))


    def test_plain_text_reference_index_cannot_pass_as_live_field(self):
        d=Document();d.add_paragraph("【索引：2.6.1.4 硬件配置】")
        a=self.root/"a.docx";d.save(a)
        codes={e["code"] for e in bid_gate.audit_docx(a,{"warranty_years":3,"require_ref_indexes":True})["errors"]}
        self.assertIn("invalid_reference_index",codes)

    def test_green_workflow_inside_dialog_is_not_navigation(self):
        im=Image.new("RGB",(900,600),"white");dr=ImageDraw.Draw(im)
        dr.line((140,65,750,65),fill=(0,160,125),width=3)
        self.assertIsNone(bid_images.green_band(im))
        dr.rectangle((0,0,400,32),fill=(0,160,125))
        self.assertEqual(bid_images.green_band(im),(0,33))

    def test_render_blank_and_title_split_fail_but_three_line_table_is_recognized(self):
        from reportlab.pdfgen import canvas
        a=self.root/"blank.pdf";c=canvas.Canvas(str(a));c.showPage();c.save()
        self.assertIn("blank_page",{e["code"] for e in bid_gate.audit_render(a)["errors"]})
        a=self.root/"three-lines.pdf";c=canvas.Canvas(str(a))
        for y in [700,675,650]:c.line(70,y,500,y)
        for y in [685,660]:
            for x in [80,200,350]:c.drawString(x,y,"Table value")
        c.showPage();c.save()
        self.assertFalse(bid_gate.audit_render(a)["errors"])


    def test_omitted_ghost_slots_and_merged_widths_are_repaired(self):
        for leading in [False,True]:
            d=Document();t=d.add_table(rows=2,cols=3)
            for g,w in zip(t._tbl.tblGrid,[72,1500,2000] if leading else [1500,2000,72]):g.set(qn('w:w'),str(w))
            t.cell(0,1 if leading else 0).text='真实数据'
            tr=t.rows[1]._tr
            for tc in list(tr.tc_lst)[1:]:tr.remove(tc)
            tc=tr.tc_lst[0];tc.grid_span=2
            from docx.table import _Cell
            _Cell(tc,t).text='编制说明应横跨有效网格宽度'
            for name,value in [('gridBefore' if leading else 'gridAfter',1),('wBefore' if leading else 'wAfter',72)]:
                e=OxmlElement('w:'+name);e.set(qn('w:val' if name.startswith('grid') else 'w:w'),str(value));tr.get_or_add_trPr().append(e)
            a=self.root/f'{leading}.docx';b=self.root/f'{leading}-clean.docx';d.save(a)
            self.assertIn('cell_width_mismatch',{e['code'] for e in bid_gate.audit_docx(a,{'warranty_years':3})['errors']})
            bid_gate.repair(a,b);fixed=Document(b).tables[0]
            self.assertFalse(fixed._tbl.xpath('.//w:gridAfter|.//w:gridBefore|.//w:wAfter|.//w:wBefore'))
            total=sum(int(g.get(qn('w:w'))) for g in fixed._tbl.tblGrid)
            self.assertEqual(fixed.rows[1]._tr.tc_lst[0].width,total*635)
            self.assertIn('编制说明',bid_gate.text(fixed._tbl))
            self.assertFalse({'table_grid_mismatch','cell_width_mismatch'}&{e['code'] for e in bid_gate.audit_docx(b,{'warranty_years':3})['errors']})

    def test_invalid_omission_markdown_and_terminal_claims_block(self):
        d=Document();t=d.add_table(rows=2,cols=3)
        t.cell(0,0).text='设备结构';t.cell(0,1).text='一体式（带四个操作终端）';t.cell(0,2).text='采用机箱'
        e=OxmlElement('w:gridAfter');e.set(qn('w:val'),'1');t.rows[1]._tr.get_or_add_trPr().append(e)
        d.add_paragraph('报告编号 `REPORT-X`');d.add_paragraph('- 测试结论');d.add_paragraph('装置带四个操作终端。')
        d.add_table(rows=1,cols=1).cell(0,0).text='技术规范或评分要求标题'
        a=self.root/'a.docx';d.save(a);cfg={'warranty_years':3,'bom':{'operating_terminals':'弱化默认满足'}}
        codes={e['code'] for e in bid_gate.audit_docx(a,cfg)['errors']}
        self.assertTrue({'table_grid_mismatch','markdown_residue','operating_terminals','plain_scoring_index'}<=codes)
        t.cell(0,2).text='默认满足，采用一体式结构。'
        for p in list(d.paragraphs):p._p.getparent().remove(p._p)
        d.save(a)
        self.assertNotIn('operating_terminals',{e['code'] for e in bid_gate.audit_docx(a,cfg)['errors']})

    def test_gray_drawer_sidebar_is_detected_without_green(self):
        im=Image.new('RGB',(900,600),(120,120,120));ImageDraw.Draw(im).rectangle((180,0,899,599),fill='white')
        self.assertIn('gray_sidebar_or_menu_context',bid_images.menu_residual(im))
        ImageDraw.Draw(im).rectangle((190,5,450,24),fill='black')
        self.assertEqual(bid_images.gray_sidebar_boundary(im),180)
        self.assertEqual(bid_images.menu_residual(im.crop((180,0,900,600))),[])
        im=Image.new('RGB',(900,600),(120,120,120));ImageDraw.Draw(im).rectangle((200,100,700,500),fill='white')
        self.assertEqual(bid_images.menu_residual(im),[])

    def test_protected_scan_classification_cannot_be_overridden_to_crop(self):
        d=Document();im=Image.new('RGB',(600,400),'white');ImageDraw.Draw(im).rectangle((0,0,599,25),fill=(0,160,125))
        b=BytesIO();im.save(b,format='PNG');d.add_picture(BytesIO(b.getvalue()))
        a=self.root/'a.docx';d.save(a)
        result=bid_images.apply(a,self.root/'b.docx',self.root/'images.json',{'figures':{'#001':{'kind':'模块功能','document_type':'合同扫描件'}}})
        self.assertIn('protected_document_crop',{e['code'] for e in result['errors']})

    def test_drawer_keeps_title_and_bottom_actions_without_sidebar(self):
        im=Image.new('RGB',(1000,600),(120,120,120));dr=ImageDraw.Draw(im)
        dr.rectangle((0,0,399,30),fill=(0,160,125));dr.rectangle((400,0,999,599),fill='white')
        dr.rectangle((410,5,650,25),fill='black');dr.rectangle((850,575,980,595),fill=(0,160,125))
        d=Document();b=BytesIO();im.save(b,format='PNG');d.add_picture(BytesIO(b.getvalue()))
        a=self.root/'a.docx';d.save(a);result=bid_images.apply(a,self.root/'b.docx',self.root/'images.json')
        rec=result['figures'][0]
        self.assertEqual(rec['crop_box'],(400,0,1000,600))
        self.assertFalse(rec['residual_menu']);self.assertEqual(result['errors'],[])

    def test_stacked_images_are_not_counted_as_whitespace(self):
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
        a=self.root/'stacked.pdf';c=canvas.Canvas(str(a));picture=ImageReader(Image.new('RGB',(100,100),'blue'))
        c.drawImage(picture,80,500,width=100,height=200);c.drawImage(picture,80,285,width=100,height=200);c.showPage();c.save()
        self.assertLess(bid_gate.audit_render(a)['image_boxes'][1]['pre_image_whitespace_ratio'],.03)

    def test_three_line_header_orphan_is_a_hard_failure(self):
        from reportlab.pdfgen import canvas
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
        pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
        a=self.root/'header.pdf';c=canvas.Canvas(str(a));c.setFont('STSong-Light',11)
        for y in [700,650,620]:c.line(70,y,500,y)
        c.drawString(80,680,'元件名');c.drawString(80,665,'称');c.drawString(250,680,'参数')
        c.drawString(80,630,'模块');c.drawString(250,630,'内容');c.showPage();c.save()
        codes={e['code'] for e in bid_gate.audit_render(a,expected_tables={'元件名称','参数'})['errors']}
        self.assertIn('single_character_header_wrap',codes)


if __name__=='__main__':unittest.main()
