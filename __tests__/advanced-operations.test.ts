import { promises as fs } from 'fs';
import { join } from 'path';
import { AdvancedOperations } from '../src/advanced-operations.js';

describe('AdvancedOperations', () => {
  const testDir = join(process.cwd(), 'test-temp-advanced');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('search_in_files', () => {
    beforeEach(async () => {
      // Create test files with content
      await fs.writeFile(join(testDir, 'file1.txt'), 'This is a test file with function keyword.');
      await fs.writeFile(join(testDir, 'file2.js'), 'function myFunction() {\n  return "hello";\n}');
      await fs.writeFile(join(testDir, 'file3.md'), 'This is a markdown file without function.');
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.rm(join(testDir, 'file1.txt'), { force: true });
        await fs.rm(join(testDir, 'file2.js'), { force: true });
        await fs.rm(join(testDir, 'file3.md'), { force: true });
      } catch {
        // Files might not exist
      }
    });

    it('should search for text patterns in files', async () => {
      const result = await AdvancedOperations.searchInFiles({
        pattern: 'function',
        directory: testDir
      });

      expect(result.success).toBe(true);
      expect(result.data?.results.length).toBeGreaterThan(0);
      expect(result.data?.totalMatches).toBeGreaterThan(0);
    });

    it('should search with file pattern filter', async () => {
      const result = await AdvancedOperations.searchInFiles({
        pattern: 'function',
        directory: testDir,
        filePattern: '*.js'
      });

      expect(result.success).toBe(true);
      expect(result.data?.results.length).toBeGreaterThan(0);
      expect(result.data?.results.every(r => r.path.endsWith('.js'))).toBe(true);
    });

    it('should search case-insensitively', async () => {
      const result = await AdvancedOperations.searchInFiles({
        pattern: 'FUNCTION',
        directory: testDir,
        caseSensitive: false
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalMatches).toBeGreaterThan(0);
    });

    it('should search with whole word matching', async () => {
      const result = await AdvancedOperations.searchInFiles({
        pattern: 'function',
        directory: testDir,
        wholeWord: true
      });

      expect(result.success).toBe(true);
      // Should find exact word matches only
    });

    it('should provide context lines around matches', async () => {
      const result = await AdvancedOperations.searchInFiles({
        pattern: 'function',
        directory: testDir,
        contextLines: 1
      });

      expect(result.success).toBe(true);
      if (result.data?.results.length > 0) {
        const match = result.data.results[0].matches[0];
        expect(match.context).toBeDefined();
        expect(match.context.includes('function')).toBe(true);
      }
    });
  });

  describe('compare_files', () => {
    beforeEach(async () => {
      await fs.writeFile(join(testDir, 'file1.txt'), 'Line 1\nLine 2\nLine 3');
      await fs.writeFile(join(testDir, 'file2.txt'), 'Line 1\nLine 2 Modified\nLine 3');
      await fs.writeFile(join(testDir, 'file3.txt'), 'Line 1\nLine 2\nLine 3');
    });

    afterEach(async () => {
      try {
        await fs.rm(join(testDir, 'file1.txt'), { force: true });
        await fs.rm(join(testDir, 'file2.txt'), { force: true });
        await fs.rm(join(testDir, 'file3.txt'), { force: true });
      } catch {
        // Files might not exist
      }
    });

    it('should compare identical files', async () => {
      const result = await AdvancedOperations.compareFiles({
        file1: join(testDir, 'file1.txt'),
        file2: join(testDir, 'file3.txt')
      });

      expect(result.success).toBe(true);
      expect(result.data?.identical).toBe(true);
      expect(result.data?.totalDifferences).toBe(0);
    });

    it('should compare different files', async () => {
      const result = await AdvancedOperations.compareFiles({
        file1: join(testDir, 'file1.txt'),
        file2: join(testDir, 'file2.txt')
      });

      expect(result.success).toBe(true);
      expect(result.data?.identical).toBe(false);
      expect(result.data?.totalDifferences).toBeGreaterThan(0);
    });

    it('should ignore whitespace differences', async () => {
      await fs.writeFile(join(testDir, 'file4.txt'), 'Line 1\nLine 2\nLine 3');
      await fs.writeFile(join(testDir, 'file5.txt'), 'Line 1\n  Line 2  \nLine 3');

      const result = await AdvancedOperations.compareFiles({
        file1: join(testDir, 'file4.txt'),
        file2: join(testDir, 'file5.txt'),
        ignoreWhitespace: true
      });

      expect(result.success).toBe(true);
      expect(result.data?.identical).toBe(true);

      // Clean up
      await fs.rm(join(testDir, 'file4.txt'), { force: true });
      await fs.rm(join(testDir, 'file5.txt'), { force: true });
    });

    it('should ignore case differences', async () => {
      await fs.writeFile(join(testDir, 'file6.txt'), 'Line 1\nLine 2\nLine 3');
      await fs.writeFile(join(testDir, 'file7.txt'), 'LINE 1\nLINE 2\nLINE 3');

      const result = await AdvancedOperations.compareFiles({
        file1: join(testDir, 'file6.txt'),
        file2: join(testDir, 'file7.txt'),
        ignoreCase: true
      });

      expect(result.success).toBe(true);
      expect(result.data?.identical).toBe(true);

      // Clean up
      await fs.rm(join(testDir, 'file6.txt'), { force: true });
      await fs.rm(join(testDir, 'file7.txt'), { force: true });
    });
  });

  describe('archive_files', () => {
    beforeEach(async () => {
      // Create test files
      await fs.writeFile(join(testDir, 'file1.txt'), 'Content 1');
      await fs.writeFile(join(testDir, 'file2.txt'), 'Content 2');
      await fs.mkdir(join(testDir, 'subdir'), { recursive: true });
      await fs.writeFile(join(testDir, 'subdir', 'file3.txt'), 'Content 3');
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.rm(join(testDir, 'file1.txt'), { force: true });
        await fs.rm(join(testDir, 'file2.txt'), { force: true });
        await fs.rm(join(testDir, 'subdir'), { recursive: true, force: true });
        await fs.rm(join(testDir, 'test.zip'), { force: true });
        await fs.rm(join(testDir, 'test.tar'), { force: true });
      } catch {
        // Files might not exist
      }
    });

    it('should create zip archive', async () => {
      const result = await AdvancedOperations.archiveFiles({
        files: [join(testDir, 'file1.txt'), join(testDir, 'file2.txt')],
        archivePath: join(testDir, 'test.zip'),
        format: 'zip'
      });

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('zip');
      expect(result.data?.filesCount).toBe(2);
      expect(result.data?.size).toBeGreaterThan(0);

      // Verify archive was created
      const stats = await fs.stat(join(testDir, 'test.zip'));
      expect(stats.isFile()).toBe(true);
    });

    it('should create tar archive', async () => {
      const result = await AdvancedOperations.archiveFiles({
        files: [join(testDir, 'file1.txt')],
        archivePath: join(testDir, 'test.tar'),
        format: 'tar'
      });

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('tar');
      expect(result.data?.filesCount).toBe(1);

      // Verify archive was created
      const stats = await fs.stat(join(testDir, 'test.tar'));
      expect(stats.isFile()).toBe(true);
    });

    it('should archive directory', async () => {
      const result = await AdvancedOperations.archiveFiles({
        files: [join(testDir, 'subdir')],
        archivePath: join(testDir, 'test.zip'),
        format: 'zip'
      });

      expect(result.success).toBe(true);
      expect(result.data?.filesCount).toBe(1);
    });

    it('should handle compression levels', async () => {
      const result = await AdvancedOperations.archiveFiles({
        files: [join(testDir, 'file1.txt')],
        archivePath: join(testDir, 'test.zip'),
        format: 'zip',
        compressionLevel: 9
      });

      expect(result.success).toBe(true);
      expect(result.data?.compressionLevel).toBe(9);
    });
  });

  describe('extract_archive', () => {
    beforeEach(async () => {
      // Create a test archive first
      await fs.writeFile(join(testDir, 'testfile.txt'), 'Test content');
      await AdvancedOperations.archiveFiles({
        files: [join(testDir, 'testfile.txt')],
        archivePath: join(testDir, 'test.zip'),
        format: 'zip'
      });
    });

    afterEach(async () => {
      try {
        await fs.rm(join(testDir, 'testfile.txt'), { force: true });
        await fs.rm(join(testDir, 'test.zip'), { force: true });
        await fs.rm(join(testDir, 'extracted'), { recursive: true, force: true });
      } catch {
        // Files might not exist
      }
    });

    it('should extract zip archive', async () => {
      const extractDir = join(testDir, 'extracted');
      const result = await AdvancedOperations.extractArchive(
        join(testDir, 'test.zip'),
        extractDir
      );

      expect(result.success).toBe(true);
      expect(result.data?.extracted).toBe(true);

      // Verify extraction
      const stats = await fs.stat(extractDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('watch_file', () => {
    beforeEach(async () => {
      await fs.writeFile(join(testDir, 'watchfile.txt'), 'Initial content');
    });

    afterEach(async () => {
      try {
        await AdvancedOperations.stopWatching(join(testDir, 'watchfile.txt'));
        await fs.rm(join(testDir, 'watchfile.txt'), { force: true });
      } catch {
        // Files might not exist or watcher might not be active
      }
    });

    it('should start watching a file', async () => {
      const result = await AdvancedOperations.watchFile({
        path: join(testDir, 'watchfile.txt'),
        recursive: false,
        ignoreInitial: true
      });

      expect(result.success).toBe(true);
      expect(result.data?.watching).toBe(true);
    });

    it('should stop watching a file', async () => {
      // Start watching first
      await AdvancedOperations.watchFile({
        path: join(testDir, 'watchfile.txt'),
        recursive: false,
        ignoreInitial: true
      });

      // Stop watching
      const result = await AdvancedOperations.stopWatching(join(testDir, 'watchfile.txt'));

      expect(result.success).toBe(true);
      expect(result.data?.watching).toBe(false);
    });

    it('should handle watching non-existent file', async () => {
      const result = await AdvancedOperations.watchFile({
        path: join(testDir, 'nonexistent.txt'),
        recursive: false,
        ignoreInitial: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});