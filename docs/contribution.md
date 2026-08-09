# Contribution Guide

Please open an issue before starting a large feature or behavior change so the
approach can be agreed on first.

## Getting Started

Follow the [Development Guide](./development.md) to prepare the project and run
it locally or with Docker.

Create a focused branch using `<type>/<description>`:

```bash
git checkout -b feat/course-filtering
```

Common types are `feat`, `fix`, `docs`, `refactor`, `test`, and `chore`.

## Code Conventions

- Prefer exported function declarations.
- Use `createX()` factory functions instead of service classes.
- Prefix Node.js built-in imports with `node:`.
- Use noun variable names and descriptive function names.
- Use `verbNoun()` for side effects and `is`, `has`, `can`, or `should` for predicates.
- Use a noun for a pure derivation, such as `errorMessage(error)`.
- Prefer `for` and `for...of` when iterating in hot paths.
- Follow existing TypeScript, Vue, Hono, database, and test patterns.

## Before Submitting

Run the complete verification suite:

```bash
npm run check
```

With the Docker development stack running, use:

```bash
make check
```

Keep commits small and use Conventional Commit messages:

```bash
git commit -m "fix: preserve playback progress"
```

Update documentation and tests when behavior changes. Pull requests should
explain the change, its reason, and how it was verified.

## License

Contributions are licensed under the project's [MIT License](../LICENSE).
