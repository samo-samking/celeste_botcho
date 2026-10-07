#!/usr/bin/env python3
"""Génère le jeu d'icônes « Trait doré » de Céleste Bôtchô.

  python3 build.py   ->  dist/interface/*.svg, dist/signature/*.svg, dist/apercu.html
"""
import math
import os
import shutil

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

# ---------------------------------------------------------------- Interface
# Grille 24, trait 1,5, bouts ronds. Chaque entrée : chaînes = <path d>,
# ('c',cx,cy,r) cercle, ('r',x,y,w,h,rx) rectangle, ('d',cx,cy,r) point plein.

BAG = ["M5 8h14l1 11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M8.5 8V7a3.5 3.5 0 0 1 7 0v1"]
RING = ("c", 12, 12, 9)
FILE = ["M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z", "M13.5 3.5V9H19"]
SPEAKER = "M3.5 9.5H7l5-4v13l-5-4H3.5z"
PARCEL = ("r", 4, 5, 16, 15, 2.5)

INTERFACE = {
    # 1. Navigation et structure
    "menu": ["M4 7h16", "M4 12h16", "M4 17h10"],
    "close": ["M6 6l12 12", "M18 6L6 18"],
    "chevron-left": ["M14.5 6l-6 6 6 6"],
    "chevron-right": ["M9.5 6l6 6-6 6"],
    "chevron-down": ["M6 9.5l6 6 6-6"],
    "chevron-up": ["M6 14.5l6-6 6 6"],
    "arrow-left": ["M20 12H4", "M10 6l-6 6 6 6"],
    "arrow-right": ["M4 12h16", "M14 6l6 6-6 6"],
    "search": [("c", 10.5, 10.5, 6.5), "M15.5 15.5l5 5"],
    "home": [
        "M3.5 11L12 3.5l8.5 7.5",
        "M5.5 9.5V19A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5",
        "M10 20.5v-5a2 2 0 0 1 4 0v5",
    ],
    "grid": [("r", 3.5, 3.5, 7, 7, 2), ("r", 13.5, 3.5, 7, 7, 2), ("r", 3.5, 13.5, 7, 7, 2), ("r", 13.5, 13.5, 7, 7, 2)],
    "external-link": ["M13.5 4.5h6v6", "M19.5 4.5L11 13", "M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"],
    # 2. Commerce
    "bag": BAG,
    "bag-plus": BAG + ["M12 12v5", "M9.5 14.5h5"],
    "plus": ["M12 5v14", "M5 12h14"],
    "minus": ["M5 12h14"],
    "trash": [
        "M4 6.5h16",
        "M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5",
        "M6 6.5l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12",
        "M10 11v5",
        "M14 11v5",
    ],
    "tag": [
        "M3.5 5.5a2 2 0 0 1 2-2H11a2 2 0 0 1 1.5.5l8 8a2 2 0 0 1 0 3L15 20.5a2 2 0 0 1-3 0l-8-8a2 2 0 0 1-.5-1.5z",
        ("d", 8, 8, 1),
    ],
    "percent": ["M18.5 5.5l-13 13", ("c", 7, 7, 2.5), ("c", 17, 17, 2.5)],
    "clock": [RING, "M12 7v5l3.5 2"],
    "package": [PARCEL, "M9.5 5v6l2.5-1.5 2.5 1.5V5", "M8 16h3"],
    "truck": [
        "M5 17H3.5a1 1 0 0 1-1-1V6.5A1.5 1.5 0 0 1 4 5h8.5A1.5 1.5 0 0 1 14 6.5V17",
        "M9 17h6.5",
        "M14 9h3.5l3.5 4v3a1 1 0 0 1-1 1h-.5",
        ("c", 7, 17, 2),
        ("c", 17.5, 17, 2),
    ],
    "map-pin": ["M12 21.5s-7-6-7-11.5a7 7 0 0 1 14 0c0 5.5-7 11.5-7 11.5z", ("c", 12, 10, 2.5)],
    "receipt": ["M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z", "M9 8h6", "M9 12h6"],
    "filter": ["M4 6h16", "M7 12h10", "M10 18h4"],
    "sort": ["M7 5v14", "M4 16l3 3 3-3", "M17 19V5", "M14 8l3-3 3 3"],
    "zoom": [("c", 10.5, 10.5, 6.5), "M15.5 15.5l5 5", "M10.5 8v5", "M8 10.5h5"],
    "share": [("c", 6, 12, 2.5), ("c", 17.5, 5.5, 2.5), ("c", 17.5, 18.5, 2.5), "M8.5 11l7-4", "M8.5 13l7 4"],
    # 3. Fiche produit et conformité
    "flask": ["M9.5 3.5h5", "M10 3.5v6L4.5 18A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-2.5L14 9.5v-6", "M7.5 15h9"],
    "book-open": [
        "M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z",
        "M12 6.5v13",
    ],
    "shield-alert": ["M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6z", "M12 8v4.5", ("d", 12, 16, 1)],
    "cookie": ["M20.5 12.5a8.5 8.5 0 1 1-9-9 3 3 0 0 0 3.5 3.5 3 3 0 0 0 5.5 5.5z", ("d", 8.5, 10, 1), ("d", 14, 15, 1), ("d", 9.5, 15.5, 1)],
    "stethoscope": [
        "M6 3.5H5a1 1 0 0 0-1 1V9a5 5 0 0 0 10 0V4.5a1 1 0 0 0-1-1h-1",
        "M9 14v2a5 5 0 0 0 10 0v-2",
        ("c", 19, 11.5, 2.5),
    ],
    "info": [RING, "M12 11v5.5", ("d", 12, 7.5, 1)],
    "scale": [("c", 15.5, 9, 5.5), ("c", 6.5, 15.5, 3.5), ("c", 14.5, 19.5, 2)],
    # 4. Communication
    "phone": [
        "M6 3.5h2.5a1 1 0 0 1 1 .5L11 7.5a1 1 0 0 1-.5 1.5L9 10a10 10 0 0 0 5 5l1-1.5a1 1 0 0 1 1.5-.5l3.5 1.5a1 1 0 0 1 .5 1V18a2.5 2.5 0 0 1-2.5 2.5C10 20.5 3.5 14 3.5 6A2.5 2.5 0 0 1 6 3.5z"
    ],
    "mail": [("r", 3, 5, 18, 14, 2.5), "M3.5 7.5l8.5 6 8.5-6"],
    "chat": [
        "M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 14z",
        "M8.5 8.5h7",
        "M8.5 12h4",
    ],
    "send": ["M21 3L10 14", "M21 3l-6.5 18-4.5-7-7-4.5z"],
    # 5. Statuts de commande
    "status-new": ["M12 3c.5 5 4 8.5 9 9-5 .5-8.5 4-9 9-.5-5-4-8.5-9-9 5-.5 8.5-4 9-9z"],
    "status-confirmed": [RING, "M8 12.5l2.5 2.5 5.5-6"],
    "status-preparing": [
        "M5 11v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7",
        "M3.5 11h17",
        "M5 11L3 6.5",
        "M19 11l2-4.5",
        "M12 3v4.5",
        "M10 5.5l2 2 2-2",
    ],
    "status-shipped": [
        "M8.5 17h-1a1 1 0 0 1-1-1V7.5A1.5 1.5 0 0 1 8 6h6a1.5 1.5 0 0 1 1.5 1.5V17",
        "M12 17h4.5",
        "M15.5 9.5h3l3 3.5v3a1 1 0 0 1-1 1",
        ("c", 10, 17, 2),
        ("c", 18.5, 17, 2),
        "M2 9h2.5",
        "M2 12.5h2.5",
    ],
    "status-delivered": [PARCEL, "M12 5v3", "M8.5 13.5L11 16l4.5-5"],
    "status-cancelled": [RING, "M9 9l6 6", "M15 9l-6 6"],
    # 6. Retours et états
    "check": ["M4.5 12.5l5 5 10-11"],
    "alert-circle": [RING, "M12 7.5v5", ("d", 12, 16, 1)],
    "alert-triangle": [
        "M10.5 4.5L3 18a1.5 1.5 0 0 0 1.5 2.5h15A1.5 1.5 0 0 0 21 18L13.5 4.5a1.5 1.5 0 0 0-3 0z",
        "M12 9.5V14",
        ("d", 12, 17, 1),
    ],
    "wifi-off": ["M3 9a13 13 0 0 1 18 0", "M6.5 12.5a8 8 0 0 1 11 0", "M9.5 16a3.5 3.5 0 0 1 5 0", ("d", 12, 19.5, 1), "M4 3.5l16 17"],
    "loader": ["M12 3a9 9 0 1 0 9 9"],
    "refresh": ["M19 8a8 8 0 0 0-14.5 1.5", "M19 3.5V8h-4.5", "M5 16a8 8 0 0 0 14.5-1.5", "M5 20.5V16h4.5"],
    "download": ["M12 3.5v12", "M7 10.5l5 5 5-5", "M4.5 20h15"],
    "image": [("r", 3.5, 4.5, 17, 15, 2.5), ("c", 8.5, 9.5, 1.5), "M4 17l5-5 4 4 2.5-2.5L20 18"],
    "eye": ["M2.5 12C5 7.5 8.5 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-6 6.5-9.5 6.5S5 16.5 2.5 12z", ("c", 12, 12, 3)],
    "eye-off": ["M3 10c2.5 3.5 5.5 5 9 5s6.5-1.5 9-5", "M12 15v3", "M7 14l-1.5 2.5", "M17 14l1.5 2.5"],
    "lock": [("r", 5, 10.5, 14, 10, 2.5), "M8 10.5V8a4 4 0 0 1 8 0v2.5", ("d", 12, 15.5, 1)],
    # 8. Admin
    "dashboard": [("r", 3.5, 3.5, 7, 9, 2), ("r", 13.5, 3.5, 7, 5, 2), ("r", 13.5, 11.5, 7, 9, 2), ("r", 3.5, 15.5, 7, 5, 2)],
    "folder": ["M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"],
    "box": ["M4 9l1.5-4.5h13L20 9", ("r", 4, 9, 16, 11, 2), "M10 13h4"],
    "clipboard-list": [
        "M9 5H7a2 2 0 0 0-2 2v11.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2",
        ("r", 9, 3.5, 6, 3.5, 1.5),
        "M9 11.5h6",
        "M9 15.5h4",
    ],
    "inbox": [
        "M3.5 13L6 5.5a1.5 1.5 0 0 1 1.5-1h9a1.5 1.5 0 0 1 1.5 1l2.5 7.5v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z",
        "M3.5 13h5a3.5 3.5 0 0 0 7 0h5",
    ],
    "megaphone": ["M4 10v4a1 1 0 0 0 1 1h3l8 4.5v-15L8 9H5a1 1 0 0 0-1 1z", "M19 9.5a3.5 3.5 0 0 1 0 5", "M8 15v3.5a1.5 1.5 0 0 0 3 0v-2"],
    "settings": ["M4 7h9", "M17 7h3", ("c", 15, 7, 2), "M4 17h3", "M11 17h9", ("c", 9, 17, 2)],
    "users": [("c", 9, 8, 3.5), "M2.5 20a6.5 6.5 0 0 1 13 0", "M16 4.5a3.5 3.5 0 0 1 0 7", "M18 14a6.5 6.5 0 0 1 3.5 6"],
    "history": ["M4.5 8a8.5 8.5 0 1 1-1 4", "M4 3.5V8h4.5", "M12 7.5v5l3 2"],
    "logout": ["M10 4H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2H10", "M10 12h10.5", "M16.5 8l4 4-4 4"],
    "bell": ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z", "M10.5 21h3"],
    "volume": [SPEAKER, "M15.5 9a4 4 0 0 1 0 6", "M18 6.5a8 8 0 0 1 0 11"],
    "volume-off": [SPEAKER, "M16 9.5l5 5", "M21 9.5l-5 5"],
    "edit": ["M4 20l1-4.5L16.5 4a2 2 0 0 1 3 0l.5.5a2 2 0 0 1 0 3L8.5 19z", "M14.5 6L18 9.5"],
    "copy": [("r", 8.5, 8.5, 12, 12, 2.5), "M5.5 15.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2"],
    "grip": [("d", 9, 6, 1), ("d", 15, 6, 1), ("d", 9, 12, 1), ("d", 15, 12, 1), ("d", 9, 18, 1), ("d", 15, 18, 1)],
    "upload": ["M12 15.5v-12", "M7 8.5l5-5 5 5", "M4.5 20h15"],
    "file-down": FILE + ["M12 11.5V17", "M9.5 14.5L12 17l2.5-2.5"],
    "printer": [
        "M7 17H5.5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H17",
        "M7 8.5v-5h10v5",
        ("r", 7, 13.5, 10, 7, 1.5),
    ],
    "calendar": [("r", 3.5, 5, 17, 15.5, 2.5), "M3.5 10h17", "M8 3v4", "M16 3v4"],
    "star": ["M12 3.5L14.5 9l6 .5-4.5 4 1.5 6-5.5-3.5-5.5 3.5 1.5-6-4.5-4 6-.5z"],
    "globe": [RING, "M3 12h18", "M12 3c3 2.5 4 5.5 4 9s-1 6.5-4 9c-3-2.5-4-5.5-4-9s1-6.5 4-9z"],
    "file-draft": FILE + ["M8.5 15.5c1-2 2-2 3 0s2 2 3.5-1"],
    "archive": [("r", 3.5, 4.5, 17, 4.5, 1.5), "M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9", "M10 13h4"],
    "more": [("d", 12, 5, 1.25), ("d", 12, 12, 1.25), ("d", 12, 19, 1.25)],
    "user": [("c", 12, 8, 4), "M4.5 20.5a7.5 7.5 0 0 1 15 0"],
}


def num(v):
    return f"{v:g}"


def interface_svg(items):
    parts = []
    for it in items:
        if isinstance(it, str):
            parts.append(f'<path d="{it}"/>')
        elif it[0] == "c":
            parts.append(f'<circle cx="{num(it[1])}" cy="{num(it[2])}" r="{num(it[3])}"/>')
        elif it[0] == "r":
            _, x, y, w, h, rx = it
            parts.append(f'<rect x="{num(x)}" y="{num(y)}" width="{num(w)}" height="{num(h)}" rx="{num(rx)}"/>')
        elif it[0] == "d":
            parts.append(f'<circle cx="{num(it[1])}" cy="{num(it[2])}" r="{num(it[3])}" fill="currentColor" stroke="none"/>')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" '
        'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + "".join(parts)
        + "</svg>\n"
    )


# ---------------------------------------------------------------- Signature
# Grille 48. Chaque trait est une forme pleine : fin au départ (0,75),
# épais au milieu, terminé en pointe, comme les courbes du logo.


def arc(cx, cy, r, a0, a1, step=4):
    n = max(2, int(abs(a1 - a0) / step))
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def bez(p0, p1, p2, p3, n=24):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        pts.append(
            (
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            )
        )
    return pts


def line(a, b, n=12):
    return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]


def rrect(x, y, w, h, r, start=0.5):
    """Rectangle arrondi, sens horaire, en partant du bord haut (start = position sur ce bord)."""
    sx = x + r + (w - 2 * r) * start
    pts = line((sx, y), (x + w - r, y), 6)
    pts += arc(x + w - r, y + r, r, -90, 0, 10)
    pts += line((x + w, y + r), (x + w, y + h - r), 8)
    pts += arc(x + w - r, y + h - r, r, 0, 90, 10)
    pts += line((x + w - r, y + h), (x + r, y + h), 10)
    pts += arc(x + r, y + h - r, r, 90, 180, 10)
    pts += line((x, y + h - r), (x, y + r), 8)
    pts += arc(x + r, y + r, r, 180, 270, 10)
    pts += line((x + r, y), (sx - 1.5, y), 6)
    return pts


def join(*segments):
    out = []
    for seg in segments:
        for p in seg:
            if not out or math.dist(out[-1], p) > 1e-6:
                out.append(p)
    return out


def resample(pts, step=0.7):
    d = [0.0]
    for a, b in zip(pts, pts[1:]):
        d.append(d[-1] + math.dist(a, b))
    total = d[-1]
    n = max(4, int(total / step))
    out, j = [], 0
    for i in range(n + 1):
        s = total * i / n
        while j < len(d) - 2 and d[j + 1] < s:
            j += 1
        seg = d[j + 1] - d[j] or 1
        t = (s - d[j]) / seg
        out.append((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t))
    return out


def stroke(pts, wmax=2.6, wmin=0.75):
    """Trait calligraphique plein le long de pts."""
    pts = resample(pts)
    n = len(pts) - 1
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        t = i / n
        a, b = pts[max(0, i - 1)], pts[min(n, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        w = wmin + (wmax - wmin) * math.sin(math.pi * t) ** 0.85
        w *= min(1.0, (1 - t) / 0.14)  # pointe effilée à l'arrivée
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    poly = left + right[::-1]
    return "M" + "L".join(f"{round(x, 1):g} {round(y, 1):g}" for x, y in poly) + "Z"


def sparkle(cx, cy, r, k=0.16):
    p = lambda x, y: f"{round(x, 1):g} {round(y, 1):g}"
    q = k * r
    return (
        f"M{p(cx, cy - r)}Q{p(cx + q, cy - q)} {p(cx + r, cy)}Q{p(cx + q, cy + q)} {p(cx, cy + r)}"
        f"Q{p(cx - q, cy + q)} {p(cx - r, cy)}Q{p(cx - q, cy - q)} {p(cx, cy - r)}Z"
    )


def dot(cx, cy, r):
    return ("dot", cx, cy, r)


def ring():
    """Arc de cercle ouvert, rappel du cercle du monogramme."""
    return stroke(arc(24, 24, 21, 205, 492), wmax=2.0)


S = stroke
SIGNATURE = {
    "sig-delivery": {
        "main": [
            ring(),
            S(join(bez((24, 36), (21, 32), (17.5, 28), (17.9, 23.5)), arc(24, 21, 7, 159, 381), bez((30.1, 23.5), (30.5, 28), (27, 32), (24.6, 35.4)))),
            dot(24, 21, 2.2),
        ],
        "accent": [sparkle(35.5, 12.5, 3.5)],
    },
    "sig-cash": {
        "main": [ring(), S(rrect(12.5, 17, 23, 14, 3, 0.3)), S(arc(24, 24, 3.6, -120, 235), wmax=1.8), dot(16.5, 24, 1), dot(31.5, 24, 1)],
        "accent": [sparkle(35, 11.5, 3)],
    },
    "sig-mobile-money": {
        "main": [ring(), S(rrect(17.5, 11.5, 13, 25, 3, 0.2)), S(line((22, 32.5), (26.5, 32.5)), wmax=1.6), S(arc(24, 22, 3.4, -120, 235), wmax=1.8)],
        "accent": [sparkle(35.5, 14, 3)],
    },
    "sig-advice": {
        "main": [ring(), S(join(line((15.5, 36.5), (19.2, 30.8), 6), arc(24, 22.5, 9.6, 120, 425)))],
        "accent": [sparkle(24, 22.5, 4.6)],
    },
    "sig-discreet": {
        "main": [
            ring(),
            S(rrect(14.5, 21, 19, 14, 2.5, 0.7)),
            S(line((12.5, 21), (36, 21)), wmax=2.2),
            S(line((24, 21.5), (24, 34.5)), wmax=1.8),
            S(bez((24, 20.5), (20, 12), (14.5, 15), (23, 20.5)), wmax=1.9),
            S(bez((24, 20.5), (28, 12), (33.5, 15), (25, 20.5)), wmax=1.9),
        ],
        "accent": [],
    },
    "sig-order-success": {
        "main": [ring(), S(join(bez((13.5, 24.5), (16, 26), (18.5, 29), (20.5, 32.5)), bez((20.5, 32.5), (24, 24), (29, 18), (35.5, 13.5))), wmax=3.2)],
        "accent": [sparkle(34.5, 31, 3.6)],
    },
    "sig-empty-cart": {
        "main": [
            ring(),
            S(join(line((19, 19.5), (32.5, 19.5), 8), line((32.5, 19.5), (34, 33), 8), arc(31.5, 33, 2.5, 0, 90, 10), line((31.5, 35.5), (16.5, 35.5), 8), arc(16.5, 33, 2.5, 90, 180, 10), line((14, 33), (15.5, 19.5), 8), line((15.5, 19.5), (17.5, 19.5), 3))),
            S(arc(24, 19.5, 5, 180, 360), wmax=2),
            dot(24, 28, 1.1),
        ],
        "accent": [],
    },
    "sig-not-found": {
        "main": [ring(), S(arc(22, 22, 8, 50, 400)), S(line((28, 28), (35.5, 35.5)), wmax=3), dot(22, 22, 1.2)],
        "accent": [sparkle(34.5, 13, 3)],
    },
    "sig-offline": {
        "main": [
            ring(),
            S(join(line((19, 31.5), (16.5, 31.5), 3), arc(16.5, 27, 4.5, 90, 250), arc(23, 22, 7, 195, 335), arc(31, 26.5, 5, 275, 450), line((31, 31.5), (21.5, 31.5), 8))),
            S(line((14, 13.5), (34.5, 36)), wmax=2.4),
        ],
        "accent": [],
    },
    "sig-sparkle": {
        "main": [sparkle(21, 27, 14), dot(37, 33.5, 1.4)],
        "accent": [sparkle(36, 12, 6)],
    },
}


def signature_svg(spec):
    def shape(item, attr):
        if isinstance(item, tuple):
            return f'<circle cx="{num(item[1])}" cy="{num(item[2])}" r="{num(item[3])}"{attr}/>'
        return f'<path d="{item}"{attr}/>'

    body = "".join(shape(i, "") for i in spec["main"])
    body += "".join(shape(i, ' fill="var(--icon-accent, currentColor)"') for i in spec["accent"])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="currentColor">{body}</svg>\n'


# ---------------------------------------------------------------- Aperçu

GROUPS = [
    ("Navigation et structure", ["menu", "close", "chevron-left", "chevron-right", "chevron-down", "chevron-up", "arrow-left", "arrow-right", "search", "home", "grid", "external-link"]),
    ("Commerce", ["bag", "bag-plus", "plus", "minus", "trash", "tag", "percent", "clock", "package", "truck", "map-pin", "receipt", "filter", "sort", "zoom", "share"]),
    ("Fiche produit et conformité", ["flask", "book-open", "shield-alert", "stethoscope", "info", "scale"]),
    ("Communication", ["phone", "mail", "chat", "send"]),
    ("Statuts de commande", ["status-new", "status-confirmed", "status-preparing", "status-shipped", "status-delivered", "status-cancelled"]),
    ("Retours et états", ["check", "alert-circle", "alert-triangle", "wifi-off", "loader", "refresh", "download", "image", "eye", "eye-off", "lock"]),
    ("Admin", ["dashboard", "folder", "box", "clipboard-list", "inbox", "megaphone", "settings", "users", "history", "logout", "bell", "volume", "volume-off", "edit", "copy", "grip", "upload", "file-down", "printer", "calendar", "star", "globe", "file-draft", "archive", "more", "user"]),
]


def preview(interface, signature):
    def cell(name, svg, cls=""):
        return f'<figure class="{cls}">{svg.strip()}<figcaption>{name}</figcaption></figure>'

    sections = ""
    for title, names in GROUPS:
        sections += f"<h2>{title}</h2><div class='grid'>" + "".join(cell(n, interface[n]) for n in names) + "</div>"
    sections += "<h2>Signature (48 px)</h2><div class='grid sig'>" + "".join(cell(n, s, "sig") for n, s in signature.items()) + "</div>"
    small = "".join(interface[n].strip() for n in ["bag", "search", "truck", "tag", "phone", "shield-alert", "status-shipped", "clipboard-list", "megaphone", "printer", "wifi-off", "stethoscope"])
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Icônes Céleste Bôtchô — Trait doré</title>
<style>
:root {{ --icon-accent: #fdda4b; }}
body {{ margin: 0; padding: 24px 16px 48px; background: #140800; color: #efb830; font-family: system-ui, sans-serif; }}
main {{ max-width: 960px; margin: 0 auto; }}
h1 {{ font-family: Georgia, serif; font-size: 1.6rem; margin: 0 0 4px; }}
p {{ color: #cdb9a0; margin: 0 0 8px; }}
h2 {{ font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #cdb9a0; margin: 32px 0 12px; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }}
.grid.sig {{ grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); }}
figure {{ margin: 0; padding: 16px 4px 10px; border: 1px solid #3a2114; border-radius: 12px; text-align: center; background: #1c0f08; }}
figure svg {{ width: 28px; height: 28px; }}
figure.sig svg {{ width: 72px; height: 72px; }}
figcaption {{ margin-top: 8px; font-size: .68rem; color: #cdb9a0; word-break: break-word; }}
.small svg {{ width: 16px; height: 16px; margin-right: 12px; }}
.light {{ background: #fbf3e4; color: #24160d; padding: 12px; border-radius: 12px; margin-top: 8px; }}
.light svg {{ width: 24px; height: 24px; margin-right: 12px; }}
</style></head><body><main>
<h1>Céleste Bôtchô — « Trait doré »</h1>
<p>{len(interface)} icônes d'interface (24 px) et {len(signature)} illustrations signature (48 px).</p>
{sections}
<h2>Test de lisibilité à 16 px</h2><div class="small">{small}</div>
<h2>Sur fond clair (admin)</h2><div class="light">{small}</div>
</main></body></html>
"""


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(os.path.join(OUT, "interface"))
    os.makedirs(os.path.join(OUT, "signature"))
    interface = {name: interface_svg(items) for name, items in INTERFACE.items()}
    signature = {name: signature_svg(spec) for name, spec in SIGNATURE.items()}
    for name, svg in interface.items():
        with open(os.path.join(OUT, "interface", f"{name}.svg"), "w") as f:
            f.write(svg)
    for name, svg in signature.items():
        with open(os.path.join(OUT, "signature", f"{name}.svg"), "w") as f:
            f.write(svg)
    listed = {n for _, names in GROUPS for n in names}
    assert listed == set(INTERFACE), listed ^ set(INTERFACE)
    with open(os.path.join(OUT, "apercu.html"), "w") as f:
        f.write(preview(interface, signature))
    print(len(interface), "interface,", len(signature), "signature")


if __name__ == "__main__":
    main()
