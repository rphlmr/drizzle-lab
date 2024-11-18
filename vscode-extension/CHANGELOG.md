# Change Log

All notable changes to the "drizzle-orm" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.


## [0.4.1]

- Fix wrong extension version in the output channel

## [0.4.0]

- Upgrade to latest drizzle-lab visualizer (catch more errors)

## [0.3.0]

### Features
- Increase the zoom-out distance
- Try to parse tsconfig.json with comments (non standard)
- Rename `🌧️ Stop Drizzle Visualizer` to `🌧️ Stop Drizzle Visualizer server`

### Fixes
- Server not stopping (leaking child processes) that cause a `address already in use` error
- Visualizer correctly refreshes on schema changes (regression from previous release)
- Save nodes positions with debounce (could cause a crash if too many changes were sent)

## [0.2.1]

- Update to latest drizzle-lab visualizer

## [0.2.0]

- Testing a new visualizer build
- Should now work on Windows
- Experimental support for TypeScript path aliases

## [0.1.9]

- Windows KO
- Boost startup time

## [0.1.8]

- Windows KO

## [0.1.6]

- Fix for Windows

## [0.1.5]

- Upgrade to the latest drizzle-lab visualizer
  - Improved error handling
  - Auto reload on schema errors fixed

## [0.1.4]

- Should handle monorepo better
- Fixed bug where the server would not restart if it was already running

## [0.1.3]

- CodeLens resolves the drizzle config path to pass to the visualizer

## [0.1.2]

- Initial release