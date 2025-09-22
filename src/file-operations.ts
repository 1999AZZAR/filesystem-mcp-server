import { promises as fs } from 'fs';
import { dirname, basename, extname } from 'path';
import { ReadFileSchema, WriteFileSchema, CopyFileSchema, MoveFileSchema, DeleteFileSchema, GetFileInfoSchema } from './types.js';
import type { FileInfo, FileOperationResult, ReadFileArgs, WriteFileArgs, CopyFileArgs, MoveFileArgs, DeleteFileArgs, GetFileInfoArgs } from './types.js';

/**
 * Core file operations for the FileSystem MCP Server
 */
export class FileOperations {
  /**
   * Read file content with optional encoding and range
   */
  static async readFile(args: ReadFileArgs): Promise<FileOperationResult> {
    try {
      const { path, encoding = 'utf8', offset, limit } = ReadFileSchema.parse(args);
      
      // Check if file exists
      await fs.access(path);
      
      let content: string | Buffer;
      
      if (offset !== undefined || limit !== undefined) {
        // Read specific range
        const buffer = await fs.readFile(path);
        const start = offset || 0;
        const end = limit ? start + limit : buffer.length;
        const slice = buffer.slice(start, end);
        content = encoding === 'utf8' ? slice.toString(encoding) : slice;
      } else {
        // Read entire file
        content = await fs.readFile(path, encoding);
      }
      
      return {
        success: true,
        message: `File read successfully`,
        path,
        data: {
          content,
          encoding,
          size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, encoding)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Write content to file with optional encoding and directory creation
   */
  static async writeFile(args: WriteFileArgs): Promise<FileOperationResult> {
    try {
      const { path, content, encoding = 'utf8', createDirs = false, append = false } = WriteFileSchema.parse(args);
      
      // Create directories if needed
      if (createDirs) {
        await fs.mkdir(dirname(path), { recursive: true });
      }
      
      // Write file
      const flag = append ? 'a' : 'w';
      await fs.writeFile(path, content, { encoding, flag });
      
      return {
        success: true,
        message: `File ${append ? 'appended to' : 'written'} successfully`,
        path,
        data: {
          size: Buffer.byteLength(content, encoding),
          encoding,
          created: !append
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Copy file from source to destination
   */
  static async copyFile(args: CopyFileArgs): Promise<FileOperationResult> {
    try {
      const { source, destination, overwrite = false, preserveTimestamps = true } = CopyFileSchema.parse(args);
      
      // Check if source exists
      await fs.access(source);
      
      // Check if destination exists and overwrite is not allowed
      try {
        await fs.access(destination);
        if (!overwrite) {
          return {
            success: false,
            message: 'Destination file exists and overwrite is disabled',
            path: destination,
            error: 'File exists'
          };
        }
      } catch {
        // Destination doesn't exist, which is fine
      }
      
      // Create destination directory if needed
      await fs.mkdir(dirname(destination), { recursive: true });
      
      // Copy file
      await fs.copyFile(source, destination);
      
      // Preserve timestamps if requested
      if (preserveTimestamps) {
        const stats = await fs.stat(source);
        await fs.utimes(destination, stats.atime, stats.mtime);
      }
      
      return {
        success: true,
        message: 'File copied successfully',
        path: destination,
        data: {
          source,
          destination,
          size: (await fs.stat(destination)).size
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.destination,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Move file from source to destination
   */
  static async moveFile(args: MoveFileArgs): Promise<FileOperationResult> {
    try {
      const { source, destination, overwrite = false } = MoveFileSchema.parse(args);
      
      // Check if source exists
      await fs.access(source);
      
      // Check if destination exists and overwrite is not allowed
      try {
        await fs.access(destination);
        if (!overwrite) {
          return {
            success: false,
            message: 'Destination file exists and overwrite is disabled',
            path: destination,
            error: 'File exists'
          };
        }
      } catch {
        // Destination doesn't exist, which is fine
      }
      
      // Create destination directory if needed
      await fs.mkdir(dirname(destination), { recursive: true });
      
      // Move file
      await fs.rename(source, destination);
      
      return {
        success: true,
        message: 'File moved successfully',
        path: destination,
        data: {
          source,
          destination,
          size: (await fs.stat(destination)).size
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.destination,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete file or directory
   */
  static async deleteFile(args: DeleteFileArgs): Promise<FileOperationResult> {
    try {
      const { path, recursive = false, force = false } = DeleteFileSchema.parse(args);
      
      // Check if path exists
      try {
        await fs.access(path);
      } catch {
        if (!force) {
          return {
            success: false,
            message: 'Path does not exist',
            path,
            error: 'Path not found'
          };
        }
        return {
          success: true,
          message: 'Path does not exist (ignored due to force flag)',
          path
        };
      }
      
      const stats = await fs.stat(path);
      
      if (stats.isDirectory()) {
        if (!recursive) {
          return {
            success: false,
            message: 'Cannot delete directory without recursive flag',
            path,
            error: 'Directory requires recursive deletion'
          };
        }
        await fs.rmdir(path, { recursive: true });
      } else {
        await fs.unlink(path);
      }
      
      return {
        success: true,
        message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted successfully`,
        path,
        data: {
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get detailed file information
   */
  static async getFileInfo(args: GetFileInfoArgs): Promise<FileOperationResult> {
    try {
      const { path, followSymlinks = true } = GetFileInfoSchema.parse(args);
      
      const stats = followSymlinks ? await fs.stat(path) : await fs.lstat(path);
      const extension = extname(path);
      const mimeType = extension ? await this.getMimeType(extension) : undefined;
      
      const fileInfo: FileInfo = {
        name: basename(path),
        path,
        type: stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'symlink',
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymlink: stats.isSymbolicLink(),
        permissions: stats.mode.toString(8),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        accessedAt: stats.atime,
        extension: extension || undefined,
        mimeType
      };
      
      return {
        success: true,
        message: 'File information retrieved successfully',
        path,
        data: fileInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get MIME type for file extension
   */
  private static async getMimeType(extension: string): Promise<string | undefined> {
    try {
      const mime = await import('mime-types');
      return mime.lookup(extension) || undefined;
    } catch {
      return undefined;
    }
  }
}