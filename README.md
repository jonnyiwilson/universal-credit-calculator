# Universal Credit Assessment Platform

A monorepo for the Universal Credit assessment platform with frontend, rules engine, migrations, and worker support.

## Contents

- `src/` - React frontend application
- `packages/` - shared packages and rules engine libraries
- `infra/` - database migration scripts
- `tests/` - integration and unit tests

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the app locally:
   ```bash
   npm run dev -- --host 127.0.0.1
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Notes

- This repo is not currently connected to a GitHub remote.
- Add your GitHub repo URL as a remote and push from the root folder.
