"""Synthetic regression cases; no customer workbooks are included."""
import tempfile
import unittest
from pathlib import Path
import openpyxl
from build_delivery_details import build, ENV_COLUMNS
from render_delivery_panel import enrich

class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.tracking=self.root/'progress.xlsx';self.inventory=self.root/'inventory.xlsx'
        self.write(self.tracking,'进度跟踪表',['地区','客户','交付阶段','交付状态'],[
            ['甲省','省调+乙地调','4.汇报与验收','暂停'],['甲省','丙地调','1.项目启动',None]])
        self.env_headers=['交付项目（客户）',*ENV_COLUMNS.values()]
        self.env_rows=[['甲省省调','云','三(主)','v1','系统甲',None,'R1','DB-A',None,'2026-09-06'],
                       ['甲省-乙地调','物理机','二(主)','v2','系统乙','已下架','R2','DB-B',None,'2026-08-20']]
        self.save_env()
    def tearDown(self):self.tmp.cleanup()
    def write(self,path,sheet,headers,rows):
        w=openpyxl.Workbook();s=w.active;s.title=sheet;s.append(headers)
        for row in rows:s.append(row)
        w.save(path)
    def save_env(self):self.write(self.inventory,'集管信息一览表',self.env_headers,self.env_rows)
    def test_join_and_missing(self):
        d=build(self.tracking,self.inventory,'2026-08')
        self.assertEqual((d['projectCount'],d['siteCount'],d['completeCoreCount']),(2,3,2))
        self.assertEqual([r['database'] for r in d['records']],['DB-A','DB-B',None])
        self.assertEqual(d['inventoryLatestUpdate'],'2026-09-06')
        self.assertEqual(d['missingInventory'],['甲省丙地调'])
        self.assertIn('待确认',d['records'][1]['notes'][-1])
        self.assertEqual(d,build(self.tracking,self.inventory,'2026-08'))
    def test_duplicate_fails(self):
        self.env_rows.append(self.env_rows[0]);self.save_env()
        with self.assertRaisesRegex(ValueError,'重复环境'):build(self.tracking,self.inventory,'2026-08')
    def test_unmatched_fails(self):
        self.env_rows[0][0]='未知交付点';self.save_env()
        with self.assertRaisesRegex(ValueError,'未匹配'):build(self.tracking,self.inventory,'2026-08')
    def test_header_order(self):
        self.write(self.inventory,'集管信息一览表',list(reversed(self.env_headers)),[list(reversed(r)) for r in self.env_rows])
        self.assertEqual(build(self.tracking,self.inventory,'2026-08')['records'][0]['database'],'DB-A')
    def test_injection_and_repeat(self):
        d=build(self.tracking,self.inventory,'2026-08');d['records'][0]['version']='</script><script>alert(1)</script>'
        base='<html><head><script>const example="</body>";</script></head><body><div class="three-col"></div><div class="notes-section"></div></body></html>'
        out=enrich(base,d)
        self.assertIn('const example="</body>";',out)
        self.assertEqual(out.count('id="delivery-data"'),1)
        self.assertNotIn('</script><script>alert(1)',out)
        self.assertEqual(enrich(out,d),out)

if __name__=='__main__':unittest.main()
