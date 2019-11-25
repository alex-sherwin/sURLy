# Quickstart

```bash
npm install
npm run start-dev
```

# Structure

* `src/main` - This is the source root for the Electron "backend" (NodeJS server)
* `src/renderer` - This is the source root for the Electron "frontend" (Essentially a React webapp)

# Developing

Use `npm run start-dev` to run a watch mode / hot-reloading instance of the application.

* If you change frontend code in `src/renderer`, it will automatically recompile and re-render on-the-fly
* If you change backend code in `src/main` you will have to kill/restart your watch process.  There's no way to hot reload a backend process

# Backend / Frontend communication

This must use the Electron IPC mechanism.  See existing code examples to build your own.