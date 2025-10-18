# Contributing to Awesome PocketBase

Thank you for your interest in contributing to Awesome PocketBase! This document provides guidelines for adding new resources to the list.

## How to Contribute

1. **Fork the repository** and create a new branch for your contribution
2. **Add your resource** to the appropriate category in README.md
3. **Follow the formatting guidelines** below
4. **Test your changes** (see Testing section)
5. **Submit a pull request** with a clear description

## Formatting Guidelines

### General Rules

- Use the following format: `- [Resource Name](link) - Brief description.`
- Keep descriptions concise (one or two sentences)
- Ensure links are working and up-to-date
- Add resources in alphabetical order within their category
- End descriptions with a period

### Categories

Choose the most appropriate category:
- **Official Packages** - Official PocketBase repositories only
- **Framework-specific** (React, Svelte, Vue, etc.) - Framework integrations
- **Language SDKs** - Client libraries for different languages
- **Hosting** - Deployment and hosting solutions
- **Native Go Plugins** - Go-based PocketBase extensions
- **TypeScript tools** - TypeScript-specific tooling
- **SQLite tools** - Database utilities
- **Other tools** - Everything else
- **Showcases** - Example applications and demos

## Quality Standards

Resources should:
- Be functional and maintained
- Have clear documentation
- Be relevant to PocketBase users
- Not duplicate existing entries
- Follow PocketBase best practices

## Testing Contributions with Demo

Before submitting, you can test your examples using the included demo:

```bash
cd pocketbase-demo

# Install dependencies
npm install

# Start PocketBase server
npm run serve &

# Provision the demo
npm run setup

# Run automated tests
npm test

# Verify the setup
npm run verify
```

### Testing Checklist

- [ ] Your resource/example works with the latest PocketBase version
- [ ] Links are accessible and correct
- [ ] Description accurately represents the resource
- [ ] Code examples (if any) are tested and working
- [ ] No linter errors or warnings

## Demo Application

The `pocketbase-demo/` directory contains a comprehensive example showcasing:
- Full CRUD operations
- Realtime subscriptions
- User authentication
- Multi-collection relationships
- Browser UI with activity logging

If you're adding a new tool or example, consider:
1. Testing it against the demo environment
2. Adding relevant examples to the demo (if applicable)
3. Documenting integration patterns

## Pull Request Process

1. **Check for duplicates** - Search existing PRs and issues
2. **One resource per PR** - Makes review easier
3. **Clear title** - e.g., "Add XYZ PocketBase integration"
4. **Description** - Explain what the resource does and why it's useful
5. **Wait for review** - Maintainers will review your PR

### PR Description Template

```markdown
## Resource Details

- **Name**: [Resource Name]
- **Category**: [Category]
- **URL**: [Link]
- **Description**: [Brief description]

## Why this resource?

[Explain why this is a valuable addition to Awesome PocketBase]

## Testing

- [ ] Links are working
- [ ] Description is accurate
- [ ] Alphabetically ordered
- [ ] Follows formatting guidelines
- [ ] Tested with demo (if applicable)
```

## Removing Resources

If you find a broken link or outdated resource:
1. Open an issue with details
2. Or submit a PR removing/updating the resource
3. Provide reasoning in the PR description

## Questions?

- Open an issue for discussion
- Check existing issues for similar questions
- Review the [PocketBase documentation](https://pocketbase.io/docs/)

## Code of Conduct

- Be respectful and constructive
- Focus on the quality of resources
- Help maintain the list's usefulness
- Follow GitHub's community guidelines

## License

By contributing, you agree that your contributions will be licensed under the same license as this project.

---

Thank you for helping make Awesome PocketBase better! 🎉
