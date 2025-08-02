# mcp-servers/my-custom-mcp/main.py
import json
import sys
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# 1. Sunucuyu Başlat
server = FastMCP(
    "tarim_mcp",
    "Proje sözlüğünü yönetir ve kod dosyalarını tarar."
)

# 2. Sözlük (Glossary) Araçları
GLOSSARY_FILE = Path(__file__).parent / "glossary.json"

def load_glossary():
    """Sözlük dosyasını yükler. Eğer dosya yoksa boş bir sözlük oluşturur."""
    if not GLOSSARY_FILE.exists():
        return {}
    with GLOSSARY_FILE.open('r', encoding='utf-8') as f:
        return json.load(f)

def save_glossary(data):
    """Sözlük verisini dosyaya kaydeder."""
    with GLOSSARY_FILE.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@server.tool()
def get_definition(term: str) -> str:
    """
    Proje sözlüğünden belirli bir terimin tanımını alır.
    Eğer terim bulunamazsa, bir bildirim döndürür.
    """
    glossary = load_glossary()
    term_lower = term.lower()
    definition = glossary.get(term, glossary.get(term_lower))
    if definition:
        return f"'{term}' teriminin tanımı: {definition}"
    else:
        return f"'{term}' terimi sözlükte bulunamadı."

@server.tool()
def add_definition(term: str, definition: str) -> str:
    """
    Proje sözlüğüne yeni bir terim ve tanımını ekler veya mevcut bir terimi günceller.
    """
    glossary = load_glossary()
    glossary[term] = definition
    save_glossary(glossary)
    return f"Başarılı! '{term}' terimi sözlüğe eklendi/güncellendi."

@server.tool()
def list_terms() -> list:
    """Sözlükteki tüm terimleri listeler."""
    glossary = load_glossary()
    return list(glossary.keys())

# 3. Kod Tarama (Code Scanner) Araçları
CODE_EXTENSIONS = {'.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.cs', '.html', '.css'}
EXCLUDED_DIRS = {'node_modules', '.git', 'venv', '__pycache__', '.next', '.vscode'}

@server.tool()
def scan_project_files(directory_path: str = ".") -> str:
    """
    Verilen dizini (varsayılan olarak proje kök dizini) ve alt dizinlerini tarayarak
    tüm kod dosyalarının içeriğini birleştirilmiş tek bir metin olarak döndürür.
    """
    abs_path = Path(directory_path).resolve()
    if not abs_path.is_dir():
        return f"Hata: '{directory_path}' bir klasör değil."

    all_code_content = []
    try:
        for p in abs_path.rglob('*'):
            if p.is_file() and p.suffix in CODE_EXTENSIONS:
                # Klasör dışlamalarını kontrol et
                if any(excluded in p.parts for excluded in EXCLUDED_DIRS):
                    continue
                
                try:
                    content = p.read_text(encoding='utf-8', errors='ignore')
                    relative_path = p.relative_to(abs_path)
                    all_code_content.append(f"--- Dosya: {relative_path} ---\n\n{content}\n\n")
                except Exception as e:
                    relative_path = p.relative_to(abs_path)
                    all_code_content.append(f"--- Hata (Dosya Okunamadı): {relative_path} - {e} ---\n\n")
        
        if not all_code_content:
            return "Belirtilen klasörde okunacak kod dosyası bulunamadı."

        return "".join(all_code_content)
    except Exception as e:
        return f"Klasör taranırken bir hata oluştu: {e}"

# 4. Sunucuyu Çalıştır
if __name__ == "__main__":
    print("Tarım MCP Sunucusu çalışıyor...", file=sys.stderr)
    server.run(transport="stdio")
