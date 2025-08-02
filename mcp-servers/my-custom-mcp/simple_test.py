import asyncio
import sys
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_server():
    """Basit test fonksiyonu"""
    server_script = str(Path(__file__).parent / "server.py")
    
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[server_script]
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Önce araç listesini al
                tools = await session.list_tools()
                print("Mevcut araçlar:")
                for tool in tools:
                    print(f"  - {tool.name}: {tool.description}")
                
    except Exception as e:
        print(f"Bağlantı hatası: {e}")

if __name__ == "__main__":
    asyncio.run(test_server())
