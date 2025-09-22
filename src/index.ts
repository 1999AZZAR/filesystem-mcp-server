#!/usr/bin/env node

import { FileSystemMCPServer } from './server.js';

/**
 * FileSystem MCP Server Entry Point
 * 
 * This server provides comprehensive file system operations via the Model Context Protocol.
 * It includes file operations, directory management, file watching, search, and archiving.
 */

async function main(): Promise<void> {
  try {
    const server = new FileSystemMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start FileSystem MCP Server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});