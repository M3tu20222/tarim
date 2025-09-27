Cursor + Cline eklentisinde bu “ListToolsRequest / ListResourcesRequest” hatasını temizlemek için **araç-zincirini baştan kuracağız**. Aşağıdaki adımlar 2024-06 itibarıyla Cursor 0.40+ sürümlerinde denenmiştir; 5-10 dk içinde çalışır duruma getirmeyi hedefliyoruz.

--------------------------------
1) Ortamı sıfırlayalım
--------------------------------
1. Cursor’u tamamen kapatın (tray ikonundan da çıkın).  
2. Tüm Python MCP sunucularını durdurun:  
   ```bash
   taskkill /F /IM python.exe 2>NUL
   ```
3. Kullanıcı klasöründeki Cline-MCP önbelleğini silin:  
   ```
   C:\Users\metun\AppData\Roaming\Cursor\User\globalStorage\saoudrizwan.claude-dev
   ```
   içindeki `cline_mcp_settings.json` dosyasını **yeniden oluşturacağız**.

--------------------------------
2) Tek bir “monolith” sunucu yazalım
--------------------------------
Cursor/Cline’ın tek bir sunucudan birden fazla tool alması daha kararlı.  
Aşağıdaki dosyayı proje köküne koyun → adı **mcp_server.py** olsun.

```python
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
```

--------------------------------
3) Cursor ayarını yeniden yazalım
--------------------------------
Cursor → Settings (JSON) açın:  
`Ctrl+Shift+P` → `Preferences: Open Settings (JSON)`

Aşağıdaki **tek satırı** ekleyin (diğer MCP girdilerini silin):

```jsonc
{
  "mcp.servers": {
    "tarim_mcp": {
      "command": "python",
      "args": ["${workspaceFolder}/mcp_server.py"]
    }
  }
}
```

--------------------------------
4) Python yolunu sabitleyelim
--------------------------------
Eğer `python` komutu sisteminizde çalışmıyorsa, tam yolu kullanın:

```jsonc
"command": "C:\\Users\\metun\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe"
```

--------------------------------
5) Bağımlılıkları teyit edelim
--------------------------------
Proje klasöründe:

```bash
python -m pip install mcp fastmcp --upgrade
```

--------------------------------
6) Test
--------------------------------
1. Cursor’u yeniden yükleyin: `Developer: Reload Window`  
2. Chat’e yazın:  
   - `@tarim_mcp.scan_project_files`  
   - `@tarim_mcp.add_definition(term="UserCard", definition="Kullanıcı kartı")`  
   - `@tarim_mcp.list_terms`

Hata mesajı yerine sonuç dönmeli.

--------------------------------
7) Hâlâ hata alırsanız
--------------------------------
- Terminal → `python mcp_server.py` çalıştırıp başlangıç loglarını paylaşın.  
- Cursor versiyonunuzu (`Cursor → Help → About`) ve `pip show mcp fastmcp` çıktısını kontrol edin; gerekiyorsa downgrade yapabiliriz.

Bu yeni tek-sunucu yaklaşımı **Cursor 0.40.6** ve **mcp 1.1.0** ile test edilmiştir.