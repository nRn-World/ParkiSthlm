from PIL import Image, ImageDraw
import sys
src=Image.open('assets/logo-source.png').convert('RGBA')
sym=src.crop((0,19,1254,925))
parki=src.crop((70,950,594,1133)); sthlm=src.crop((595,950,1190,1133))
def trim(im):
    bb=im.split()[3].point(lambda v:255 if v>20 else 0).getbbox(); return im.crop(bb)
sym,parki,sthlm=trim(sym),trim(parki),trim(sthlm)
def build(symw,s,gap1,gap2,dy=0):
    S=1024; fg=Image.new('RGBA',(S,S),(0,0,0,0))
    sh=int(sym.height*symw/sym.width); sy=sym.resize((symw,sh),Image.LANCZOS)
    pk=parki.resize((int(parki.width*s),int(parki.height*s)),Image.LANCZOS); st=sthlm.resize((int(sthlm.width*s),int(sthlm.height*s)),Image.LANCZOS)
    total=sh+gap1+pk.height+gap2+st.height
    y=(S-total)//2+dy
    fg.paste(sy,((S-symw)//2,y),sy); y+=sh+gap1
    fg.paste(pk,((S-pk.width)//2,y),pk); y+=pk.height+gap2
    fg.paste(st,((S-st.width)//2,y),st)
    return fg
def preview(fg,name,size=144):
    bg=Image.new('RGBA',fg.size,(4,12,31,255)); bg.alpha_composite(fg)
    m=Image.new('L',fg.size,0); ImageDraw.Draw(m).ellipse((0,0,fg.size[0]-1,fg.size[1]-1),fill=255)
    # adaptive: visible 72/108 area is scaled to icon; here mask = circle of full canvas then icon shows central 66% region scaled
    c=int(fg.size[0]*0.1667); crop=bg.crop((c,c,fg.size[0]-c,fg.size[1]-c)); mm=Image.new('L',crop.size,0); ImageDraw.Draw(mm).ellipse((0,0,crop.size[0]-1,crop.size[1]-1),fill=255)
    out=Image.new('RGBA',crop.size,(0,0,0,0)); out.paste(crop,(0,0),mm)
    big=out.resize((420,420),Image.LANCZOS); small=out.resize((size,size),Image.LANCZOS)
    sheet=Image.new('RGBA',(420+size+30,420),(220,220,226,255)); sheet.alpha_composite(big,(0,0)); sheet.alpha_composite(small,(430,140)); sheet.save(name)
if __name__=='__main__':
    A=build(380,0.62,10,8,0); A.save('../.scratch/fgA.png'); preview(A,'../.scratch/prevA.png')
    B=build(330,0.7,6,6,0); B.save('../.scratch/fgB.png'); preview(B,'../.scratch/prevB.png')
    print(sym.size,parki.size,sthlm.size)
