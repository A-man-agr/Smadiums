# Contributing to Smadiums

Thank you for your interest in contributing to the FIFA World Cup 2026 Stadium Operations & Fan Experience Hub.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/A-man-agr/Smadiums.git
cd Smadiums

# Install development dependencies
npm install

# Start the development server
npm start

# Run tests
npm test

# Lint the codebase
npm run lint
```

## Architecture

Smadiums uses a **zero-dependency modular ES6 architecture** with 15 single-purpose modules. See the [README](README.md) for the full module map.

### Key Principles
- **Single Responsibility**: Each module owns exactly one domain concern
- **Static Imports**: All dependencies resolved at load time via ES6 `import`/`export`
- **Reactive State**: Centralized pub/sub state store drives all UI updates
- **Type Safety**: Every `.js` module has a matching `.d.ts` TypeScript declaration file
- **Zero Dynamic Imports**: No `await import()` anti-patterns

## Code Style

- ESLint enforced (`eslint:recommended`)
- Single quotes, mandatory semicolons
- Complete JSDoc for all exported functions
- `Object.freeze()` for all configuration constants

## Testing

All changes must pass the existing 15 automated tests:
```bash
npm test
```

Tests cover: sanitization, state management, security (prompt injection), accessibility (focus trapping), efficiency (caching), and project structure validation.

## Pull Request Guidelines

1. Fork the repository and create a feature branch
2. Ensure `npm test` passes with 15/15
3. Ensure `npm run lint` returns zero warnings
4. Add JSDoc documentation for any new exported functions
5. Update the corresponding `.d.ts` file if adding new exports
