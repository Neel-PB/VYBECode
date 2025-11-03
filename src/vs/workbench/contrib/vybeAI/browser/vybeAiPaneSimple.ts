/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $ } from '../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';

/**
 * VYBE AI Pane - Simple version without title bar
 */
export class VybeAiPaneSimple extends ViewPane {
	private container!: HTMLElement;
	private contentContainer!: HTMLElement;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override async renderBody(parent: HTMLElement): Promise<void> {
		super.renderBody(parent);

		this.container = parent;
		this.container.classList.add('vybe-ai-pane');

		this.contentContainer = $('.vybe-ai-content');
		this.container.appendChild(this.contentContainer);

		this.renderEmptyState();
	}

	private renderEmptyState(): void {
		// Use DOM methods instead of innerHTML to avoid TrustedHTML errors
		const emptyState = $('.vybe-ai-empty-state');

		const logo = $('.vybe-ai-logo');
		const h1 = document.createElement('h1');
		// allow-any-unicode-next-line
		h1.textContent = '🎵 VYBE AI';
		logo.appendChild(h1);
		emptyState.appendChild(logo);

		const message = $('.vybe-ai-message');
		const p1 = document.createElement('p');
		p1.textContent = 'VYBE AI Pane is ready.';
		message.appendChild(p1);

		const p2 = document.createElement('p');
		p2.textContent = 'Waiting for content to be loaded...';
		p2.style.fontSize = '12px';
		p2.style.opacity = '0.7';
		message.appendChild(p2);

		emptyState.appendChild(message);
		this.contentContainer.appendChild(emptyState);
	}

	public setContent(htmlContent: string): void {
		// Clear existing content
		while (this.contentContainer.firstChild) {
			this.contentContainer.removeChild(this.contentContainer.firstChild);
		}

		// Create a temporary div to parse HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = htmlContent;

		// Move all children to contentContainer
		while (tempDiv.firstChild) {
			this.contentContainer.appendChild(tempDiv.firstChild);
		}
	}

	public getContentContainer(): HTMLElement {
		return this.contentContainer;
	}

	public clearContent(): void {
		while (this.contentContainer.firstChild) {
			this.contentContainer.removeChild(this.contentContainer.firstChild);
		}
	}

	override focus(): void {
		super.focus();
		this.contentContainer.focus();
	}
}

