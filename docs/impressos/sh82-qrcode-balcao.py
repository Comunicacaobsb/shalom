import sys, segno
from PIL import Image, ImageDraw, ImageFont
URL = "https://brasilia.comshalom.org/asasul/sh82/"
Y, K = (253, 215, 32), (31, 31, 31)
W, H = 1748, 2480                      # A5 a 300 dpi
F = "/Users/joaoroque/Library/Fonts/Montserrat-{}.ttf"
f = lambda peso, tam: ImageFont.truetype(F.format(peso), tam)
img = Image.new("RGB", (W, H), Y); d = ImageDraw.Draw(img)
M = 140                                 # margem

# Topo: nome à esquerda, cápsula SH82 à direita com o texto na base do oval
d.text((M, 150), "Lanchonete", font=f("Black", 150), fill=K)
d.text((M, 300), "Shalom", font=f("Black", 150), fill=K)
d.text((M + 6, 488), "Asa Sul · Cardápio", font=f("SemiBold", 58), fill=K)
cw, ch = 210, 400; cx, cy = W - M - cw, 140
d.rounded_rectangle((cx, cy, cx + cw, cy + ch), radius=cw // 2, outline=K, width=16)
fs = f("ExtraBold", 92)
for i, t in enumerate(("SH", "82")):
    tw = d.textlength(t, font=fs)
    d.text((cx + (cw - tw) / 2, cy + ch - 228 + i * 98), t, font=fs, fill=K)

# QR: módulos carvão sobre o amarelo (escuro sobre claro, o que todo leitor entende)
qr = segno.make(URL, error="q", boost_error=False)
mat = [list(r) for r in qr.matrix]; n = len(mat); quiet = 4
area = 1060; mod = area // (n + 2 * quiet); lado = mod * (n + 2 * quiet)
qx, qy = (W - lado) // 2, 640
for r, linha in enumerate(mat):
    for c, v in enumerate(linha):
        if v:
            x0 = qx + (c + quiet) * mod; y0 = qy + (r + quiet) * mod
            d.rectangle((x0, y0, x0 + mod - 1, y0 + mod - 1), fill=K)

# Chamada
ty = qy + lado + 40
t = "Peça pelo celular"; ft = f("Black", 112)
d.text(((W - d.textlength(t, font=ft)) / 2, ty), t, font=ft, fill=K)
fb = f("Medium", 56)
for i, t in enumerate(("Aponte a câmera, monte seu pedido", "e confirme no balcão.")):
    d.text(((W - d.textlength(t, font=fb)) / 2, ty + 160 + i * 76), t, font=fb, fill=K)

# Faixa carvão com o endereço em amarelo
by = H - 250
d.rectangle((0, by, W, H), fill=K)
t = "brasilia.comshalom.org/asasul/sh82"; fu = f("Bold", 64)
d.text(((W - d.textlength(t, font=fu)) / 2, by + 88), t, font=fu, fill=Y)

out = sys.argv[1]
img.save(out, dpi=(300, 300), optimize=True)
print(out, img.size, "versão QR", qr.version, "módulos", n, "px/módulo", mod)
