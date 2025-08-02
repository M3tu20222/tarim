# mcp-servers/my-custom-mcp/test_server.py
import asyncio
import sys
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    """MCP sunucusunun araçlarını test etmek için asenkron fonksiyon."""
    # Sunucuyu çalıştıran launcher script'in tam yolunu al
    server_script = str(Path(__file__).parent / "server.py")
    
    # Sunucu parametrelerini oluştur
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[server_script],
        env=None
    )
    
    # İstemciyi oluştur ve bağlan
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            print("Sunucuya bağlanıldı. Araçlar test ediliyor...")

            # 1. Sözlük Araçlarını Test Et
            print("\n--- Sözlük Testleri ---")
            try:
                # Terim ekle
                add_result = await session.call_tool("add_definition", {
                    "term": "API", 
                    "definition": "Uygulama Programlama Arayüzü"
                })
                print(f"add_definition: {add_result}")

                # Terim getir
                get_result = await session.call_tool("get_definition", {
                    "term": "API"
                })
                print(f"get_definition: {get_result}")

                # Terimleri listele
                terms_result = await session.call_tool("list_terms", {})
                print(f"list_terms: {terms_result}")
                
                # Var olmayan terim
                not_found_result = await session.call_tool("get_definition", {
                    "term": "Bilinmeyen"
                })
                print(f"get_definition (olmayan): {not_found_result}")

            except Exception as e:
                print(f"Sözlük testleri sırasında hata: {e}")

            # 2. Kod Tarama Aracını Test Et
            print("\n--- Kod Tarama Testi ---")
            try:
                # Proje kök dizinini tara (iki üst dizin)
                project_root = str(Path(__file__).parent.parent.parent)
                scan_result = await session.call_tool("scan_project_files", {
                    "directory_path": project_root
                })
                print("scan_project_files sonucu (ilk 500 karakter):")
                # Sonucu doğru şekilde işle
                if hasattr(scan_result, 'content'):
                    content = scan_result.content[0].text if scan_result.content else str(scan_result)
                else:
                    content = str(scan_result)
                print(content[:500] + "...")
            except Exception as e:
                print(f"Kod tarama testi sırasında hata: {e}")

if __name__ == "__main__":
    asyncio.run(main())
