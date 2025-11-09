# Contributing to RemoteCC

Thanks for your interest in contributing! This is a community project and we welcome PRs.

## Development Setup

1. Fork and clone the repo
2. Run `./setup.sh` to install dependencies
3. Make your changes
4. Test thoroughly
5. Submit a PR

## Project Structure

- `server/` - Node.js WebSocket server
- `mobile/` - React Native Expo app
- `docs/` - Additional documentation

## Testing Your Changes

### Server Changes

```bash
cd server
npm start
```

### Mobile Changes

```bash
cd mobile
npm start
```

Test on both iOS and Android if possible.

## Code Style

- Use ES6+ features
- Keep functions small and focused
- Add comments for complex logic
- Follow existing code style

## Areas for Contribution

### Easy Wins
- Bug fixes
- Documentation improvements
- Error message improvements
- UI/UX polish

### Medium Difficulty
- ANSI color code rendering
- Better reconnection logic
- Configuration options
- Performance optimizations

### Advanced Features
- Smart prompt detection (Phase 3 in plan.md)
- Multiple terminal sessions
- Session history/recording
- Push notifications
- Voice input

## Pull Request Process

1. Update the README if you add features
2. Test on macOS/Linux for server, iOS/Android for mobile
3. Keep PRs focused on a single feature/fix
4. Add a clear description of what and why

## Questions?

Open an issue or start a discussion!

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to make this tool better.
