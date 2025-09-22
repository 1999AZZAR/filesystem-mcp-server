import { promises as fs } from 'fs';
import { join } from 'path';
import { FileOperations } from '../src/file-operations.js';
import { DirectoryOperations } from '../src/directory-operations.js';

describe('FileOperations', () => {
  const testDir = join(process.cwd(), 'test-temp');
  const testFile = join(testDir, 'test.txt');
  const testContent = 'Hello, World!\nThis is a test file.';

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await fs.writeFile(testFile, testContent, 'utf8');
  });

  afterEach(async () => {
    try {
      await fs.unlink(testFile);
    } catch {
      // File might not exist
    }
  });

  describe('read_file', () => {
    it('should read file content successfully', async () => {
      const result = await FileOperations.readFile({ path: testFile });
      
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(testContent);
      expect(result.data?.encoding).toBe('utf8');
      expect(result.data?.size).toBe(Buffer.byteLength(testContent, 'utf8'));
    });

    it('should read file with custom encoding', async () => {
      const result = await FileOperations.readFile({ 
        path: testFile, 
        encoding: 'base64' 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.encoding).toBe('base64');
    });

    it('should read file with offset and limit', async () => {
      const result = await FileOperations.readFile({ 
        path: testFile, 
        offset: 0, 
        limit: 5 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Hello');
    });

    it('should handle non-existent file', async () => {
      const result = await FileOperations.readFile({ 
        path: join(testDir, 'nonexistent.txt') 
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('write_file', () => {
    it('should write file content successfully', async () => {
      const newContent = 'New content for testing';
      const result = await FileOperations.writeFile({ 
        path: join(testDir, 'newfile.txt'), 
        content: newContent 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(Buffer.byteLength(newContent, 'utf8'));
      
      // Verify file was created
      const fileContent = await fs.readFile(join(testDir, 'newfile.txt'), 'utf8');
      expect(fileContent).toBe(newContent);
    });

    it('should create directories when createDirs is true', async () => {
      const nestedPath = join(testDir, 'nested', 'deep', 'file.txt');
      const result = await FileOperations.writeFile({ 
        path: nestedPath, 
        content: 'test', 
        createDirs: true 
      });
      
      expect(result.success).toBe(true);
      
      // Verify directories were created
      const stats = await fs.stat(join(testDir, 'nested', 'deep'));
      expect(stats.isDirectory()).toBe(true);
    });

    it('should append to file when append is true', async () => {
      const additionalContent = '\nAdditional content';
      const result = await FileOperations.writeFile({ 
        path: testFile, 
        content: additionalContent, 
        append: true 
      });
      
      expect(result.success).toBe(true);
      
      // Verify content was appended
      const fileContent = await fs.readFile(testFile, 'utf8');
      expect(fileContent).toBe(testContent + additionalContent);
    });
  });

  describe('copy_file', () => {
    it('should copy file successfully', async () => {
      const destination = join(testDir, 'copied.txt');
      const result = await FileOperations.copyFile({ 
        source: testFile, 
        destination 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.source).toBe(testFile);
      expect(result.data?.destination).toBe(destination);
      
      // Verify file was copied
      const copiedContent = await fs.readFile(destination, 'utf8');
      expect(copiedContent).toBe(testContent);
    });

    it('should handle overwrite option', async () => {
      const destination = join(testDir, 'copied.txt');
      
      // First copy
      await FileOperations.copyFile({ source: testFile, destination });
      
      // Try to copy again without overwrite
      const result = await FileOperations.copyFile({ 
        source: testFile, 
        destination, 
        overwrite: false 
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File exists');
    });
  });

  describe('move_file', () => {
    it('should move file successfully', async () => {
      const destination = join(testDir, 'moved.txt');
      const result = await FileOperations.moveFile({ 
        source: testFile, 
        destination 
      });
      
      expect(result.success).toBe(true);
      
      // Verify file was moved
      await expect(fs.access(testFile)).rejects.toThrow();
      const movedContent = await fs.readFile(destination, 'utf8');
      expect(movedContent).toBe(testContent);
    });
  });

  describe('delete_file', () => {
    it('should delete file successfully', async () => {
      const result = await FileOperations.deleteFile({ path: testFile });
      
      expect(result.success).toBe(true);
      
      // Verify file was deleted
      await expect(fs.access(testFile)).rejects.toThrow();
    });

    it('should delete directory recursively', async () => {
      const dirPath = join(testDir, 'testdir');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(join(dirPath, 'file.txt'), 'test');
      
      const result = await FileOperations.deleteFile({ 
        path: dirPath, 
        recursive: true 
      });
      
      expect(result.success).toBe(true);
      
      // Verify directory was deleted
      await expect(fs.access(dirPath)).rejects.toThrow();
    });
  });

  describe('get_file_info', () => {
    it('should get file information successfully', async () => {
      const result = await FileOperations.getFileInfo({ path: testFile });
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('test.txt');
      expect(result.data?.path).toBe(testFile);
      expect(result.data?.type).toBe('file');
      expect(result.data?.isFile).toBe(true);
      expect(result.data?.isDirectory).toBe(false);
      expect(result.data?.size).toBe(Buffer.byteLength(testContent, 'utf8'));
      expect(result.data?.extension).toBe('.txt');
    });
  });
});

describe('DirectoryOperations', () => {
  const testDir = join(process.cwd(), 'test-temp-dir');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('create_directory', () => {
    it('should create directory successfully', async () => {
      const dirPath = join(testDir, 'newdir');
      const result = await DirectoryOperations.createDirectory({ path: dirPath });
      
      expect(result.success).toBe(true);
      
      // Verify directory was created
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const nestedPath = join(testDir, 'nested', 'deep', 'directory');
      const result = await DirectoryOperations.createDirectory({ 
        path: nestedPath, 
        recursive: true 
      });
      
      expect(result.success).toBe(true);
      
      // Verify nested directories were created
      const stats = await fs.stat(nestedPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('list_directory', () => {
    beforeEach(async () => {
      // Create test files and directories
      await fs.writeFile(join(testDir, 'file1.txt'), 'content1');
      await fs.writeFile(join(testDir, 'file2.txt'), 'content2');
      await fs.mkdir(join(testDir, 'subdir'), { recursive: true });
      await fs.writeFile(join(testDir, 'subdir', 'file3.txt'), 'content3');
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.rm(join(testDir, 'file1.txt'), { force: true });
        await fs.rm(join(testDir, 'file2.txt'), { force: true });
        await fs.rm(join(testDir, 'subdir'), { recursive: true, force: true });
      } catch {
        // Files might not exist
      }
    });

    it('should list directory contents', async () => {
      const result = await DirectoryOperations.listDirectory({ path: testDir });
      
      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBeGreaterThan(0);
      expect(result.data?.count).toBeGreaterThan(0);
    });

    it('should list directory recursively', async () => {
      const result = await DirectoryOperations.listDirectory({ 
        path: testDir, 
        recursive: true 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.recursive).toBe(true);
    });

    it('should filter by file types', async () => {
      const result = await DirectoryOperations.listDirectory({ 
        path: testDir, 
        fileTypes: ['file'] 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.items.every(item => item.isFile)).toBe(true);
    });
  });

  describe('find_files', () => {
    beforeEach(async () => {
      // Create test files
      await fs.writeFile(join(testDir, 'test1.txt'), 'content1');
      await fs.writeFile(join(testDir, 'test2.js'), 'content2');
      await fs.writeFile(join(testDir, 'test3.md'), 'content3');
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.rm(join(testDir, 'test1.txt'), { force: true });
        await fs.rm(join(testDir, 'test2.js'), { force: true });
        await fs.rm(join(testDir, 'test3.md'), { force: true });
      } catch {
        // Files might not exist
      }
    });

    it('should find files by pattern', async () => {
      const result = await DirectoryOperations.findFiles({ 
        pattern: '*.txt', 
        directory: testDir 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.files.length).toBeGreaterThan(0);
      expect(result.data?.files.every(file => file.name.endsWith('.txt'))).toBe(true);
    });

    it('should find files case-insensitively', async () => {
      const result = await DirectoryOperations.findFiles({ 
        pattern: '*.TXT', 
        directory: testDir, 
        caseSensitive: false 
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.files.length).toBeGreaterThan(0);
    });
  });
});