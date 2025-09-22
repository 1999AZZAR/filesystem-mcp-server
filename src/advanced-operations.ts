import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { glob } from 'glob';
import archiver from 'archiver';
import chokidar from 'chokidar';
import { SearchInFilesSchema, WatchFileSchema, CompareFilesSchema, ArchiveFilesSchema } from './types.js';
import type { FileOperationResult, SearchInFilesArgs, WatchFileArgs, CompareFilesArgs, ArchiveFilesArgs, SearchResult, FileWatchEvent } from './types.js';
import { FileOperations } from './file-operations.js';

/**
 * Advanced operations for the FileSystem MCP Server
 */
export class AdvancedOperations {
  private static watchers = new Map<string, chokidar.FSWatcher>();

  /**
   * Search for text patterns in files
   */
  static async searchInFiles(args: SearchInFilesArgs): Promise<FileOperationResult> {
    try {
      const {
        pattern,
        directory = '.',
        filePattern,
        maxDepth,
        includeHidden = false,
        caseSensitive = false,
        wholeWord = false,
        contextLines = 2
      } = SearchInFilesSchema.parse(args);

      const resolvedDir = resolve(directory);
      const results: SearchResult[] = [];

      // Build file pattern for glob
      const searchPattern = filePattern || '**/*';
      const globOptions: any = {
        cwd: resolvedDir,
        dot: includeHidden,
        caseSensitiveMatch: caseSensitive
      };

      if (maxDepth !== undefined) {
        const depthPattern = maxDepth === 1 ? '' : '/*'.repeat(maxDepth - 1);
        globOptions.pattern = join(searchPattern, depthPattern);
      } else {
        globOptions.pattern = searchPattern;
      }

      const files = await glob(globOptions.pattern || searchPattern, globOptions);

      // Create regex pattern
      let regexPattern = pattern;
      if (wholeWord) {
        regexPattern = `\\b${regexPattern}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(regexPattern, flags);

      // Search in each file
      for (const file of files) {
        try {
          const fullPath = join(resolvedDir, file);
          const fileInfo = await FileOperations.getFileInfo({ path: fullPath, followSymlinks: true });
          
          if (!fileInfo.success || !fileInfo.data?.isFile) {
            continue;
          }

          const content = await fs.readFile(fullPath, 'utf8');
          const lines = content.split('\n');
          const matches: any[] = [];

          // Search for matches
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(line)) !== null) {
              const startLine = Math.max(0, i - contextLines);
              const endLine = Math.min(lines.length - 1, i + contextLines);
              const context = lines.slice(startLine, endLine + 1).join('\n');

              matches.push({
                line: i + 1,
                column: match.index + 1,
                text: match[0],
                context: context
              });
            }
            regex.lastIndex = 0; // Reset regex for next line
          }

          if (matches.length > 0) {
            results.push({
              path: fullPath,
              matches,
              fileInfo: fileInfo.data
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }

      return {
        success: true,
        message: `Search completed: ${results.length} files with matches`,
        path: directory,
        data: {
          results,
          totalMatches: results.reduce((sum, result) => sum + result.matches.length, 0),
          pattern,
          directory: resolvedDir
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search in files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.directory || '.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Watch file or directory for changes
   */
  static async watchFile(args: WatchFileArgs): Promise<FileOperationResult> {
    try {
      const { path, recursive = false, ignoreInitial = true, ignored } = WatchFileSchema.parse(args);

      // Check if path exists
      await fs.access(path);

      // Stop existing watcher if any
      if (this.watchers.has(path)) {
        await this.stopWatching(path);
      }

      const watcher = chokidar.watch(path, {
        ignored: ignored || /(^|[\/\\])\../, // ignore dotfiles by default
        persistent: true,
        ignoreInitial,
        followSymlinks: false,
        depth: recursive ? undefined : 0
      } as any);

      this.watchers.set(path, watcher);

      const events: FileWatchEvent[] = [];

      watcher
        .on('add', (filePath, stats) => {
          events.push({
            type: 'add',
            path: filePath,
            stats: stats ? this.statsToFileInfo(filePath, stats) : undefined
          });
        })
        .on('change', (filePath, stats) => {
          events.push({
            type: 'change',
            path: filePath,
            stats: stats ? this.statsToFileInfo(filePath, stats) : undefined
          });
        })
        .on('unlink', (filePath) => {
          events.push({
            type: 'unlink',
            path: filePath
          });
        })
        .on('addDir', (dirPath, stats) => {
          events.push({
            type: 'addDir',
            path: dirPath,
            stats: stats ? this.statsToFileInfo(dirPath, stats) : undefined
          });
        })
        .on('unlinkDir', (dirPath) => {
          events.push({
            type: 'unlinkDir',
            path: dirPath
          });
        })
        .on('error', (error) => {
          console.error('Watcher error:', error);
        });

      return {
        success: true,
        message: 'File watching started successfully',
        path,
        data: {
          watching: true,
          recursive,
          ignoreInitial,
          events: events.slice(-10) // Return last 10 events
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start watching: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stop watching a file or directory
   */
  static async stopWatching(path: string): Promise<FileOperationResult> {
    try {
      const watcher = this.watchers.get(path);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(path);
        return {
          success: true,
          message: 'Watching stopped successfully',
          path,
          data: { watching: false }
        };
      } else {
        return {
          success: false,
          message: 'No active watcher found for path',
          path,
          error: 'Watcher not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop watching: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Compare two files
   */
  static async compareFiles(args: CompareFilesArgs): Promise<FileOperationResult> {
    try {
      const { file1, file2, ignoreWhitespace = false, ignoreCase = false } = CompareFilesSchema.parse(args);

      // Check if both files exist
      await fs.access(file1);
      await fs.access(file2);

      const content1 = await fs.readFile(file1, 'utf8');
      const content2 = await fs.readFile(file2, 'utf8');

      let processedContent1 = content1;
      let processedContent2 = content2;

      if (ignoreWhitespace) {
        processedContent1 = content1.replace(/\s+/g, ' ').trim();
        processedContent2 = content2.replace(/\s+/g, ' ').trim();
      }

      if (ignoreCase) {
        processedContent1 = processedContent1.toLowerCase();
        processedContent2 = processedContent2.toLowerCase();
      }

      const lines1 = processedContent1.split('\n');
      const lines2 = processedContent2.split('\n');

      const differences: Array<{
        line: number;
        type: 'added' | 'removed' | 'modified';
        content: string;
      }> = [];

      const maxLines = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';

        if (line1 !== line2) {
          if (i >= lines1.length) {
            differences.push({ line: i + 1, type: 'added', content: line2 });
          } else if (i >= lines2.length) {
            differences.push({ line: i + 1, type: 'removed', content: line1 });
          } else {
            differences.push({ line: i + 1, type: 'modified', content: `- ${line1}\n+ ${line2}` });
          }
        }
      }

      const identical = differences.length === 0;

      return {
        success: true,
        message: identical ? 'Files are identical' : `Files differ: ${differences.length} differences found`,
        path: file1,
        data: {
          identical,
          differences,
          totalDifferences: differences.length,
          file1: { path: file1, lines: lines1.length, size: content1.length },
          file2: { path: file2, lines: lines2.length, size: content2.length },
          options: { ignoreWhitespace, ignoreCase }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to compare files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.file1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create archive from files
   */
  static async archiveFiles(args: ArchiveFilesArgs): Promise<FileOperationResult> {
    try {
      const {
        files,
        archivePath,
        format = 'zip',
        compressionLevel = 6
      } = ArchiveFilesSchema.parse(args);

      // Check if all source files exist
      for (const file of files) {
        await fs.access(file);
      }

      // Create archive
      const archive = archiver(format as any, {
        zlib: { level: compressionLevel }
      });

      const { createWriteStream } = await import('fs');
      const output = createWriteStream(archivePath);
      archive.pipe(output);

      // Add files to archive
      for (const file of files) {
        const stats = await fs.stat(file);
        if (stats.isDirectory()) {
          archive.directory(file, file);
        } else {
          archive.file(file, { name: file });
        }
      }

      await archive.finalize();

      // Wait for archive to complete
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', reject);
      });

      const archiveStats = await fs.stat(archivePath);

      return {
        success: true,
        message: 'Archive created successfully',
        path: archivePath,
        data: {
          archivePath,
          format,
          compressionLevel,
          size: archiveStats.size,
          filesCount: files.length,
          humanReadable: this.formatBytes(archiveStats.size)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: args.archivePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract archive
   */
  static async extractArchive(archivePath: string, destination: string): Promise<FileOperationResult> {
    try {
      await fs.access(archivePath);
      await fs.mkdir(destination, { recursive: true });

      // For now, we'll use a simple implementation
      // In a real implementation, you'd use proper archive extraction libraries
      const { createReadStream } = await import('fs');
      const stream = createReadStream(archivePath);
      const unzipper = await import('unzipper');
      const extract = stream.pipe(unzipper.Extract({ path: destination }));

      await new Promise((resolve, reject) => {
        extract.on('close', resolve);
        extract.on('error', reject);
      });

      return {
        success: true,
        message: 'Archive extracted successfully',
        path: destination,
        data: {
          archivePath,
          destination,
          extracted: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to extract archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: destination,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert fs.Stats to FileInfo
   */
  private static statsToFileInfo(path: string, stats: any): any {
    return {
      name: require('path').basename(path),
      path,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymlink: stats.isSymbolicLink(),
      permissions: stats.mode.toString(8),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime
    };
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

  /**
   * Cleanup all watchers
   */
  static async cleanup(): Promise<void> {
    for (const [, watcher] of this.watchers) {
      try {
        await watcher.close();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.watchers.clear();
  }
}