import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { FileOperations } from './file-operations.js';
import { DirectoryOperations } from './directory-operations.js';
import { AdvancedOperations } from './advanced-operations.js';
import {
  ReadFileSchema,
  WriteFileSchema,
  CopyFileSchema,
  MoveFileSchema,
  DeleteFileSchema,
  CreateDirectorySchema,
  ListDirectorySchema,
  FindFilesSchema,
  SearchInFilesSchema,
  WatchFileSchema,
  CompareFilesSchema,
  ArchiveFilesSchema,
  GetFileInfoSchema
} from './types.js';

/**
 * FileSystem MCP Server
 * Provides comprehensive file system operations via Model Context Protocol
 */
export class FileSystemMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'filesystem-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read file content with optional encoding and range',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to read' },
                encoding: { 
                  type: 'string', 
                  enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii', 'binary'],
                  default: 'utf8',
                  description: 'File encoding'
                },
                offset: { type: 'number', description: 'Byte offset to start reading from' },
                limit: { type: 'number', description: 'Maximum number of bytes to read' }
              },
              required: ['path']
            }
          },
          {
            name: 'write_file',
            description: 'Write content to file with optional encoding and directory creation',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to write' },
                content: { type: 'string', description: 'Content to write to the file' },
                encoding: { 
                  type: 'string', 
                  enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii', 'binary'],
                  default: 'utf8',
                  description: 'File encoding'
                },
                createDirs: { type: 'boolean', default: false, description: 'Create parent directories if they don\'t exist' },
                append: { type: 'boolean', default: false, description: 'Append to file instead of overwriting' }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'copy_file',
            description: 'Copy file from source to destination',
            inputSchema: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'Source file path' },
                destination: { type: 'string', description: 'Destination file path' },
                overwrite: { type: 'boolean', default: false, description: 'Overwrite destination if it exists' },
                preserveTimestamps: { type: 'boolean', default: true, description: 'Preserve file timestamps' }
              },
              required: ['source', 'destination']
            }
          },
          {
            name: 'move_file',
            description: 'Move file from source to destination',
            inputSchema: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'Source file path' },
                destination: { type: 'string', description: 'Destination file path' },
                overwrite: { type: 'boolean', default: false, description: 'Overwrite destination if it exists' }
              },
              required: ['source', 'destination']
            }
          },
          {
            name: 'delete_file',
            description: 'Delete file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to delete' },
                recursive: { type: 'boolean', default: false, description: 'Recursively delete directories' },
                force: { type: 'boolean', default: false, description: 'Force deletion even if path doesn\'t exist' }
              },
              required: ['path']
            }
          },
          {
            name: 'get_file_info',
            description: 'Get detailed file information including metadata',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to get information for' },
                followSymlinks: { type: 'boolean', default: true, description: 'Follow symbolic links' }
              },
              required: ['path']
            }
          },
          {
            name: 'create_directory',
            description: 'Create directory with optional recursive creation',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path to create' },
                recursive: { type: 'boolean', default: false, description: 'Create parent directories recursively' },
                mode: { type: 'string', description: 'Directory permissions in octal format' }
              },
              required: ['path']
            }
          },
          {
            name: 'list_directory',
            description: 'List directory contents with optional filtering and recursion',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path to list' },
                recursive: { type: 'boolean', default: false, description: 'List contents recursively' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files and directories' },
                maxDepth: { type: 'number', description: 'Maximum depth for recursive listing' },
                fileTypes: { 
                  type: 'array', 
                  items: { type: 'string', enum: ['file', 'directory', 'symlink'] },
                  description: 'Filter by file types'
                }
              },
              required: ['path']
            }
          },
          {
            name: 'find_files',
            description: 'Find files matching a pattern',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: 'Glob pattern to match files' },
                directory: { type: 'string', default: '.', description: 'Directory to search in' },
                maxDepth: { type: 'number', description: 'Maximum search depth' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files' },
                fileTypes: { 
                  type: 'array', 
                  items: { type: 'string', enum: ['file', 'directory', 'symlink'] },
                  description: 'Filter by file types'
                },
                caseSensitive: { type: 'boolean', default: false, description: 'Case-sensitive pattern matching' }
              },
              required: ['pattern']
            }
          },
          {
            name: 'search_in_files',
            description: 'Search for text patterns in files',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: 'Text pattern to search for' },
                directory: { type: 'string', default: '.', description: 'Directory to search in' },
                filePattern: { type: 'string', description: 'Glob pattern for files to search' },
                maxDepth: { type: 'number', description: 'Maximum search depth' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files' },
                caseSensitive: { type: 'boolean', default: false, description: 'Case-sensitive search' },
                wholeWord: { type: 'boolean', default: false, description: 'Match whole words only' },
                contextLines: { type: 'number', default: 2, description: 'Number of context lines around matches' }
              },
              required: ['pattern']
            }
          },
          {
            name: 'watch_file',
            description: 'Watch file or directory for changes',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to watch' },
                recursive: { type: 'boolean', default: false, description: 'Watch recursively' },
                ignoreInitial: { type: 'boolean', default: true, description: 'Ignore initial events' },
                ignored: { type: 'array', items: { type: 'string' }, description: 'Patterns to ignore' }
              },
              required: ['path']
            }
          },
          {
            name: 'stop_watching',
            description: 'Stop watching a file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to stop watching' }
              },
              required: ['path']
            }
          },
          {
            name: 'compare_files',
            description: 'Compare two files and show differences',
            inputSchema: {
              type: 'object',
              properties: {
                file1: { type: 'string', description: 'First file path' },
                file2: { type: 'string', description: 'Second file path' },
                ignoreWhitespace: { type: 'boolean', default: false, description: 'Ignore whitespace differences' },
                ignoreCase: { type: 'boolean', default: false, description: 'Ignore case differences' }
              },
              required: ['file1', 'file2']
            }
          },
          {
            name: 'archive_files',
            description: 'Create archive from files',
            inputSchema: {
              type: 'object',
              properties: {
                files: { type: 'array', items: { type: 'string' }, description: 'Files to archive' },
                archivePath: { type: 'string', description: 'Archive file path' },
                format: { type: 'string', enum: ['zip', 'tar', 'gzip'], default: 'zip', description: 'Archive format' },
                compressionLevel: { type: 'number', default: 6, description: 'Compression level (0-9)' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files' },
                excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Patterns to exclude' }
              },
              required: ['files', 'archivePath']
            }
          },
          {
            name: 'extract_archive',
            description: 'Extract archive to destination',
            inputSchema: {
              type: 'object',
              properties: {
                archivePath: { type: 'string', description: 'Archive file path' },
                destination: { type: 'string', description: 'Extraction destination' }
              },
              required: ['archivePath', 'destination']
            }
          },
          {
            name: 'get_directory_size',
            description: 'Get directory size recursively',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path' }
              },
              required: ['path']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file':
            const readResult = await FileOperations.readFile(ReadFileSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(readResult, null, 2) }] };
          
          case 'write_file':
            const writeResult = await FileOperations.writeFile(WriteFileSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(writeResult, null, 2) }] };
          
          case 'copy_file':
            const copyResult = await FileOperations.copyFile(CopyFileSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(copyResult, null, 2) }] };
          
          case 'move_file':
            const moveResult = await FileOperations.moveFile(MoveFileSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(moveResult, null, 2) }] };
          
          case 'delete_file':
            const deleteResult = await FileOperations.deleteFile(DeleteFileSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(deleteResult, null, 2) }] };
          
          case 'get_file_info':
            const infoResult = await FileOperations.getFileInfo(GetFileInfoSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(infoResult, null, 2) }] };
          
          case 'create_directory':
            const createDirResult = await DirectoryOperations.createDirectory(CreateDirectorySchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(createDirResult, null, 2) }] };
          
          case 'list_directory':
            const listResult = await DirectoryOperations.listDirectory(ListDirectorySchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(listResult, null, 2) }] };
          
          case 'find_files':
            const findResult = await DirectoryOperations.findFiles(FindFilesSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(findResult, null, 2) }] };
          
          case 'search_in_files':
            const searchResult = await AdvancedOperations.searchInFiles(SearchInFilesSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(searchResult, null, 2) }] };
          
          case 'watch_file':
            const watchResult = await AdvancedOperations.watchFile(WatchFileSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(watchResult, null, 2) }] };
          
          case 'stop_watching':
            const stopWatchResult = await AdvancedOperations.stopWatching(args?.['path'] as string);
            return { content: [{ type: 'text', text: JSON.stringify(stopWatchResult, null, 2) }] };
          
          case 'compare_files':
            const compareResult = await AdvancedOperations.compareFiles(CompareFilesSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(compareResult, null, 2) }] };
          
          case 'archive_files':
            const archiveResult = await AdvancedOperations.archiveFiles(ArchiveFilesSchema.parse(args));
            return { content: [{ type: 'text', text: JSON.stringify(archiveResult, null, 2) }] };
          
          case 'extract_archive':
            const extractResult = await AdvancedOperations.extractArchive(args?.['archivePath'] as string, args?.['destination'] as string);
            return { content: [{ type: 'text', text: JSON.stringify(extractResult, null, 2) }] };
          
          case 'get_directory_size':
            const sizeResult = await DirectoryOperations.getDirectorySize(args?.['path'] as string);
            return { content: [{ type: 'text', text: JSON.stringify(sizeResult, null, 2) }] };
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            success: false,
            message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]
        };
      }
    });
  }

  private setupErrorHandling(): void {
    // Handle process cleanup
    process.on('SIGINT', async () => {
      await AdvancedOperations.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await AdvancedOperations.cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await AdvancedOperations.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled Rejection:', reason);
      await AdvancedOperations.cleanup();
      process.exit(1);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FileSystem MCP Server running on stdio');
  }
}