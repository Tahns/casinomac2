"""Build demo/stellar_vigil_demo.html: one self-contained file (books.js and art/*.webp inlined) for phones.

Usage: python3 demo/build_single.py
"""

import base64
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
import sys
VARIANT = sys.argv[1] if len(sys.argv) > 1 else ""  # "wheels" -> books_wheels.js -> stellar_vigil_demo_wheels.html


def data_uri(path: str) -> str:
    with open(os.path.join(HERE, path), "rb") as f:
        return "data:image/webp;base64," + base64.b64encode(f.read()).decode()


html = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
books = open(os.path.join(HERE, "books_wheels.js" if VARIANT == "wheels" else "books.js"), encoding="utf-8").read()
html = html.replace('<script src="books.js"></script>', "<script>" + books + "</script>")
html = re.sub(r'((?:src|href)=\\?")art/([A-Za-z0-9_]+\.webp)(\\?")', lambda m: m.group(1) + data_uri("art/" + m.group(2)) + m.group(3), html)
html = re.sub(r"url\(art/([A-Za-z0-9_]+\.webp)\)", lambda m: "url(" + data_uri("art/" + m.group(1)) + ")", html)
out = os.path.join(HERE, "stellar_vigil_demo_wheels.html" if VARIANT == "wheels" else "stellar_vigil_demo.html")
open(out, "w", encoding="utf-8").write(html)
print(out, round(os.path.getsize(out) / 1024), "KB")
