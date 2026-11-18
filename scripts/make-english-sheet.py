"""Optional PDF regeneration: requires reportlab and DejaVu fonts. PDF is checked in."""
from pathlib import Path
import re,xml.etree.ElementTree as E
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
root=Path(__file__).resolve().parent.parent
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
c=canvas.Canvas(str(root/'worksheet-a4-en.pdf'),pagesize=A4);W,H=A4
ink=HexColor('#202126');pink=HexColor('#e5008b');gray=HexColor('#aaaaaa')
def text(x,y,s,size=10,bold=False,color=ink):
 c.setFillColor(color);c.setFont('DejaVu-Bold' if bold else 'DejaVu',size);c.drawString(x,y,s)
text(38,H-40,'BREAKING THE PROMPT',22,True)
text(38,H-61,'Designing AI interactions for cognitive friction',11)
text(38,H-87,'OPEN THE EXERCISE',8,True,color=pink)
text(38,H-104,'Workshop:',10)
c.acroForm.textfield(name='exercise_url',tooltip='Workshop address',value='https://kasiata.github.io/ai-friction-workshop/',x=105,y=H-110,width=W-143,height=20,borderWidth=.5,borderStyle='underlined',fillColor=HexColor('#ffffff'),textColor=ink,fontName='Helvetica',fontSize=9,forceBorder=True)
text(38,H-124,'Work in pairs; record your own experience. Words or sketches are enough.',8.5)
text(38,H-142,'DESIGN CHALLENGE',8,True,color=pink)
c.acroForm.textfield(name='design_challenge',tooltip='Design challenge',value='Design a place on campus where strangers feel comfortable starting a conversation.',x=38,y=H-164,width=W-76,height=18,borderWidth=.5,borderStyle='underlined',fillColor=HexColor('#ffffff'),textColor=ink,fontName='Helvetica',fontSize=8,forceBorder=True)
for i,(title,subtitle) in enumerate([('01  SYSTEM → INTUITION','Explore the system. Choose a proposal and develop it on paper.'),('02  INTUITION → SYSTEM','Analyse your text. Shape and revise collections, probabilities and relationships.')]):
 top=H-187-i*203;text(38,top,title,11,True,color=pink);text(38,top-17,subtitle,8)
 for j,label in enumerate(['I expected…','I changed…','I noticed…','I reconsidered…']):
  x=38+(j%2)*266;y=top-43-(j//2)*72;text(x,y,label,10,True);c.setStrokeColor(gray);c.setLineWidth(.35)
  for k in range(2):c.line(x,y-19-k*19,x+247,y-19-k*19)
text(38,224,'When did you stop choosing results and start designing the system?',9.5,True)
c.setStrokeColor(gray);c.line(38,200,W-38,200)
text(38,180,'EXPLORE FURTHER',8,True,color=pink)
for i,(name,label) in enumerate([('article','Article'),('project','Project'),('website','Website'),('linkedin','LinkedIn')]):
 svg=E.parse(root/'assets'/f'qr-{name}.svg').getroot();view=list(map(float,svg.attrib['viewBox'].split()));d=svg.find('{http://www.w3.org/2000/svg}path').attrib['d'];size=77;x=38+i*134;y=64;scale=size/view[2]
 c.setFillColor(HexColor('#ffffff'));c.rect(x,y,size,size,fill=1,stroke=0);c.setFillColor(ink)
 p=c.beginPath()
 tokens=iter(re.findall(r'[MLZ]|-?\d+(?:\.\d+)?',d))
 for cmd in tokens:
  if cmd=='Z':p.close();continue
  px=float(next(tokens));py=float(next(tokens));xx=x+(px-view[0])*scale;yy=y+size-(py-view[1])*scale
  if cmd=='M':p.moveTo(xx,yy)
  elif cmd=='L':p.lineTo(xx,yy)
 c.drawPath(p,fill=1,stroke=0);text(x,y-14,label,9,True)
text(38,24,'Kasia Głowicka / Inholland / Breaking the Prompt',8)
c.save()
print('Generated English A4 with the four original vector QR codes.')
