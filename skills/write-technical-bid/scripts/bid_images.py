#!/usr/bin/env python3
"""Classify DOCX figures, crop UI chrome, and preserve evidence illustrations.

Usage: bid_images.py INPUT.docx --output OUTPUT.docx --report images.json
       [--policy migration.json] [--assets-dir figures]
Dependencies: python-docx, Pillow, numpy. No network or external OCR is used.
"""
import argparse
from collections import defaultdict
from copy import deepcopy
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import statistics

import numpy as np
from PIL import Image, ImageOps
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

KINDS = ('总体介绍', '模块功能', '弹窗', '非界面')


def fingerprint(blob):
    return sha256(blob).hexdigest()


def green_band(im):
    """Return top navigation band only for a wide, near-edge saturated strip."""
    a = np.asarray(im.convert('RGB'), dtype=np.float32)
    g = (a[:, :, 1] > a[:, :, 0] * 1.25 + 10) & (a[:, :, 2] > a[:, :, 0] * 1.05 + 5)
    g &= (a[:, :, 1] > 35) & (a[:, :, 0] < 180)
    rows=[]
    for y,row in enumerate(g[:max(2,int(im.height*.12))]):
        # Separate architecture boxes do not form a continuous navigation strip.
        edges=np.diff(np.r_[False,row,False].astype(np.int8));starts=np.where(edges==1)[0];ends=np.where(edges==-1)[0]
        longest=max(ends-starts,default=0)
        if row.mean()>.22 and longest/im.width>.22:rows.append(y)
    if len(rows)<2 or rows[0]>im.height*.025:
        return None
    end=rows[0]
    for y in rows[1:]:
        if y-end>max(3,im.height*.025):break
        end=y
    return (int(rows[0]),int(end)+1)


def classify(im):
    band = green_band(im)
    if not band:
        return '非界面', {'top_band': None}
    a = np.asarray(im.convert('RGB'), dtype=np.int16)
    low, high = a.min(axis=2), a.max(axis=2)
    neutral = ((high - low) < 18) & (low > 45) & (high < 210)
    white = low > 235
    modal = float(neutral.mean()) > .18 and float(white.mean()) > .08
    return ('弹窗' if modal else '模块功能'), {'top_band': band,
            'neutral_ratio': float(neutral.mean()), 'white_ratio': float(white.mean())}


def detect_crop(im, override=None):
    if override:
        box = tuple(int(v) for v in override)
        if len(box) != 4 or not (0 <= box[0] < box[2] <= im.width and 0 <= box[1] < box[3] <= im.height):
            raise ValueError('裁剪矩形超出原图')
        return box, 'explicit'
    band = green_band(im)
    if not band:
        raise ValueError('未找到界面顶栏；请先核实分类或提供裁剪矩形')
    # Locate the persistent sidebar boundary. A ratio fallback is explicit in the manifest.
    a = np.asarray(im.convert('RGB'), dtype=np.float32)
    top = min(im.height - 2, max(band[1], int(im.height * .075)))
    bottom = max(top + 1, int(im.height * .955))
    profile = np.abs(np.diff(a[top:bottom], axis=1)).mean(axis=(0, 2))
    lo, hi = int(im.width * .06), int(im.width * .20)
    stability=a[top:bottom].std(axis=0).mean(axis=1)
    candidates=[x for x in range(lo,hi) if profile[x]>2.0 and min(stability[x],stability[x+1])<8]
    best=candidates[0] if candidates else int(im.width*.10)
    if candidates:
        best=max(x for x in candidates if x<=best+12)
    method = 'vertical-divider'
    if not candidates:
        method = 'ratio-0.10'
    # Keep the entire functional viewport for modals, including its grey context.
    # No tight dialog crop or artificial font enlargement is performed.
    return (best + 2, top, im.width, bottom), method


def crop_ui(im, box, mask=None):
    # A single pixel border is part of the output; no resizing or pixel distortion.
    result=im.convert('RGB').crop(box)
    if mask:
        from PIL import ImageDraw
        fill=im.convert('RGB').getpixel((box[0]+2,min(im.height-1,mask[3]+40)))
        ImageDraw.Draw(result).rectangle(mask,fill=fill)
    return ImageOps.expand(result, border=1, fill='#D9D9D9')


def gray_sidebar_boundary(im):
    """Segment a full-height grey strip beside a white workspace/right drawer.

    A centred modal has grey context on both sides and does not satisfy the
    white-to-right-edge condition. No OCR or product-specific keywords are used.
    """
    a=np.asarray(im.convert('RGB'),dtype=np.float32)
    if im.width<30 or im.height<30:return None
    white=(a.min(axis=2)>232).mean(axis=0)>.85
    region=a[int(im.height*.12):int(im.height*.9)]
    neutral=((region.max(axis=2)-region.min(axis=2)<22)&(region.mean(axis=2)>45)&(region.mean(axis=2)<225)).mean(axis=0)
    prefix=np.cumsum(neutral);white_suffix=np.cumsum(white[::-1])[::-1]
    lo,hi=int(im.width*.04),int(im.width*.85)
    for x in range(lo,hi):
        if not white[x] or white_suffix[x]/(im.width-x)<.86:continue
        limit=max(1,x-2)
        if prefix[limit-1]/limit>.60:return x
    return None


def menu_residual(im, box=None):
    reasons = []
    if green_band(im):
        reasons.append('top_navigation_band')
    if gray_sidebar_boundary(im) is not None:
        reasons.append('gray_sidebar_or_menu_context')
    # Check a specified original sidebar boundary, not arbitrary text on a form.
    if box and box[0] < im.width * .06:
        reasons.append('sidebar_not_removed')
    return reasons


def apply(input_path, output_path, report_path, policy=None, assets_dir=None):
    policy = policy or {}
    if Path(input_path).resolve() == Path(output_path).resolve():
        raise ValueError('输入与输出必须不同；保留可恢复原稿')
    d = Document(input_path)
    assets = Path(assets_dir or Path(report_path).with_suffix(''))
    assets.mkdir(parents=True, exist_ok=True)
    allow_overview = set(policy.get('overview_ids', []))
    if len(allow_overview) > policy.get('max_overviews', 1):
        raise ValueError('总体介绍白名单超过允许数量')
    overrides = policy.get('figures', {})
    records, errors = [], []
    section = 'document'
    section_level = policy.get('group_heading_level', 4)
    sequence = 0
    paragraph_records = []
    for p in d.paragraphs:
        style = p.style.name
        ol = p._p.xpath('./w:pPr/w:outlineLvl/@w:val')
        level = int(style.split()[-1]) if style.startswith('Heading ') else (int(ol[0])+1 if ol else 10)
        if p.text and level <= section_level:
            section = p.text
        for drawing in p._p.xpath('.//w:drawing'):
            refs = drawing.xpath('.//a:blip/@r:embed')
            if len(refs) != 1:
                errors.append({'code': 'unclassified_drawing', 'section': section})
                continue
            sequence += 1
            image_id = f'#{sequence:03d}'
            rid = refs[0]
            part = d.part.rels[rid].target_part
            original = part.blob
            try:
                im = Image.open(BytesIO(original)); im.load()
            except Exception as e:
                errors.append({'id': image_id, 'code': 'unsupported_image', 'detail': str(e)})
                continue
            ov = overrides.get(image_id, overrides.get(fingerprint(original), {}))
            detected, evidence = classify(im)
            kind = ov.get('kind', detected)
            if any(term in str(ov.get('document_type','')) for term in ('合同','检测报告','制度凭证','证书')) and kind!='非界面':
                errors.append({'id':image_id,'code':'protected_document_crop'});continue
            if kind not in KINDS:
                errors.append({'id': image_id, 'code': 'invalid_kind'}); continue
            if image_id in allow_overview:
                kind = '总体介绍'
            if kind == '总体介绍' and image_id not in allow_overview:
                errors.append({'id': image_id, 'code': 'overview_not_allowlisted'}); continue
            # An override cannot silently exempt a detected interface as non-interface.
            if kind == '非界面' and detected != '非界面' and not ov.get('review_reason'):
                errors.append({'id': image_id, 'code': 'unreviewed_classification_override'})
            box, method, result, mask = None, 'unchanged', im, None
            if kind in ('模块功能', '弹窗'):
                try:
                    box, method = detect_crop(im, ov.get('crop_box'))
                    if kind=='弹窗' and not ov.get('crop_box'):
                        # Right drawers start exactly at the dialog edge: grey menu context is forbidden.
                        panel=gray_sidebar_boundary(im)
                        if panel is not None:
                            box=(panel,0,im.width,im.height);method+='-drawer-edge'
                    result = crop_ui(im, box, mask)
                except ValueError as e:
                    errors.append({'id': image_id, 'code': 'crop_failed', 'detail': str(e)})
                    continue
            buffer = BytesIO()
            if kind in ('模块功能', '弹窗'):
                result.save(buffer, format='PNG')
                # One relationship per occurrence avoids overwriting shared evidence images.
                new_rid, _ = d.part.get_or_add_image(BytesIO(buffer.getvalue()))
                drawing.xpath('.//a:blip')[0].set(qn('r:embed'), new_rid)
                blob = buffer.getvalue()
            else:
                new_rid, blob = rid, original
            artifact = assets / f'{image_id[1:]}-{fingerprint(blob)[:12]}.png'
            if kind in ('模块功能', '弹窗'):
                artifact.write_bytes(blob)
            else:
                artifact = artifact.with_suffix(Path(str(part.partname)).suffix)
                artifact.write_bytes(blob)
            remaining = menu_residual(result) if kind in ('模块功能', '弹窗') else []
            if box and (box[0] < im.width*.06 or (box[1] < (green_band(im) or (0,0))[1] and not method.endswith('drawer-edge')) or (box[3] > im.height*.98 and not method.endswith('drawer-edge'))):
                remaining.append('uncleared_viewport_chrome')
            if remaining:
                errors.append({'id': image_id, 'code': 'menu_residual', 'reasons': remaining})
            rec = {'id': image_id, 'relationship_id': new_rid, 'section': section,
                   'kind': kind, 'detected_kind': detected, 'classification_evidence': evidence,
                   'original_sha256': fingerprint(original), 'sha256': fingerprint(blob),
                   'original_pixels': list(im.size), 'pixels': list(result.size),
                   'crop_box': box, 'crop_method': method, 'residual_menu': bool(remaining),
                   'context_chrome_mask': mask,
                   'artifact': str(artifact.resolve()), 'width_deviation': None,
                   'rendered_width_cm': None, 'pre_image_whitespace_ratio': None}
            records.append(rec); paragraph_records.append((p, drawing, rec))
    groups = defaultdict(list)
    for p, drawing, rec in paragraph_records:
        if rec['kind'] in ('模块功能', '弹窗'):
            groups[rec['section']].append(rec)
    # Both caps apply. Use the smallest fitting width throughout a section, not one width per image.
    target_width = {key: min([policy.get('width_max_cm', 14.2)] +
                     [policy.get('height_max_cm', 7.4)*r['pixels'][0]/r['pixels'][1] for r in values])
                    for key, values in groups.items()}
    for p, drawing, rec in paragraph_records:
        if rec['kind'] in ('模块功能', '弹窗'):
            width = target_width[rec['section']]; height = width*rec['pixels'][1]/rec['pixels'][0]
            for ex in drawing.xpath('.//wp:extent|.//a:xfrm/a:ext'):
                ex.set('cx', str(int(Cm(width)))); ex.set('cy', str(int(Cm(height))))
            rec['display_width_cm'] = width; rec['display_height_cm'] = height
            rec['width_deviation'] = 0.0
        else:
            ex = drawing.xpath('.//wp:extent')
            if ex:
                rec['display_width_cm'] = int(ex[0].get('cx'))/360000
                rec['display_height_cm'] = int(ex[0].get('cy'))/360000
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        f = p.paragraph_format
        f.left_indent = Cm(0); f.right_indent = Cm(0); f.first_line_indent = Cm(0)
        f.line_spacing = 1; f.space_before = Pt(0); f.space_after = Pt(6)
        f.keep_with_next = False; f.keep_together = True
        previous = p._p.getprevious()
        if previous is not None and previous.tag == qn('w:p') and not previous.xpath('.//w:drawing'):
            from docx.text.paragraph import Paragraph
            lead = Paragraph(previous, d)
            if lead.text.strip() and len(lead.text) < 180:
                lead.paragraph_format.keep_with_next = True
    output = Path(output_path); output.parent.mkdir(parents=True, exist_ok=True); d.save(output)
    result = {'schema_version': 1, 'input_sha256': fingerprint(Path(input_path).read_bytes()),
              'docx_sha256': fingerprint(output.read_bytes()), 'figures': records,
              'errors': errors, 'status': 'failed' if errors else 'awaiting_render_audit'}
    Path(report_path).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument('input'); a.add_argument('--output', required=True)
    a.add_argument('--report', required=True); a.add_argument('--policy'); a.add_argument('--assets-dir')
    args = a.parse_args(); policy = json.loads(Path(args.policy).read_text()) if args.policy else {}
    result = apply(args.input, args.output, args.report, policy, args.assets_dir)
    print(json.dumps({'status': result['status'], 'figures': len(result['figures']), 'errors': result['errors']}, ensure_ascii=False))
    return 2 if result['errors'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
