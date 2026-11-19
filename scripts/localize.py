"""Generate checked-in EN/NL static pages using only Python's standard library."""
from pathlib import Path
from html.parser import HTMLParser
import html,json,re,hashlib
ROOT=Path(__file__).resolve().parent.parent
D=json.loads((ROOT/'scripts/translations.json').read_text())
REV=hashlib.sha256(b''.join((ROOT/name).read_bytes() for name in ['app.mjs','exercise2.mjs','transfer.mjs','randomness.mjs','experiments.mjs','system-map.mjs','weights.mjs','relations.mjs','relation-editor.mjs','fbs-data.mjs','fbs-analysis.mjs','fbs-prompt.mjs','example.mjs','begrippen.html','style.css','workshop.html','oefening-2.html','werkblad.html','scripts/translations.json'])).hexdigest()[:12]

def js(source):
    # Translate full template literals before their individual string components.
    for a,b in sorted(D.items(),key=lambda x:-len(x[0])):
        if '${' in a:source=source.replace('`'+a+'`','`'+b+'`')
    for a,b in sorted(D.items(),key=lambda x:-len(x[0])):
        source=source.replace("'"+a.replace("'","\\'")+"'",json.dumps(b,ensure_ascii=False))
    source=source.replace("'nl-NL'","'en-GB'").replace("'nl'","'en'")
    for key in ['breaking-prompt-ex2-system','breaking-prompt-v2','workshop-exercise-url']:
        source=source.replace(key,key+'-en')
    return source

class Translate(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.out=[];self.raw=[]
    def handle_decl(self,decl):self.out.append('<!'+decl+'>')
    def handle_starttag(self,tag,attrs):
        raw=self.get_starttag_text()
        def attr(m):
            value=html.unescape(m.group(3));translated=D.get(value,value)
            return m.group(1)+m.group(2)+html.escape(translated,quote=True)+m.group(2)
        raw=re.sub(r'(\b(?:placeholder|aria-label|alt|title)\s*=\s*)([\"\'])(.*?)\2',attr,raw,flags=re.S)
        self.out.append(raw)
        if tag in ['script','style']:self.raw.append(tag)
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs)
    def handle_endtag(self,tag):
        self.out.append('</'+tag+'>')
        if self.raw and self.raw[-1]==tag:self.raw.pop()
    def handle_data(self,data):
        if self.raw:self.out.append(js(data) if self.raw[-1]=='script' else data);return
        stripped=data.strip();translated=D.get(stripped,stripped)
        self.out.append(html.escape(data.replace(stripped,translated,1) if stripped else data,quote=False))
    def handle_comment(self,text):self.out.append('<!--'+text+'-->')

for lang in ['nl','en']:
    target=ROOT/lang;target.mkdir(exist_ok=True)
    for source,name in [('workshop.html','index.html'),('oefening-2.html','oefening-2.html'),('werkblad.html','werkblad.html'),('begrippen.html','begrippen.html')]:
        text=(ROOT/source).read_text()
        if lang=='en':
            parser=Translate();parser.feed(text);text=''.join(parser.out).replace('lang="nl"','lang="en"')
            text=text.replace("GitHub-adres: vul hier het adres van de oefening in","Workshop address: enter the exercise URL here")
        text=text.replace('href="style.css"','href="../style.css?v='+REV+'"').replace('src="assets/','src="../assets/')
        pdf='worksheet-a4-en.pdf' if lang=='en' else 'werkblad-a4.pdf'
        text=text.replace('href="werkblad-a4.pdf"','href="../'+pdf+'"')
        other='nl' if lang=='en' else 'en';label='NL' if lang=='en' else 'ENG'
        switch=f'<a class="language-switch" href="../{other}/{name}" lang="{other}">{label}</a>'
        if '<nav>' in text:text=text.replace('<nav>','<nav>'+switch,1)
        else:text=text.replace('<div class="toolbar">','<div class="toolbar">'+switch,1)
        text=re.sub(r'src="(app|exercise2)\.mjs"',lambda m:'src="'+m.group(1)+'.mjs?v='+REV+'"',text)
        text=re.sub(r'(from\s*[\"\'])(\./[^\"\']+\.mjs)([\"\'])',lambda m:m.group(1)+m.group(2)+'?v='+REV+m.group(3),text)
        text=text.replace('href="./"','href="./?v='+REV+'"').replace('href="oefening-2.html"','href="oefening-2.html?v='+REV+'"').replace('href="begrippen.html"','href="begrippen.html?v='+REV+'"').replace('href="begrippen.html#toeval"','href="begrippen.html?v='+REV+'#toeval"')
        text=re.sub(r'href="(\.\./(?:en|nl)/[^"]*?\.html)"',lambda m:'href="'+m.group(1)+'?v='+REV+'"',text)
        (target/name).write_text(text)
    for name in ['app.mjs','engine.mjs','analysis.mjs','document.mjs','exercise2.mjs','transfer.mjs','randomness.mjs','experiments.mjs','system-map.mjs','weights.mjs','relations.mjs','relation-editor.mjs','fbs-data.mjs','fbs-analysis.mjs','fbs-prompt.mjs','example.mjs']:
        text=(ROOT/name).read_text()
        if lang=='en':
            text=js(text)
            if name=='example.mjs':
                text=re.sub(r'export const exampleText=`.*?`;',lambda m:'export const exampleText='+json.dumps(D['__example_en'],ensure_ascii=False)+';',text,flags=re.S)
        text=re.sub(r'src="(app|exercise2)\.mjs"',lambda m:'src="'+m.group(1)+'.mjs?v='+REV+'"',text)
        text=re.sub(r'(from\s*[\"\'])(\./[^\"\']+\.mjs)([\"\'])',lambda m:m.group(1)+m.group(2)+'?v='+REV+m.group(3),text)
        text=text.replace('href="./"','href="./?v='+REV+'"').replace('href="oefening-2.html"','href="oefening-2.html?v='+REV+'"').replace('href="begrippen.html"','href="begrippen.html?v='+REV+'"').replace('href="begrippen.html#toeval"','href="begrippen.html?v='+REV+'#toeval"')
        text=re.sub(r'href="(\.\./(?:en|nl)/[^"]*?\.html)"',lambda m:'href="'+m.group(1)+'?v='+REV+'"',text)
        (target/name).write_text(text)
print('Generated English and Dutch exercises, runtime messages and worksheets.')

# Version language entry URLs too, so a language choice requests fresh page HTML.
entry=(ROOT/'index.html').read_text()
entry=re.sub(r'href="(en|nl)/(?:\?v=[a-f0-9]+)?"',lambda m:'href="'+m.group(1)+'/?v='+REV+'"',entry)
(ROOT/'index.html').write_text(entry)
