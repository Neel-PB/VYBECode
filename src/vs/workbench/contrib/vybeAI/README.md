# VYBE AI Pane

## Overview

The VYBE AI Pane is a custom AI interface for the VYBE IDE. It provides a dedicated space for AI-powered features without using React - just native HTML, CSS, and JavaScript.

## Architecture

### Component Structure

```
VybeAiPane (ViewPane)
  └── Container (.vybe-ai-pane)
      └── Content Container (.vybe-ai-content)
          └── Your HTML Content Here
```

### Service Layer

The `IVybeAiService` provides a clean API for interacting with the pane:

```typescript
interface IVybeAiService {
  setContent(content: string): Promise<void>;
  clearContent(): Promise<void>;
  getContentContainer(): Promise<HTMLElement | undefined>;
  openPane(): Promise<void>;
  isPaneVisible(): boolean;
}
```

## Files

### Browser Layer
- **vybeAiPane.ts** - Main ViewPane component
- **vybeai.contribution.ts** - Registration and integration
- **vybeAiServiceImpl.ts** - Service implementation
- **vybeAiCommands.ts** - Example commands
- **media/vybeai.css** - Styling

### Common Layer
- **vybeAiService.ts** - Service interface

## Usage

### Opening the Pane

```typescript
@IVybeAiService private readonly vybeAiService: IVybeAiService

await this.vybeAiService.openPane();
```

### Setting Content

```typescript
await this.vybeAiService.setContent(`
  <div style="padding: 20px;">
    <h1>Hello from VYBE AI!</h1>
  </div>
`);
```

### Getting the Container

```typescript
const container = await this.vybeAiService.getContentContainer();
if (container) {
  // Add event listeners, manipulate DOM, etc.
  const button = container.querySelector('#my-button');
  button?.addEventListener('click', () => {
    console.log('Button clicked!');
  });
}
```

## Commands

Available in Command Palette (F1):

- `VYBE AI: Open VYBE AI Pane`
- `VYBE AI: Set Example Content`
- `VYBE AI: Clear Content`

## Styling

The pane uses VS Code theme variables for seamless integration:

```css
color: var(--vscode-foreground);
background: var(--vscode-editor-background);
border: 1px solid var(--vscode-panel-border);
font-family: var(--vscode-font-family);
```

## Location

The VYBE AI Pane is registered in the **AuxiliaryBar** (right sidebar by default) with a sparkle icon (✨).

## Integration

The pane is automatically loaded when the workbench starts via the import in `workbench.common.main.ts`:

```typescript
import './contrib/vybeai/browser/vybeai.contribution.js';
```

## Development

### Adding New Features

1. Modify `vybeAiPane.ts` to add new methods
2. Update `vybeAiService.ts` interface if needed
3. Implement in `vybeAiServiceImpl.ts`
4. Add commands in `vybeAiCommands.ts` if needed

### Styling

Edit `media/vybeai.css` to customize the appearance.

### Testing

1. Build: `npm run compile`
2. Launch VYBE IDE
3. Use F1 commands to test

## Documentation

See the root-level documentation files for more details:

- **VYBE_AI_QUICKSTART.md** - Quick start guide
- **VYBE_AI_PANE_SETUP.md** - Detailed setup
- **VYBE_AI_USAGE_EXAMPLES.md** - Code examples
- **VYBE_AI_IMPLEMENTATION_COMPLETE.md** - Implementation summary


