# VYBE Development Quick Start

## 🚀 Running VYBE with Hot Reload

This guide will get you up and running with VYBE in development mode where you can see changes instantly.

## Prerequisites ✅

- ✅ Node.js v22.17.1 (installed)
- ✅ npm 10.9.2 (installed)
- ✅ Dependencies (installed)

## Quick Start (3 Steps)

### Step 1: Start the Watch Compiler

Open a terminal and start the watch process (this runs in the background and auto-compiles when you make changes):

```bash
cd /Users/neel/VYBECode
npm run watch
```

**What this does:**
- Compiles TypeScript to JavaScript
- Watches for file changes
- Auto-recompiles when you save files
- Compiles both client and extensions

**Keep this terminal open!** It will show compilation progress and any errors.

Expected output:
```
[watch-client] Starting compilation...
[watch-extensions] Starting compilation...
```

### Step 2: Launch VYBE

In a **NEW terminal window/tab**, launch VYBE:

```bash
cd /Users/neel/VYBECode
./scripts/code.sh
```

**On Windows:**
```cmd
cd C:\path\to\VYBECode
.\scripts\code.bat
```

### Step 3: Make Changes & See Them Live!

1. VYBE will open with your branding
2. Make changes to any source file
3. Watch terminal #1 for compilation
4. Reload VYBE to see changes:
   - **macOS/Linux:** `Cmd+R` or `Ctrl+R`
   - **Windows:** `Ctrl+R`

## Development Workflow

### Full Development Setup (Recommended)

For the best experience, use these NPM scripts:

```bash
# Option 1: Watch everything (client + extensions)
npm run watch

# Option 2: Watch only client code
npm run watch-client

# Option 3: Watch only extensions
npm run watch-extensions
```

### Alternative: Compile Once

If you don't need hot reload, just compile once:

```bash
npm run compile
./scripts/code.sh
```

## What You'll See

When VYBE launches, you should see:

✅ **Window Title:** "VYBE" (instead of "VS Code")
✅ **App Icon:** Your black square with white waveform (in Dock/taskbar)
✅ **Welcome Page:** "Get started with VYBE"
✅ **Settings Path:** `~/.vybe/` (instead of `~/.vscode/`)

## Debugging VYBE

### Open Developer Tools

Once VYBE is running:
- **macOS:** `Cmd+Option+I`
- **Windows/Linux:** `Ctrl+Shift+I`

This opens Chrome DevTools for inspecting and debugging.

### View Logs

Check the console output in:
1. The terminal where you launched VYBE
2. Developer Tools Console (Cmd+Option+I)

### Common Issues & Solutions

#### Issue: "Cannot find module"
**Solution:** Run `npm install` again
```bash
npm install
```

#### Issue: Compilation errors
**Solution:** Check the watch terminal for errors, fix them, and save the file

#### Issue: Changes not appearing
**Solution:**
1. Wait for compilation to finish (check watch terminal)
2. Reload VYBE (Cmd+R / Ctrl+R)
3. If still not working, restart VYBE completely

#### Issue: "ENOSPC" errors (Linux)
**Solution:** Increase file watchers
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Testing Your Branding Changes

### Quick Branding Tests

1. **Window Title:**
   - Look at the title bar - should say "VYBE"

2. **Application Icon:**
   - Check Dock (macOS) or taskbar (Windows/Linux)
   - Should show your VYBE icon

3. **Welcome Screen:**
   - Help > Welcome
   - Should say "Get started with VYBE"

4. **Settings:**
   - Open settings (Cmd+,)
   - Check folder: `~/.vybe/`

5. **About Dialog:**
   - Help > About (when implemented)

### Making UI Changes

To change UI text/content:

1. Edit file (e.g., welcome content)
2. Wait for watch to recompile
3. Reload VYBE (Cmd+R)
4. See changes instantly!

**Example:** Edit welcome text
```bash
# Edit this file:
src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts

# Save it, watch recompiles automatically
# Then: Cmd+R in VYBE to reload
```

## Development Environment Setup

### Recommended VS Code Extensions (for development)

If you're using VS Code to develop VYBE:
- ESLint
- TypeScript and JavaScript Language Features
- EditorConfig

### Recommended Terminal Setup

Use **2 terminal windows/tabs:**

**Terminal 1: Watch Process**
```bash
cd /Users/neel/VYBECode
npm run watch
# Keep this running - shows compilation
```

**Terminal 2: Launch/Commands**
```bash
cd /Users/neel/VYBECode
./scripts/code.sh
# Or run other commands as needed
```

## Performance Tips

### Faster Compilation

If compilation is slow, you can watch only what you're working on:

**Working on core editor?**
```bash
npm run watch-client
```

**Working on extensions?**
```bash
npm run watch-extensions
```

### Skip Pre-launch Checks

For faster restarts during development:
```bash
VSCODE_SKIP_PRELAUNCH=1 ./scripts/code.sh
```

## Next Steps: Building Features

Once you're comfortable with the dev workflow:

1. **Explore the Codebase:**
   - `src/vs/workbench/` - Main workbench UI
   - `src/vs/editor/` - Code editor
   - `extensions/` - Built-in extensions

2. **Plan Your Features:**
   - Agentic development interface
   - Vibe coding mode
   - Chat + preview integration

3. **Start Coding:**
   - Make changes
   - Test in real-time
   - Iterate quickly!

## Useful Commands Reference

```bash
# Development
npm run watch              # Watch and auto-compile
npm run compile           # Compile once
./scripts/code.sh         # Launch VYBE

# Testing
npm run test              # Run tests
npm run test-browser      # Browser tests

# Linting
npm run eslint           # Check code style
npm run hygiene          # Code hygiene checks

# Building (production)
npm run gulp vscode-darwin-universal  # macOS build
npm run gulp vscode-linux-x64         # Linux build
npm run gulp vscode-win32-x64         # Windows build
```

## Your Development Loop

```
1. Start watch: npm run watch
   └─> Terminal stays open, shows compilation

2. Launch VYBE: ./scripts/code.sh
   └─> VYBE opens with your branding

3. Edit code in your editor
   └─> Watch terminal shows recompilation

4. Reload VYBE: Cmd+R
   └─> See your changes instantly!

5. Repeat steps 3-4 🔄
```

## Ready to Code! 🎉

You're all set! Start the watch process and launch VYBE to see your branded IDE in action.

**Happy coding! Time to vibe! 🎵✨**

