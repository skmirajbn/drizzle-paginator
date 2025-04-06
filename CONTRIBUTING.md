# Contributing to Drizzle Paginator

Thank you for considering contributing to Drizzle Paginator! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a welcoming, inclusive, and harassment-free environment. Be respectful towards others regardless of their identity and background.

## How Can I Contribute?

### Reporting Bugs

Bug reports help improve the project. When you create a bug report, please include:

1. **Clear title and description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** and what actually happened
4. **Your environment** (Node.js version, drizzle-orm version, etc.)
5. **Code examples** or error messages (when applicable)

### Suggesting Features

Feature suggestions are welcome. Please include:

1. **Clear description** of the feature
2. **Use case** - why this feature would be beneficial
3. **Implementation ideas** (optional)

### Pull Requests

We welcome code contributions through pull requests. To submit a PR:

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Run tests and linters (if applicable)
5. Submit a pull request

#### Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md with details of changes
3. Include tests for new functionality
4. Ensure the code builds properly
5. Your PR will be reviewed by the maintainers

## Development Workflow

### Setting Up the Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/drizzle-paginator.git

# Add the original repository as a remote
git remote add upstream https://github.com/skmirajbn/drizzle-paginator.git

# Install dependencies
cd drizzle-paginator
npm install
```

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them with clear, descriptive messages:
   ```bash
   git commit -m "Add feature X"
   ```

3. Keep your branch updated with the main repository:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

### Building and Testing

```bash
# Build the package
npm run build

# Run tests (when available)
npm test
```

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### TypeScript Styleguide

* Follow the existing code style
* Use descriptive variable names
* Add JSDoc comments for public APIs
* Use proper TypeScript types
* Avoid `any` types where possible

## License

By contributing to Drizzle Paginator, you agree that your contributions will be licensed under the project's [ISC License](LICENSE).

## Questions?

Feel free to reach out by creating an issue or contacting the maintainer if you have any questions about contributing.

Thank you for contributing to Drizzle Paginator! 