import logging
import pathlib
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import asyncio
import mcp.types as types

# Log dosyasını betiğin yanına oluştur
log_dir = pathlib.Path(__file__).parent
log_file_path = log_dir / 'my_mcp_server.log'
logging.basicConfig(filename=log_file_path, level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logging.info("MCP sunucusu başlatılıyor...")

server = Server("my-tools")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="hello_world",
            description="Merhaba dünya örneği",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "İsim"
                    }
                },
                "required": ["name"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    if name == "hello_world":
        return [types.TextContent(type="text", text=f"Merhaba, {arguments['name']}!")]
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="my-tools",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    try:
        logging.info("Ana fonksiyon çalıştırılıyor.")
        asyncio.run(main())
        logging.info("Sunucu başarıyla çalıştı ve sonlandı.")
    except Exception as e:
        logging.error(f"Sunucu çalışırken bir hata oluştu: {e}", exc_info=True)
        raise
