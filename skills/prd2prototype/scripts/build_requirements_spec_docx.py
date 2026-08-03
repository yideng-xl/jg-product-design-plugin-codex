#!/usr/bin/env python3
"""Create a self-contained R&D requirements specification DOCX from JSON.

Usage:
    python build_requirements_spec_docx.py input.json output.docx

Expected JSON shape:
{
  "title": "产品 V1.0-主题",
  "document_info": {
    "产品经理": "",
    "交互设计师": "",
    "研发经理": "",
    "产品名称": ""
  },
  "version_records": [
    {"版本号": "v0.1", "修改人": "", "修改内容": "初稿", "修改时间": ""}
  ],
  "overview": {
    "需求背景": ["段落 1", "段落 2"],
    "功能目标": ["问题与来源：...", "客户诉求：...", "我们的解决思路：..."],
    "迭代版本": "产品 V1.0"
  },
  "business_rules": {
    "业务流程图": ["流程描述或 Mermaid 文本"],
    "业务规则梳理": ["规则 1", "规则 2"]
  },
  "function_permission": ["..."],
  "data_permission": ["..."],
  "functions": [
    {
      "功能编号": "01", "功能名称": "...", "功能说明": "...", "前置条件": "...",
      "操作流程": "...", "功能逻辑": "...", "交互逻辑": "...", "注意事项": "..."
    }
  ],
  "nonfunctional": {
    "性能需求": ["..."], "安全需求": ["..."], "易用性需求": ["..."],
    "可靠性需求": ["..."], "其他说明": ["..."]
  }
}
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


FONT_MAC = "Songti SC"
FONT_EAST_ASIA = "宋体"
BODY_SIZE = Pt(10.5)
FUNCTION_FIELDS = (
    "功能编号",
    "功能名称",
    "功能说明",
    "前置条件",
    "操作流程",
    "功能逻辑",
    "交互逻辑",
    "注意事项",
)


def set_run_font(run, size: Pt | None = None, bold: bool | None = None) -> None:
    run.font.name = FONT_MAC
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT_EAST_ASIA)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), FONT_MAC)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), FONT_MAC)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:cs"), FONT_MAC)
    run.font.color.rgb = RGBColor(0, 0, 0)
    if size is not None:
        run.font.size = size
    if bold is not None:
        run.bold = bold


def set_style_font(style, size: Pt, bold: bool | None = None) -> None:
    style.font.name = FONT_MAC
    style.font.size = size
    style.font.color.rgb = RGBColor(0, 0, 0)
    if bold is not None:
        style.font.bold = bold
    rpr = style._element.get_or_add_rPr()
    fonts = rpr.get_or_add_rFonts()
    fonts.set(qn("w:ascii"), FONT_MAC)
    fonts.set(qn("w:hAnsi"), FONT_MAC)
    fonts.set(qn("w:eastAsia"), FONT_EAST_ASIA)
    fonts.set(qn("w:cs"), FONT_MAC)


def set_document_defaults(document: Document) -> None:
    styles = document.styles.element
    doc_defaults = styles.find(qn("w:docDefaults"))
    if doc_defaults is None:
        doc_defaults = OxmlElement("w:docDefaults")
        styles.insert(0, doc_defaults)
    rpr_default = doc_defaults.find(qn("w:rPrDefault"))
    if rpr_default is None:
        rpr_default = OxmlElement("w:rPrDefault")
        doc_defaults.append(rpr_default)
    rpr = rpr_default.find(qn("w:rPr"))
    if rpr is None:
        rpr = OxmlElement("w:rPr")
        rpr_default.append(rpr)
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.insert(0, fonts)
    fonts.set(qn("w:ascii"), FONT_MAC)
    fonts.set(qn("w:hAnsi"), FONT_MAC)
    fonts.set(qn("w:eastAsia"), FONT_EAST_ASIA)
    fonts.set(qn("w:cs"), FONT_MAC)


def add_text_paragraph(document: Document, text: str, bold: bool = False):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1
    run = paragraph.add_run(str(text))
    set_run_font(run, BODY_SIZE, bold)
    return paragraph


def add_labeled_section(document: Document, label: str, values) -> None:
    add_text_paragraph(document, label, bold=True)
    if isinstance(values, str):
        values = [values]
    for value in values or [""]:
        add_text_paragraph(document, value)


def set_cell_text(cell, text: str, bold: bool = False) -> None:
    cell.text = ""
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1
    parts = str(text).split("\n")
    for index, part in enumerate(parts):
        if index:
            paragraph.add_run().add_break()
        run = paragraph.add_run(part)
        set_run_font(run, BODY_SIZE, bold)


def keep_row_together(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:cantSplit")) is None:
        tr_pr.append(OxmlElement("w:cantSplit"))


def add_visible_blank_line(document: Document) -> None:
    paragraph = document.add_paragraph()
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing = 1
    ppr = paragraph._p.get_or_add_pPr()
    rpr = ppr.find(qn("w:rPr"))
    if rpr is None:
        rpr = OxmlElement("w:rPr")
        ppr.append(rpr)
    fonts = OxmlElement("w:rFonts")
    fonts.set(qn("w:ascii"), FONT_MAC)
    fonts.set(qn("w:hAnsi"), FONT_MAC)
    fonts.set(qn("w:eastAsia"), FONT_EAST_ASIA)
    fonts.set(qn("w:cs"), FONT_MAC)
    rpr.append(fonts)
    size = OxmlElement("w:sz")
    size.set(qn("w:val"), "24")
    rpr.append(size)
    size_cs = OxmlElement("w:szCs")
    size_cs.set(qn("w:val"), "24")
    rpr.append(size_cs)


def add_heading(document: Document, text: str, level: int = 2) -> None:
    paragraph = document.add_paragraph(style=f"Heading {level}")
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(text)
    set_run_font(run, Pt(16) if level == 2 else BODY_SIZE, True)


def build(data: dict, output: Path) -> None:
    document = Document()
    section = document.sections[0]
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(3.17)
    section.right_margin = Cm(3.17)

    set_document_defaults(document)
    set_style_font(document.styles["Normal"], BODY_SIZE)
    set_style_font(document.styles["Heading 2"], Pt(16), True)
    set_style_font(document.styles["Heading 3"], BODY_SIZE, True)

    for title in (data.get("title", ""), "产品需求说明书"):
        paragraph = document.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_after = Pt(12)
        run = paragraph.add_run(title)
        set_run_font(run, Pt(26), True)

    document.add_paragraph()
    add_text_paragraph(document, "文档信息：", bold=True)
    info = data.get("document_info", {})
    info_table = document.add_table(rows=4, cols=2)
    info_table.style = "Table Grid"
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for row, key in zip(info_table.rows, ("产品经理", "交互设计师", "研发经理", "产品名称")):
        set_cell_text(row.cells[0], key)
        set_cell_text(row.cells[1], info.get(key, ""))

    add_visible_blank_line(document)
    add_text_paragraph(document, "版本记录：", bold=True)
    records = data.get("version_records") or [{}]
    version_table = document.add_table(rows=1 + len(records), cols=4)
    version_table.style = "Table Grid"
    version_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    keys = ("版本号", "修改人", "修改内容", "修改时间")
    for index, key in enumerate(keys):
        set_cell_text(version_table.rows[0].cells[index], key, bold=True)
    for row, record in zip(version_table.rows[1:], records):
        for index, key in enumerate(keys):
            set_cell_text(row.cells[index], record.get(key, ""))

    document.add_page_break()
    overview = data.get("overview", {})
    add_heading(document, "一、概述（必填）")
    add_labeled_section(document, "需求背景", overview.get("需求背景", []))
    add_labeled_section(document, "功能目标", overview.get("功能目标", []))
    add_labeled_section(document, "迭代版本", overview.get("迭代版本", ""))

    rules = data.get("business_rules", {})
    add_heading(document, "二、业务规则分析")
    add_labeled_section(document, "业务流程图", rules.get("业务流程图", []))
    add_labeled_section(document, "业务规则梳理", rules.get("业务规则梳理", []))

    add_heading(document, "三、功能权限说明")
    for value in data.get("function_permission") or [""]:
        add_text_paragraph(document, value)
    add_heading(document, "四、数据权限说明")
    for value in data.get("data_permission") or [""]:
        add_text_paragraph(document, value)

    add_heading(document, "五、功能需求（必填）")
    functions = data.get("functions") or []
    if not functions:
        raise ValueError("functions 不能为空")
    for item in functions:
        table = document.add_table(rows=len(FUNCTION_FIELDS), cols=2)
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        for row, key in zip(table.rows, FUNCTION_FIELDS):
            keep_row_together(row)
            row.cells[0].width = Cm(2.2)
            set_cell_text(row.cells[0], key)
            set_cell_text(row.cells[1], item.get(key, ""))
        add_visible_blank_line(document)

    add_heading(document, "六、非功能需求说明")
    nonfunctional = data.get("nonfunctional", {})
    for index, key in enumerate(("性能需求", "安全需求", "易用性需求", "可靠性需求", "其他说明"), start=1):
        add_heading(document, f"7.{index}{key}", level=3)
        for value in nonfunctional.get(key) or [""]:
            add_text_paragraph(document, value)

    output.parent.mkdir(parents=True, exist_ok=True)
    document.save(output)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: build_requirements_spec_docx.py input.json output.docx", file=sys.stderr)
        return 2
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    data = json.loads(input_path.read_text(encoding="utf-8"))
    build(data, output_path)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
