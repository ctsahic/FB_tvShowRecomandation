#!/usr/bin/env python3
"""
מקור אמת אחד לאייקון ולבאנר.
הגיאומטריה מוגדרת כרשימת פרימיטיבים, וממנה מיוצרים גם הווקטורים של אנדרואיד
וגם תמונות ה-PNG (כדי שלא יתפצלו), וגם עמוד תצוגה מקדימה לאישור.

מוטיב: טלוויזיה ובה כפתור נגן (סרט/צפייה), כדור (ספורט) וכוכב (המלצה).
"""
import math, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

BG, FRAME, WHITE, BLUE, GOLD = "#101838", "#16224E", "#FFFFFF", "#5B8CFF", "#FFC542"
BANNER_A, BANNER_B = "#0B1020", "#212C56"

# ------------------------------------------------------------------ פרימיטיבים
def rrect(x0, y0, x1, y1, r, fill, stroke=None, sw=0):
    return dict(kind="rrect", box=(x0, y0, x1, y1), r=r, fill=fill, stroke=stroke, sw=sw)

def circle(cx, cy, r, fill, stroke=None, sw=0):
    return dict(kind="circle", c=(cx, cy), r=r, fill=fill, stroke=stroke, sw=sw)

def poly(pts, fill):
    return dict(kind="poly", pts=[(round(x, 3), round(y, 3)) for x, y in pts], fill=fill)

def regular(cx, cy, r, sides, start=-90):
    return [(cx + r * math.cos(math.radians(start + i * 360.0 / sides)),
             cy + r * math.sin(math.radians(start + i * 360.0 / sides))) for i in range(sides)]

def star(cx, cy, outer, inner):
    return [(cx + (outer if i % 2 == 0 else inner) * math.cos(math.radians(-90 + i * 36)),
             cy + (outer if i % 2 == 0 else inner) * math.sin(math.radians(-90 + i * 36)))
            for i in range(10)]

def to_path(p):
    if p["kind"] == "rrect":
        x0, y0, x1, y1 = p["box"]; r = p["r"]
        if r <= 0:
            return f"M{x0},{y0} L{x1},{y0} L{x1},{y1} L{x0},{y1} Z"
        return (f"M{x0+r},{y0} L{x1-r},{y0} A{r},{r} 0 0 1 {x1},{y0+r} L{x1},{y1-r} "
                f"A{r},{r} 0 0 1 {x1-r},{y1} L{x0+r},{y1} A{r},{r} 0 0 1 {x0},{y1-r} "
                f"L{x0},{y0+r} A{r},{r} 0 0 1 {x0+r},{y0} Z")
    if p["kind"] == "circle":
        cx, cy = p["c"]; r = p["r"]
        return f"M{cx-r},{cy} a{r},{r} 0 1,0 {2*r},0 a{r},{r} 0 1,0 {-2*r},0 Z"
    pts = p["pts"]
    return f"M{pts[0][0]},{pts[0][1]} " + " ".join(f"L{x},{y}" for x, y in pts[1:]) + " Z"

# ------------------------------------------------------------------ האייקון (108x108)
# הליבה נשמרת בתוך עיגול בטיחות ברדיוס ~33 מסביב למרכז (54,54).
ICON = [
    rrect(24, 42, 84, 70, 6.5, FRAME, WHITE, 5),          # מסגרת הטלוויזיה
    poly([(47, 48), (47, 64), (63, 56)], BLUE),           # כפתור נגן
    rrect(41, 70, 48, 74.5, 1.5, WHITE),                  # רגל שמאל
    rrect(60, 70, 67, 74.5, 1.5, WHITE),                  # רגל ימין
    circle(70, 38, 10, BG),                               # הילה לכוכב
    poly(star(70, 38, 7.5, 3.3), GOLD),                   # כוכב — המלצה
    circle(33, 67, 7.5, WHITE),                           # כדור — ספורט
    poly(regular(33, 67, 3.0, 5), FRAME),
]

# ------------------------------------------------------------------ הבאנר (320x180)
BANNER = [
    rrect(76, 42, 244, 136, 16, FRAME, WHITE, 9),
    poly([(128, 66), (128, 120), (184, 93)], BLUE),
    rrect(136, 136, 156, 146, 3, WHITE),
    rrect(176, 136, 196, 146, 3, WHITE),
    circle(222, 48, 22, BANNER_A),
    poly(star(222, 48, 16.5, 7.3), GOLD),
    circle(106, 122, 20, WHITE),
    poly(regular(106, 122, 8.0, 5), FRAME),
]

# ------------------------------------------------------------------ כתיבה
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print("wrote", os.path.relpath(path, ROOT))

def vector_xml(shapes, w, h):
    out = ['<?xml version="1.0" encoding="utf-8"?>',
           '<!-- נוצר אוטומטית מ-make_icon.py — אין לערוך ידנית. -->',
           '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
           f'    android:width="{w}dp"',
           f'    android:height="{h}dp"',
           f'    android:viewportWidth="{w}"',
           f'    android:viewportHeight="{h}">']
    for p in shapes:
        out.append('    <path')
        out.append(f'        android:pathData="{to_path(p)}"')
        out.append(f'        android:fillColor="{p["fill"]}"')
        if p.get("stroke"):
            out.append(f'        android:strokeColor="{p["stroke"]}"')
            out.append(f'        android:strokeWidth="{p["sw"]}"')
        out[-1] = out[-1] + ' />'
    out.append('</vector>')
    return "\n".join(out) + "\n"

def svg(shapes, w, h, bg=None):
    parts = []
    if bg:
        parts.append(f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
                     f'<stop offset="0" stop-color="{bg[0]}"/>'
                     f'<stop offset="1" stop-color="{bg[1]}"/></linearGradient></defs>'
                     f'<rect width="{w}" height="{h}" fill="url(#g)"/>')
    for p in shapes:
        st = f' stroke="{p["stroke"]}" stroke-width="{p["sw"]}"' if p.get("stroke") else ""
        parts.append(f'<path d="{to_path(p)}" fill="{p["fill"]}"{st}/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'preserveAspectRatio="xMidYMid meet">' + "".join(parts) + '</svg>')

SS = 4  # supersampling

def rgb(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))

def paint(d, shapes, k, off=(0.0, 0.0)):
    """שרטוט הפרימיטיבים בקנה מידה k (פיקסלים ליחידה) עם הסחה."""
    ox, oy = off
    for p in shapes:
        f = rgb(p["fill"]) + (255,)
        s = rgb(p["stroke"]) + (255,) if p.get("stroke") else None
        wpx = max(1, int(round(p.get("sw", 0) * k))) if s else 0
        if p["kind"] == "circle":
            cx, cy = p["c"]; r = p["r"]
            d.ellipse([(cx - r + ox) * k, (cy - r + oy) * k,
                       (cx + r + ox) * k, (cy + r + oy) * k], fill=f, outline=s, width=wpx)
        elif p["kind"] == "rrect":
            x0, y0, x1, y1 = p["box"]
            d.rounded_rectangle([(x0 + ox) * k, (y0 + oy) * k,
                                 (x1 + ox) * k, (y1 + oy) * k],
                                radius=p["r"] * k, fill=f, outline=s, width=wpx)
        else:
            d.polygon([((x + ox) * k, (y + oy) * k) for x, y in p["pts"]], fill=f)

def render_icon(size, shapes, bg=None, circle_mask=False):
    px = size * SS
    img = Image.new("RGBA", (px, px), (rgb(bg) + (255,)) if bg else (0, 0, 0, 0))
    paint(ImageDraw.Draw(img), shapes, px / 108.0)
    if circle_mask:
        mask = Image.new("L", (px, px), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, px - 1, px - 1], fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)

def render_banner(w, h, shapes, a, b):
    grad = Image.new("RGB", (w, h))
    gp = grad.load()
    ca, cb = rgb(a), rgb(b)
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            gp[x, y] = tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    layer = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    paint(ImageDraw.Draw(layer), shapes, (w * SS) / 320.0)
    layer = layer.resize((w, h), Image.LANCZOS)
    return Image.alpha_composite(grad.convert("RGBA"), layer).convert("RGB")

# ------------------------------------------------------------------ הפקה
write(os.path.join(RES, "values", "ic_launcher_background.xml"),
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
      f'    <color name="ic_launcher_background">{BG}</color>\n</resources>\n')
write(os.path.join(RES, "drawable", "ic_launcher_foreground.xml"), vector_xml(ICON, 108, 108))
write(os.path.join(RES, "drawable", "tv_banner_art.xml"), vector_xml(BANNER, 320, 180))
write(os.path.join(RES, "drawable", "tv_banner.xml"),
      '<?xml version="1.0" encoding="utf-8"?>\n'
      '<!-- באנר לשורת היישומים ב-Android TV (320x180dp). -->\n'
      '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
      '    <item>\n'
      '        <shape android:shape="rectangle">\n'
      '            <gradient\n'
      '                android:angle="45"\n'
      f'                android:endColor="{BANNER_B}"\n'
      f'                android:startColor="{BANNER_A}"\n'
      '                android:type="linear" />\n'
      '        </shape>\n'
      '    </item>\n'
      '    <item android:drawable="@drawable/tv_banner_art" />\n'
      '</layer-list>\n')

for dens, px in [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]:
    render_icon(px, ICON).save(os.path.join(RES, f"mipmap-{dens}", "ic_launcher_foreground.png"))
for dens, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    render_icon(px, ICON, bg=BG).convert("RGB").save(
        os.path.join(RES, f"mipmap-{dens}", "ic_launcher.png"))
    render_icon(px, ICON, bg=BG, circle_mask=True).save(
        os.path.join(RES, f"mipmap-{dens}", "ic_launcher_round.png"))

render_banner(640, 360, BANNER, BANNER_A, BANNER_B).save(
    os.path.join(RES, "drawable-xhdpi", "tv_banner.png"))

icon_svg = svg(ICON, 108, 108)
banner_svg = svg(BANNER, 320, 180, bg=(BANNER_A, BANNER_B))
prev = os.path.join(ROOT, "verification", "icon-preview.html")
html = f"""<!doctype html>
<html lang="he" dir="rtl"><meta charset="utf-8">
<title>תצוגה מקדימה — אייקון האפליקציה</title>
<style>
 body {{ background:#0b1020; color:#e8ecf8; font:16px/1.5 system-ui,"Segoe UI",sans-serif; margin:0; padding:28px; }}
 h1 {{ font-size:22px; margin:0 0 6px; }}
 p {{ color:#9aa6c7; margin:6px 0 24px; }}
 .row {{ display:flex; gap:36px; align-items:flex-end; flex-wrap:wrap; margin-bottom:32px; }}
 figure {{ margin:0; text-align:center; }}
 figcaption {{ color:#8f9bbe; font-size:13px; margin-top:10px; }}
 .box {{ display:inline-block; overflow:hidden; background:#101838; }}
 .round {{ border-radius:50%; }}
 .squircle {{ border-radius:30%; }}
 .plain {{ border-radius:0; }}
 .banner {{ border-radius:8px; border:1px solid #22305e; }}
 svg {{ display:block; }}
</style>
<h1>אייקון האפליקציה ובאנר הטלוויזיה</h1>
<p>טלוויזיה עם כפתור נגן (סרט), כדור (ספורט) וכוכב (המלצה) — אותו איור במסכות ובגדלים אמיתיים.</p>

<div class="row">
  <figure><span class="box round" style="width:48px;height:48px">{icon_svg}</span><figcaption>48px · עגול</figcaption></figure>
  <figure><span class="box squircle" style="width:72px;height:72px">{icon_svg}</span><figcaption>72px · ריבוע מעוגל</figcaption></figure>
  <figure><span class="box plain" style="width:108px;height:108px">{icon_svg}</span><figcaption>108px · ריבוע</figcaption></figure>
  <figure><span class="box round" style="width:192px;height:192px">{icon_svg}</span><figcaption>192px · עגול</figcaption></figure>
</div>

<div class="row">
  <figure><span class="box banner" style="width:320px;height:180px">{banner_svg}</span><figcaption>באנר Android TV · 320x180</figcaption></figure>
  <figure><span class="box banner" style="width:160px;height:90px">{banner_svg}</span><figcaption>אותו באנר מוקטן</figcaption></figure>
</div>
</html>
"""
os.makedirs(os.path.dirname(prev), exist_ok=True)
with open(prev, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(html)
print("wrote", os.path.relpath(prev, ROOT))
print("OK")
