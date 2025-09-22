import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { glob } from 'glob';
import { CreateDirectorySchema, ListDirectorySchema, FindFilesSchema } from './types.js';
import type { FileInfo, FileOperationResult, CreateDirectoryArgs, ListDirectoryArgs, FindFilesArgs } from './types.js';
import { FileOperations } from './file-operations.js';

/**
 * Directory operations for the FileSystem MCP Server
 */
export class DirectoryOperations {
  /**
   * Create directory with optional recursive creation
   */
  static async createDirectory(args: CreateDirectoryArgs): Promise<FileOperationResult> {
    try {
      const { path, recursive = false, mode } = CreateDirectorySchema.parse(args);
      
      const options: any = { recursive };
      if (mode) {
        options.mode = parseInt(mode, 8);
      }
      
      await fs.mkdir(path, options);
      
      return {
        success: true,
        message: 'Directory created successfully',
        path,
        data: {
          created: true,
          recursive
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List directory contents with optional filtering and recursion
   */
  static async listDirectory(args: ListDirectoryArgs): Promise<FileOperationResult> {
    try {
      const { path, recursive = false, includeHidden = false, maxDepth, fileTypes } = ListDirectorySchema.parse(args);
      
      // Check if directory exists
      await fs.access(path);
      
      const items: FileInfo[] = [];
      await this.traverseDirectory(path, items, {
        recursive,
        includeHidden,
        maxDepth: maxDepth || (recursive ? Infinity : 1),
        fileTypes: fileTypes,
        basePath: path
      });
      
      return {
        success: true,
        message: `Directory listed successfully (${items.length} items)`,
        path,
        data: {
          items,
          count: items.length,
          recursive,
          includeHidden
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find files matching a pattern
   */
  static async findFiles(args: FindFilesArgs): Promise<FileOperationResult> {
    try {
      const { pattern, directory = '.', includeHidden = false, fileTypes, caseSensitive = false } = FindFilesSchema.parse(args);
      
      const resolvedDir = resolve(directory);
      
      // Build glob options
      const globOptions: any = {
        cwd: resolvedDir,
        nodir: fileTypes?.includes('directory') === false,
        dot: includeHidden,
        caseSensitiveMatch: caseSensitive
      };
      
      // Use the pattern directly with glob
      const matches = await glob(pattern, globOptions);
      
      // Get file info for each match
      const fileInfos: FileInfo[] = [];
      for (const match of matches) {
        try {
          const fullPath = join(resolvedDir, match);
          const result = await FileOperations.getFileInfo({ path: fullPath, followSymlinks: true });
          if (result.success && result.data) {
            fileInfos.push(result.data);
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
      
      // Filter by file types if specified
      const filteredInfos = fileTypes ? fileInfos.filter(info => fileTypes.includes(info.type as 'file' | 'directory' | 'symlink')) : fileInfos;
      
      return {
        success: true,
        message: `Found ${filteredInfos.length} files matching pattern`,
        path: directory,
        data: {
          files: filteredInfos,
          count: filteredInfos.length,
          pattern,
          directory: resolvedDir
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to find files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.directory || '.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Recursively traverse directory and collect file information
   */
  private static async traverseDirectory(
    dirPath: string,
    items: FileInfo[],
    options: {
      recursive: boolean;
      includeHidden: boolean;
      maxDepth: number;
      fileTypes?: string[] | undefined;
      basePath: string;
      currentDepth?: number;
    }
  ): Promise<void> {
    const currentDepth = options.currentDepth || 0;
    
    if (currentDepth >= options.maxDepth) {
      return;
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        // Skip hidden files if not included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        try {
          const result = await FileOperations.getFileInfo({ path: fullPath, followSymlinks: true });
          if (result.success && result.data) {
            const fileInfo = result.data;
            
            // Filter by file types if specified
            if (!options.fileTypes || options.fileTypes.includes(fileInfo.type)) {
              items.push(fileInfo);
            }
            
            // Recursively traverse subdirectories
            if (options.recursive && fileInfo.isDirectory && currentDepth < options.maxDepth - 1) {
              await this.traverseDirectory(fullPath, items, {
                ...options,
                currentDepth: currentDepth + 1
              });
            }
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch (error) {
      // Skip directories that can't be accessed
    }
  }

  /**
   * Get directory size recursively
   */
  static async getDirectorySize(path: string): Promise<FileOperationResult> {
    try {
      let totalSize = 0;
      let fileCount = 0;
      let dirCount = 0;
      
      await this.calculateDirectorySize(path, { totalSize, fileCount, dirCount });
      
      return {
        success: true,
        message: 'Directory size calculated successfully',
        path,
        data: {
          totalSize,
          fileCount,
          dirCount,
          humanReadable: this.formatBytes(totalSize)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to calculate directory size: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate directory size recursively
   */
  private static async calculateDirectorySize(
    dirPath: string,
    stats: { totalSize: number; fileCount: number; dirCount: number }
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        try {
          if (entry.isDirectory()) {
            stats.dirCount++;
            await this.calculateDirectorySize(fullPath, stats);
          } else {
            const fileStats = await fs.stat(fullPath);
            stats.totalSize += fileStats.size;
            stats.fileCount++;
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch {
      // Skip directories that can't be accessed
    }
  }

  /**
   * Format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}