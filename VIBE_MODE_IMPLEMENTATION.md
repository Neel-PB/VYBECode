# VYBE Mode Toggle Implementation

## 🎯 Goal: IDE ↔ Vibe Mode Switching

Create a mode toggle system (like Trae AI) that switches between:
- **IDE Mode**: Traditional code editor
- **Vibe Mode**: Chat + live preview driven development

## 📐 Architecture

### Visual Structure (Trae AI Style)

```
┌─────────────────────────────────────────────────────────┐
│  Main Menu Bar (File, Edit, etc.)                       │
├─────────────────────────────────────────────────────────┤
│  [IDE] [VIBE]  | Select Project ▼ |    🔍 Search        │ ← MODE BAR (NEW!)
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Content Area (changes based on mode)                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Mode Behaviors

**IDE Mode:**
- Traditional VS Code layout
- Activity bar, sidebar, editor, panel
- Full file explorer and extensions

**Vibe Mode:**
- Chat interface (left or right)
- Live preview panel
- Minimal file tree
- AI-driven workflow

## 🛠️ Implementation Steps

### Phase 1: Mode Bar Component ✨

**File to create:** `src/vs/workbench/browser/parts/modebar/modeBarPart.ts`

This creates the toggle bar with IDE/VIBE buttons.

### Phase 2: Mode State Management

**File to create:** `src/vs/workbench/services/mode/common/modeService.ts`

Manages the current mode state across the application.

### Phase 3: Layout Switcher

**File to modify:** `src/vs/workbench/browser/layout.ts`

Switches the entire workbench layout based on mode.

### Phase 4: Vibe Mode Layout

**Files to create:**
- `src/vs/workbench/browser/parts/vibe/vibeView.ts` - Main vibe mode container
- `src/vs/workbench/browser/parts/vibe/chatPanel.ts` - Chat interface
- `src/vs/workbench/browser/parts/vibe/previewPanel.ts` - Live preview

## 📝 Detailed Implementation

### 1. Mode Service (State Management)

Location: `src/vs/workbench/services/mode/common/modeService.ts`

```typescript
export const enum WorkbenchMode {
  IDE = 'ide',
  VIBE = 'vibe'
}

export interface IModeService {
  _serviceBrand: undefined;

  /** Current active mode */
  readonly currentMode: WorkbenchMode;

  /** Switch to a different mode */
  switchMode(mode: WorkbenchMode): Promise<void>;

  /** Event fired when mode changes */
  readonly onDidChangeMode: Event<WorkbenchMode>;
}
```

### 2. Mode Bar Component

Location: `src/vs/workbench/browser/parts/modebar/modeBarPart.ts`

Visual: `[IDE ●] [VIBE]  |  Select Project ▼  |  🔍 Search`

Features:
- Toggle buttons for IDE/VIBE
- Active state indication
- Project selector dropdown
- Integrated search

### 3. Vibe Mode Layout

**Chat Panel (Left/Right):**
- AI conversation interface
- Code generation
- File references
- Message history

**Preview Panel (Center/Right):**
- Live web preview
- Hot reload
- Device frames
- Console output

## 🎨 CSS Structure

### Mode Bar Styles

```css
.mode-bar {
  height: 40px;
  background: var(--vybe-bg-secondary);
  border-bottom: 1px solid var(--vybe-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
}

.mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--vybe-bg-tertiary);
  border-radius: 6px;
  padding: 4px;
}

.mode-button {
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--vybe-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-button.active {
  background: var(--vybe-accent-primary);
  color: white;
}
```

## 🔌 Integration Points

### Workbench Modifications

**File:** `src/vs/workbench/browser/workbench.ts`

Add mode bar to layout:
```typescript
private createWorkbench(): void {
  // ... existing code ...

  // Add mode bar
  this.modeBar = this._register(
    this.instantiationService.createInstance(ModeBarPart)
  );
  this.modeBar.create(this.parent);

  // Listen for mode changes
  this._register(
    this.modeService.onDidChangeMode(mode => {
      this.switchLayout(mode);
    })
  );
}
```

### Layout Switching

```typescript
private switchLayout(mode: WorkbenchMode): void {
  if (mode === WorkbenchMode.VIBE) {
    // Hide traditional parts
    this.activityBarPartView.hide();
    this.sideBarPartView.minimize();

    // Show vibe parts
    this.vibeView.show();
  } else {
    // Show traditional IDE
    this.vibeView.hide();
    this.activityBarPartView.show();
    this.sideBarPartView.restore();
  }
}
```

## 🎯 User Experience

### Switching to Vibe Mode

1. Click "VIBE" button in mode bar
2. Layout smoothly transitions
3. Chat panel appears
4. Preview panel appears
5. Traditional sidebar minimizes

### In Vibe Mode

**Chat Panel:**
- "Build a login page"
- AI generates code
- Files created automatically
- Preview updates live

**Preview Panel:**
- Shows live application
- Hot reload on changes
- Responsive controls
- Console logs visible

## 📦 File Structure

```
src/vs/workbench/
├── services/mode/
│   ├── common/
│   │   ├── modeService.ts          # Interface & types
│   │   └── mode.ts                 # Mode enum
│   └── browser/
│       └── modeService.ts          # Implementation
├── browser/parts/
│   ├── modebar/
│   │   ├── modeBarPart.ts          # Mode toggle bar
│   │   └── media/
│   │       └── modeBar.css
│   └── vibe/
│       ├── vibeView.ts             # Main vibe container
│       ├── chatPanel.ts            # Chat interface
│       ├── previewPanel.ts         # Live preview
│       └── media/
│           └── vibe.css
└── contrib/vibe/                   # Vibe-specific features
    ├── chat/
    │   └── vybeChat.ts
    └── preview/
        └── vybePreview.ts
```

## 🚀 Implementation Order

### Step 1: Core Infrastructure (30 min)
1. Create mode service interface
2. Implement mode service
3. Register in services

### Step 2: Mode Bar UI (45 min)
1. Create mode bar component
2. Add toggle buttons
3. Wire up to mode service
4. Style the bar

### Step 3: Layout Switching (1 hour)
1. Modify workbench layout
2. Implement mode transitions
3. Show/hide appropriate parts

### Step 4: Vibe Mode Views (2-3 hours)
1. Create chat panel
2. Create preview panel
3. Wire up communication
4. Add AI integration points

### Step 5: Polish (1 hour)
1. Smooth transitions
2. State persistence
3. Keyboard shortcuts
4. Documentation

## 💡 Next Steps After Implementation

1. **AI Integration**: Connect chat to LLM
2. **File Generation**: Auto-create files from chat
3. **Preview Server**: Live reload functionality
4. **State Sync**: Keep preview in sync with code
5. **Templates**: Quick project scaffolding

## 🎨 Visual Enhancements

- Smooth fade transitions between modes
- Loading states during mode switch
- Animated preview panel
- Chat message animations
- Code syntax highlighting in chat

---

**Ready to implement!** This will transform VYBE into a truly unique development experience! 🎵✨

