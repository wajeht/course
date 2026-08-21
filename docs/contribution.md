# Contribution Guide

Please open an issue before starting a large feature or behavior change so the
approach can be agreed on first.

## Getting Started

Follow the [Development Guide](./development.md) to prepare the project and run
it locally or with Docker.

Create a focused branch using `<type>/<description>`:

```bash
git checkout -b feat/playlist-filtering
```

Common types are `feat`, `fix`, `docs`, `refactor`, `test`, and `chore`.

## Code Conventions

- Prefer exported function declarations.
- Use `verbNoun()` for functions that have side effects or can fail.
- Use a noun for a pure derivation, such as `errorMessage(error)`.
- Use `is`, `has`, `can`, or `should` for boolean predicates.
- Use `createX()` factory functions instead of service classes.
- Drop `get`, `build`, and `format` prefixes from pure derivations. Keep `get`
  when a function performs real work such as I/O, subprocess execution, or
  parsing that can throw.
- Use noun variable names without `get`, `build`, or `format` prefixes.
- Avoid default exports.
- Prefix Node.js built-in imports with `node:`.
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
