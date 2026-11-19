"""Render both localized HTML worksheets as one-page, fillable A4 PDFs.
Run npm run build:pdf (requires Python playwright, PyMuPDF, and Chromium).
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from threading import Thread
import fitz
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
        for language,filename in [('nl','werkblad-a4.pdf'),('en','worksheet-a4-en.pdf')]:
            page=browser.new_page(viewport={'width':1000,'height':1300})
            page.goto(f'http://127.0.0.1:{server.server_port}/{language}/werkblad.html',wait_until='networkidle')
            page.emulate_media(media='print')
            page.evaluate('document.fonts.ready')
            assert page.locator('.resources img').count()==4
            assert page.locator('.resources img').evaluate_all('(imgs)=>imgs.every(img=>img.complete&&img.naturalWidth>0)')
            geometry=page.evaluate('''()=>{const sheet=document.querySelector('.sheet').getBoundingClientRect();const box=el=>{const r=el.getBoundingClientRect();return {x:r.x-sheet.x,y:r.y-sheet.y,w:r.width,h:r.height,text:el.textContent};};return {height:sheet.height,width:sheet.width,footer:box(document.querySelector('footer')),address:box(document.querySelector('#address')),challenge:box(document.querySelector('#sheetChallenge')),responses:[...document.querySelectorAll('.box,.answer')].map(box)};}''')
            assert geometry['footer']['y']+geometry['footer']['h']<geometry['height']-12,f'{language}: footer overflows A4'
            output=ROOT/filename
            page.pdf(path=str(output),format='A4',prefer_css_page_size=True,print_background=True,display_header_footer=False)
            document=fitz.open(output)
            assert len(document)==1
            pdfpage=document[0]
            scale=pdfpage.rect.width/geometry['width']
            def add_field(name,box,value='',multiline=False,inset=0):
                rect=fitz.Rect(box['x']*scale,(box['y']+inset)*scale,(box['x']+box['w'])*scale,(box['y']+box['h'])*scale)
                widget=fitz.Widget();widget.field_name=name;widget.field_type=fitz.PDF_WIDGET_TYPE_TEXT;widget.field_value=value;widget.rect=rect;widget.text_font='Helv';widget.text_fontsize=9;widget.border_width=0
                if value:widget.fill_color=(1,1,1)
                if multiline:widget.field_flags=fitz.PDF_TX_FIELD_IS_MULTILINE
                pdfpage.add_widget(widget)
            add_field('exercise_url',geometry['address'],geometry['address']['text'])
            add_field('design_challenge',geometry['challenge'],geometry['challenge']['text'])
            for index,box in enumerate(geometry['responses']):add_field('reflection_'+str(index+1),box,multiline=True,inset=18 if index<8 else 0)
            data=document.tobytes(garbage=4,deflate=True);document.close();output.write_bytes(data)
            print(f'{filename}: one A4 page, four QR codes, larger reflection spaces and 11 fillable fields')
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
