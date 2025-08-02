# mcp_server.py
import os
import json
import sys
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# Cursor için stdio modunda çalışacak
mcp = FastMCP(
    "tarim_mcp",
    "Proje sözlüğü + kod tarama"
)

# ------------ GLOSSARY ------------
GLOSSARY_FILE = Path(__file__).with_name("glossary.json")
if not GLOSSARY_FILE.exists():
    GLOSSARY_FILE.write_text("{}")

@mcp.tool()
def add_definition(term: str, definition: str) -> str:
    """Sözlüğe yeni terim ekler."""
    data = json.loads(GLOSSARY_FILE.read_text(encoding="utf-8"))
    data[term] = definition
    GLOSSARY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return f"'{term}' eklendi."

@mcp.tool()
def get_definition(term: str) -> str:
    """Sözlükten tanım okur."""
    data = json.loads(GLOSSARY_FILE.read_text(encoding="utf-8"))
    return data.get(term, f"'{term}' bulunamadı.")

@mcp.tool()
def list_terms() -> list[str]:
    """Sözlükteki tüm terimleri listeler."""
    data = json.loads(GLOSSARY_FILE.read_text(encoding="utf-8"))
    return list(data.keys())

# ------------ CODE SCANNER ------------
@mcp.tool()
def scan_project_files() -> str:
    """Proje klasöründeki tüm kod dosyalarının isimlerini döndürür."""
    root = Path.cwd()
    code_files = [
        str(p.relative_to(root))
        for ext in [".py", ".js", ".ts", ".tsx", ".jsx"]
        for p in root.rglob(f"*{ext}")
    ]
    if not code_files:
        return "Kod dosyası bulunamadı."
    return "\n".join(code_files)

# ------------ ENTRY ------------
if __name__ == "__main__":
    mcp.run(transport="stdio")