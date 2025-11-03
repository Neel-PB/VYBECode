/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, addDisposableListener, append, clearNode } from '../../../../base/browser/dom.js';
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

interface ChatTab {
	id: string;
	title: string;
	isActive: boolean;
}

/**
 * VYBE AI Pane with custom Cursor-style title bar
 */
export class VybeAiPaneWithCustomTitle extends ViewPane {
	private container!: HTMLElement;
	private contentContainer!: HTMLElement;
	private tabs: ChatTab[] = [];
	private activeChatId = 'default';
	private tabsContainer!: HTMLElement;

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

		// Initialize with default tab
		this.tabs = [{ id: 'default', title: 'New Chat', isActive: true }];
	}

	/**
	 * Override to create custom title bar matching Cursor's structure
	 */
	protected override renderHeader(container: HTMLElement): void {
		console.log('[VYBE AI] renderHeader called - REPLACING default header');

		// Store the container reference (needed by base class)
		(this as any).headerContainer = container;

		// Clear container using DOM methods (TrustedHTML safe)
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}

		// HIDE the entire pane header - we'll use the container's header instead
		const paneHeader = this.element.querySelector('.pane-header') as HTMLElement;
		if (paneHeader) {
			paneHeader.style.display = 'none';
			console.log('[VYBE AI] Hid default pane header');
		}

		// Now customize the CONTAINER's title bar
		// Wait for container to be available, then modify it
		setTimeout(() => {
			this.customizeContainerTitle();
		}, 0);
	}

	private customizeContainerTitle(): void {
		// Find the container's title bar
		const containerTitle = this.element.closest('.pane-composite-part')?.querySelector('.composite.title') as HTMLElement;

		if (!containerTitle) {
			console.log('[VYBE AI] Container title not found yet');
			return;
		}

		console.log('[VYBE AI] Found container title, customizing...');

		// Add composite-bar class
		containerTitle.classList.add('has-composite-bar');

		// Clear and rebuild the title structure
		while (containerTitle.firstChild) {
			containerTitle.removeChild(containerTitle.firstChild);
		}

		containerTitle.style.display = 'flex';
		containerTitle.style.alignItems = 'center';
		containerTitle.style.padding = '0';
		containerTitle.style.height = '35px';

		// Create composite bar container (for tabs - left side)
		const compositeBarContainer = append(containerTitle, $('.composite-bar-container'));
		compositeBarContainer.style.flex = '1';
		compositeBarContainer.style.minWidth = '0';
		compositeBarContainer.style.overflow = 'hidden';
		compositeBarContainer.style.paddingLeft = '8px'; // Add left padding for first tab

		// Create scrollable element
		const scrollable = append(compositeBarContainer, $('.monaco-scrollable-element.composite-bar-scrollable.mac'));
		scrollable.setAttribute('role', 'presentation');
		scrollable.style.position = 'relative';
		scrollable.style.overflow = 'hidden';

		// Create composite bar - THIS is what scrolls
		const compositeBar = append(scrollable, $('.composite-bar'));
		compositeBar.style.overflow = 'hidden';
		compositeBar.style.overflowX = 'auto'; // Enable horizontal scroll
		compositeBar.style.scrollbarWidth = 'none'; // Hide Firefox scrollbar
		// Hide webkit scrollbar with inline CSS (safest approach)
		const styleId = 'vybe-ai-scrollbar-hide';
		if (!document.getElementById(styleId)) {
			const style = document.createElement('style');
			style.id = styleId;
			style.textContent = '.composite-bar::-webkit-scrollbar { display: none; }';
			document.head.appendChild(style);
		}

		// Create action bar
		const actionBar = append(compositeBar, $('.monaco-action-bar'));

		// Create tabs container with spacing between tabs
		this.tabsContainer = append(actionBar, $('ul.actions-container'));
		this.tabsContainer.setAttribute('role', 'tablist');
		this.tabsContainer.setAttribute('aria-label', 'Active View Switcher');
		this.tabsContainer.style.display = 'flex';
		this.tabsContainer.style.gap = '4px'; // Add spacing between tabs

		// Render tabs
		this.renderTabs();

		// Add horizontal scrollbar (shows when content overflows)
		const hScrollbar = append(scrollable, $('.invisible.scrollbar.horizontal'));
		hScrollbar.setAttribute('role', 'presentation');
		hScrollbar.setAttribute('aria-hidden', 'true');
		hScrollbar.style.position = 'absolute';
		hScrollbar.style.height = '3px';
		hScrollbar.style.left = '0px';
		hScrollbar.style.bottom = '0px';

		const hSlider = append(hScrollbar, $('.slider'));
		hSlider.style.position = 'absolute';
		hSlider.style.top = '0px';
		hSlider.style.left = '0px';
		hSlider.style.height = '3px';
		hSlider.style.transform = 'translate3d(0px, 0px, 0px)';
		hSlider.style.contain = 'strict';

		// Theme-aware scrollbar slider color
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench ? (workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black')) : true;
		hSlider.style.backgroundColor = isDarkTheme ? 'rgba(228, 228, 228, 0.4)' : 'rgba(51, 51, 51, 0.4)';
		hSlider.style.borderRadius = '2px';

		// Update scrollbar dynamically based on content (proportional slider)
		const updateScrollbar = () => {
			const containerWidth = compositeBarContainer.offsetWidth;
			const contentWidth = this.tabsContainer.scrollWidth;
			const scrollLeft = compositeBar.scrollLeft;

			// Set scrollbar track width to container width
			hScrollbar.style.width = `${containerWidth}px`;

			// Calculate proportional slider width (visible ratio)
			const visibleRatio = containerWidth / contentWidth;
			const sliderWidth = Math.max(containerWidth * visibleRatio, 30); // Min 30px
			hSlider.style.width = `${sliderWidth}px`;

			// Calculate slider position based on scroll
			const maxScroll = contentWidth - containerWidth;
			const scrollRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0;
			const maxSliderOffset = containerWidth - sliderWidth;
			const sliderLeft = maxSliderOffset * scrollRatio;
			hSlider.style.transform = `translate3d(${sliderLeft}px, 0px, 0px)`;

			// Show/hide scrollbar based on overflow
			if (contentWidth > containerWidth) {
				hScrollbar.classList.remove('invisible');
			} else {
				hScrollbar.classList.add('invisible');
			}
		};

		// Update scrollbar on scroll
		this._register(addDisposableListener(compositeBar, 'scroll', updateScrollbar));

		// Update scrollbar on window resize
		this._register(addDisposableListener(window, 'resize', updateScrollbar));

		// Store reference to update when tabs change
		(this as any).updateScrollbar = updateScrollbar;

		// Initial update
		setTimeout(updateScrollbar, 100); // Delay to ensure DOM is ready

		// Create title actions section - Match Cursor's exact structure
		const titleActions = append(containerTitle, $('.title-actions'));
		titleActions.style.paddingRight = '4px'; // Minimal right padding like reference
		const toolbar = append(titleActions, $('.monaco-toolbar'));
		const titleActionBar = append(toolbar, $('.monaco-action-bar'));
		const titleActionsContainer = append(titleActionBar, $('ul.actions-container'));
		titleActionsContainer.setAttribute('role', 'toolbar');
		titleActionsContainer.setAttribute('aria-label', 'Chat actions');

		console.log('[VYBE AI] Creating action buttons');

		// Plus icon for new chat
		const plusLi = append(titleActionsContainer, $('li.action-item.menu-entry'));
		plusLi.setAttribute('role', 'presentation');
		plusLi.setAttribute('custom-hover', 'true');
		const plusBtn = append(plusLi, $('a.action-label.codicon.codicon-add'));
		plusBtn.setAttribute('role', 'button');
		plusBtn.setAttribute('aria-label', 'New Chat');
		plusBtn.setAttribute('tabindex', '0');
		const plusBadge = append(plusLi, $('.badge'));
		plusBadge.setAttribute('aria-hidden', 'true');
		plusBadge.style.display = 'none';
		append(plusBadge, $('.badge-content'));

		this._register(addDisposableListener(plusBtn, 'click', () => {
			this.handleNewChat();
		}));

		// History icon
		const historyLi = append(titleActionsContainer, $('li.action-item.menu-entry'));
		historyLi.setAttribute('role', 'presentation');
		historyLi.setAttribute('custom-hover', 'true');
		const historyBtn = append(historyLi, $('a.action-label.codicon.codicon-history'));
		historyBtn.setAttribute('role', 'button');
		historyBtn.setAttribute('aria-label', 'Show Chat History');
		const historyBadge = append(historyLi, $('.badge'));
		historyBadge.setAttribute('aria-hidden', 'true');
		historyBadge.style.display = 'none';
		append(historyBadge, $('.badge-content'));

		this._register(addDisposableListener(historyBtn, 'click', (e) => {
			e.stopPropagation();
			this.showHistoryDropdown(historyBtn);
		}));

		// Ellipsis menu (more options)
		const ellipsisLi = append(titleActionsContainer, $('li.action-item'));
		ellipsisLi.setAttribute('role', 'presentation');
		const dropdown = append(ellipsisLi, $('.monaco-dropdown'));
		const dropdownLabel = append(dropdown, $('.dropdown-label'));
		const ellipsisBtn = append(dropdownLabel, $('a.action-label.codicon.codicon-ellipsis'));
		ellipsisBtn.setAttribute('custom-hover', 'true');
		ellipsisBtn.setAttribute('aria-label', 'More Actions...');
		ellipsisBtn.setAttribute('aria-expanded', 'false');

		this._register(addDisposableListener(ellipsisBtn, 'click', () => {
			console.log('More actions clicked');
			// TODO: Show dropdown menu
		}));

		console.log('[VYBE AI] customizeContainerTitle complete - Total children:', containerTitle.children.length);
	}

	private renderTabs(): void {
		clearNode(this.tabsContainer);

		// Detect theme - same approach as dropdown
		let isDarkTheme = false;
		const workbench = document.querySelector('.monaco-workbench');
		if (workbench) {
			isDarkTheme = workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black');
		}

		// Theme-aware colors for tabs - matching dropdown exactly
		const textColor = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)'; // Same for all tabs (no fading)
		const borderColor = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		// Use VYBE dropdown background colors for tab backgrounds
		const hoverBg = isDarkTheme ? '#222427' : '#eceff2'; // Dropdown background color
		const activeBg = isDarkTheme ? '#222427' : '#eceff2'; // Active chat has subtle background (dropdown color)

		this.tabs.forEach(tab => {
			// Match Cursor's exact structure
			const li = append(this.tabsContainer, $('li.action-item.composite-bar-action-tab'));
			li.setAttribute('role', 'tab');
			li.setAttribute('draggable', 'true');
			li.setAttribute('aria-label', tab.title);
			li.setAttribute('aria-expanded', tab.isActive.toString());
			li.setAttribute('aria-selected', tab.isActive.toString());

			// Add rounded corners to prevent overlapping appearance
			li.style.borderRadius = '4px';
			li.style.transition = 'background-color 0.15s ease';

			// Add is-truncated and checked classes like Cursor
			if (tab.isActive) {
				li.classList.add('is-truncated');
				li.classList.add('checked');
			}

			// Set CSS variable for insert border color - theme-aware
			li.style.setProperty('--insert-border-color', borderColor);

			// Status indicator (first element in tab)
			append(li, $('.status-indicator'));

			// Terminal icon (hidden by default, but present in structure like Cursor)
			const terminalIcon = append(li, $('.codicon.codicon-terminal'));
			terminalIcon.style.marginRight = '4px';
			terminalIcon.style.display = 'none';
			terminalIcon.style.fontSize = '11px';
			terminalIcon.style.color = 'var(--cursor-icon-primary)';

			// Tab label with theme-aware colors - same for all tabs (no fading)
			const label = append(li, $('a.action-label'));
			label.setAttribute('aria-label', tab.title);
			label.textContent = tab.title;
			label.style.color = textColor; // Same color for active and inactive
			label.style.borderBottomColor = isDarkTheme ? 'rgba(228, 228, 228, 0)' : 'rgba(51, 51, 51, 0)';

			// Badge (hidden by default)
			const badge = append(li, $('.badge'));
			badge.setAttribute('aria-hidden', 'true');
			badge.setAttribute('aria-label', tab.title);
			badge.style.display = 'none';
			const badgeContent = append(badge, $('.badge-content'));
			badgeContent.style.color = 'rgb(20, 20, 20)';
			badgeContent.style.backgroundColor = 'rgb(136, 192, 208)';

			// Close button (exact Cursor positioning)
			const closeBtn = append(li, $('.codicon.codicon-close.remove-button'));
			closeBtn.style.position = 'absolute';
			closeBtn.style.right = '0px'; // Cursor uses 0px
			closeBtn.style.top = '50%';
			closeBtn.style.transform = 'translateY(-50%)';
			closeBtn.style.cursor = 'pointer';
			closeBtn.style.zIndex = '2';
			closeBtn.style.opacity = '0';
			closeBtn.style.pointerEvents = 'none';

			// Active item indicator (always present)
			append(li, $('.active-item-indicator'));

			// Set initial background for active chat (subtle background in light theme)
			if (tab.isActive) {
				li.style.backgroundColor = activeBg;
			} else {
				li.style.backgroundColor = 'transparent';
			}

			// Show close button and hover background
			this._register(addDisposableListener(li, 'mouseenter', () => {
				li.style.backgroundColor = hoverBg;
				closeBtn.style.opacity = '1';
				closeBtn.style.pointerEvents = 'auto';
			}));

			this._register(addDisposableListener(li, 'mouseleave', () => {
				// Restore background: active gets subtle background, inactive gets transparent
				li.style.backgroundColor = tab.isActive ? activeBg : 'transparent';
				closeBtn.style.opacity = '0';
				closeBtn.style.pointerEvents = 'none';
			}));

			// Close button handler
			this._register(addDisposableListener(closeBtn, 'click', (e) => {
				e.stopPropagation();
				this.removeTab(tab.id);
			}));

			// Tab click handler
			this._register(addDisposableListener(li, 'click', () => {
				this.setActiveTab(tab.id);
			}));
		});

		// Update scrollbar after rendering tabs
		if ((this as any).updateScrollbar) {
			setTimeout(() => (this as any).updateScrollbar(), 50);
		}
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
		p2.textContent = 'Waiting for your custom content...';
		p2.style.fontSize = '12px';
		p2.style.opacity = '0.7';
		message.appendChild(p2);

		emptyState.appendChild(message);
		this.contentContainer.appendChild(emptyState);
	}

	public setContent(htmlContent: string): void {
		while (this.contentContainer.firstChild) {
			this.contentContainer.removeChild(this.contentContainer.firstChild);
		}

		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = htmlContent;

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

	// Tab management methods
	private handleNewChat(): void {
		const newId = `chat-${Date.now()}`;
		this.tabs.push({ id: newId, title: 'New Chat', isActive: false });
		this.setActiveTab(newId);
	}

	private setActiveTab(tabId: string): void {
		this.tabs.forEach(t => t.isActive = t.id === tabId);
		this.activeChatId = tabId;
		this.renderTabs();
	}

	private removeTab(tabId: string): void {
		const index = this.tabs.findIndex(t => t.id === tabId);
		if (index !== -1) {
			this.tabs.splice(index, 1);
			if (this.activeChatId === tabId && this.tabs.length > 0) {
				this.setActiveTab(this.tabs[0].id);
			}
			this.renderTabs();
		}
	}

	private showHistoryDropdown(anchorElement: HTMLElement): void {
		// Remove existing dropdown if any
		const existing = document.getElementById('vybe-history-dropdown');
		if (existing) {
			existing.remove();
			return; // Toggle behavior
		}

		// Create dropdown container - use contrasting background
		const dropdown = append(document.body, $('#vybe-history-dropdown'));
		dropdown.style.boxSizing = 'border-box';
		dropdown.style.padding = '0';
		dropdown.style.borderRadius = '6px';

		// Detect theme - try multiple methods
		let isDarkTheme = false;

		// Method 1: Check workbench element classes
		const workbench = document.querySelector('.monaco-workbench');
		if (workbench) {
			isDarkTheme = workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black');
			console.log('[VYBE AI Dropdown] Theme detection via workbench classes:', isDarkTheme ? 'DARK' : 'LIGHT');
		}

		// Method 2: Fallback to luminance check
		if (!workbench) {
			const bodyBg = window.getComputedStyle(document.body).backgroundColor;
			const rgb = bodyBg.match(/\d+/g);
			if (rgb && rgb.length >= 3) {
				const luminance = (0.299 * parseInt(rgb[0]) + 0.587 * parseInt(rgb[1]) + 0.114 * parseInt(rgb[2])) / 255;
				isDarkTheme = luminance < 0.5;
				console.log('[VYBE AI Dropdown] Theme detection via luminance:', luminance, isDarkTheme ? 'DARK' : 'LIGHT');
			}
		}

		// VYBE-specific dropdown colors
		if (isDarkTheme) {
			// VYBE Dark theme dropdown background
			dropdown.style.backgroundColor = '#222427';
			dropdown.style.border = '1px solid rgba(128, 128, 128, 0.2)';
			console.log('[VYBE AI Dropdown] Applied DARK theme colors: #222427');
		} else {
			// VYBE Light theme dropdown background
			dropdown.style.backgroundColor = '#eceff2';
			dropdown.style.border = '1px solid rgba(0, 0, 0, 0.1)';
			console.log('[VYBE AI Dropdown] Applied LIGHT theme colors: #eceff2');
		}

		dropdown.style.alignItems = 'stretch';
		dropdown.style.fontSize = '12px';
		dropdown.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
		dropdown.style.display = 'flex';
		dropdown.style.flexDirection = 'column';
		dropdown.style.gap = '0';
		dropdown.style.position = 'fixed';
		dropdown.style.visibility = 'visible';
		dropdown.style.width = '340px';
		dropdown.style.transformOrigin = 'right top';
		dropdown.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.24)';
		dropdown.style.zIndex = '10000';

		// Position below and aligned to the right of the history button
		const rect = anchorElement.getBoundingClientRect();
		dropdown.style.top = `${rect.bottom + 8}px`;
		dropdown.style.left = `${rect.right}px`;
		dropdown.style.transform = 'translateX(-100%)';

		// Inner container
		const innerContainer = append(dropdown, $('div'));
		innerContainer.style.flex = '1';
		innerContainer.style.overflow = 'hidden';
		innerContainer.style.display = 'flex';
		innerContainer.style.height = '100%';
		innerContainer.style.flexDirection = 'column';

		// Content container - compact padding
		const contentContainer = append(innerContainer, $('div'));
		contentContainer.setAttribute('tabindex', '0');
		contentContainer.style.boxSizing = 'border-box';
		contentContainer.style.alignItems = 'stretch';
		contentContainer.style.fontSize = '12px';
		contentContainer.style.display = 'flex';
		contentContainer.style.flexDirection = 'column';
		contentContainer.style.gap = '2px';
		contentContainer.style.padding = '4px';
		contentContainer.style.outline = 'none';
		contentContainer.style.pointerEvents = 'auto';

		// Search input container - aligned left with chat items
		const searchContainer = append(contentContainer, $('div'));
		searchContainer.style.display = 'flex';
		searchContainer.style.gap = '0';
		searchContainer.style.alignItems = 'center';
		searchContainer.style.padding = '0'; // No padding on container
		searchContainer.style.border = 'none';
		searchContainer.style.boxSizing = 'border-box';
		searchContainer.style.outline = 'none';
		searchContainer.style.margin = '0';

		// Search input - compact size, aligned with Today header and chat items
		const searchInput = append(searchContainer, $('input'));
		searchInput.setAttribute('placeholder', 'Search...');
		searchInput.style.fontSize = '11px'; // Smaller
		searchInput.style.lineHeight = '16px';
		searchInput.style.borderRadius = '3px';
		searchInput.style.backgroundColor = 'var(--vscode-input-background)';
		// Explicit colors for typed text and caret - visible in both themes
		searchInput.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.caretColor = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.padding = '3px 4px'; // Match 4px left padding of chat items
		searchInput.style.flex = '1';
		searchInput.style.minWidth = '0';
		searchInput.style.border = '1px solid var(--vscode-input-border)';
		searchInput.style.outline = 'none';
		searchInput.style.boxSizing = 'border-box';
		searchInput.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// List container
		const listContainer = append(contentContainer, $('div'));
		listContainer.style.height = 'auto';
		listContainer.style.maxHeight = '300px';
		listContainer.style.overflow = 'auto';

		// List content
		const listContent = append(listContainer, $('div'));
		listContent.style.display = 'flex';
		listContent.style.flexDirection = 'column';
		listContent.style.gap = '1px'; // Tighter spacing
		listContent.style.padding = '0';

		// Today section header - visible in both themes with explicit colors
		const todayHeader = append(listContent, $('div'));
		todayHeader.textContent = 'Today';
		todayHeader.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.6)' : 'rgba(51, 51, 51, 0.6)';
		todayHeader.style.fontSize = '10px';
		todayHeader.style.opacity = '1';
		todayHeader.style.padding = '4px 4px 2px 4px';
		todayHeader.style.lineHeight = '14px';
		todayHeader.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// Render chat history items - compact design
		this.tabs.forEach((tab, index) => {
			const item = append(listContent, $('div'));
			item.style.display = 'flex';
			item.style.alignItems = 'center';
			item.style.justifyContent = 'space-between';
			item.style.padding = '4px 4px'; // Much tighter padding
			item.style.minWidth = '0';
			item.style.cursor = 'pointer';
			item.style.borderRadius = '3px'; // Smaller radius
			item.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
			item.style.gap = '6px'; // Tighter gap

			// Set initial background - no special background for active, only on hover
			item.style.backgroundColor = 'transparent';

			// Left side: icon + title + current badge
			const leftSide = append(item, $('div'));
			leftSide.style.display = 'flex';
			leftSide.style.alignItems = 'center';
			leftSide.style.gap = '6px'; // Tighter gap
			leftSide.style.minWidth = '0';
			leftSide.style.flex = '1';

			// Chat icon - same color for all chats (active and inactive)
			const icon = append(leftSide, $('i.codicon.codicon-comment'));
			icon.style.flexShrink = '0';
			icon.style.fontSize = '13px'; // Smaller icon
			icon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';

			// Title + Current badge (inline)
			const titleWithBadge = append(leftSide, $('div'));
			titleWithBadge.style.display = 'flex';
			titleWithBadge.style.alignItems = 'center';
			titleWithBadge.style.gap = '4px'; // Tighter gap
			titleWithBadge.style.minWidth = '0';
			titleWithBadge.style.flex = '1';

			// Title - same color for all chats (active and inactive)
			const title = append(titleWithBadge, $('span'));
			title.textContent = tab.title;
			title.style.fontSize = '11px';
			title.style.lineHeight = '16px';
			title.style.whiteSpace = 'nowrap';
			title.style.textOverflow = 'ellipsis';
			title.style.overflow = 'hidden';
			title.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';

			// "Current" badge - visible in both themes with explicit colors
			if (tab.isActive) {
				const badge = append(titleWithBadge, $('span'));
				badge.textContent = 'Current';
				badge.style.fontSize = '9px';
				badge.style.lineHeight = '16px';
				badge.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.7)' : 'rgba(102, 102, 102, 0.7)';
				badge.style.flexShrink = '0';
				badge.style.opacity = '1';
				badge.style.fontWeight = '400';
			}

			// Right side: time ago + edit + delete icons - smaller
			const rightSide = append(item, $('div'));
			rightSide.style.display = 'flex';
			rightSide.style.alignItems = 'center';
			rightSide.style.gap = '4px'; // Tighter gap
			rightSide.style.flexShrink = '0';

			// Time ago (show on hover for non-current chats) - visible with explicit colors
			if (!tab.isActive) {
				const timeAgo = append(rightSide, $('span'));
				// Calculate time ago (mock for now - use actual timestamp in production)
				const hoursAgo = index + 1;
				timeAgo.textContent = hoursAgo < 1 ? `${hoursAgo * 60}m` : hoursAgo < 24 ? `${hoursAgo}h` : `${Math.floor(hoursAgo / 24)}d`;
				timeAgo.style.fontSize = '9px';
				timeAgo.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.8)' : 'rgba(102, 102, 102, 0.8)';
				timeAgo.style.opacity = '0'; // Hidden until hover
				timeAgo.style.transition = 'opacity 0.2s';
				timeAgo.style.flexShrink = '0';
				(item as any)._timeAgo = timeAgo;
			}

			// Edit icon (pencil) - same color for all chats
			const editIcon = append(rightSide, $('i.codicon.codicon-edit'));
			editIcon.style.fontSize = '12px';
			editIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			editIcon.style.opacity = '0'; // Hidden until hover
			editIcon.style.transition = 'opacity 0.2s';
			editIcon.style.cursor = 'pointer';
			editIcon.style.padding = '1px';
			editIcon.style.flexShrink = '0';
			(item as any)._editIcon = editIcon;

			this._register(addDisposableListener(editIcon, 'click', (e) => {
				e.stopPropagation();
				console.log('Edit chat:', tab.id);
				// TODO: Implement rename functionality
			}));

			// Delete icon (trash) - same color for all chats
			const deleteIcon = append(rightSide, $('i.codicon.codicon-trash'));
			deleteIcon.style.fontSize = '12px';
			deleteIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			deleteIcon.style.opacity = '0'; // Hidden until hover
			deleteIcon.style.transition = 'opacity 0.2s';
			deleteIcon.style.cursor = 'pointer';
			deleteIcon.style.padding = '1px';
			deleteIcon.style.flexShrink = '0';
			(item as any)._deleteIcon = deleteIcon;

			this._register(addDisposableListener(deleteIcon, 'click', (e) => {
				e.stopPropagation();
				this.removeTab(tab.id);
				dropdown.remove();
			}));

			// Hover state - VYBE hover background #7e7f80
			this._register(addDisposableListener(item, 'mouseenter', () => {
				// Use VYBE hover color
				item.style.backgroundColor = '#7e7f80';
				item.style.transition = 'background-color 0.15s ease';

				// Show icons on hover - full opacity for visibility
				if ((item as any)._editIcon) {
					(item as any)._editIcon.style.opacity = '1';
				}
				if ((item as any)._deleteIcon) {
					(item as any)._deleteIcon.style.opacity = '1';
				}
				if ((item as any)._timeAgo) {
					(item as any)._timeAgo.style.opacity = '1';
				}
			}));

			this._register(addDisposableListener(item, 'mouseleave', () => {
				// Reset to transparent for all items (no special background for active)
				item.style.backgroundColor = 'transparent';

				// Hide icons
				if ((item as any)._editIcon) {
					(item as any)._editIcon.style.opacity = '0';
				}
				if ((item as any)._deleteIcon) {
					(item as any)._deleteIcon.style.opacity = '0';
				}
				if ((item as any)._timeAgo) {
					(item as any)._timeAgo.style.opacity = '0';
				}
			}));

			// Click handler
			this._register(addDisposableListener(item, 'click', () => {
				this.setActiveTab(tab.id);
				dropdown.remove();
			}));
		});

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !anchorElement.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 0);
	}

	override focus(): void {
		super.focus();
		this.contentContainer.focus();
	}
}

