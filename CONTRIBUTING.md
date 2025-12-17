# Contributing to FileSystem MCP Server

Thank you for your interest in contributing to the FileSystem MCP Server! This document provides guidelines for contributing to this project.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Ways to Contribute

### Code Contributions
- **Bug fixes**: Fix issues in file operations, directory management, or search functionality
- **New features**: Add new file operations, advanced search capabilities, or archive support
- **Performance improvements**: Optimize file operations or search algorithms
- **Documentation**: Improve documentation and examples

### Testing & Quality
- **Bug reports**: Report issues with detailed reproduction steps
- **Test coverage**: Add or improve test cases
- **Compatibility testing**: Test with different file systems and operating systems

### Documentation
- **README updates**: Keep documentation current
- **Examples**: Provide usage examples and tutorials
- **Troubleshooting**: Document common file system issues

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/1999AZZAR/filesystem-mcp-server.git
   cd filesystem-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and ensure tests pass:
   ```bash
   npm test
   ```

3. **Run linting**:
   ```bash
   npm run lint
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Commit your changes**:
   ```bash
   git commit -m "Add: brief description of your changes"
   ```

6. **Push to your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

## Coding Standards

### General Guidelines
- Follow TypeScript best practices
- Handle file system permissions properly
- Add proper error handling for file operations
- Use async/await for file operations
- Validate file paths and permissions

### Code Style
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Follow the existing code patterns
- Use ESLint configuration

### Commit Messages
- Use conventional commit format: `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep first line under 50 characters
- Add detailed description for complex changes

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- Add unit tests for new file operations
- Add integration tests for file system interactions
- Test error conditions and edge cases
- Test with different file types and permissions
- Maintain high test coverage

## Pull Request Process

1. **Ensure all tests pass**
2. **Update documentation** if needed
3. **Add tests** for new features
4. **Follow coding standards**
5. **Write clear commit messages**

### PR Checklist
- [ ] Tests pass
- [ ] Code is linted
- [ ] Documentation updated
- [ ] File permissions handled properly
- [ ] Cross-platform compatibility verified
- [ ] Commit messages follow conventions
- [ ] PR description is clear
- [ ] Breaking changes documented

## Reporting Issues

### Bug Reports
Please include:
- **Steps to reproduce**: Detailed steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, file system type
- **File permissions**: Relevant file/directory permissions
- **Logs**: Any relevant error messages

### Feature Requests
Please include:
- **Use case**: Why this feature is needed
- **Proposed solution**: How it should work
- **Alternatives considered**: Other approaches
- **File system impact**: How it affects file operations

## Getting Help

- **Issues**: Use GitHub issues for bugs and features
- **Discussions**: Join community discussions
- **Documentation**: Check the README and docs folder

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
