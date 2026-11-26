"""Template-driven Word heading, list-instance and typography normalization."""
from collections import defaultdict
import re

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE


def val(e, path, default=None):
    node=e.find(path)
    return node.get(qn('w:val'),default) if node is not None else default


def put(parent,tag,attributes):
    old=parent.find(qn('w:'+tag))
    if old is not None:parent.remove(old)
    node=OxmlElement('w:'+tag)
    for key,value in attributes.items():node.set(qn('w:'+key),str(value))
    parent.append(node);return node


def heading_level(p):
    match=re.fullmatch(r'Heading ([1-9])',p.style.name)
    if match:return int(match.group(1))
    styles=[];s=p.style
    while s is not None and s not in styles:styles.append(s);s=s.base_style
    for pr in [p._p.pPr]+[s.element.pPr for s in styles]:
        level=val(pr,'./'+qn('w:outlineLvl')) if pr is not None else None
        if level is not None:return int(level)+1 if int(level)<9 else 0
    return 0


def num_info(d,p):
    properties=[p._p.pPr];s=p.style;seen=set()
    while s is not None and s.style_id not in seen:
        seen.add(s.style_id);properties.append(s.element.pPr);s=s.base_style
    number=None;level='0'
    for pr in properties:
        if pr is None:continue
        np=pr.find(qn('w:numPr'))
        if np is not None:
            number=val(np,'./'+qn('w:numId'));level=val(np,'./'+qn('w:ilvl'),'0');break
    if not number or number=='0':return None
    root=d.part.numbering_part.element
    nums=root.xpath(f'./w:num[@w:numId="{number}"]')
    if not nums:return {'id':number,'invalid':True}
    abstract=val(nums[0],'./'+qn('w:abstractNumId'))
    definitions=root.xpath(f'./w:abstractNum[@w:abstractNumId="{abstract}"]/w:lvl[@w:ilvl="{level}"]')
    if not definitions:return {'id':number,'invalid':True}
    definition=definitions[0]
    return {'id':number,'level':int(level),'abstract':abstract,'definition':definition,'num':nums[0],
            'format':val(definition,'./'+qn('w:numFmt')),'pattern':val(definition,'./'+qn('w:lvlText'),'')}


def ordered_level(info):
    if not info or info.get('invalid'):return None
    if info['format'] not in ('decimal','lowerLetter','upperLetter'):return None
    return (2 if info['format']!='decimal' else 0)+(1 if ')' in info['pattern'] or '）' in info['pattern'] else 0)



def ordinary_body(d,p):
    """Narrative body only: preserve headings, lists, captions and template labels."""
    text=p.text.strip()
    if p._p.getparent().tag!=qn('w:body'):return False
    if not text or heading_level(p) or num_info(d,p) or p._p.xpath('.//w:drawing|.//w:pict'):
        return False
    if re.match(r'^(?:\d+(?:[.．]\d+)*[.、)）]|[a-zA-Z][.)]|[（(](?:\d+|[a-zA-Z]|[一二三四五六七八九十]+)[）)])',text):
        return False
    if re.match(r'^(?:图|表)\s*[0-9０-９一二三四五六七八九十]+(?:[.、：:\s]|$)',text):
        return False
    if re.match(r'^(?:项目名称|项目编号|招标编号|分标名称|分标编号|包名称|包号|项目单位)[：:]',text) or text.startswith('【索引：'):
        return False
    style=p.style;seen=set();properties=[p._p.pPr]
    while style is not None and style.style_id not in seen:
        seen.add(style.style_id);properties.append(style.element.pPr);style=style.base_style
    for pr in properties:
        if pr is None:continue
        alignment=val(pr,'./'+qn('w:jc'))
        if alignment is not None:return alignment not in ('center','right','end')
    return True



def trim_manual_indent(p):
    """Remove only leading spaces/tabs, retaining fields, bookmarks and run markings."""
    for run in p._p.findall(qn('w:r')):
        for node in list(run):
            if node.tag==qn('w:rPr'):continue
            if node.tag==qn('w:tab'):run.remove(node);continue
            if node.tag==qn('w:t'):
                node.text=(node.text or '').lstrip(' \t\u3000')
                if node.text:return
            else:return


def normalize_body_indents(d,profile):
    """Two CJK characters, with a twip fallback for non-Word renderers."""
    changes=[];twips=int(profile['size_half_points'])*20
    for pi,p in enumerate(d.paragraphs):
        if not ordinary_body(d,p):continue
        pr=p._p.get_or_add_pPr();ind=pr.find(qn('w:ind'))
        # Reflow after indentation must not leave a one-line tail across pages.
        put(pr,'widowControl',{'val':1})
        if ind is None:ind=put(pr,'ind',{})
        before=dict(ind.attrib);before_text=p.text
        trim_manual_indent(p)
        for name in ['hanging','hangingChars','firstLine','firstLineChars']:
            ind.attrib.pop(qn('w:'+name),None)
        ind.set(qn('w:firstLineChars'),'200');ind.set(qn('w:firstLine'),str(twips))
        if dict(ind.attrib)!=before or p.text!=before_text:changes.append({'paragraph':pi,'text':p.text[:80]})
    order_properties(d)
    return changes


def next_id(root,tag,attribute):
    return max([int(e.get(qn('w:'+attribute))) for e in root.findall(qn('w:'+tag))]+[-1])+1


def add_number(root,abstract):
    identifier=next_id(root,'num','numId');num=OxmlElement('w:num');num.set(qn('w:numId'),str(identifier))
    put(num,'abstractNumId',{'val':abstract});root.append(num);return identifier,num


def bind(p,identifier,level):
    np=put(p._p.get_or_add_pPr(),'numPr',{})
    put(np,'ilvl',{'val':level});put(np,'numId',{'val':identifier})


def font_properties(rpr,font,size):
    put(rpr,'rFonts',{'ascii':font,'hAnsi':font,'eastAsia':font,'cs':font})
    put(rpr,'sz',{'val':size});put(rpr,'szCs',{'val':size})


def spacing(pr,profile):
    put(pr,'spacing',profile['spacing'])


def order_properties(d):
    orders={
        'style':'name aliases basedOn next link autoRedefine hidden uiPriority semiHidden unhideWhenUsed qFormat locked personal personalCompose personalReply rsid pPr rPr tblPr trPr tcPr tblStylePr',
        'pPr':'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange',
        'rPr':'rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang eastAsianLayout specVanish oMath rPrChange',
        'lvl':'start numFmt lvlRestart pStyle isLgl suff lvlText lvlPicBulletId legacy lvlJc pPr rPr',
        'abstractNum':'nsid multiLevelType tmpl name styleLink numStyleLink lvl',
        'numbering':'numPicBullet abstractNum num numIdMacAtCleanup',
        'num':'abstractNumId lvlOverride',
        'lvlOverride':'startOverride lvl',
    }
    for root in [d.element,d.styles.element,d.part.numbering_part.element]:
        for e in root.iter():
            name=e.tag.split('}')[-1]
            if name not in orders:continue
            order={qn('w:'+name):i for i,name in enumerate(orders[name].split())}
            children=sorted(list(e),key=lambda child:order.get(child.tag,len(order)))
            for child in children:e.append(child)


def normalize(d,profile):
    """Only typography/numbering changes; preserve runs, response markings and fields."""
    font=profile['font'];size=int(profile['size_half_points']);root=d.part.numbering_part.element
    heading_paras=[(p,heading_level(p)) for p in d.paragraphs if heading_level(p)]
    source_lists={p._p:num_info(d,p) for p in d.paragraphs if not heading_level(p)}
    for item in profile.get('required_headings',[]):
        matches=[p for p in d.paragraphs if p.text.strip()==item['text']]
        if len(matches)!=1:raise ValueError('独立章节缺失或重名：'+item['text'])
        heading_paras=[(p,l) for p,l in heading_paras if p._p is not matches[0]._p]+[(matches[0],item['level'])]
    # WPS numeric style IDs and semiHidden/custom flags do not provide a reliable Word heading link.
    mapping={}
    for level in range(1,10):
        name=f'Heading {level}'
        try:style=d.styles[name]
        except KeyError:style=d.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
        mapping[style.style_id]=f'Heading{level}'
    for part in [d.element,d.styles.element,root]:
        for e in part.iter():
            if e.tag in [qn('w:pStyle'),qn('w:rStyle'),qn('w:basedOn'),qn('w:next'),qn('w:link')]:
                value=e.get(qn('w:val'))
                if value in mapping:e.set(qn('w:val'),mapping[value])
    for style in d.styles:
        if style.style_id in mapping:style.element.set(qn('w:styleId'),mapping[style.style_id])
    aid=next_id(root,'abstractNum','abstractNumId');abstract=OxmlElement('w:abstractNum');abstract.set(qn('w:abstractNumId'),str(aid))
    put(abstract,'nsid',{'val':f'{0xBD000000|aid:08X}'});put(abstract,'tmpl',{'val':f'{0xBE000000|aid:08X}'})
    put(abstract,'multiLevelType',{'val':'hybridMultilevel'})
    # abstractNum definitions precede concrete num instances in the OOXML sequence.
    root.insert(0,abstract);chapter,_=add_number(root,aid)
    for level in range(1,10):
        style=d.styles[f'Heading {level}'];style.element.attrib.pop(qn('w:customStyle'),None)
        for tag in ['semiHidden','hidden','locked']:
            for e in style.element.findall(qn('w:'+tag)):style.element.remove(e)
        put(style.element,'qFormat',{})
        pr=style.element.get_or_add_pPr();put(pr,'outlineLvl',{'val':level-1});put(pr,'keepNext',{})
        put(pr,'keepLines',{});put(pr,'ind',{'left':0,'firstLine':0});spacing(pr,profile)
        np=put(pr,'numPr',{});put(np,'ilvl',{'val':level-1});put(np,'numId',{'val':chapter})
        rpr=style.element.get_or_add_rPr();font_properties(rpr,font,size);put(rpr,'b',{})
        lvl=OxmlElement('w:lvl');lvl.set(qn('w:ilvl'),str(level-1))
        for tag,attrs in [('start',{'val':1}),('numFmt',{'val':'decimal'}),('pStyle',{'val':style.style_id}),
                          ('lvlText',{'val':'.'.join('%'+str(i) for i in range(1,level+1))+'.'}),('suff',{'val':'space'}),('lvlJc',{'val':'left'})]:put(lvl,tag,attrs)
        # Word uses the preceding level as the default restart; explicit imported
        # lvlRestart values can blank intermediate labels in compatibility mode.
        rpr=put(lvl,'rPr',{});font_properties(rpr,font,size);abstract.append(lvl)
    for p,level in heading_paras:
        p.style=d.styles[f'Heading {level}'];pr=p._p.get_or_add_pPr()
        put(pr,'outlineLvl',{'val':level-1});put(pr,'ind',{'left':0,'firstLine':0});bind(p,chapter,level-1)
    # Normal style is the target template body baseline, not an imported source's Normal.
    body=d.styles['Normal'];font_properties(body.element.get_or_add_rPr(),font,size);spacing(body.element.get_or_add_pPr(),profile)
    list_abstracts={};active={};parent_tokens=[None]*4;section=0;counts=defaultdict(int);lists=[]
    for pi,p in enumerate(d.paragraphs):
        if heading_level(p):active={};parent_tokens=[None]*4;section+=1
        elif not p._p.xpath('.//w:drawing|.//w:pict') and p.text.strip():
            info=source_lists.get(p._p);level=ordered_level(info)
            if level is not None:
                context=(section,tuple(parent_tokens[:level]),info['id'])
                if level not in active or active[level][0]!=context:
                    if level not in list_abstracts:
                        la=next_id(root,'abstractNum','abstractNumId');an=OxmlElement('w:abstractNum');an.set(qn('w:abstractNumId'),str(la))
                        put(an,'nsid',{'val':f'{0xBD000000|la:08X}'});put(an,'tmpl',{'val':f'{0xBE000000|la:08X}'});put(an,'multiLevelType',{'val':'singleLevel'})
                        lvl=OxmlElement('w:lvl');lvl.set(qn('w:ilvl'),'0')
                        for tag,value in [('start',1),('numFmt','decimal' if level<2 else 'lowerLetter'),('lvlText','%1'+('.' if level%2==0 else ')')),('suff','tab'),('lvlJc','left')]:put(lvl,tag,{'val':value})
                        pp=put(lvl,'pPr',{});put(pp,'ind',{'left':720+level*240,'hanging':240})
                        font_properties(put(lvl,'rPr',{}),font,size);an.append(lvl);root.insert(0,an);list_abstracts[level]=la
                    nid,num=add_number(root,list_abstracts[level]);ov=put(num,'lvlOverride',{'ilvl':0});put(ov,'startOverride',{'val':1});active[level]=(context,nid)
                nid=active[level][1];bind(p,nid,0);counts[nid]+=1;lists.append({'paragraph':pi,'num_id':nid,'level':level,'ordinal':counts[nid]})
                parent_tokens[level]=pi
                for child in range(level+1,4):active.pop(child,None);parent_tokens[child]=None
                put(p._p.get_or_add_pPr(),'ind',{'left':720+level*240,'hanging':240})
                tabs=put(p._p.get_or_add_pPr(),'tabs',{});put(tabs,'tab',{'val':'num','pos':720+level*240})
            p.style=body
        if p._p.xpath('.//w:drawing|.//w:pict'):continue
        spacing(p._p.get_or_add_pPr(),profile)
        for run in p.runs:
            font_properties(run._r.get_or_add_rPr(),font,size)
            if heading_level(p):put(run._r.get_or_add_rPr(),'b',{})
    # Refresh cached REF numbers without converting live fields into text.
    counters=[0]*9;bookmarks={};headings=[]
    for p in d.paragraphs:
        level=heading_level(p)
        if not level:continue
        counters[level-1]+=1
        for j in range(level,9):counters[j]=0
        number='.'.join(str(v or 1) for v in counters[:level])
        headings.append({'text':p.text,'level':level,'number':number})
        for name in p._p.xpath('./w:bookmarkStart/@w:name'):bookmarks[name]=number
    for p in d.element.xpath('.//w:p'):
        current=None;result=False
        for run in p.findall(qn('w:r')):
            for item in run:
                if item.tag==qn('w:instrText'):
                    match=re.search(r'\bREF\s+(\S+)',item.text or '');current=bookmarks.get(match.group(1)) if match else None
                elif item.tag==qn('w:fldChar'):
                    kind=item.get(qn('w:fldCharType'))
                    if kind=='separate':result=True
                    elif kind=='end':current=None;result=False
                elif item.tag==qn('w:t') and result and current is not None:item.text=current;current=''
    indent_changes=normalize_body_indents(d,profile)
    order_properties(d)
    return {'body_indent_changes':indent_changes,'headings':headings,'lists':lists,'chapter_num_id':chapter,'max_list_ordinal':max(counts.values(),default=0)}


def audit(d,profile):
    if not profile:return [{'code':'missing_format_profile'}]
    errors=[];font=profile['font'];size=int(profile['size_half_points']);seen={};section=0;ordinals=defaultdict(int);identities={};checked=set()
    heading_ids=set();parents=[None]*4
    for pi,p in enumerate(d.paragraphs):
        if not p.text.strip() or p._p.xpath('.//w:drawing|.//w:pict'):continue
        level=heading_level(p);info=num_info(d,p)
        if info and info.get('invalid'):
            errors.append({'code':'invalid_numbering_reference','paragraph':pi})
        literal=re.match(r'^\s*(\d{2,})[.)、）]\s*',p.text)
        if not level and literal and int(literal.group(1))>profile.get('max_list_items',50):
            errors.append({'code':'list_ordinal_overflow','paragraph':pi,'ordinal':int(literal.group(1))})
        if info and not info.get('invalid') and info['abstract'] not in checked:
            checked.add(info['abstract']);root=d.part.numbering_part.element
            abstract=root.xpath(f'./w:abstractNum[@w:abstractNumId="{info["abstract"]}"]')[0]
            nsid=val(abstract,'./'+qn('w:nsid'))
            if not nsid or not re.fullmatch(r'[0-9A-Fa-f]{8}',nsid):errors.append({'code':'numbering_identity_missing','abstract':info['abstract']})
            elif nsid in identities and identities[nsid]!=info['abstract']:errors.append({'code':'numbering_identity_collision','abstract':info['abstract'],'nsid':nsid})
            else:identities[nsid]=info['abstract']
        if level:
            section+=1;parents=[None]*4
            expected=f'Heading{level}';style_np=p.style.element.pPr.find(qn('w:numPr')) if p.style.element.pPr is not None else None
            style_num=val(style_np,'./'+qn('w:numId')) if style_np is not None else None
            linked=val(info['definition'],'./'+qn('w:pStyle')) if info and not info.get('invalid') else None
            outline=val(p.style.element.pPr,'./'+qn('w:outlineLvl')) if p.style.element.pPr is not None else None
            if p.style.style_id!=expected or outline!=str(level-1) or not style_num or not info or info.get('invalid') or info['id']!=style_num or info['level']!=level-1 or linked!=expected:
                errors.append({'code':'heading_numbering_binding','paragraph':pi,'text':p.text[:80]})
            if info and not info.get('invalid'):
                if info['definition'].find(qn('w:lvlRestart')) is not None:
                    errors.append({'code':'heading_restart_compatibility','paragraph':pi})
            if info:heading_ids.add(info['id'])
        else:
            rank=ordered_level(info)
            if rank is not None:
                context=(section,tuple(parents[:rank]));nid=info['id'];ordinals[nid]+=1
                if nid in seen and seen[nid]!=context:errors.append({'code':'list_cross_section_continuation','paragraph':pi,'num_id':nid})
                seen[nid]=context;parents[rank]=pi
                for j in range(rank+1,4):parents[j]=None
                if not info['num'].xpath('./w:lvlOverride[@w:ilvl="0"]/w:startOverride[@w:val="1"]'):
                    errors.append({'code':'list_restart_missing','paragraph':pi,'num_id':nid})
                if ordinals[nid]>profile.get('max_list_items',50):errors.append({'code':'list_ordinal_overflow','paragraph':pi,'ordinal':ordinals[nid]})
        if ordinary_body(d,p):
            pr=p._p.pPr;ind=pr.find(qn('w:ind')) if pr is not None else None
            if re.match(r'^[ \t\u3000]',p.text) or ind is None or ind.get(qn('w:firstLineChars'))!='200' or ind.get(qn('w:firstLine'))!=str(size*20) or any(ind.get(qn('w:'+k)) is not None for k in ['hanging','hangingChars']):
                errors.append({'code':'body_first_line_indent_drift','paragraph':pi,'text':p.text[:80],'expected_characters':2})
        pr=p._p.pPr;actual_spacing=pr.find(qn('w:spacing')) if pr is not None else None
        if actual_spacing is None or any(actual_spacing.get(qn('w:'+k))!=str(v) for k,v in profile['spacing'].items()):
            errors.append({'code':'paragraph_spacing_drift','paragraph':pi,'text':p.text[:80]})
        for run in p.runs:
            if not run.text.strip():continue
            rp=run._r.rPr;rf=rp.find(qn('w:rFonts')) if rp is not None else None
            if rf is None or any(rf.get(qn('w:'+slot))!=font for slot in ['ascii','hAnsi','eastAsia','cs']) or any(k.endswith('Theme') for k in rf.attrib) or val(rp,'./'+qn('w:sz'))!=str(size) or val(rp,'./'+qn('w:szCs'))!=str(size):
                errors.append({'code':'font_size_drift','paragraph':pi,'text':run.text[:60]});break
    if len(heading_ids)>1:errors.append({'code':'multiple_chapter_number_instances','num_ids':sorted(heading_ids)})
    for required in profile.get('required_headings',[]):
        matches=[p for p in d.paragraphs if p.text.strip()==required['text']]
        if len(matches)!=1 or heading_level(matches[0])!=required['level']:errors.append({'code':'missing_independent_heading','text':required['text']})
    return errors
