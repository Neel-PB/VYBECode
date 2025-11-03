/*---------------------------------------------------------------------------------------------
 *  VYBE AI Commands - Example commands for interacting with VYBE AI Pane
 *  Copyright (c) VYBE. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IVybeAiService } from '../common/vybeAiService.js';
import { localize2 } from '../../../../nls.js';

/**
 * Command to open the VYBE AI Pane
 */
class OpenVybeAiPaneAction extends Action2 {
	constructor() {
		super({
			id: 'vybeai.openPane',
			title: localize2('vybeai.openPane', 'Open VYBE AI Pane'),
			category: localize2('vybeai.category', 'VYBE AI'),
			f1: true // Show in command palette
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const vybeAiService = accessor.get(IVybeAiService);
		await vybeAiService.openPane();
	}
}

/**
 * Command to set example content in VYBE AI Pane
 */
class SetVybeAiExampleContentAction extends Action2 {
	constructor() {
		super({
			id: 'vybeai.setExampleContent',
			title: localize2('vybeai.setExampleContent', 'VYBE AI: Set Example Content'),
			category: localize2('vybeai.category', 'VYBE AI'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const vybeAiService = accessor.get(IVybeAiService);

		const exampleHtml = `
			<div style="padding: 20px; font-family: var(--vscode-font-family);">
				<h2 style="color: var(--vscode-foreground);">🎵 Welcome to VYBE AI!</h2>
				<p style="color: var(--vscode-descriptionForeground);">
					This is example content loaded via command.
				</p>
				<div style="margin-top: 20px; padding: 15px; background: var(--vscode-editor-background); border-radius: 5px;">
					<p><strong>You can now add your own HTML here!</strong></p>
					<p>This pane uses native HTML/DOM - no React required.</p>
				</div>
			</div>
		`;

		await vybeAiService.setContent(exampleHtml);
	}
}

/**
 * Command to clear VYBE AI Pane content
 */
class ClearVybeAiContentAction extends Action2 {
	constructor() {
		super({
			id: 'vybeai.clearContent',
			title: localize2('vybeai.clearContent', 'VYBE AI: Clear Content'),
			category: localize2('vybeai.category', 'VYBE AI'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const vybeAiService = accessor.get(IVybeAiService);
		await vybeAiService.clearContent();
	}
}

// Register all commands
registerAction2(OpenVybeAiPaneAction);
registerAction2(SetVybeAiExampleContentAction);
registerAction2(ClearVybeAiContentAction);

