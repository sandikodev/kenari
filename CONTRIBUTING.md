# Contributing to Kenari

Thank you for your interest in contributing! Kenari is built in the open and welcomes contributions of all kinds.

## Ways to Contribute

- 🐛 **Bug reports** — open an issue with reproduction steps
- 💡 **Feature requests** — open an issue with your use case
- 📝 **Documentation** — improve docs, fix typos
- 🔧 **Code** — fix bugs, implement features from the roadmap
- 🌍 **Translations** — help make Kenari accessible globally

## Development Setup

```bash
git clone https://github.com/sandikodev/kenari
cd kenari
bun install
cp .env.example .env.local
# Fill in .env.local (see .env.example for guidance)
bun run db:push
bun run dev
```

## Code Style

- TypeScript strict mode
- Prettier + ESLint (run `bun run format` before committing)
- Svelte 5 runes mode (`$state`, `$props`, `$derived`)
- No `any` types without justification

## Commit Convention

```
feat: add GitHub OAuth support
fix: resolve proxy timeout on large responses
docs: update CLI design document
chore: update dependencies
```

## Pull Request Process

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make changes and test
4. Run `bun run check` — must pass with 0 errors
5. Open a PR with a clear description

## Questions?

Open a [GitHub Discussion](https://github.com/sandikodev/kenari/discussions).
