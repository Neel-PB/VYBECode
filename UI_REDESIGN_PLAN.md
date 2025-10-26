# VYBE UI Redesign Plan
## Making VYBE Visually Distinct from VS Code

Inspired by Trae AI's complete visual transformation while maintaining VS Code's functionality.

## 🎯 Design Philosophy

**Goal:** Create a modern, agentic-focused interface that feels completely different from VS Code while maintaining all functionality.

**Inspiration:**
- Cursor AI: Minimal, clean, AI-first
- Trae AI: Complete visual departure from VS Code
- Modern dev tools: Vercel, Linear, Raycast aesthetics

## 🎨 Phase 1: Core Visual Identity (Start Here)

### 1.1 Custom Color Theme & Palette

**Files to modify:**
- `src/vs/platform/theme/common/colorRegistry.ts`
- `src/vs/workbench/common/theme.ts`
- Create: `src/vs/workbench/contrib/themes/vybe/vybeTheme.ts`

**VYBE Color Palette (Dark Mode First):**
```css
/* Background Layers */
--vybe-bg-primary: #0A0A0F      /* Deepest background */
--vybe-bg-secondary: #141419     /* Panels, sidebars */
--vybe-bg-tertiary: #1C1C24      /* Elevated surfaces */
--vybe-bg-hover: #252530         /* Hover states */

/* Accent Colors */
--vybe-accent-primary: #8B5CF6   /* Purple - primary actions */
--vybe-accent-secondary: #3B82F6 /* Blue - secondary actions */
--vybe-accent-success: #10B981   /* Green - success states */
--vybe-accent-warning: #F59E0B   /* Amber - warnings */
--vybe-accent-error: #EF4444     /* Red - errors */

/* Text Colors */
--vybe-text-primary: #F9FAFB     /* Main text */
--vybe-text-secondary: #9CA3AF   /* Secondary text */
--vybe-text-tertiary: #6B7280    /* Muted text */

/* Borders & Dividers */
--vybe-border: #2D2D3D           /* Subtle borders */
--vybe-border-focus: #8B5CF6     /* Focused borders */

/* Special */
--vybe-glow: rgba(139, 92, 246, 0.3)  /* Glow effects */
```

### 1.2 Typography System

**Files to modify:**
- `src/vs/base/browser/ui/fonts.ts`
- `src/vs/workbench/browser/workbench.ts`

**VYBE Typography:**
```css
/* Primary Font: Inter or SF Pro */
--vybe-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--vybe-font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* Font Sizes */
--vybe-text-xs: 11px;
--vybe-text-sm: 12px;
--vybe-text-base: 13px;
--vybe-text-lg: 14px;
--vybe-text-xl: 16px;
--vybe-text-2xl: 20px;
--vybe-text-3xl: 24px;

/* Font Weights */
--vybe-font-normal: 400;
--vybe-font-medium: 500;
--vybe-font-semibold: 600;
--vybe-font-bold: 700;
```

### 1.3 Layout Modifications

**Key Changes:**
1. **Rounded Corners Everywhere** (VS Code is mostly square)
2. **Increased Padding/Spacing** (more breathing room)
3. **Floating Panels** (elevated, shadowed surfaces)
4. **Glassmorphism Effects** (subtle backdrop blur)

**Files to modify:**
- `src/vs/workbench/browser/parts/editor/editorPart.ts`
- `src/vs/workbench/browser/parts/sidebar/sidebarPart.ts`
- `src/vs/workbench/browser/parts/panel/panelPart.ts`
- CSS: `src/vs/workbench/browser/media/part.css`

## 🎨 Phase 2: Component Redesign

### 2.1 Activity Bar (Left Sidebar Icons)

**Current:** Vertical icon bar on far left
**VYBE Design:**
- Option A: Horizontal tabs at top (more modern)
- Option B: Floating circular icons with glow
- Option C: Hidden by default, show on hover

**File:** `src/vs/workbench/browser/parts/activitybar/activitybarPart.ts`

### 2.2 Title Bar

**Current:** Standard OS title bar or custom VS Code bar
**VYBE Design:**
- Centered window title
- Traffic lights integrated
- Search/command palette prominent
- Gradient background or glass effect

**Files:**
- `src/vs/workbench/browser/parts/titlebar/titlebarPart.ts`
- `src/vs/workbench/browser/parts/titlebar/media/titlebarpart.css`

### 2.3 Status Bar

**Current:** Blue/purple bar at bottom
**VYBE Design:**
- Darker, more subtle
- Rounded top corners
- Glowing indicators
- Custom VYBE branding element

**File:** `src/vs/workbench/browser/parts/statusbar/statusbarPart.ts`

### 2.4 Tabs & Editor Chrome

**Current:** Rectangular tabs, sharp edges
**VYBE Design:**
- Rounded tabs with spacing between
- Active tab has glow/elevation
- Close buttons only on hover
- Custom scrollbar styling

**Files:**
- `src/vs/workbench/browser/parts/editor/tabsTitleControl.ts`
- `src/vs/workbench/browser/parts/editor/media/editorgroupview.css`

### 2.5 Sidebar Panels (Explorer, Search, etc.)

**VYBE Design:**
- Elevated, card-like sections
- Rounded corners
- Custom icons (replace Codicons)
- Smooth expand/collapse animations
- Gradient headers

**File:** `src/vs/workbench/browser/parts/sidebar/media/sidebarpart.css`

### 2.6 Command Palette

**Current:** Dropdown from top, standard styling
**VYBE Design:**
- Centered modal with backdrop blur
- Rounded, floating
- Gradient border or glow
- Custom placeholder text
- Better fuzzy search UI

**Files:**
- `src/vs/workbench/contrib/quickaccess/browser/quickAccess.ts`
- `src/vs/base/parts/quickinput/browser/quickInput.ts`

### 2.7 Buttons & Inputs

**VYBE Design:**
- Rounded corners (8px border radius)
- Gradient backgrounds for primary actions
- Glow on hover
- Better focus states
- Custom checkbox/radio styles

**File:** `src/vs/base/browser/ui/button/button.ts`

## 🎨 Phase 3: Advanced UI Elements

### 3.1 Welcome Screen Redesign

**Current:** Standard grid layout
**VYBE Design:**
- Full custom design with animations
- Gradient backgrounds
- Large VYBE branding
- Interactive cards
- Video backgrounds (optional)

**Files:**
- `src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts`
- Create custom CSS/components

### 3.2 Settings UI

**VYBE Design:**
- Card-based layout
- Better search
- Visual previews
- Categorized sections with icons
- Toggle switches instead of checkboxes

**File:** `src/vs/workbench/contrib/preferences/browser/settingsEditor2.ts`

### 3.3 Terminal

**VYBE Design:**
- Rounded terminal panel
- Custom prompt styling
- Gradient header
- Better tab management

**File:** `src/vs/workbench/contrib/terminal/browser/terminalView.ts`

### 3.4 Notifications

**VYBE Design:**
- Toast-style notifications (top right)
- Rounded, floating
- Better icons
- Smooth animations

**File:** `src/vs/workbench/browser/parts/notifications/notificationsToasts.ts`

## 🎨 Phase 4: Custom Components

### 4.1 Chat Interface (For Agentic Mode)

**New Component:** Build from scratch
- Floating chat panel
- Message bubbles
- Code highlighting in messages
- Streaming responses with animations

**Create:**
- `src/vs/workbench/contrib/vybe/chat/chatView.ts`
- `src/vs/workbench/contrib/vybe/chat/chatWidget.ts`

### 4.2 Preview Panel (For Vibe Mode)

**New Component:**
- Split screen preview
- Live reload indicator
- Device frame options
- Responsive controls

**Create:**
- `src/vs/workbench/contrib/vybe/preview/previewPanel.ts`

### 4.3 AI Status Indicator

**New Component:**
- Animated indicator showing AI activity
- Pulse/glow effects
- Integration with status bar

## 🎯 Implementation Strategy

### Quick Wins (Start Here - 1-2 days):

1. **Custom Color Scheme** ✨
   - Override default colors
   - Apply VYBE palette
   - High impact, relatively easy

2. **Rounded Corners Everywhere**
   - Add border-radius to all components
   - Immediate visual distinction

3. **Custom Fonts**
   - Load custom font family
   - Apply throughout UI

4. **Spacing Updates**
   - Increase padding/margins
   - More breathing room

### Medium Effort (3-5 days):

5. **Title Bar Redesign**
6. **Status Bar Redesign**
7. **Activity Bar Modification**
8. **Tab Styling**
9. **Command Palette Redesign**

### Major Projects (1-2 weeks each):

10. **Welcome Screen Overhaul**
11. **Settings UI Redesign**
12. **Chat Interface (New)**
13. **Preview Panel (New)**

## 📁 Key Files Reference

### CSS Files to Modify:
```
src/vs/workbench/browser/media/
  - part.css              # Base parts
  - workbench.css         # Main workbench

src/vs/workbench/browser/parts/*/media/
  - *.css                 # Component-specific styles

src/vs/base/browser/ui/*/
  - *.css                 # Base UI components
```

### TypeScript Files for Behavior:
```
src/vs/workbench/browser/parts/
  - titlebar/titlebarPart.ts
  - statusbar/statusbarPart.ts
  - activitybar/activitybarPart.ts
  - editor/editorPart.ts
  - sidebar/sidebarPart.ts
```

### Theme System:
```
src/vs/platform/theme/common/
  - colorRegistry.ts      # Color definitions
  - themeService.ts       # Theme service
```

## 🚀 Getting Started

### Step 1: Create VYBE Theme File

Create a new custom theme as the foundation:

```typescript
// src/vs/workbench/contrib/themes/vybe/vybeTheme.ts

import { registerColor } from 'vs/platform/theme/common/colorRegistry';
import { Color } from 'vs/base/common/color';

// VYBE Color Palette
export const VYBE_COLORS = {
  // Backgrounds
  bgPrimary: Color.fromHex('#0A0A0F'),
  bgSecondary: Color.fromHex('#141419'),
  bgTertiary: Color.fromHex('#1C1C24'),

  // Accents
  accentPrimary: Color.fromHex('#8B5CF6'),
  accentSecondary: Color.fromHex('#3B82F6'),

  // ... more colors
};

// Register colors
export const vybeBackground = registerColor('vybe.background', VYBE_COLORS.bgPrimary, 'VYBE primary background');
// ... register all colors
```

### Step 2: Override Default CSS

Create global VYBE styles:

```css
/* src/vs/workbench/browser/media/vybe-overrides.css */

:root {
  /* VYBE Variables */
  --vybe-radius: 8px;
  --vybe-radius-lg: 12px;
  --vybe-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --vybe-glow: 0 0 20px rgba(139, 92, 246, 0.3);
}

/* Round everything */
.monaco-workbench * {
  border-radius: var(--vybe-radius) !important;
}

/* Custom scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: var(--vybe-accent-primary);
  border-radius: 4px;
}

/* Add elevation */
.part {
  box-shadow: var(--vybe-shadow);
}
```

### Step 3: Import VYBE Styles

Modify workbench to load VYBE theme:

```typescript
// src/vs/workbench/browser/workbench.ts

import 'vs/workbench/browser/media/vybe-overrides.css';
import { VYBE_COLORS } from 'vs/workbench/contrib/themes/vybe/vybeTheme';
```

## 🎨 Visual Inspiration

Reference these for VYBE's aesthetic:
- **Cursor AI**: Clean, minimal, AI-focused
- **Trae AI**: Complete visual departure
- **Linear**: Beautiful gradients, smooth animations
- **Raycast**: Rounded, floating UI elements
- **Vercel**: Clean, modern, professional

## ⚡ Next Steps

1. **Review this plan** - Adjust based on your vision
2. **Start with Quick Wins** - Maximum visual impact, minimum effort
3. **Iterate rapidly** - Use hot reload to see changes instantly
4. **Test thoroughly** - Ensure nothing breaks

Ready to start? Let's begin with the color scheme and rounded corners! 🚀

