/*---------------------------------------------------------------------------------------------
 *  VYBE AI History Dropdown - Chat history dropdown menu
 *  Copyright (c) VYBE. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { $, addDisposableListener, clearNode } from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';

export interface IChatHistoryItem {
	id: string;
	title: string;
	timestamp: Date;
	isCurrent?: boolean;
}

export interface IVybeAiHistoryDropdownOptions {
	onSelectHistory?: (historyId: string) => void;
	onEditHistory?: (historyId: string) => void;
	onRefreshHistory?: (historyId: string) => void;
}

/**
 * Chat history dropdown menu
 */
export class VybeAiHistoryDropdown extends Disposable {
	private readonly container: HTMLElement;
	private readonly searchInput: HTMLInputElement;
	private readonly historyContainer: HTMLElement;
	private historyItems: IChatHistoryItem[] = [];
	private filteredItems: IChatHistoryItem[] = [];
	private readonly disposables = this._register(new DisposableStore());

	constructor(
		parent: HTMLElement,
		private readonly options: IVybeAiHistoryDropdownOptions
	) {
		super();

		// Create dropdown container
		this.container = $('.vybe-history-dropdown');
		this.container.style.position = 'fixed';
		this.container.style.visibility = 'hidden';
		this.container.style.width = '340px';
		this.container.style.boxSizing = 'border-box';
		this.container.style.padding = '0px';
		this.container.style.borderRadius = '6px';
		this.container.style.backgroundColor = 'var(--vscode-dropdown-background)';
		this.container.style.border = 'none';
		this.container.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 16px 23px 0px';
		this.container.style.zIndex = '2548';
		this.container.style.display = 'flex';
		this.container.style.flexDirection = 'column';

		// Search input
		this.searchInput = document.createElement('input');
		this.searchInput.placeholder = 'Search...';
		this.searchInput.style.margin = '8px';
		this.searchInput.style.padding = '4px 8px';
		this.searchInput.style.border = '1px solid var(--vscode-input-border)';
		this.searchInput.style.background = 'var(--vscode-input-background)';
		this.searchInput.style.color = 'var(--vscode-input-foreground)';
		this.container.appendChild(this.searchInput);

		// History container
		this.historyContainer = $('.vybe-history-items');
		this.historyContainer.style.padding = '4px';
		this.historyContainer.style.maxHeight = '400px';
		this.historyContainer.style.overflowY = 'auto';
		this.container.appendChild(this.historyContainer);

		// Search input handler
		this.disposables.add(addDisposableListener(this.searchInput, 'input', () => {
			this.filterHistory(this.searchInput.value);
		}));

		// Click outside to close
		this.disposables.add(addDisposableListener(document, 'click', (e) => {
			if (!this.container.contains(e.target as Node)) {
				this.hide();
			}
		}));

		parent.appendChild(this.container);
	}

	public show(anchorElement: HTMLElement): void {
		const rect = anchorElement.getBoundingClientRect();
		this.container.style.top = `${rect.bottom + 5}px`;
		this.container.style.left = `${rect.right}px`;
		this.container.style.transform = 'translateX(-100%)';
		this.container.style.visibility = 'visible';
		setTimeout(() => this.searchInput.focus(), 0);
	}

	public hide(): void {
		this.container.style.visibility = 'hidden';
		this.searchInput.value = '';
		this.filterHistory('');
	}

	public isVisible(): boolean {
		return this.container.style.visibility === 'visible';
	}

	public toggle(anchorElement: HTMLElement): void {
		if (this.isVisible()) {
			this.hide();
		} else {
			this.show(anchorElement);
		}
	}

	public setHistoryItems(items: IChatHistoryItem[]): void {
		this.historyItems = items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		this.filteredItems = [...this.historyItems];
		this.renderHistory();
	}

	private filterHistory(query: string): void {
		const lowerQuery = query.toLowerCase();
		this.filteredItems = this.historyItems.filter(item =>
			item.title.toLowerCase().includes(lowerQuery)
		);
		this.renderHistory();
	}

	private renderHistory(): void {
		clearNode(this.historyContainer);

		if (this.filteredItems.length === 0) {
			const emptyMessage = $('.vybe-history-empty');
			emptyMessage.textContent = 'No chat history found';
			emptyMessage.style.padding = '20px';
			emptyMessage.style.textAlign = 'center';
			emptyMessage.style.opacity = '0.5';
			this.historyContainer.appendChild(emptyMessage);
			return;
		}

		this.filteredItems.forEach(item => {
			const itemEl = $('.vybe-history-item');
			itemEl.style.padding = '8px';
			itemEl.style.cursor = 'pointer';
			itemEl.style.borderRadius = '4px';

			const title = $('span');
			title.textContent = item.title;
			itemEl.appendChild(title);

			if (item.isCurrent) {
				itemEl.style.backgroundColor = 'var(--vscode-list-activeSelectionBackground)';
			}

			this.disposables.add(addDisposableListener(itemEl, 'mouseenter', () => {
				if (!item.isCurrent) {
					itemEl.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
				}
			}));

			this.disposables.add(addDisposableListener(itemEl, 'mouseleave', () => {
				if (!item.isCurrent) {
					itemEl.style.backgroundColor = 'transparent';
				}
			}));

			this.disposables.add(addDisposableListener(itemEl, 'click', () => {
				this.options.onSelectHistory?.(item.id);
				this.hide();
			}));

			this.historyContainer.appendChild(itemEl);
		});
	}
}
