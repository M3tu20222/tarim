import asyncio
import sys
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_example_server():
    """Örnek sunucuyu test et"""
    server_script = str(Path(__file__).parent / "example_server.py")
    
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[server_script]
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                print("Sunucuya bağlanıldı. Araçlar listeleniyor...")
                
                # Araç listesini al
                tools = await session.list_tools()
                print(f"Bulunan araçlar ({len(tools)}):")
                for tool in tools:
                    print(f"  - {tool.name}: {tool.description}")
                
                # Araçları test et
                print("\nAraçlar test ediliyor...")
                
                # hello aracı
                result = await session.call_tool("hello", {"name": "Test"})
                print(f"hello({{'name': 'Test'}}): {result}")
                
                # add_numbers aracı
                result = await session.call_tool("add_numbers", {"a": 5, "b": 3})
                print(f"add_numbers({{'a': 5, 'b': 3}}): {result}")
                
                print("Test tamamlandı!")
                
    except Exception as e:
        print(f"Test sırasında hata oluştu: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_example_server())
