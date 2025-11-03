# VYBE AI Pane - Usage Examples

## 📋 Quick Reference

### Using Commands (F1 Command Palette)

After building the project, you can use these commands from the Command Palette (F1):

1. **Open VYBE AI Pane** - `VYBE AI: Open VYBE AI Pane`
2. **Set Example Content** - `VYBE AI: Set Example Content`
3. **Clear Content** - `VYBE AI: Clear Content`

### Using the Service Programmatically

#### Basic Example - Set Custom HTML

```typescript
import { IVybeAiService } from './workbench/contrib/vybeai/common/vybeAiService.js';

// In any class with dependency injection:
constructor(
  @IVybeAiService private readonly vybeAiService: IVybeAiService
) {}

// Set your custom HTML
async setMyContent() {
  const myHtml = `
    <div class="my-custom-interface">
      <h1>My Custom AI Interface</h1>
      <div id="chat-messages"></div>
      <input type="text" id="chat-input" placeholder="Type a message..." />
    </div>
  `;

  await this.vybeAiService.setContent(myHtml);
}
```

#### Example - Interactive Chat Interface

```typescript
async createChatInterface() {
  // Create the HTML structure
  const chatHtml = `
    <div style="display: flex; flex-direction: column; height: 100%; font-family: var(--vscode-font-family);">
      <!-- Header -->
      <div style="padding: 16px; border-bottom: 1px solid var(--vscode-panel-border);">
        <h2 style="margin: 0; color: var(--vscode-foreground);">VYBE AI Chat</h2>
      </div>

      <!-- Messages Container -->
      <div id="vybe-messages" style="flex: 1; overflow-y: auto; padding: 16px;">
        <div class="vybe-message user">
          <strong>You:</strong> Hello!
        </div>
        <div class="vybe-message assistant">
          <strong>VYBE AI:</strong> Hi! How can I help you today?
        </div>
      </div>

      <!-- Input Area -->
      <div style="padding: 16px; border-top: 1px solid var(--vscode-panel-border);">
        <div style="display: flex; gap: 8px;">
          <input
            id="vybe-input"
            type="text"
            placeholder="Ask VYBE AI..."
            style="flex: 1; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px;"
          />
          <button
            id="vybe-send"
            style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  `;

  // Set the HTML
  await this.vybeAiService.setContent(chatHtml);

  // Get the container and add event listeners
  const container = await this.vybeAiService.getContentContainer();
  if (container) {
    const input = container.querySelector('#vybe-input') as HTMLInputElement;
    const sendButton = container.querySelector('#vybe-send') as HTMLButtonElement;
    const messagesDiv = container.querySelector('#vybe-messages') as HTMLDivElement;

    const sendMessage = () => {
      const message = input.value.trim();
      if (message) {
        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'vybe-message user';
        userMsg.innerHTML = `<strong>You:</strong> ${message}`;
        messagesDiv.appendChild(userMsg);

        // Clear input
        input.value = '';

        // Simulate AI response (replace with actual AI call)
        setTimeout(() => {
          const aiMsg = document.createElement('div');
          aiMsg.className = 'vybe-message assistant';
          aiMsg.innerHTML = `<strong>VYBE AI:</strong> I received your message: "${message}"`;
          messagesDiv.appendChild(aiMsg);

          // Scroll to bottom
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 500);
      }
    };

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
}
```

#### Example - Loading Content from File

```typescript
async loadHtmlFromFile() {
  // Option 1: Import HTML as string (requires proper webpack config)
  const htmlContent = await fetch('/path/to/your/template.html')
    .then(res => res.text());

  await this.vybeAiService.setContent(htmlContent);

  // Option 2: Load from workspace
  const htmlContent = await this.fileService.readFile(
    URI.file('/path/to/template.html')
  );

  await this.vybeAiService.setContent(htmlContent.value.toString());
}
```

#### Example - Using Web Components

```typescript
async setupWithWebComponents() {
  // Define a custom web component
  if (!customElements.get('vybe-chat')) {
    class VybeChatComponent extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `
          <div class="vybe-chat-component">
            <h3>VYBE Chat Component</h3>
            <p>This is a reusable web component!</p>
          </div>
        `;

        this.querySelector('.vybe-chat-component')?.addEventListener('click', () => {
          alert('Component clicked!');
        });
      }
    }

    customElements.define('vybe-chat', VybeChatComponent);
  }

  // Use the component
  const html = `
    <vybe-chat></vybe-chat>
  `;

  await this.vybeAiService.setContent(html);
}
```

## 🎨 Styling Best Practices

### Use VS Code Theme Variables

Always use VS Code's CSS variables for proper theme integration:

```css
/* Good - Uses theme colors */
.my-element {
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
}

/* Bad - Hard-coded colors */
.my-element {
  color: #000000;
  background: #ffffff;
  border: 1px solid #cccccc;
}
```

### Common VS Code CSS Variables

```css
/* Text Colors */
--vscode-foreground
--vscode-descriptionForeground
--vscode-errorForeground
--vscode-warningForeground

/* Backgrounds */
--vscode-editor-background
--vscode-sideBar-background
--vscode-panel-background

/* Input Elements */
--vscode-input-background
--vscode-input-foreground
--vscode-input-border
--vscode-input-placeholderForeground

/* Buttons */
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground

/* Borders */
--vscode-panel-border
--vscode-contrastBorder

/* Fonts */
--vscode-font-family
--vscode-font-size
--vscode-editor-font-family
```

## 🔌 Integration Points

### Creating a Command to Open VYBE AI

```typescript
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IVybeAiService } from '../common/vybeAiService.js';

class MyCustomVybeCommand extends Action2 {
  constructor() {
    super({
      id: 'myextension.openVybeWithCustomContent',
      title: 'My Custom VYBE Command',
      f1: true
    });
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const vybeAiService = accessor.get(IVybeAiService);

    // Open the pane
    await vybeAiService.openPane();

    // Set custom content
    await vybeAiService.setContent(`
      <h1>Opened from my custom command!</h1>
    `);
  }
}

registerAction2(MyCustomVybeCommand);
```

### Creating a Keybinding

In your package.json or contribution file:

```typescript
{
  "keybindings": [{
    "command": "vybeai.openPane",
    "key": "ctrl+shift+v",
    "mac": "cmd+shift+v"
  }]
}
```

## 📦 Full Example: Complete AI Chat Interface

Here's a complete example of setting up a fully functional chat interface:

```typescript
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IVybeAiService } from '../common/vybeAiService.js';

export class VybeAiChatManager extends Disposable {
  private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(
    @IVybeAiService private readonly vybeAiService: IVybeAiService
  ) {
    super();
    this.initialize();
  }

  private async initialize() {
    // Create the initial UI
    await this.render();

    // Set up event listeners
    this.setupEventListeners();
  }

  private async render() {
    const messagesHtml = this.messages.map(msg => `
      <div class="vybe-message ${msg.role}">
        <div class="vybe-message-role">${msg.role === 'user' ? 'You' : 'VYBE AI'}:</div>
        <div class="vybe-message-content">${this.escapeHtml(msg.content)}</div>
      </div>
    `).join('');

    const html = `
      <style>
        .vybe-chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }

        .vybe-header {
          padding: 16px;
          border-bottom: 1px solid var(--vscode-panel-border);
          background: var(--vscode-sideBar-background);
        }

        .vybe-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .vybe-message {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 6px;
        }

        .vybe-message.user {
          background: var(--vscode-input-background);
          margin-left: 20%;
        }

        .vybe-message.assistant {
          background: var(--vscode-editor-background);
          margin-right: 20%;
        }

        .vybe-message-role {
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 12px;
          opacity: 0.8;
        }

        .vybe-input-container {
          padding: 16px;
          border-top: 1px solid var(--vscode-panel-border);
          background: var(--vscode-sideBar-background);
        }

        .vybe-input-wrapper {
          display: flex;
          gap: 8px;
        }

        .vybe-input {
          flex: 1;
          padding: 10px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
        }

        .vybe-input:focus {
          outline: 1px solid var(--vscode-focusBorder);
        }

        .vybe-send-button {
          padding: 10px 20px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--vscode-font-family);
        }

        .vybe-send-button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .vybe-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>

      <div class="vybe-chat-container">
        <div class="vybe-header">
          <h2 style="margin: 0;">🎵 VYBE AI Chat</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.7;">Your intelligent coding assistant</p>
        </div>

        <div class="vybe-messages" id="vybe-messages-container">
          ${messagesHtml || '<div style="text-align: center; padding: 40px; opacity: 0.5;">Start a conversation with VYBE AI</div>'}
        </div>

        <div class="vybe-input-container">
          <div class="vybe-input-wrapper">
            <input
              id="vybe-chat-input"
              class="vybe-input"
              type="text"
              placeholder="Ask VYBE AI anything..."
            />
            <button id="vybe-send-button" class="vybe-send-button">
              Send
            </button>
          </div>
        </div>
      </div>
    `;

    await this.vybeAiService.setContent(html);
  }

  private setupEventListeners() {
    this.vybeAiService.getContentContainer().then(container => {
      if (!container) return;

      const input = container.querySelector('#vybe-chat-input') as HTMLInputElement;
      const sendButton = container.querySelector('#vybe-send-button') as HTMLButtonElement;

      const send = () => this.sendMessage(input.value);

      sendButton?.addEventListener('click', send);
      input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });
    });
  }

  private async sendMessage(content: string) {
    if (!content.trim()) return;

    // Add user message
    this.messages.push({ role: 'user', content: content.trim() });
    await this.render();

    // TODO: Call your AI backend here
    // For now, simulate a response
    setTimeout(async () => {
      this.messages.push({
        role: 'assistant',
        content: `I received your message: "${content}". This is where the AI response would go.`
      });
      await this.render();
      this.setupEventListeners(); // Re-setup after re-render
    }, 500);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
```

## 🚀 Next Steps

1. **Build the project**: `npm run compile`
2. **Test the commands**: Open Command Palette (F1) and search for "VYBE AI"
3. **Provide your HTML**: Send me your outerHTML and I'll integrate it
4. **Customize**: Modify the examples above to match your needs

## 💡 Tips

- Use `innerHTML` for simple static content
- Use DOM manipulation (`createElement`, `appendChild`) for dynamic content
- Always sanitize user input to prevent XSS attacks
- Use event delegation for better performance with many elements
- Test with both light and dark themes
- Keep the main thread free by using web workers for heavy computations

