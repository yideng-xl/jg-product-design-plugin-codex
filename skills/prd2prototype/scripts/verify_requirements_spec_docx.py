#!/usr/bin/env python3
"""Verify the self-contained R&D requirements specification DOCX contract."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
SONGTI = {"宋体", "SimSun", "Songti SC", "STSong"}
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


def text(element) -> str:
    return "".join(node.text or "" for node in element.iter(f"{W}t"))


def attr(element, name: str):
    return element.get(f"{W}{name}") if element is not None else None


def verify(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return [f"文件不存在：{path}"]
    try:
        package = zipfile.ZipFile(path)
    except zipfile.BadZipFile:
        return ["文件不是有效的 DOCX/ZIP 包"]

    with package:
        names = set(package.namelist())
        for required in ("word/document.xml", "word/styles.xml"):
            if required not in names:
                errors.append(f"缺少 {required}")
        if errors:
            return errors
        document = ET.fromstring(package.read("word/document.xml"))
        styles = ET.fromstring(package.read("word/styles.xml"))

    defaults = styles.find(f"{W}docDefaults/{W}rPrDefault/{W}rPr/{W}rFonts")
    if defaults is None:
        errors.append("styles.xml 未设置默认字体")
    else:
        for key in ("ascii", "hAnsi", "eastAsia", "cs"):
            if attr(defaults, key) not in SONGTI:
                errors.append(f"默认字体 {key} 不是宋体：{attr(defaults, key)!r}")

    body = document.find(f"{W}body")
    if body is None:
        return errors + ["document.xml 缺少正文 body"]
    children = list(body)
    function_tables = []
    expected_index = 0
    for index, element in enumerate(children):
        if element.tag != f"{W}tbl":
            continue
        rows = element.findall(f"{W}tr")
        if not rows:
            continue
        first_cells = rows[0].findall(f"{W}tc")
        if not first_cells or text(first_cells[0]).strip() != "功能编号":
            continue
        function_tables.append(element)
        labels = []
        for row in rows:
            cells = row.findall(f"{W}tc")
            labels.append(text(cells[0]).strip() if cells else "")
        if tuple(labels) != FUNCTION_FIELDS:
            errors.append(f"第 {len(function_tables)} 张功能表字段不符合固定 8 行：{labels}")
        if index + 1 >= len(children) or children[index + 1].tag != f"{W}p":
            errors.append(f"第 {len(function_tables)} 张功能表后没有紧邻空段落")
            continue
        spacer = children[index + 1]
        if text(spacer).strip():
            errors.append(f"第 {len(function_tables)} 张功能表后的段落不是空行")
        if spacer.find(f".//{W}vanish") is not None:
            errors.append(f"第 {len(function_tables)} 张功能表后的空行带隐藏属性")
        spacing = spacer.find(f"{W}pPr/{W}spacing")
        if spacing is not None and (attr(spacing, "before") not in (None, "0") or attr(spacing, "after") not in (None, "0")):
            errors.append(f"第 {len(function_tables)} 张功能表后的空行段前/段后不是 0")
        if spacing is not None and attr(spacing, "line") not in (None, "240"):
            errors.append(f"第 {len(function_tables)} 张功能表后的空行不是 12 pt 单倍行高")
        size = spacer.find(f"{W}pPr/{W}rPr/{W}sz")
        if size is None or attr(size, "val") != "24":
            errors.append(f"第 {len(function_tables)} 张功能表后的空行字号不是 12 pt")

    if not function_tables:
        errors.append("未找到以“功能编号”开头的功能表")
    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: verify_requirements_spec_docx.py output.docx", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    errors = verify(path)
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1
    print(f"PASS: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
