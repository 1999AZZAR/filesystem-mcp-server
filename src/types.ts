import { z } from 'zod';

// File system operation types
export type FileEncoding = 'utf8' | 'utf16le' | 'latin1' | 'base64' | 'hex' | 'ascii' | 'binary';
export type ArchiveFormat = 'zip' | 'tar' | 'gzip';
export type FileType = 'file' | 'directory' | 'symlink' | 'unknown';

// File information interface
export interface FileInfo {
  name: string;
  path: string;
  type: FileType;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  permissions: string;
  createdAt: Date;
  modifiedAt: Date;
  accessedAt: Date;
  extension: string | undefined;
  mimeType: string | undefined;
}

// File operation result interface
export interface FileOperationResult {
  success: boolean;
  message: string;
  path?: string;
  data?: any;
  error?: string;
}

// File watch event interface
export interface FileWatchEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  stats?: FileInfo;
}

// Search result interface
export interface SearchResult {
  path: string;
  matches: Array<{
    line: number;
    column: number;
    text: string;
    context: string;
  }>;
  fileInfo: FileInfo;
}

// Archive operation interface
export interface ArchiveOptions {
  format: ArchiveFormat;
  compressionLevel?: number;
  includeHidden?: boolean;
  excludePatterns?: string[];
}

// Validation schemas
export const ReadFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  encoding: z.enum(['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii', 'binary']).optional().default('utf8'),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).optional()
});

export const WriteFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  content: z.string(),
  encoding: z.enum(['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii', 'binary']).optional().default('utf8'),
  createDirs: z.boolean().optional().default(false),
  append: z.boolean().optional().default(false)
});

export const CopyFileSchema = z.object({
  source: z.string().min(1, 'Source path is required'),
  destination: z.string().min(1, 'Destination path is required'),
  overwrite: z.boolean().optional().default(false),
  preserveTimestamps: z.boolean().optional().default(true)
});

export const MoveFileSchema = z.object({
  source: z.string().min(1, 'Source path is required'),
  destination: z.string().min(1, 'Destination path is required'),
  overwrite: z.boolean().optional().default(false)
});

export const DeleteFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional().default(false),
  force: z.boolean().optional().default(false)
});

export const CreateDirectorySchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional().default(false),
  mode: z.string().optional()
});

export const ListDirectorySchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional().default(false),
  includeHidden: z.boolean().optional().default(false),
  maxDepth: z.number().int().min(1).optional(),
  fileTypes: z.array(z.enum(['file', 'directory', 'symlink'])).optional()
});

export const FindFilesSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  directory: z.string().optional().default('.'),
  maxDepth: z.number().int().min(1).optional(),
  includeHidden: z.boolean().optional().default(false),
  fileTypes: z.array(z.enum(['file', 'directory', 'symlink'])).optional(),
  caseSensitive: z.boolean().optional().default(false)
});

export const SearchInFilesSchema = z.object({
  pattern: z.string().min(1, 'Search pattern is required'),
  directory: z.string().optional().default('.'),
  filePattern: z.string().optional(),
  maxDepth: z.number().int().min(1).optional(),
  includeHidden: z.boolean().optional().default(false),
  caseSensitive: z.boolean().optional().default(false),
  wholeWord: z.boolean().optional().default(false),
  contextLines: z.number().int().min(0).optional().default(2)
});

export const WatchFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional().default(false),
  ignoreInitial: z.boolean().optional().default(true),
  ignored: z.array(z.string()).optional()
});

export const CompareFilesSchema = z.object({
  file1: z.string().min(1, 'First file path is required'),
  file2: z.string().min(1, 'Second file path is required'),
  ignoreWhitespace: z.boolean().optional().default(false),
  ignoreCase: z.boolean().optional().default(false)
});

export const ArchiveFilesSchema = z.object({
  files: z.array(z.string()).min(1, 'At least one file is required'),
  archivePath: z.string().min(1, 'Archive path is required'),
  format: z.enum(['zip', 'tar', 'gzip']).optional().default('zip'),
  compressionLevel: z.number().int().min(0).max(9).optional().default(6),
  includeHidden: z.boolean().optional().default(false),
  excludePatterns: z.array(z.string()).optional()
});

export const GetFileInfoSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  followSymlinks: z.boolean().optional().default(true)
});

// Type exports for schemas
export type ReadFileArgs = z.infer<typeof ReadFileSchema>;
export type WriteFileArgs = z.infer<typeof WriteFileSchema>;
export type CopyFileArgs = z.infer<typeof CopyFileSchema>;
export type MoveFileArgs = z.infer<typeof MoveFileSchema>;
export type DeleteFileArgs = z.infer<typeof DeleteFileSchema>;
export type CreateDirectoryArgs = z.infer<typeof CreateDirectorySchema>;
export type ListDirectoryArgs = z.infer<typeof ListDirectorySchema>;
export type FindFilesArgs = z.infer<typeof FindFilesSchema>;
export type SearchInFilesArgs = z.infer<typeof SearchInFilesSchema>;
export type WatchFileArgs = z.infer<typeof WatchFileSchema>;
export type CompareFilesArgs = z.infer<typeof CompareFilesSchema>;
export type ArchiveFilesArgs = z.infer<typeof ArchiveFilesSchema>;
export type GetFileInfoArgs = z.infer<typeof GetFileInfoSchema>;