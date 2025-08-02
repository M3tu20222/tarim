#!/usr/bin/env python3
"""
Example MCP server using FastMCP
"""

from mcp.server.fastmcp import FastMCP
import sys

# Create server instance
server = FastMCP("example-server", "An example MCP server")

@server.tool()
def hello(name: str = "World") -> str:
    """Say hello to someone"""
    return f"Hello, {name}!"

@server.tool()
def add_numbers(a: int, b: int) -> int:
    """Add two numbers together"""
    return a + b

if __name__ == "__main__":
    print("Example MCP Server starting...", file=sys.stderr)
    server.run(transport="stdio")
