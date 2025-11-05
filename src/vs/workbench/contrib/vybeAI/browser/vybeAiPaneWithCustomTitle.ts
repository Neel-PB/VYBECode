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
	private selectedModel: string = 'composer-1';
	private isMaxModeEnabled: boolean = false;
	private isAutoEnabled: boolean = true;
	private autoLabelElement: HTMLElement | null = null;
	private maxBadge: HTMLElement | null = null;
	private textInput: HTMLElement | null = null;
	private messages: Array<{ id: string; type: 'user' | 'ai'; content: string; timestamp: number }> = [];
	private userMessageCount: number = 0;
	private readonly LOCK_DISTANCE = 10; // Distance in px where messages "lock" and move together
	private messagePages: Map<string, HTMLElement> = new Map(); // Each message+response is a "page"

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
		const hoverBg = isDarkTheme ? '#1e1f21' : '#f8f8f9'; // Dropdown background color
		const activeBg = isDarkTheme ? '#1e1f21' : '#f8f8f9'; // Active chat has subtle background (dropdown color)

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

		// Main container with flex layout
		const mainContainer = $('.vybe-ai-main-container');
		mainContainer.style.display = 'flex';
		mainContainer.style.flexDirection = 'column';
		mainContainer.style.height = '100%';
		mainContainer.style.overflow = 'hidden';

	// Content area (scrollable, fills remaining space)
	// Each message+response will be a full-height "page"
	this.contentContainer = $('.vybe-ai-content');
	this.contentContainer.style.flex = '1';
	this.contentContainer.style.overflow = 'auto';
	this.contentContainer.style.padding = '0';
	this.contentContainer.style.paddingBottom = '100%'; // Spacer at bottom to scroll last page to top
	this.contentContainer.style.boxSizing = 'border-box';
	this.contentContainer.style.scrollSnapType = 'y mandatory'; // Snap to pages
	mainContainer.appendChild(this.contentContainer);

		// Composer at the bottom
		const composer = this.renderComposer();
		mainContainer.appendChild(composer);

	this.container.appendChild(mainContainer);

	// Initialize scroll listener for smooth sticky transitions
	this.initStickyTransitionBehavior();

	// Empty state removed - composer is always visible
	// this.renderEmptyState();
}

	private renderComposer(): HTMLElement {
		// Detect theme
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench ? (workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black')) : true;

		// Outer container with padding
		const composerOuter = $('.vybe-ai-composer-outer');
		composerOuter.style.display = 'flex';
		composerOuter.style.flexDirection = 'column';
		composerOuter.style.margin = '0px 10px 10px';
		composerOuter.style.flexShrink = '0';

	// Main input box container with VYBE theme-aware background
	const inputBox = $('.vybe-ai-input-box');
	inputBox.style.position = 'relative';
	inputBox.style.borderRadius = '6px';
	inputBox.style.border = '1px solid var(--vscode-input-border)';
	// Use VYBE theme colors for composer background
	inputBox.style.backgroundColor = isDarkTheme ? '#1e1f21' : '#f8f8f9';
	inputBox.style.transition = 'box-shadow 100ms ease-in-out, border-color 100ms ease-in-out';
	inputBox.style.padding = '8px';

	// Add drag-and-drop support for images/files
	this._register(addDisposableListener(inputBox, 'dragover', (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		inputBox.style.borderColor = 'var(--vscode-focusBorder)';
		inputBox.style.boxShadow = '0 0 0 1px var(--vscode-focusBorder)';
	}));

	this._register(addDisposableListener(inputBox, 'dragleave', (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		inputBox.style.borderColor = 'var(--vscode-input-border)';
		inputBox.style.boxShadow = 'none';
	}));

	this._register(addDisposableListener(inputBox, 'drop', (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		inputBox.style.borderColor = 'var(--vscode-input-border)';
		inputBox.style.boxShadow = 'none';

		if (e.dataTransfer?.files) {
			Array.from(e.dataTransfer.files).forEach((file) => {
				const isImage = file.type.startsWith('image/');
				// Create object URL for image preview
				const fileUrl = isImage ? URL.createObjectURL(file) : undefined;
				this.addAttachedItem(file.name, isImage ? 'image' : 'file', file.name, fileUrl);
			});
		}
	}));

	// Inner content wrapper
		const innerContent = $('.vybe-ai-input-inner');
		innerContent.style.display = 'flex';
		innerContent.style.flexDirection = 'column';
		innerContent.style.gap = '8px';
		innerContent.style.width = '100%';
		innerContent.style.boxSizing = 'border-box';

		// Context pills area
		const contextPills = this.renderContextPills(isDarkTheme);
		innerContent.appendChild(contextPills);

		// Text input area
		const textInputArea = this.renderTextInput(isDarkTheme);
		innerContent.appendChild(textInputArea);

	// Bottom bar (mode/model + action buttons)
	const bottomBar = this.renderBottomBar(isDarkTheme);
	innerContent.appendChild(bottomBar);

	inputBox.appendChild(innerContent);

	// Append action buttons directly to inputBox (absolute positioned)
	const rightSide = (bottomBar as any).rightSide;
	if (rightSide) {
		inputBox.appendChild(rightSide);
	}

	composerOuter.appendChild(inputBox);

		return composerOuter;
	}

	private renderContextPills(isDarkTheme: boolean): HTMLElement {
		const contextArea = $('.vybe-ai-context-pills');
		contextArea.style.display = 'flex';
		contextArea.style.alignItems = 'center';
		contextArea.style.gap = '4px';
		contextArea.style.flexWrap = 'nowrap';
		contextArea.style.minHeight = '20px';
		contextArea.style.overflow = 'visible'; // Allow hover previews to show
		contextArea.style.position = 'relative';
		contextArea.style.justifyContent = 'flex-start'; // Everything flows left to right
		contextArea.style.width = '100%'; // Ensure it extends all the way to the right edge
		contextArea.style.boxSizing = 'border-box';

	// @ button to add context
	const addButton = $('.vybe-ai-add-context');
	addButton.style.cursor = 'pointer';
	addButton.style.display = 'flex';
	addButton.style.alignItems = 'center';
	addButton.style.justifyContent = 'center';
	addButton.style.padding = '2px';
	addButton.style.height = '20px';
	addButton.style.width = '20px';
	addButton.style.boxSizing = 'border-box';
	addButton.style.borderRadius = '4px';
	addButton.style.border = 'none';
	addButton.style.backgroundColor = 'var(--vscode-input-background)';
	addButton.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 1px 3px';
	addButton.style.flexShrink = '0';
	addButton.style.outline = 'none';

	const atIcon = $('span.codicon.codicon-mention');
	atIcon.style.fontSize = '12px';
	atIcon.style.color = 'var(--vscode-icon-foreground)';
	atIcon.style.paddingLeft = '0';
	addButton.appendChild(atIcon);

	this._register(addDisposableListener(addButton, 'click', (e) => {
		e.stopPropagation();
		this.showContextDropdown(addButton);
	}));

	contextArea.appendChild(addButton);

	// Pills container - flows left to right, flexible
	const pillsContainer = $('.vybe-ai-pills-container');
	pillsContainer.style.display = 'flex';
	pillsContainer.style.alignItems = 'center';
	pillsContainer.style.gap = '4px';
	pillsContainer.style.flex = '1 1 auto'; // Flexible
	pillsContainer.style.overflow = 'hidden';
	pillsContainer.style.flexWrap = 'nowrap';
	pillsContainer.style.minWidth = '0';
	pillsContainer.style.position = 'relative';
	pillsContainer.style.justifyContent = 'flex-start';

	this.contextPillsContainer = pillsContainer;
	contextArea.appendChild(pillsContainer);

	// Right group: +N and 0% glued together
	const rightGroup = $('.vybe-ai-right-group');
	rightGroup.style.display = 'flex';
	rightGroup.style.alignItems = 'center';
	rightGroup.style.gap = '4px';
	rightGroup.style.flexShrink = '0'; // Never shrink
	rightGroup.style.marginLeft = 'auto'; // Push to right

	// +N overflow pill container (inside rightGroup)
	const overflowPillContainer = $('.vybe-ai-overflow-pill-container');
	overflowPillContainer.style.display = 'none'; // Hidden by default
	overflowPillContainer.style.alignItems = 'center';

	this.overflowPillContainer = overflowPillContainer;
	rightGroup.appendChild(overflowPillContainer);

	// 0% usage indicator (inside rightGroup)
	const usageIndicator = $('.vybe-ai-usage-indicator');
	usageIndicator.style.display = 'flex';
	usageIndicator.style.alignItems = 'center';
	usageIndicator.style.gap = '4px';
	usageIndicator.style.paddingLeft = '4px';
	usageIndicator.style.paddingRight = '2px';
	usageIndicator.style.backgroundColor = 'var(--vscode-input-background)';
	usageIndicator.style.borderRadius = '4px';
	usageIndicator.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 1px 3px';
	usageIndicator.style.cursor = 'pointer';
	usageIndicator.style.height = '20px';

	const usageText = document.createElement('span');
	usageText.textContent = '0%';
	usageText.style.fontSize = '12px';
	usageText.style.color = 'var(--vscode-descriptionForeground)';
	usageIndicator.appendChild(usageText);

	// Progress circle (SVG)
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('width', '14');
	svg.setAttribute('height', '14');
	svg.style.flexShrink = '0';

	const circleBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circleBg.setAttribute('fill', 'none');
	circleBg.setAttribute('opacity', '0.25');
	circleBg.setAttribute('cx', '7');
	circleBg.setAttribute('cy', '7');
	circleBg.setAttribute('r', '5.25');
	circleBg.setAttribute('stroke', 'var(--vscode-icon-foreground)');
	circleBg.setAttribute('stroke-width', '1.5');
	svg.appendChild(circleBg);

	const circleFg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circleFg.setAttribute('fill', 'none');
	circleFg.setAttribute('stroke-linecap', 'round');
	circleFg.setAttribute('opacity', '0.9');
	circleFg.setAttribute('cx', '7');
	circleFg.setAttribute('cy', '7');
	circleFg.setAttribute('r', '5.25');
	circleFg.setAttribute('stroke', 'var(--vscode-icon-foreground)');
	circleFg.setAttribute('stroke-width', '1.5');
	circleFg.setAttribute('stroke-dasharray', '32.99');
	circleFg.setAttribute('stroke-dashoffset', '32.99'); // 0% progress
	circleFg.setAttribute('transform', 'rotate(-90 7 7)');
	svg.appendChild(circleFg);

	usageIndicator.appendChild(svg);

	this._register(addDisposableListener(usageIndicator, 'click', (e) => {
		e.stopPropagation();
		this.showUsageDropdown(usageIndicator);
	}));

	rightGroup.appendChild(usageIndicator);
	contextArea.appendChild(rightGroup);

	this.rightGroup = rightGroup;

	// Add resize observer to recalculate pills when panel resizes
	if (typeof ResizeObserver !== 'undefined') {
		const resizeObserver = new ResizeObserver(() => {
			this.updateContextPills();
		});
		resizeObserver.observe(contextArea);
		this._register({ dispose: () => resizeObserver.disconnect() });
	}

	return contextArea;
	}

	private attachedItems: Array<{ id: string; name: string; type: 'image' | 'file'; path?: string; fileUrl?: string }> = [];
	private contextPillsContainer: HTMLElement | null = null;
	private overflowPillContainer: HTMLElement | null = null;
	private rightGroup: HTMLElement | null = null;


	private addAttachedItem(name: string, type: 'image' | 'file', path?: string, fileUrl?: string): void {
		const id = `${type}-${Date.now()}-${Math.random()}`;
		this.attachedItems.push({ id, name, type, path, fileUrl });
		this.updateContextPills();
	}

	private removeAttachedItem(id: string): void {
		this.attachedItems = this.attachedItems.filter(item => item.id !== id);
		this.updateContextPills();
	}

	private updateContextPills(): void {
		if (!this.contextPillsContainer || !this.overflowPillContainer || !this.rightGroup) {
			return;
		}

		// Clear existing pills
		while (this.contextPillsContainer.firstChild) {
			this.contextPillsContainer.removeChild(this.contextPillsContainer.firstChild);
		}

		// If no items, hide +N and return
		if (this.attachedItems.length === 0) {
			this.overflowPillContainer.style.display = 'none';
			return;
		}

		// Calculate available width for pills
		// Pills container is flexible and will automatically shrink to fit available space
		const pillsContainerWidth = this.contextPillsContainer.offsetWidth;

		const PILL_WIDTH = 84; // 80px max-width + 4px gap

		// Calculate how many pills can fit in the available space
		let maxVisiblePills = Math.floor(pillsContainerWidth / PILL_WIDTH);

		// Ensure we don't show more than we have
		maxVisiblePills = Math.min(maxVisiblePills, this.attachedItems.length);

		// Ensure at least 1 pill is shown if there are items
		if (maxVisiblePills === 0 && this.attachedItems.length > 0) {
			maxVisiblePills = 1;
		}

		const itemsToShow = this.attachedItems.slice(0, maxVisiblePills);
		const overflowCount = this.attachedItems.length - maxVisiblePills;

		// Render visible pills
		itemsToShow.forEach((item) => {
			const pill = this.createPill(item);
			this.contextPillsContainer!.appendChild(pill);
		});

		// Show/hide +N pill
		if (overflowCount > 0) {
			while (this.overflowPillContainer.firstChild) {
				this.overflowPillContainer.removeChild(this.overflowPillContainer.firstChild);
			}
			const overflowPill = this.createOverflowPill(overflowCount);
			this.overflowPillContainer.appendChild(overflowPill);
			this.overflowPillContainer.style.display = 'flex';
		} else {
			this.overflowPillContainer.style.display = 'none';
		}
	}

	private createPill(item: { id: string; name: string; type: 'image' | 'file'; fileUrl?: string }): HTMLElement {
		const pill = $('.vybe-ai-context-pill');
		pill.setAttribute('data-id', item.id);
		pill.style.display = 'flex';
		pill.style.alignItems = 'center';
		pill.style.gap = '4px';
		pill.style.padding = '2px 6px';
		pill.style.height = '20px'; // Match @ button height
		pill.style.boxSizing = 'border-box';
		pill.style.borderRadius = '4px';
		pill.style.backgroundColor = 'var(--vscode-input-background)';
		pill.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 1px 3px';
		pill.style.fontSize = '11px';
		pill.style.color = 'var(--vscode-foreground)';
		pill.style.cursor = 'default';
		pill.style.flexShrink = '0';
		pill.style.maxWidth = '80px'; // Reduced to prevent overflow
		pill.style.overflow = 'hidden';
		pill.style.position = 'relative';

		// Icon based on type
		const icon = $(item.type === 'image' ? 'span.codicon.codicon-file-media' : 'span.codicon.codicon-file');
		icon.style.fontSize = '11px';
		icon.style.flexShrink = '0';
		pill.appendChild(icon);

		// Name - show "Image" for images, "File" for files
		const nameSpan = document.createElement('span');
		nameSpan.textContent = item.type === 'image' ? 'Image' : 'File';
		nameSpan.style.overflow = 'hidden';
		nameSpan.style.textOverflow = 'ellipsis';
		nameSpan.style.whiteSpace = 'nowrap';
		nameSpan.style.flexShrink = '1';
		pill.appendChild(nameSpan);

		// Close button
		const closeBtn = $('span.codicon.codicon-close');
		closeBtn.style.fontSize = '11px';
		closeBtn.style.cursor = 'pointer';
		closeBtn.style.opacity = '0.7';
		closeBtn.style.flexShrink = '0';

		this._register(addDisposableListener(closeBtn, 'click', (e) => {
			e.stopPropagation();
			this.removeAttachedItem(item.id);
		}));

		pill.appendChild(closeBtn);

		// Add hover preview for images
		if (item.type === 'image' && item.fileUrl) {
			this.addImageHoverPreview(pill, item.fileUrl, item.name);
		}

		return pill;
	}

	private addImageHoverPreview(pill: HTMLElement, imageUrl: string, imageName: string): void {
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench ? (workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black')) : true;

		let preview: HTMLElement | null = null;
		let showTimeout: any = null;

		this._register(addDisposableListener(pill, 'mouseenter', () => {
			// Delay showing preview slightly
			showTimeout = setTimeout(() => {
				preview = $('.vybe-ai-image-preview');
				preview.style.position = 'fixed';
				preview.style.zIndex = '10000';
				preview.style.backgroundColor = isDarkTheme ? '#1e1f21' : '#f8f8f9';
				preview.style.border = `1px solid ${isDarkTheme ? '#3e3f41' : '#d0d0d0'}`;
				preview.style.borderRadius = '6px';
				preview.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
				preview.style.padding = '8px';
				preview.style.maxWidth = '300px';
				preview.style.maxHeight = '300px';

			// Image only - no filename
			const img = document.createElement('img');
			img.src = imageUrl;
			img.style.maxWidth = '100%';
			img.style.maxHeight = '280px';
			img.style.objectFit = 'contain';
			img.style.display = 'block';
			img.style.borderRadius = '4px';
			preview.appendChild(img);

			document.body.appendChild(preview);

				// Position preview above the pill
				const pillRect = pill.getBoundingClientRect();
				const previewRect = preview.getBoundingClientRect();

				// Position above pill, centered
				let left = pillRect.left + (pillRect.width / 2) - (previewRect.width / 2);
				let top = pillRect.top - previewRect.height - 8;

				// Keep within viewport
				if (left < 8) left = 8;
				if (left + previewRect.width > window.innerWidth - 8) {
					left = window.innerWidth - previewRect.width - 8;
				}
				if (top < 8) {
					// If no room above, show below
					top = pillRect.bottom + 8;
				}

				preview.style.left = `${left}px`;
				preview.style.top = `${top}px`;
			}, 300); // 300ms delay before showing
		}));

		this._register(addDisposableListener(pill, 'mouseleave', () => {
			if (showTimeout) {
				clearTimeout(showTimeout);
				showTimeout = null;
			}
			if (preview) {
				preview.remove();
				preview = null;
			}
		}));
	}

	private createOverflowPill(count: number): HTMLElement {
		const pill = $('.vybe-ai-overflow-pill');
		pill.style.display = 'flex';
		pill.style.alignItems = 'center';
		pill.style.justifyContent = 'center';
		pill.style.padding = '2px 6px';
		pill.style.height = '20px'; // Match @ button height
		pill.style.boxSizing = 'border-box';
		pill.style.borderRadius = '4px';
		pill.style.backgroundColor = 'var(--vscode-input-background)';
		pill.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 1px 3px';
		pill.style.fontSize = '11px';
		pill.style.color = 'var(--vscode-foreground)';
		pill.style.cursor = 'pointer';
		pill.style.flexShrink = '0';
		pill.style.fontWeight = '500';
		pill.style.minWidth = 'fit-content';

		const text = document.createElement('span');
		text.textContent = `+${count}`;
		pill.appendChild(text);

		this._register(addDisposableListener(pill, 'click', (e) => {
			e.stopPropagation();
			this.showAllAttachmentsDropdown(pill);
		}));

		return pill;
	}

	private showAllAttachmentsDropdown(anchor: HTMLElement): void {
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench ? (workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black')) : true;

		// Remove existing dropdown if any (toggle behavior)
		const existing = document.querySelector('.vybe-ai-attachments-dropdown');
		if (existing) {
			existing.remove();
			return;
		}

		// Create outer container
		const dropdown = $('.vybe-ai-attachments-dropdown');
		dropdown.style.position = 'fixed';
		dropdown.style.boxSizing = 'border-box';
		dropdown.style.borderRadius = '6px';
		dropdown.style.background = 'transparent';
		dropdown.style.border = 'none';
		dropdown.style.zIndex = '10000';
		dropdown.style.width = '240px';
		dropdown.style.boxShadow = '0 0 8px 2px rgba(0, 0, 0, 0.3)';

		// Inner container with actual styling
		const innerContainer = document.createElement('div');
		innerContainer.style.boxSizing = 'border-box';
		innerContainer.style.borderRadius = '6px';
		innerContainer.style.backgroundColor = isDarkTheme ? '#1e1f21' : '#f8f8f9';
		innerContainer.style.border = `1px solid ${isDarkTheme ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`;
		innerContainer.style.display = 'flex';
		innerContainer.style.flexDirection = 'column';
		innerContainer.style.gap = '2px';
		innerContainer.style.padding = '0px';
		innerContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
		innerContainer.style.fontSize = '12px';
		innerContainer.style.outline = 'none';

		// Search input container
		const searchContainer = document.createElement('div');
		searchContainer.style.display = 'flex';
		searchContainer.style.gap = '4px';
		searchContainer.style.alignItems = 'center';
		searchContainer.style.padding = '0px 6px';
		searchContainer.style.border = 'none';
		searchContainer.style.boxSizing = 'border-box';
		searchContainer.style.outline = 'none';
		searchContainer.style.margin = '2px';

		// Search input
		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Add files, folders, docs...';
		searchInput.style.fontSize = '12px';
		searchInput.style.lineHeight = '15px';
		searchInput.style.borderRadius = '3px';
		searchInput.style.backgroundColor = 'transparent';
		searchInput.style.color = 'var(--vscode-input-foreground)';
		searchInput.style.padding = '3px 0px';
		searchInput.style.flex = '1';
		searchInput.style.minWidth = '0';
		searchInput.style.border = 'none';
		searchInput.style.outline = 'none';
		searchInput.style.boxSizing = 'border-box';
		searchInput.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
		searchInput.setAttribute('placeholder', 'Add files, folders, docs...');

		searchContainer.appendChild(searchInput);
		innerContainer.appendChild(searchContainer);

		// Scrollable content container
		const scrollContainer = document.createElement('div');
		scrollContainer.style.height = '200px';
		scrollContainer.style.overflowY = 'auto';
		scrollContainer.style.overflowX = 'hidden';

		// Content wrapper
		const contentWrapper = document.createElement('div');
		contentWrapper.style.display = 'flex';
		contentWrapper.style.flexDirection = 'column';
		contentWrapper.style.gap = '1px';
		contentWrapper.style.padding = '0.5px';

		// "Added" section
		if (this.attachedItems.length > 0) {
			const addedSection = document.createElement('div');
			addedSection.style.display = 'flex';
			addedSection.style.flexDirection = 'column';
			addedSection.style.gap = '0.5px';

			// Section header
			const sectionHeader = document.createElement('div');
			sectionHeader.textContent = 'Added';
			sectionHeader.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.4)' : 'rgba(102, 102, 102, 0.4)';
			sectionHeader.style.fontSize = '11px';
			sectionHeader.style.opacity = '0.4';
			sectionHeader.style.padding = '4px 6px';
			sectionHeader.style.lineHeight = '15px';
			addedSection.appendChild(sectionHeader);

			// Items container
			const itemsContainer = document.createElement('div');
			itemsContainer.style.display = 'flex';
			itemsContainer.style.flexDirection = 'column';
			itemsContainer.style.gap = '0.5px';

			this.attachedItems.forEach((item) => {
				const itemEl = document.createElement('div');
				itemEl.style.borderRadius = '3px';
				itemEl.style.display = 'flex';
				itemEl.style.flexDirection = 'column';
				itemEl.style.gap = '0.5px';
				itemEl.style.padding = '2px 6px';
				itemEl.style.minWidth = '0';
				itemEl.style.cursor = 'pointer';

				const itemInner = document.createElement('div');
				itemInner.style.display = 'flex';
				itemInner.style.justifyContent = 'space-between';
				itemInner.style.alignItems = 'center';
				itemInner.style.minWidth = '0';
				itemInner.style.width = '100%';

				// Left side (icon + text)
				const leftSide = document.createElement('div');
				leftSide.style.display = 'flex';
				leftSide.style.alignItems = 'center';
				leftSide.style.gap = '4px';
				leftSide.style.minWidth = '0';
				leftSide.style.height = '16px';
				leftSide.style.width = '100%';

				// Icon
				const icon = $(item.type === 'image' ? 'span.codicon.codicon-file-media' : 'span.codicon.codicon-file');
				icon.style.flexShrink = '0';
				icon.style.width = '13px';
				icon.style.fontSize = '12px';
				icon.style.display = 'flex';
				icon.style.alignItems = 'center';
				icon.style.justifyContent = 'flex-start';
				icon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
				leftSide.appendChild(icon);

				// Text wrapper
				const textWrapper = document.createElement('div');
				textWrapper.style.display = 'flex';
				textWrapper.style.width = '100%';
				textWrapper.style.alignItems = 'center';
				textWrapper.style.minWidth = '0';
				textWrapper.style.gap = '4px';
				textWrapper.style.height = '17px';

				// Name
				const nameWrapper = document.createElement('div');
				nameWrapper.style.maxWidth = '100%';

				const name = document.createElement('span');
				name.textContent = item.type === 'image' ? 'Image' : item.name;
				name.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
				name.style.fontSize = '12px';
				name.style.lineHeight = '17px';
				name.style.whiteSpace = 'nowrap';
				name.style.textOverflow = 'ellipsis';
				name.style.overflow = 'hidden';
				name.style.display = 'block';
				name.style.width = '100%';
				nameWrapper.appendChild(name);

				textWrapper.appendChild(nameWrapper);
				leftSide.appendChild(textWrapper);
				itemInner.appendChild(leftSide);

				// Right side (checkmark)
				const rightSide = document.createElement('div');
				rightSide.style.display = 'flex';
				rightSide.style.alignItems = 'center';
				rightSide.style.gap = '6px';
				rightSide.style.marginLeft = '4px';

				const checkContainer = document.createElement('div');
				checkContainer.style.position = 'relative';
				checkContainer.style.flexShrink = '0';
				checkContainer.style.width = '16px';

				const checkWrapper = document.createElement('span');
				checkWrapper.style.position = 'absolute';
				checkWrapper.style.inset = '0';
				checkWrapper.style.display = 'flex';
				checkWrapper.style.alignItems = 'center';
				checkWrapper.style.justifyContent = 'flex-end';
				checkWrapper.style.zIndex = '1';

				const checkInner = document.createElement('span');
				checkInner.style.display = 'inline-flex';
				checkInner.style.alignItems = 'center';
				checkInner.style.justifyContent = 'center';
				checkInner.style.minWidth = '16px';
				checkInner.style.fontSize = '10px';
				checkInner.style.lineHeight = '10px';
				checkInner.style.userSelect = 'none';

				const checkIcon = $('span.codicon.codicon-check');
				checkIcon.style.padding = '2px';
				checkIcon.style.margin = '0px';
				checkIcon.style.borderRadius = '2px';
				checkIcon.style.transition = 'opacity 0.2s';
				checkIcon.style.fontSize = '10px';
				checkIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
				checkInner.appendChild(checkIcon);
				checkWrapper.appendChild(checkInner);
				checkContainer.appendChild(checkWrapper);
				rightSide.appendChild(checkContainer);
				itemInner.appendChild(rightSide);

				itemEl.appendChild(itemInner);

				// Hover effect
				this._register(addDisposableListener(itemEl, 'mouseenter', () => {
					itemEl.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
				}));
				this._register(addDisposableListener(itemEl, 'mouseleave', () => {
					itemEl.style.backgroundColor = 'transparent';
				}));

				// Click to remove
				this._register(addDisposableListener(itemEl, 'click', () => {
					this.removeAttachedItem(item.id);
					dropdown.remove();
				}));

				itemsContainer.appendChild(itemEl);
			});

			addedSection.appendChild(itemsContainer);
			contentWrapper.appendChild(addedSection);

			// Separator
			const separator = document.createElement('div');
			separator.style.height = '1px';
			separator.style.width = '100%';
			separator.style.backgroundColor = isDarkTheme ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 0, 0, 0.1)';
			separator.style.opacity = '0.8';
			contentWrapper.appendChild(separator);
		}

		// Context options section
		const contextSection = document.createElement('div');
		contextSection.style.display = 'flex';
		contextSection.style.flexDirection = 'column';
		contextSection.style.gap = '0.5px';

		const contextOptions = [
			{ icon: 'codicon-files', label: 'Files & Folders', hasSubmenu: true },
			{ icon: 'codicon-code', label: 'Code', hasSubmenu: true },
			{ icon: 'codicon-book', label: 'Docs', hasSubmenu: true }
		];

		contextOptions.forEach(option => {
			const optionEl = document.createElement('div');
			optionEl.style.borderRadius = '3px';
			optionEl.style.display = 'flex';
			optionEl.style.flexDirection = 'column';
			optionEl.style.gap = '0.5px';
			optionEl.style.padding = '2px 6px';
			optionEl.style.minWidth = '0';
			optionEl.style.cursor = 'pointer';

			const optionInner = document.createElement('div');
			optionInner.style.display = 'flex';
			optionInner.style.justifyContent = 'space-between';
			optionInner.style.alignItems = 'center';
			optionInner.style.minWidth = '0';
			optionInner.style.width = '100%';

			// Left side
			const leftSide = document.createElement('div');
			leftSide.style.display = 'flex';
			leftSide.style.alignItems = 'center';
			leftSide.style.gap = '4px';
			leftSide.style.minWidth = '0';
			leftSide.style.height = '16px';
			leftSide.style.width = '100%';

			const icon = $(`span.codicon.${option.icon}`);
			icon.style.flexShrink = '0';
			icon.style.width = '13px';
			icon.style.fontSize = '12px';
			icon.style.display = 'flex';
			icon.style.alignItems = 'center';
			icon.style.justifyContent = 'flex-start';
			icon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			leftSide.appendChild(icon);

			const textWrapper = document.createElement('div');
			textWrapper.style.display = 'flex';
			textWrapper.style.width = '100%';
			textWrapper.style.alignItems = 'center';
			textWrapper.style.minWidth = '0';
			textWrapper.style.gap = '4px';
			textWrapper.style.height = '17px';

			const nameWrapper = document.createElement('div');
			nameWrapper.style.maxWidth = '100%';

			const name = document.createElement('span');
			name.textContent = option.label;
			name.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			name.style.fontSize = '12px';
			name.style.lineHeight = '17px';
			name.style.whiteSpace = 'nowrap';
			name.style.textOverflow = 'ellipsis';
			name.style.overflow = 'hidden';
			name.style.display = 'block';
			name.style.width = '100%';
			nameWrapper.appendChild(name);

			textWrapper.appendChild(nameWrapper);
			leftSide.appendChild(textWrapper);
			optionInner.appendChild(leftSide);

			// Right side (chevron for submenu)
			if (option.hasSubmenu) {
				const rightSide = document.createElement('div');
				rightSide.style.display = 'flex';
				rightSide.style.alignItems = 'center';
				rightSide.style.gap = '6px';
				rightSide.style.marginLeft = '4px';

				const chevron = $('span.codicon.codicon-chevron-right');
				chevron.style.marginRight = '0';
				chevron.style.fontSize = '8px';
				chevron.style.flexShrink = '0';
				chevron.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
				chevron.style.opacity = '0.3';
				rightSide.appendChild(chevron);
				optionInner.appendChild(rightSide);
			}

			optionEl.appendChild(optionInner);

			// Hover effect
			this._register(addDisposableListener(optionEl, 'mouseenter', () => {
				optionEl.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
			}));
			this._register(addDisposableListener(optionEl, 'mouseleave', () => {
				optionEl.style.backgroundColor = 'transparent';
			}));

			contextSection.appendChild(optionEl);
		});

		contentWrapper.appendChild(contextSection);
		scrollContainer.appendChild(contentWrapper);
		innerContainer.appendChild(scrollContainer);
		dropdown.appendChild(innerContainer);

		document.body.appendChild(dropdown);

		// Position dropdown - ABOVE composer, RIGHT-ALIGNED to composer's outer edge (like @ dropdown)
		const anchorRect = anchor.getBoundingClientRect();

		// Find the composer outer box to align with its right edge
		const composerElement = document.querySelector('.vybe-ai-input-box') as HTMLElement;
		const composerRect = composerElement ? composerElement.getBoundingClientRect() : anchorRect;

		// Position ABOVE the anchor with gap (same as @ dropdown: 18px)
		dropdown.style.top = `${anchorRect.top - 18}px`; // 18px gap above
		dropdown.style.right = `${window.innerWidth - composerRect.right + 8}px`; // Right-aligned to composer's outer edge (with 8px inset, like @ dropdown)
		dropdown.style.left = 'auto';
		dropdown.style.transform = 'translateY(-100%)'; // Move up by its own height

		// Focus search input
		setTimeout(() => searchInput.focus(), 0);

		// Close on outside click
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => document.addEventListener('click', closeHandler), 0);
	}

	private updateMaxBadge(): void {
		if (this.maxBadge) {
			this.maxBadge.style.display = this.isMaxModeEnabled ? 'flex' : 'none';
		}
	}

	private renderTextInput(isDarkTheme: boolean): HTMLElement {
		const inputWrapper = $('.vybe-ai-text-input-wrapper');
		inputWrapper.style.position = 'relative';
		inputWrapper.style.minHeight = '20px';
		inputWrapper.style.maxHeight = '240px';

	// Actual input (contenteditable div)
	const input = document.createElement('div');
	input.contentEditable = 'true';
	input.setAttribute('role', 'textbox');
	input.setAttribute('spellcheck', 'false');
	input.style.outline = 'none';
	input.style.border = 'none';
	input.style.padding = '0';
	input.style.fontSize = '13px';
	input.style.lineHeight = '1.5';
	input.style.color = 'var(--vscode-input-foreground)';
	input.style.backgroundColor = 'transparent';
	input.style.minHeight = '20px';
	input.style.maxHeight = '240px';
	input.style.overflowY = 'auto';
	input.style.wordBreak = 'break-word';
	input.style.whiteSpace = 'pre-wrap';

	// Save reference to input
	this.textInput = input;

		// Placeholder
		const placeholder = $('.vybe-ai-placeholder');
		placeholder.textContent = 'Plan, @ for context, / for commands';
		placeholder.style.position = 'absolute';
		placeholder.style.top = '0';
		placeholder.style.left = '0';
		placeholder.style.fontSize = '13px';
		placeholder.style.lineHeight = '1.5';
		placeholder.style.color = 'var(--vscode-input-placeholderForeground)';
		placeholder.style.opacity = '0.5';
		placeholder.style.pointerEvents = 'none';

		// Hide placeholder when input has content
		this._register(addDisposableListener(input, 'input', () => {
			if (input.textContent && input.textContent.trim().length > 0) {
				placeholder.style.display = 'none';
			} else {
				placeholder.style.display = 'block';
			}
		}));

		inputWrapper.appendChild(input);
		inputWrapper.appendChild(placeholder);

		return inputWrapper;
	}

	private renderBottomBar(isDarkTheme: boolean): HTMLElement {
	// Main container - grid layout matching Cursor
	const bottomBar = $('.vybe-ai-bottom-bar');
	bottomBar.style.display = 'grid';
	bottomBar.style.gridTemplateColumns = '4fr 1fr';
	bottomBar.style.alignItems = 'center';
	bottomBar.style.height = '28px';
	bottomBar.style.boxSizing = 'border-box';
	bottomBar.style.flex = '1';
	bottomBar.style.justifyContent = 'space-between';
	bottomBar.style.width = '100%';
	bottomBar.style.marginTop = '20px'; // Gap between input area and bottom toolbar

		// Left side: Mode and Model dropdowns
		const leftSide = $('.vybe-ai-bottom-left');
		leftSide.style.display = 'flex';
		leftSide.style.alignItems = 'center';
		leftSide.style.gap = '4px';
		leftSide.style.marginRight = '6px';
		leftSide.style.flexShrink = '1';
		leftSide.style.flexGrow = '0';
		leftSide.style.minWidth = '0';
		leftSide.style.height = '20px';

		// Agent dropdown (pill-shaped with background on hover)
		const agentDropdown = $('.vybe-ai-agent-dropdown');
		agentDropdown.style.display = 'flex';
		agentDropdown.style.gap = '4px'; // Gap between "Agent" text and chevron
		agentDropdown.style.fontSize = '12px';
		agentDropdown.style.alignItems = 'center';
		agentDropdown.style.lineHeight = '24px';
		agentDropdown.style.minWidth = '0';
		agentDropdown.style.maxWidth = '100%';
		agentDropdown.style.padding = '3px 6px 3px 7px'; // Matching Cursor: 7px left, 6px right
		agentDropdown.style.borderRadius = '24px';
		agentDropdown.style.flexShrink = '0';
		agentDropdown.style.cursor = 'pointer';
		agentDropdown.style.border = 'none';
		// Default background (always visible, not just on hover)
		agentDropdown.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
		agentDropdown.style.transition = 'background-color 0.15s ease';

		// Agent inner content
		const agentInner = $('.vybe-ai-agent-inner');
		agentInner.style.display = 'flex';
		agentInner.style.alignItems = 'center';
		agentInner.style.gap = '4px';
		agentInner.style.minWidth = '0';
		agentInner.style.maxWidth = '100%';
		agentInner.style.overflow = 'hidden';

		// Gear icon (replacing infinity since it doesn't exist in VS Code)
		const gearIcon = $('span.codicon.codicon-gear');
		gearIcon.style.fontSize = '14px';
		gearIcon.style.flexShrink = '0';
		gearIcon.style.width = '14px';
		gearIcon.style.height = '14px';
		gearIcon.style.display = 'flex';
		gearIcon.style.alignItems = 'center';
		gearIcon.style.justifyContent = 'center';
		gearIcon.style.opacity = '0.5';
		agentInner.appendChild(gearIcon);

		// Agent label with text and shortcut
		const agentLabel = $('.vybe-ai-agent-label');
		agentLabel.style.minWidth = '0';
		agentLabel.style.maxWidth = '100%';
		agentLabel.style.overflow = 'hidden';
		agentLabel.style.textOverflow = 'ellipsis';
		agentLabel.style.whiteSpace = 'nowrap';
		agentLabel.style.lineHeight = '12px';
		agentLabel.style.display = 'flex';
		agentLabel.style.alignItems = 'baseline';
		agentLabel.style.gap = '4px';
		agentLabel.style.height = '13px';
		agentLabel.style.fontWeight = '400';

		const agentText = document.createElement('span');
		agentText.textContent = 'Agent';
		agentText.style.opacity = '0.8';
		agentText.style.maxWidth = '120px';
		agentText.style.overflow = 'hidden';
		agentText.style.height = '13px';
		agentText.style.textOverflow = 'ellipsis';
		agentText.style.whiteSpace = 'nowrap';
		agentText.style.minWidth = '0';
		agentLabel.appendChild(agentText);

		// No shortcut - removed per user request

		agentInner.appendChild(agentLabel);
		agentDropdown.appendChild(agentInner);

		// Agent chevron
		const agentChevron = $('span.codicon.codicon-chevron-up');
		agentChevron.style.fontSize = '10px';
		agentChevron.style.flexShrink = '0';
		agentDropdown.appendChild(agentChevron);

		// No hover effect needed - background is already set as default

		this._register(addDisposableListener(agentDropdown, 'click', (e) => {
			e.stopPropagation();
			this.showModeDropdown(agentDropdown);
		}));

		leftSide.appendChild(agentDropdown);

		// Auto (Model) dropdown - simpler, no pill background
		const autoDropdown = $('.vybe-ai-auto-dropdown');
		autoDropdown.style.display = 'flex';
		autoDropdown.style.gap = '4px';
		autoDropdown.style.fontSize = '12px';
		autoDropdown.style.alignItems = 'center';
		autoDropdown.style.lineHeight = '12px';
		autoDropdown.style.cursor = 'pointer';
		autoDropdown.style.minWidth = '0';
		autoDropdown.style.maxWidth = '100%';
		autoDropdown.style.padding = '2.5px 6px';
		autoDropdown.style.borderRadius = '23px';
		autoDropdown.style.border = 'none';
		autoDropdown.style.backgroundColor = 'transparent';
		autoDropdown.style.flexShrink = '1';
		autoDropdown.style.overflow = 'hidden';
		autoDropdown.style.transition = 'background-color 0.15s ease';

		// Auto inner
		const autoInner = $('.vybe-ai-auto-inner');
		autoInner.style.display = 'flex';
		autoInner.style.alignItems = 'center';
		autoInner.style.gap = '4px';
		autoInner.style.minWidth = '0';
		autoInner.style.maxWidth = '100%';
		autoInner.style.overflow = 'hidden';
		autoInner.style.flexShrink = '1';
		autoInner.style.flexGrow = '1';

		// Auto label
		const autoLabel = $('.vybe-ai-auto-label');
		autoLabel.style.minWidth = '0';
		autoLabel.style.textOverflow = 'ellipsis';
		autoLabel.style.whiteSpace = 'nowrap';
		autoLabel.style.lineHeight = '12px';
		autoLabel.style.display = 'flex';
		autoLabel.style.alignItems = 'center';
		autoLabel.style.gap = '4px';
		autoLabel.style.overflow = 'hidden';
		autoLabel.style.height = '16px';
		autoLabel.style.flexShrink = '1';
		autoLabel.style.flexGrow = '1';

		const autoText = document.createElement('span');
		// Show "Auto" if auto is enabled, otherwise show selected model name
		autoText.textContent = this.isAutoEnabled ? 'Auto' : this.selectedModel;
		autoText.style.whiteSpace = 'nowrap';
		autoText.style.overflow = 'hidden';
		autoText.style.textOverflow = 'ellipsis';
		autoText.style.lineHeight = 'normal';
		autoText.style.maxWidth = '100%';
		autoText.style.flex = '1 1 auto';
		autoText.style.minWidth = '0';
		autoText.style.paddingBottom = '1px';
		autoText.style.opacity = '0.6'; // Default opacity
		autoText.style.transition = 'opacity 0.15s ease';
		autoLabel.appendChild(autoText);

		// Store reference to update dynamically
		this.autoLabelElement = autoText;

		autoInner.appendChild(autoLabel);
		autoDropdown.appendChild(autoInner);

		// Auto chevron
		const autoChevron = $('span.codicon.codicon-chevron-up');
		autoChevron.style.fontSize = '10px';
		autoChevron.style.flexShrink = '0';
		autoChevron.style.opacity = '0.6'; // Default opacity
		autoChevron.style.transition = 'opacity 0.15s ease';
		autoDropdown.appendChild(autoChevron);

		// Hover effect for Auto dropdown - only highlight text (no background)
		this._register(addDisposableListener(autoDropdown, 'mouseenter', () => {
			autoText.style.opacity = '1';
			autoChevron.style.opacity = '1';
		}));
		this._register(addDisposableListener(autoDropdown, 'mouseleave', () => {
			autoText.style.opacity = '0.6';
			autoChevron.style.opacity = '0.6';
		}));

		this._register(addDisposableListener(autoDropdown, 'click', (e) => {
			e.stopPropagation();
			this.showModelDropdown(autoDropdown);
		}));

		leftSide.appendChild(autoDropdown);
		bottomBar.appendChild(leftSide);

	// Right side: Action buttons - ABSOLUTE positioned at bottom right
	const rightSide = $('.vybe-ai-bottom-right');
	rightSide.style.position = 'absolute';
	rightSide.style.bottom = '8px';
	rightSide.style.right = '8px';
	rightSide.style.display = 'flex';
	rightSide.style.alignItems = 'center';
	rightSide.style.gap = '8px';
	rightSide.style.zIndex = '10';

	// MAX badge (shows when MAX Mode is enabled) - appears to the left of attachment button
	const maxBadge = $('.vybe-ai-max-badge');
	maxBadge.style.display = this.isMaxModeEnabled ? 'flex' : 'none';
	maxBadge.style.alignItems = 'center';
	maxBadge.style.justifyContent = 'center';
	maxBadge.style.padding = '0';
	maxBadge.style.height = '18px';
	maxBadge.style.backgroundColor = 'transparent'; // No background
	maxBadge.style.fontSize = '10px';
	maxBadge.style.fontWeight = '600';
	maxBadge.style.color = '#3ecf8e'; // VYBE green text
	maxBadge.style.letterSpacing = '0.5px';
	maxBadge.style.textTransform = 'uppercase';
	maxBadge.style.flexShrink = '0';
	maxBadge.textContent = 'MAX';

	this.maxBadge = maxBadge;
	rightSide.appendChild(maxBadge);

		// Image upload button
	// Image attachment button (18x18, transparent)
	const imageButton = $('.vybe-ai-image-button');
	imageButton.style.width = '18px';
	imageButton.style.height = '18px';
	imageButton.style.display = 'flex';
	imageButton.style.alignItems = 'center';
	imageButton.style.justifyContent = 'center';
	imageButton.style.cursor = 'pointer';
	imageButton.style.backgroundColor = 'transparent';
	imageButton.style.border = 'none';
	imageButton.style.flexShrink = '0';

	const imageIcon = $('span.codicon.codicon-attach');
	imageIcon.style.fontSize = '12px';
	imageIcon.style.color = 'var(--vscode-foreground)';
	imageButton.appendChild(imageIcon);

	// Create hidden file input for image selection
	const imageFileInput = document.createElement('input');
	imageFileInput.type = 'file';
	imageFileInput.accept = 'image/*';
	imageFileInput.multiple = true;
	imageFileInput.style.display = 'none';

	this._register(addDisposableListener(imageFileInput, 'change', () => {
		if (imageFileInput.files) {
			Array.from(imageFileInput.files).forEach((file) => {
				// Create object URL for preview
				const fileUrl = URL.createObjectURL(file);
				this.addAttachedItem(file.name, 'image', file.name, fileUrl);
			});
		}
		// Reset input so same file can be selected again
		imageFileInput.value = '';
	}));

	imageButton.appendChild(imageFileInput);

	this._register(addDisposableListener(imageButton, 'click', () => {
		console.log('[VYBE AI] Image button clicked');
		imageFileInput.click();
	}));

	rightSide.appendChild(imageButton);

	// Send/Stop button (20x20, outlined with background)
	const sendButton = $('.vybe-ai-send-button');
	sendButton.setAttribute('data-outlined', 'true');
	sendButton.setAttribute('data-stop-button', 'false'); // Will toggle to true when sending
	sendButton.style.width = '20px';
	sendButton.style.height = '20px';
	sendButton.style.display = 'flex';
	sendButton.style.alignItems = 'center';
	sendButton.style.justifyContent = 'center';
	sendButton.style.cursor = 'pointer';
	sendButton.style.border = 'none';
	sendButton.style.borderRadius = '4px';
	sendButton.style.flexShrink = '0';
	// Outlined button style - visible background
	sendButton.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
	sendButton.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 1px 3px';

	const sendIcon = $('span.codicon.codicon-arrow-up');
	sendIcon.style.fontSize = '12px';
	sendIcon.style.color = 'var(--vscode-foreground)';
	sendButton.appendChild(sendIcon);

	this._register(addDisposableListener(sendButton, 'click', () => {
		const isStopButton = sendButton.getAttribute('data-stop-button') === 'true';
		if (isStopButton) {
			console.log('[VYBE AI] Stop button clicked');
			// Switch back to send
			sendButton.setAttribute('data-stop-button', 'false');
			sendIcon.className = 'codicon codicon-arrow-up';
		} else {
			console.log('[VYBE AI] Send button clicked');

			// Get message from input
			if (this.textInput) {
				const messageText = this.textInput.textContent?.trim() || '';
				if (messageText) {
					// Add user message to display
					this.addUserMessage(messageText);

					// Clear input
					this.textInput.textContent = '';
					// Trigger input event to show placeholder
					const inputEvent = new Event('input', { bubbles: true });
					this.textInput.dispatchEvent(inputEvent);

					// Switch to stop button
					sendButton.setAttribute('data-stop-button', 'true');
					sendIcon.className = 'codicon codicon-debug-stop';

					// TODO: Send to AI and handle streaming response
					// For now, add a dummy AI response after a short delay
					setTimeout(() => {
						// Add dummy AI response
						this.addAiMessage('This is a test AI response. In the future, this will be the actual AI response from your selected model.\n\nYou can scroll to see how the sticky message behavior works. The user message should stay at the top while you scroll through the AI response.');

						// Switch back to send button
						sendButton.setAttribute('data-stop-button', 'false');
						sendIcon.className = 'codicon codicon-arrow-up';
					}, 1000);
				}
			}
		}
	}));

	rightSide.appendChild(sendButton);

		// Don't append rightSide to bottomBar - it will be appended directly to inputBox
		// bottomBar.appendChild(rightSide);

		// Store reference for later use
		(bottomBar as any).rightSide = rightSide;

		return bottomBar;
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
			dropdown.style.backgroundColor = '#1e1f21';
			dropdown.style.border = '1px solid rgba(128, 128, 128, 0.2)';
			console.log('[VYBE AI Dropdown] Applied DARK theme colors: #1e1f21');
		} else {
			// VYBE Light theme dropdown background
			dropdown.style.backgroundColor = '#f8f8f9';
			dropdown.style.border = '1px solid rgba(0, 0, 0, 0.1)';
		console.log('[VYBE AI Dropdown] Applied LIGHT theme colors: #f8f8f9');
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
		item.style.gap = '6px'; // Tighter gap
		item.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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

	private showContextDropdown(anchorElement: HTMLElement): void {
		// Remove existing dropdown if any
		const existing = document.getElementById('vybe-context-dropdown');
		if (existing) {
			existing.remove();
			return; // Toggle behavior
		}

		// Create dropdown container - use contrasting background
		const dropdown = append(document.body, $('#vybe-context-dropdown'));
		dropdown.style.boxSizing = 'border-box';
		dropdown.style.padding = '0';
		dropdown.style.borderRadius = '6px';

		// Detect theme - same approach as history dropdown
		let isDarkTheme = false;
		const workbench = document.querySelector('.monaco-workbench');
		if (workbench) {
			isDarkTheme = workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black');
		}

		// VYBE-specific dropdown colors
		if (isDarkTheme) {
			dropdown.style.backgroundColor = '#1e1f21';
			dropdown.style.border = '1px solid rgba(128, 128, 128, 0.2)';
		} else {
		dropdown.style.backgroundColor = '#f8f8f9';
		dropdown.style.border = '1px solid rgba(0, 0, 0, 0.1)';
	}

	dropdown.style.alignItems = 'stretch';
	dropdown.style.fontSize = '12px';
	dropdown.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
	dropdown.style.display = 'flex';
	dropdown.style.flexDirection = 'column';
	dropdown.style.gap = '0';
	dropdown.style.position = 'fixed';
		dropdown.style.visibility = 'visible';
		dropdown.style.width = '300px'; // Reduced from 340px
		dropdown.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.24)';
		dropdown.style.zIndex = '10000';

		// Position ABOVE the @ button, aligned to the composer's left edge
		const rect = anchorElement.getBoundingClientRect();
		dropdown.style.top = `${rect.top - 18}px`; // 18px gap above the button
		dropdown.style.left = `${rect.left - 8}px`; // Align with composer (button is 8px inset from composer edge)
		dropdown.style.transform = 'translateY(-100%)'; // Move up by its own height

		// Inner container
		const innerContainer = append(dropdown, $('div'));
		innerContainer.style.flex = '1';
		innerContainer.style.overflow = 'hidden';
		innerContainer.style.display = 'flex';
		innerContainer.style.height = '100%';
		innerContainer.style.flexDirection = 'column';

		// Content container
		const contentContainer = append(innerContainer, $('div'));
		contentContainer.setAttribute('tabindex', '0');
		contentContainer.style.boxSizing = 'border-box';
		contentContainer.style.alignItems = 'stretch';
		contentContainer.style.fontSize = '12px';
		contentContainer.style.display = 'flex';
		contentContainer.style.flexDirection = 'column';
		contentContainer.style.gap = '1px'; // Tighter gap
		contentContainer.style.padding = '2px'; // Reduced padding
		contentContainer.style.outline = 'none';
		contentContainer.style.pointerEvents = 'auto';
		contentContainer.style.maxHeight = '350px'; // Reduced max height
		contentContainer.style.overflowY = 'auto';

		// Search input container
		const searchContainer = append(contentContainer, $('div'));
		searchContainer.style.display = 'flex';
		searchContainer.style.gap = '0';
		searchContainer.style.alignItems = 'center';
		searchContainer.style.padding = '0';
		searchContainer.style.border = 'none';
		searchContainer.style.boxSizing = 'border-box';
		searchContainer.style.outline = 'none';
		searchContainer.style.margin = '0';

		// Search input
		const searchInput = append(searchContainer, $('input'));
		searchInput.setAttribute('placeholder', 'Add files, folders, docs...');
		searchInput.style.fontSize = '11px';
		searchInput.style.lineHeight = '14px'; // Tighter line height
		searchInput.style.borderRadius = '3px';
		searchInput.style.backgroundColor = 'var(--vscode-input-background)';
		searchInput.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.caretColor = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.padding = '2px 4px'; // Reduced vertical padding
		searchInput.style.flex = '1';
	searchInput.style.minWidth = '0';
	searchInput.style.border = '1px solid var(--vscode-input-border)';
	searchInput.style.outline = 'none';
	searchInput.style.boxSizing = 'border-box';
	searchInput.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

	// Recent files section
		const recentSection = append(contentContainer, $('div'));
		recentSection.style.display = 'flex';
		recentSection.style.flexDirection = 'column';
		recentSection.style.gap = '0px'; // No gap
		recentSection.style.padding = '2px 0'; // Tighter padding

		// Example recent files (mock data - replace with actual in production)
		const recentFiles = [
			{ name: 'vybeAiPaneWithCustomTitle.ts', path: 'src/vs/workbench/contrib/vybeAI/browser' },
			{ name: 'package.json', path: '' }
		];

		recentFiles.forEach(file => {
			const fileItem = append(recentSection, $('div'));
			fileItem.style.display = 'flex';
			fileItem.style.alignItems = 'center';
		fileItem.style.gap = '4px'; // Reduced gap
		fileItem.style.padding = '2px 4px'; // 50% reduction in vertical padding
		fileItem.style.cursor = 'pointer';
		fileItem.style.borderRadius = '3px';
		fileItem.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// File icon
			const fileIcon = append(fileItem, $('i.codicon.codicon-file'));
			fileIcon.style.fontSize = '13px';
			fileIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			fileIcon.style.flexShrink = '0';

			// File name and path
			const fileNameContainer = append(fileItem, $('div'));
			fileNameContainer.style.display = 'flex';
			fileNameContainer.style.flexDirection = 'column';
			fileNameContainer.style.flex = '1';
			fileNameContainer.style.minWidth = '0';
			fileNameContainer.style.gap = '0px'; // No gap

			const fileName = append(fileNameContainer, $('span'));
			fileName.textContent = file.name;
			fileName.style.fontSize = '11px';
			fileName.style.lineHeight = '14px'; // Tighter line height
			fileName.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			fileName.style.overflow = 'hidden';
			fileName.style.textOverflow = 'ellipsis';
			fileName.style.whiteSpace = 'nowrap';

			if (file.path) {
				const filePath = append(fileNameContainer, $('span'));
				filePath.textContent = file.path;
				filePath.style.fontSize = '9px';
				filePath.style.lineHeight = '12px'; // Tighter line height
				filePath.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.6)' : 'rgba(102, 102, 102, 0.6)';
				filePath.style.overflow = 'hidden';
				filePath.style.textOverflow = 'ellipsis';
				filePath.style.whiteSpace = 'nowrap';
			}

			// Hover effect
			this._register(addDisposableListener(fileItem, 'mouseenter', () => {
				fileItem.style.backgroundColor = '#7e7f80';
			}));
			this._register(addDisposableListener(fileItem, 'mouseleave', () => {
				fileItem.style.backgroundColor = 'transparent';
			}));

			// Click handler
			this._register(addDisposableListener(fileItem, 'click', () => {
				console.log('[VYBE AI] File selected:', file.name);
				// TODO: Add file to context
				dropdown.remove();
			}));
		});

		// Separator
		const separator1 = append(contentContainer, $('div'));
		separator1.style.height = '1px';
		separator1.style.backgroundColor = isDarkTheme ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 0, 0, 0.1)';
		separator1.style.margin = '2px 0'; // Tighter margin

		// Added section
		const addedSection = append(contentContainer, $('div'));
		addedSection.style.display = 'flex';
		addedSection.style.flexDirection = 'column';
		addedSection.style.gap = '0px'; // No gap
		addedSection.style.padding = '2px 0'; // Tighter padding

		const addedHeader = append(addedSection, $('div'));
		addedHeader.textContent = 'Added';
	addedHeader.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.6)' : 'rgba(51, 51, 51, 0.6)';
	addedHeader.style.fontSize = '10px';
	addedHeader.style.opacity = '1';
	addedHeader.style.padding = '2px 4px 1px 4px'; // Tighter padding
	addedHeader.style.lineHeight = '12px'; // Tighter line height
	addedHeader.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

	// Added items (mock data - replace with actual in production)
		const addedItems = [
			{ label: 'Active Tabs', icon: 'codicon-window' },
			{ label: 'Terminals', icon: 'codicon-terminal' }
		];

		addedItems.forEach(item => {
			const addedItem = append(addedSection, $('div'));
			addedItem.style.display = 'flex';
			addedItem.style.alignItems = 'center';
		addedItem.style.gap = '4px'; // Reduced gap
		addedItem.style.padding = '2px 4px'; // 50% reduction in vertical padding
		addedItem.style.cursor = 'pointer';
		addedItem.style.borderRadius = '3px';
		addedItem.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// Checkmark icon
			const checkIcon = append(addedItem, $('i.codicon.codicon-check'));
			checkIcon.style.fontSize = '13px';
			checkIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			checkIcon.style.flexShrink = '0';

			// Item icon
			const itemIcon = append(addedItem, $(`i.codicon.${item.icon}`));
			itemIcon.style.fontSize = '13px';
			itemIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			itemIcon.style.flexShrink = '0';

			// Label
			const label = append(addedItem, $('span'));
			label.textContent = item.label;
			label.style.fontSize = '11px';
			label.style.lineHeight = '14px'; // Tighter line height
			label.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			label.style.flex = '1';

			// Hover effect
			this._register(addDisposableListener(addedItem, 'mouseenter', () => {
				addedItem.style.backgroundColor = '#7e7f80';
			}));
			this._register(addDisposableListener(addedItem, 'mouseleave', () => {
				addedItem.style.backgroundColor = 'transparent';
			}));

			// Click handler
			this._register(addDisposableListener(addedItem, 'click', () => {
				console.log('[VYBE AI] Added item clicked:', item.label);
				// TODO: Remove from context or toggle
			}));
		});

		// Separator
		const separator2 = append(contentContainer, $('div'));
		separator2.style.height = '1px';
		separator2.style.backgroundColor = isDarkTheme ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 0, 0, 0.1)';
		separator2.style.margin = '2px 0'; // Tighter margin

		// Context options section
		const optionsSection = append(contentContainer, $('div'));
		optionsSection.style.display = 'flex';
		optionsSection.style.flexDirection = 'column';
		optionsSection.style.gap = '0px'; // No gap
		optionsSection.style.padding = '2px 0'; // Tighter padding

		// Context options (mock data - replace with actual in production)
		const contextOptions = [
			{ label: 'Files & Folders', icon: 'codicon-folder' },
			{ label: 'Code', icon: 'codicon-code' },
			{ label: 'Docs', icon: 'codicon-book' },
			{ label: 'Git', icon: 'codicon-source-control' },
			{ label: 'Browser', icon: 'codicon-browser' },
			{ label: 'Past Chats', icon: 'codicon-history' },
			{ label: 'Recent Changes', icon: 'codicon-diff' }
		];

		contextOptions.forEach(option => {
			const optionItem = append(optionsSection, $('div'));
			optionItem.style.display = 'flex';
			optionItem.style.alignItems = 'center';
		optionItem.style.gap = '4px'; // Reduced gap
		optionItem.style.padding = '2px 4px'; // 50% reduction in vertical padding
		optionItem.style.cursor = 'pointer';
		optionItem.style.borderRadius = '3px';
		optionItem.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// Option icon
			const optionIcon = append(optionItem, $(`i.codicon.${option.icon}`));
			optionIcon.style.fontSize = '13px';
			optionIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.9)' : 'rgba(51, 51, 51, 0.9)';
			optionIcon.style.flexShrink = '0';

			// Label
			const label = append(optionItem, $('span'));
			label.textContent = option.label;
			label.style.fontSize = '11px';
			label.style.lineHeight = '14px'; // Tighter line height
			label.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			label.style.flex = '1';

			// Chevron right icon
			const chevronIcon = append(optionItem, $('i.codicon.codicon-chevron-right'));
			chevronIcon.style.fontSize = '11px';
			chevronIcon.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.6)' : 'rgba(102, 102, 102, 0.6)';
			chevronIcon.style.flexShrink = '0';

			// Hover effect
			this._register(addDisposableListener(optionItem, 'mouseenter', () => {
				optionItem.style.backgroundColor = '#7e7f80';
			}));
			this._register(addDisposableListener(optionItem, 'mouseleave', () => {
				optionItem.style.backgroundColor = 'transparent';
			}));

			// Click handler
			this._register(addDisposableListener(optionItem, 'click', () => {
				console.log('[VYBE AI] Context option clicked:', option.label);
				// TODO: Show submenu or execute action
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

	private showModeDropdown(anchorElement: HTMLElement): void {
		// Remove existing dropdown if any
		const existing = document.getElementById('vybe-mode-dropdown');
		if (existing) {
			existing.remove();
			return; // Toggle behavior
		}

		// Detect theme
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench?.classList.contains('vs-dark') || workbench?.classList.contains('hc-black') || false;

		// Create dropdown container
		const dropdown = append(document.body, $('#vybe-mode-dropdown'));
		dropdown.style.boxSizing = 'border-box';
		dropdown.style.padding = '0';
		dropdown.style.borderRadius = '6px';
		dropdown.style.position = 'fixed';
		dropdown.style.visibility = 'visible';
		dropdown.style.width = '170px'; // min-width from HTML
		dropdown.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.24)';
		dropdown.style.zIndex = '10000';

		// VYBE-specific dropdown colors
		if (isDarkTheme) {
			dropdown.style.backgroundColor = '#1e1f21';
			dropdown.style.border = '1px solid rgba(128, 128, 128, 0.2)';
		} else {
			dropdown.style.backgroundColor = '#f8f8f9';
			dropdown.style.border = '1px solid rgba(0, 0, 0, 0.1)';
		}

		// Position ABOVE the Agent button
		const rect = anchorElement.getBoundingClientRect();
		dropdown.style.top = `${rect.top - 3}px`; // 3px above the button
		dropdown.style.left = `${rect.left}px`; // Aligned to left of button
		dropdown.style.transform = 'translateY(-100%)'; // Move up by its own height

		// Inner container
		const innerContainer = append(dropdown, $('div'));
		innerContainer.style.flex = '1 1 0%';
		innerContainer.style.overflow = 'hidden';
		innerContainer.style.display = 'flex';
		innerContainer.style.height = '100%';
		innerContainer.style.flexDirection = 'column';

		// Content container
		const contentContainer = append(innerContainer, $('div'));
		contentContainer.setAttribute('tabindex', '0');
		contentContainer.style.boxSizing = 'border-box';
		contentContainer.style.alignItems = 'stretch';
		contentContainer.style.fontSize = '12px';
		contentContainer.style.display = 'flex';
		contentContainer.style.flexDirection = 'column';
		contentContainer.style.gap = '2px';
		contentContainer.style.padding = '0px';
		contentContainer.style.outline = 'none';
		contentContainer.style.pointerEvents = 'auto';

		// Search input container
		const searchContainer = append(contentContainer, $('div'));
		searchContainer.style.display = 'flex';
		searchContainer.style.gap = '4px';
		searchContainer.style.alignItems = 'center';
		searchContainer.style.padding = '0 6px';
		searchContainer.style.border = 'none';
		searchContainer.style.boxSizing = 'border-box';
		searchContainer.style.outline = 'none';
		searchContainer.style.margin = '2px';

		// allow-any-unicode-next-line
		const searchInput = append(searchContainer, $('input'));
		searchInput.setAttribute('placeholder', '⌘. to switch modes');
		searchInput.style.fontSize = '11px';
		searchInput.style.lineHeight = '15px';
		searchInput.style.borderRadius = '3px';
		searchInput.style.backgroundColor = 'transparent';
		searchInput.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.caretColor = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.padding = '3px 0';
		searchInput.style.flex = '1';
	searchInput.style.minWidth = '0';
	searchInput.style.border = 'none';
	searchInput.style.outline = 'none';
	searchInput.style.boxSizing = 'border-box';
	searchInput.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

	// Modes list
		const modesSection = append(contentContainer, $('div'));
		modesSection.style.display = 'flex';
		modesSection.style.flexDirection = 'column';
		modesSection.style.gap = '0px';
		modesSection.style.padding = '0.5px'; // p-0.5

		const modes = [
			{ id: 'agent', label: 'Agent', icon: 'codicon-gear', shortcut: '⌘I', isSelected: true },
			{ id: 'plan', label: 'Plan', icon: 'codicon-checklist', shortcut: null, isSelected: false },
			{ id: 'ask', label: 'Ask', icon: 'codicon-comment', shortcut: null, isSelected: false }
		];

		modes.forEach(mode => {
			const modeItem = append(modesSection, $('div'));
			modeItem.style.display = 'flex';
			modeItem.style.flexDirection = 'column';
			modeItem.style.gap = '0.5px';
		modeItem.style.padding = '2px 4px'; // px-1.5 py-0.5
		modeItem.style.minWidth = '0';
		modeItem.style.cursor = 'pointer';
		modeItem.style.borderRadius = '3px';
		modeItem.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// Main row
			const mainRow = append(modeItem, $('div'));
			mainRow.style.display = 'flex';
			mainRow.style.justifyContent = 'space-between';
			mainRow.style.alignItems = 'center';
			mainRow.style.minWidth = '0';
			mainRow.style.width = '100%';

			// Left side with icon and label
			const leftSide = append(mainRow, $('div'));
			leftSide.style.display = 'flex';
			leftSide.style.alignItems = 'center';
			leftSide.style.gap = '4px'; // gap-1
			leftSide.style.minWidth = '0';
			leftSide.style.height = '16px';
			leftSide.style.width = '100%';

			// Icon
			const icon = append(leftSide, $(`i.codicon.${mode.icon}`));
			icon.style.fontSize = '12px';
			icon.style.flexShrink = '0';
			icon.style.width = '13px';
			icon.style.display = 'flex';
			icon.style.alignItems = 'center';
			icon.style.justifyContent = 'start';
			icon.style.marginRight = '0';
			if (mode.isSelected) {
				icon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			} else {
				icon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			}

			// Label and shortcut container
			const labelContainer = append(leftSide, $('div'));
			labelContainer.style.display = 'flex';
			labelContainer.style.width = '100%';
			labelContainer.style.alignItems = 'center';
			labelContainer.style.minWidth = '0';
			labelContainer.style.gap = '4px'; // gap-1
			labelContainer.style.height = '17px';

			// Label
			const labelDiv = append(labelContainer, $('div'));
			labelDiv.style.maxWidth = '100%';
			labelDiv.style.flexShrink = '1';
			labelDiv.style.minWidth = '0';
			labelDiv.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';

			const labelSpan = append(labelDiv, $('span.monaco-highlighted-label'));
			labelSpan.textContent = mode.label;
			labelSpan.style.fontSize = '12px';
			labelSpan.style.lineHeight = '17px';
			labelSpan.style.whiteSpace = 'nowrap';
			labelSpan.style.textOverflow = 'ellipsis';
			labelSpan.style.overflow = 'hidden';
			labelSpan.style.display = 'block';
			labelSpan.style.width = '100%';
			if (mode.isSelected) {
				labelSpan.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			} else {
				labelSpan.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			}

			// Shortcut (if exists)
			if (mode.shortcut) {
				const shortcutSpan = append(labelContainer, $('span'));
				shortcutSpan.textContent = mode.shortcut;
				shortcutSpan.style.direction = 'rtl';
				shortcutSpan.style.textOverflow = 'ellipsis';
				shortcutSpan.style.overflow = 'hidden';
				shortcutSpan.style.whiteSpace = 'nowrap';
				shortcutSpan.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.7)' : 'rgba(102, 102, 102, 0.7)';
				shortcutSpan.style.flexShrink = '0';
				shortcutSpan.style.opacity = '0.6';
				shortcutSpan.style.fontSize = '9px';
				shortcutSpan.style.lineHeight = '17px';
			}

			// Right side with edit and check icons
			const rightSide = append(mainRow, $('div'));
			rightSide.style.display = 'flex';
			rightSide.style.alignItems = 'center';
			rightSide.style.gap = '6px'; // gap-1.5
			rightSide.style.marginLeft = '4px'; // ml-1
			rightSide.style.flexShrink = '0';

			// Edit icon (pencil)
			const editIcon = append(rightSide, $('i.codicon.codicon-edit'));
			editIcon.style.fontSize = '12px';
			editIcon.style.flexShrink = '0';
			editIcon.style.width = '12px';
			editIcon.style.display = 'flex';
			editIcon.style.alignItems = 'center';
			editIcon.style.justifyContent = 'center';
			editIcon.style.marginLeft = '4px'; // ml-1
			editIcon.style.marginRight = '0';
			editIcon.style.cursor = 'pointer';
			if (mode.isSelected) {
				editIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
				editIcon.style.opacity = '0.6';
			} else {
				editIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
				editIcon.style.opacity = '0.6';
			}

			this._register(addDisposableListener(editIcon, 'click', (e) => {
				e.stopPropagation();
				console.log('[VYBE AI] Edit mode:', mode.label);
			}));

			// Checkmark for selected mode
			if (mode.isSelected) {
				const checkContainer = append(rightSide, $('div'));
				checkContainer.style.position = 'relative';
				checkContainer.style.flexShrink = '0';
				checkContainer.style.width = '16px';

				const checkIcon = append(checkContainer, $('span.codicon.codicon-check'));
				checkIcon.style.fontSize = '10px';
				checkIcon.style.lineHeight = '10px';
				checkIcon.style.padding = '2px';
				checkIcon.style.margin = '0';
				checkIcon.style.borderRadius = '2px';
				checkIcon.style.transition = 'opacity';
				checkIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			}

			// Hover effect
			this._register(addDisposableListener(modeItem, 'mouseenter', () => {
				modeItem.style.backgroundColor = '#7e7f80';
			}));
			this._register(addDisposableListener(modeItem, 'mouseleave', () => {
				if (mode.isSelected) {
					modeItem.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
				} else {
					modeItem.style.backgroundColor = 'transparent';
				}
			}));

			// Set initial background for selected
			if (mode.isSelected) {
				modeItem.style.backgroundColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
			}

			// Click handler
			this._register(addDisposableListener(modeItem, 'click', () => {
				console.log('[VYBE AI] Mode selected:', mode.label);
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

	private showModelDropdown(anchorElement: HTMLElement): void {
		// Remove existing dropdown if any
		const existing = document.getElementById('vybe-model-dropdown');
		if (existing) {
			existing.remove();
			return; // Toggle behavior
		}

		// Detect theme
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench?.classList.contains('vs-dark') || workbench?.classList.contains('hc-black') || false;

		// State for Auto toggle
		let isAutoOn = true;

		// Create dropdown container
		const dropdown = append(document.body, $('#vybe-model-dropdown'));
		dropdown.style.boxSizing = 'border-box';
		dropdown.style.padding = '0';
		dropdown.style.borderRadius = '6px';
		dropdown.style.position = 'fixed';
		dropdown.style.visibility = 'visible';
		dropdown.style.width = '200px';
		dropdown.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.24)';
		dropdown.style.zIndex = '10000';

	// VYBE-specific dropdown colors
	if (isDarkTheme) {
		dropdown.style.backgroundColor = '#1e1f21';
		dropdown.style.border = '1px solid rgba(128, 128, 128, 0.2)';
	} else {
		dropdown.style.backgroundColor = '#f8f8f9';
		dropdown.style.border = '1px solid rgba(0, 0, 0, 0.1)';
	}

	// Use same font as other dropdowns
	dropdown.style.fontSize = '12px';
	dropdown.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

	// Position ABOVE the Auto button, centered horizontally
		const rect = anchorElement.getBoundingClientRect();
		const buttonCenter = rect.left + rect.width / 2;
		dropdown.style.top = `${rect.top - 3}px`; // 3px above the button
		dropdown.style.left = `${buttonCenter}px`; // Center point
		dropdown.style.transform = 'translateX(-50%) translateY(-100%)'; // Center horizontally and move up

		// Inner container
		const innerContainer = append(dropdown, $('div'));
		innerContainer.setAttribute('tabindex', '0');
		innerContainer.style.boxSizing = 'border-box';
		innerContainer.style.borderRadius = '6px';
		innerContainer.style.backgroundColor = isDarkTheme ? '#1e1f21' : '#f8f8f9';
		innerContainer.style.border = isDarkTheme ? '1px solid rgba(128, 128, 128, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)';
		innerContainer.style.alignItems = 'stretch';
		innerContainer.style.fontSize = '12px';
		innerContainer.style.display = 'flex';
		innerContainer.style.flexDirection = 'column';
		innerContainer.style.gap = '2px';
		innerContainer.style.padding = '0px';
		innerContainer.style.outline = 'none';
		innerContainer.style.pointerEvents = 'auto';

		// Search input container
		const searchContainer = append(innerContainer, $('div'));
		searchContainer.style.display = 'flex';
		searchContainer.style.gap = '4px';
		searchContainer.style.alignItems = 'center';
		searchContainer.style.padding = '0 6px';
		searchContainer.style.border = 'none';
		searchContainer.style.boxSizing = 'border-box';
		searchContainer.style.outline = 'none';
		searchContainer.style.margin = '2px';

		// allow-any-unicode-next-line
		const searchInput = append(searchContainer, $('input'));
		searchInput.setAttribute('placeholder', '⌘/ to switch models');
		searchInput.style.fontSize = '11px';
		searchInput.style.lineHeight = '15px';
		searchInput.style.borderRadius = '3px';
		searchInput.style.backgroundColor = 'transparent';
		searchInput.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.caretColor = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
		searchInput.style.padding = '3px 0';
		searchInput.style.flex = '1';
		searchInput.style.minWidth = '0';
	searchInput.style.border = 'none';
	searchInput.style.outline = 'none';
	searchInput.style.boxSizing = 'border-box';
	searchInput.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

	// Content area for toggles and models
		const contentArea = append(innerContainer, $('div'));
		contentArea.style.display = 'flex';
		contentArea.style.flexDirection = 'column';
		contentArea.style.gap = '2px'; // gap-0.5
		contentArea.style.padding = '2px'; // p-0.5

		// Render initial content
		const renderContent = () => {
			// Clear content area (manually remove children for TrustedHTML compliance)
			while (contentArea.firstChild) {
				contentArea.removeChild(contentArea.firstChild);
			}

			// Toggles section
			const togglesSection = append(contentArea, $('div'));
			togglesSection.style.display = 'flex';
			togglesSection.style.flexDirection = 'column';
			togglesSection.style.gap = '2px';

			// Auto toggle
			this.renderToggleItem(togglesSection, 'Auto', isAutoOn, 'Balanced quality and speed, recommended for most tasks', isDarkTheme, (newState) => {
				isAutoOn = newState;
				this.isAutoEnabled = newState;
				// Update the label in the composer
				if (this.autoLabelElement) {
					this.autoLabelElement.textContent = newState ? 'Auto' : this.selectedModel;
				}
				renderContent();
			});

			// MAX Mode toggle
			this.renderToggleItem(togglesSection, 'MAX Mode', this.isMaxModeEnabled, null, isDarkTheme, (newState) => {
				console.log('[VYBE AI] MAX Mode toggled:', newState);
				this.isMaxModeEnabled = newState;
				this.updateMaxBadge();
			});

			// Show model list only if Auto is OFF
			if (!isAutoOn) {
				// Separator - MATCH @ dropdown
				const separator = append(contentArea, $('div'));
				separator.style.height = '1px';
				separator.style.width = '100%';
				separator.style.backgroundColor = isDarkTheme ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 0, 0, 0.1)';
				separator.style.margin = '2px 0';

				// Models section
				const modelsSection = append(contentArea, $('div'));
				modelsSection.style.display = 'flex';
				modelsSection.style.flexDirection = 'column';
				modelsSection.style.gap = '2px';

				const models = [
					{ id: 'composer-1', label: 'composer-1', icon: 'check', isSelected: true },
					{ id: 'claude-4.5-sonnet', label: 'claude-4.5-sonnet', icon: 'brain', isSelected: false },
					{ id: 'gpt-5-codex', label: 'gpt-5-codex', icon: 'brain', isSelected: false },
					{ id: 'gpt-5', label: 'gpt-5', icon: 'brain', isSelected: false },
					{ id: 'claude-4.5-haiku', label: 'claude-4.5-haiku', icon: 'brain', isSelected: false },
					{ id: 'grok-code-fast-1', label: 'grok-code-fast-1', icon: 'brain', isSelected: false }
				];

				models.forEach(model => {
					const modelItem = append(modelsSection, $('div'));
					modelItem.style.display = 'flex';
					modelItem.style.flexDirection = 'column';
					modelItem.style.gap = '2px';
					modelItem.style.padding = '2px 6px'; // px-1.5 py-0.5
					modelItem.style.minWidth = '0';
					modelItem.style.cursor = 'pointer';
					modelItem.style.borderRadius = '3px';

					const mainRow = append(modelItem, $('div'));
					mainRow.style.display = 'flex';
					mainRow.style.justifyContent = 'space-between';
					mainRow.style.alignItems = 'center';
					mainRow.style.minWidth = '0';
					mainRow.style.width = '100%';

					// Left side
					const leftSide = append(mainRow, $('div'));
					leftSide.style.display = 'flex';
					leftSide.style.alignItems = 'center';
					leftSide.style.gap = '4px';
					leftSide.style.minWidth = '0';
					leftSide.style.height = '16px';
					leftSide.style.width = '100%';
					leftSide.style.overflow = 'hidden';

					const labelSpan = append(leftSide, $('span.monaco-highlighted-label'));
					labelSpan.textContent = model.label;
					labelSpan.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
					labelSpan.style.fontSize = '12px';
					labelSpan.style.lineHeight = '17px';
					labelSpan.style.whiteSpace = 'nowrap';
					labelSpan.style.textOverflow = 'ellipsis';
					labelSpan.style.overflow = 'hidden';
					labelSpan.style.display = 'block';
					labelSpan.style.width = '100%';
					labelSpan.style.flexShrink = '1';
					labelSpan.style.minWidth = '0';

					// Icon on the right
					const iconContainer = append(leftSide, $('span'));
					iconContainer.style.flexShrink = '0';
					iconContainer.style.display = 'flex';
					iconContainer.style.alignItems = 'center';
					iconContainer.style.justifyContent = 'center';
					iconContainer.style.height = '20px';

					if (model.icon === 'check') {
						const checkIcon = append(iconContainer, $('span.codicon.codicon-check'));
						checkIcon.style.fontSize = '10px';
						checkIcon.style.opacity = '1';
						checkIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
					} else if (model.icon === 'brain') {
						const brainIcon = append(iconContainer, $('span.codicon.codicon-circuit-board')); // Using circuit-board as brain alternative
						brainIcon.style.fontSize = '10px';
						brainIcon.style.opacity = '0.6';
						brainIcon.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.6)' : 'rgba(102, 102, 102, 0.6)';
					}

					// Hover effect
					this._register(addDisposableListener(modelItem, 'mouseenter', () => {
						modelItem.style.backgroundColor = '#7e7f80';
					}));
					this._register(addDisposableListener(modelItem, 'mouseleave', () => {
						modelItem.style.backgroundColor = 'transparent';
					}));

					// Click handler
					this._register(addDisposableListener(modelItem, 'click', () => {
						console.log('[VYBE AI] Model selected:', model.label);
						this.selectedModel = model.label;
						// Update the label - show model name when Auto is OFF
						if (this.autoLabelElement) {
							this.autoLabelElement.textContent = this.isAutoEnabled ? 'Auto' : model.label;
						}
						dropdown.remove();
					}));
				});

				// Separator - MATCH @ dropdown
				const separator2 = append(contentArea, $('div'));
				separator2.style.height = '1px';
				separator2.style.width = '100%';
				separator2.style.backgroundColor = isDarkTheme ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 0, 0, 0.1)';
				separator2.style.margin = '2px 0';

				// Add Models option
				const addModelsItem = append(contentArea, $('div'));
				addModelsItem.style.display = 'flex';
				addModelsItem.style.justifyContent = 'space-between';
				addModelsItem.style.alignItems = 'center';
				addModelsItem.style.padding = '2px 6px';
				addModelsItem.style.cursor = 'pointer';
				addModelsItem.style.borderRadius = '3px';
				addModelsItem.style.fontSize = '12px';

				const addModelsLabel = append(addModelsItem, $('span'));
				addModelsLabel.textContent = 'Add Models';
				addModelsLabel.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
				addModelsLabel.style.fontSize = '12px';
				addModelsLabel.style.lineHeight = '17px';

				const chevronIcon = append(addModelsItem, $('span.codicon.codicon-chevron-right'));
				chevronIcon.style.fontSize = '8px';
				chevronIcon.style.opacity = '0.3';
				chevronIcon.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';

				// Hover effect
				this._register(addDisposableListener(addModelsItem, 'mouseenter', () => {
					addModelsItem.style.backgroundColor = '#7e7f80';
				}));
				this._register(addDisposableListener(addModelsItem, 'mouseleave', () => {
					addModelsItem.style.backgroundColor = 'transparent';
				}));

				// Click handler
				this._register(addDisposableListener(addModelsItem, 'click', () => {
					console.log('[VYBE AI] Add Models clicked');
				}));
			}
		};

		renderContent();

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

	private renderToggleItem(parent: HTMLElement, label: string, isOn: boolean, description: string | null, isDarkTheme: boolean, onToggle: (newState: boolean) => void): void {
		const item = append(parent, $('div'));
		item.style.display = 'flex';
		item.style.flexDirection = 'column';
		item.style.gap = '2px';
		item.style.padding = '2px 6px'; // px-1.5 py-0.5
		item.style.minWidth = '0';
		item.style.cursor = 'pointer';
		item.style.borderRadius = '3px';

		const mainRow = append(item, $('div'));
		mainRow.style.display = 'flex';
		mainRow.style.justifyContent = 'space-between';
		mainRow.style.alignItems = 'center';
		mainRow.style.minWidth = '0';
		mainRow.style.width = '100%';

		// Label
		const labelSpan = append(mainRow, $('span'));
		labelSpan.textContent = label;
		labelSpan.style.fontSize = '12px';
		labelSpan.style.padding = '4px 0'; // py-1
		labelSpan.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';

		// Toggle switch
		const toggleContainer = append(mainRow, $('span'));
		toggleContainer.style.flexShrink = '0';
		toggleContainer.style.marginLeft = '4px';
		toggleContainer.style.cursor = 'pointer';

		const toggleSwitch = append(toggleContainer, $('div'));
		toggleSwitch.style.width = '24px'; // w-6
		toggleSwitch.style.height = '14px'; // h-3.5
		toggleSwitch.style.borderRadius = '999px'; // rounded-full
		toggleSwitch.style.position = 'relative';
		toggleSwitch.style.display = 'flex';
		toggleSwitch.style.alignItems = 'center';
		toggleSwitch.style.cursor = 'pointer';
		toggleSwitch.style.transition = 'all 300ms';
		toggleSwitch.style.overflow = 'hidden';
		toggleSwitch.style.backgroundColor = isOn ? '#10b981' : '#6b7280'; // Green when ON, grey when OFF
		toggleSwitch.style.opacity = '1';

		// Toggle slider
		const slider = append(toggleSwitch, $('div'));
		slider.style.width = '10px'; // w-2.5
		slider.style.height = '10px'; // h-2.5
		slider.style.borderRadius = '999px';
		slider.style.position = 'absolute';
		slider.style.backgroundColor = 'white';
		slider.style.transition = '500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
		slider.style.left = isOn ? 'calc(100% - 12px)' : '2px';

		// Description (only if provided and Auto is ON)
		if (description && label === 'Auto' && isOn) {
			const descText = append(item, $('div'));
			descText.textContent = description;
			descText.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.6)' : 'rgba(102, 102, 102, 0.6)';
			descText.style.opacity = '0.6';
			descText.style.lineHeight = '14px';
			descText.style.whiteSpace = 'normal';
			descText.style.paddingBottom = '2px';
			descText.style.fontSize = '10px';
		}

		// Hover effect
		this._register(addDisposableListener(item, 'mouseenter', () => {
			item.style.backgroundColor = '#7e7f80';
		}));
		this._register(addDisposableListener(item, 'mouseleave', () => {
			item.style.backgroundColor = 'transparent';
		}));

		// Click handler to toggle
		this._register(addDisposableListener(item, 'click', (e) => {
			e.stopPropagation();
			onToggle(!isOn);
		}));
	}

	private showUsageDropdown(anchorElement: HTMLElement): void {
		// Remove existing dropdown if any
		const existing = document.getElementById('vybe-usage-dropdown');
		if (existing) {
			existing.remove();
			return; // Toggle behavior
		}

		// Detect theme
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench?.classList.contains('vs-dark') || workbench?.classList.contains('hc-black') || false;

		// Create dropdown container
		const dropdown = append(document.body, $('#vybe-usage-dropdown'));
		dropdown.style.boxSizing = 'border-box';
		dropdown.style.padding = '0';
		dropdown.style.borderRadius = '6px';
		dropdown.style.position = 'fixed';
		dropdown.style.visibility = 'visible';
		dropdown.style.width = '250px';
		dropdown.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.24)';
		dropdown.style.zIndex = '10000';

		// VYBE-specific dropdown colors
		if (isDarkTheme) {
			dropdown.style.backgroundColor = '#1e1f21';
			dropdown.style.border = '1px solid rgba(128, 128, 128, 0.2)';
		} else {
			dropdown.style.backgroundColor = '#f8f8f9';
			dropdown.style.border = '1px solid rgba(0, 0, 0, 0.1)';
		}

		// Use same font as other dropdowns
		dropdown.style.fontSize = '12px';
		dropdown.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

		// Position ABOVE the usage indicator with 18px gap, RIGHT-ALIGNED with composer (like @ dropdown)
		const rect = anchorElement.getBoundingClientRect();

		// Find the composer to align with its right edge
		const composerElement = document.querySelector('.vybe-ai-input-box') as HTMLElement;
		const composerRect = composerElement ? composerElement.getBoundingClientRect() : rect;

		dropdown.style.top = `${rect.top - 18}px`; // 18px gap above (matching @ dropdown)
		dropdown.style.right = `${window.innerWidth - composerRect.right + 8}px`; // Right-aligned with composer (8px inset from edge, like @ dropdown)
		dropdown.style.left = 'auto';
		dropdown.style.transform = 'translateY(-100%)'; // Move up by its own height

		// Inner container
		const innerContainer = append(dropdown, $('div'));
		innerContainer.style.display = 'flex';
		innerContainer.style.flexDirection = 'column';
		innerContainer.style.gap = '0';

		// Content container
		const contentContainer = append(innerContainer, $('div'));
		contentContainer.setAttribute('tabindex', '0');
		contentContainer.style.boxSizing = 'border-box';
		contentContainer.style.alignItems = 'stretch';
		contentContainer.style.fontSize = '12px';
		contentContainer.style.display = 'flex';
		contentContainer.style.flexDirection = 'column';
		contentContainer.style.gap = '1px';
		contentContainer.style.padding = '2px';
		contentContainer.style.outline = 'none';
		contentContainer.style.pointerEvents = 'auto';

		// Usage info items
		const usageItems = [
			{ label: 'Context used', value: '0 / 200K tokens' },
			{ label: 'Messages', value: '0 / 50' },
			{ label: 'Model', value: 'Auto' }
		];

		usageItems.forEach(item => {
			const usageItem = append(contentContainer, $('div'));
			usageItem.style.display = 'flex';
			usageItem.style.justifyContent = 'space-between';
			usageItem.style.alignItems = 'center';
			usageItem.style.padding = '4px 6px';
			usageItem.style.borderRadius = '3px';
			usageItem.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

			const labelSpan = append(usageItem, $('span'));
			labelSpan.textContent = item.label;
			labelSpan.style.fontSize = '11px';
			labelSpan.style.lineHeight = '14px';
			labelSpan.style.color = isDarkTheme ? 'rgba(204, 204, 204, 0.7)' : 'rgba(102, 102, 102, 0.7)';

			const valueSpan = append(usageItem, $('span'));
			valueSpan.textContent = item.value;
			valueSpan.style.fontSize = '11px';
			valueSpan.style.lineHeight = '14px';
			valueSpan.style.color = isDarkTheme ? 'rgba(228, 228, 228, 0.92)' : 'rgba(51, 51, 51, 0.92)';
			valueSpan.style.fontWeight = '500';

			// Hover effect
			this._register(addDisposableListener(usageItem, 'mouseenter', () => {
				usageItem.style.backgroundColor = '#7e7f80';
			}));
			this._register(addDisposableListener(usageItem, 'mouseleave', () => {
				usageItem.style.backgroundColor = 'transparent';
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

	/**
	 * Initialize scroll listener to manage smooth sticky transitions
	 */
	private initStickyTransitionBehavior(): void {
		this._register(addDisposableListener(this.contentContainer, 'scroll', () => {
			this.handleStickyTransitions();
		}));
	}

	/**
	 * Handle sticky transitions - Transform-based "lock and move together" effect
	 */
	private handleStickyTransitions(): void {
		// Get all user message containers, sorted by index
		const userMessages = Array.from(this.contentContainer.querySelectorAll('.vybe-ai-message-container'))
			.filter((el): el is HTMLElement => el instanceof HTMLElement)
			.filter(el => el.getAttribute('data-message-id')?.startsWith('msg-'))
			.sort((a, b) => {
				const aIndex = parseInt(a.getAttribute('data-message-index') || '0');
				const bIndex = parseInt(b.getAttribute('data-message-index') || '0');
				return aIndex - bIndex;
			});

		if (userMessages.length === 0) {
			return;
		}

		const containerRect = this.contentContainer.getBoundingClientRect();
		const stickyPosition = containerRect.top; // Top of the container (where sticky messages stick)

		// Process each message to determine sticky/locked state
		for (let i = 0; i < userMessages.length; i++) {
			const currentMsg = userMessages[i];
			const currentRect = currentMsg.getBoundingClientRect();

			// Check if this message is currently at the sticky position
			const isAtStickyPosition = Math.abs(currentRect.top - stickyPosition) < 2;

			// Forward scrolling: Check if next message is approaching
			if (isAtStickyPosition && i < userMessages.length - 1) {
				const nextMsg = userMessages[i + 1];
				const nextRect = nextMsg.getBoundingClientRect();

				// Calculate distance from sticky position
				const distanceFromSticky = nextRect.top - stickyPosition;

				// LOCK ZONE: If next message is within LOCK_DISTANCE
				if (distanceFromSticky > 0 && distanceFromSticky <= this.LOCK_DISTANCE) {
					// Apply downward transform to current message to "push" it down with next message
					const pushOffset = this.LOCK_DISTANCE - distanceFromSticky;
					currentMsg.style.transform = `translateY(-${pushOffset}px)`;
					currentMsg.style.position = 'sticky';
					currentMsg.style.top = '0';
				} else {
					// Not in lock zone - reset transform
					currentMsg.style.transform = 'translateY(0)';
					currentMsg.style.position = 'sticky';
					currentMsg.style.top = '0';
				}
			} else {
				// Not at sticky position - ensure transform is reset
				currentMsg.style.transform = 'translateY(0)';

				// Keep position sticky for all messages (they become sticky when they reach top)
				if (currentMsg.style.position !== 'sticky') {
					currentMsg.style.position = 'sticky';
					currentMsg.style.top = '0';
				}
			}
		}
	}

	/**
	 * Create a message page (full-height widget containing user message + AI response area)
	 */
	private createMessagePage(message: { id: string; type: 'user' | 'ai'; content: string; timestamp: number }, messageIndex: number): HTMLElement {
		const workbench = document.querySelector('.monaco-workbench');
		const isDarkTheme = workbench ? (workbench.classList.contains('vs-dark') || workbench.classList.contains('hc-black')) : true;

		// Page container - takes full viewport height
		const page = $('.vybe-ai-message-page');
		page.setAttribute('data-message-id', message.id);
		page.setAttribute('data-message-index', messageIndex.toString());
		page.style.minHeight = '100%'; // Full viewport height
		page.style.height = 'auto'; // Grow if content exceeds viewport
		page.style.display = 'flex';
		page.style.flexDirection = 'column';
		page.style.scrollSnapAlign = 'start'; // Snap to this page
		page.style.scrollSnapStop = 'always'; // Force stop at this page
		page.style.position = 'relative';

		// User message header (sticky within this page)
		const messageHeader = $('.vybe-ai-message-header');
		messageHeader.style.position = 'sticky';
		messageHeader.style.top = '0';
		messageHeader.style.zIndex = '10';
		messageHeader.style.padding = '1px 10px 8px';
		messageHeader.style.paddingBottom = '10px';
		messageHeader.style.backgroundColor = 'var(--vscode-sideBar-background)';
		messageHeader.style.flexShrink = '0'; // Don't shrink

		// Message box
		const messageBox = $('.vybe-ai-message-box');
		messageBox.style.position = 'relative';
		messageBox.style.borderRadius = '6px';
		messageBox.style.border = '1px solid var(--vscode-input-border)';
		messageBox.style.backgroundColor = isDarkTheme ? '#1e1f21' : '#f8f8f9';
		messageBox.style.padding = '8px';
		messageBox.style.boxSizing = 'border-box';
		messageBox.style.cursor = 'pointer';
		messageBox.style.width = '100%';

		// Message content
		const messageContent = $('.vybe-ai-message-content');
		messageContent.setAttribute('contenteditable', 'false');
		messageContent.textContent = message.content;
		messageContent.style.fontSize = '13px';
		messageContent.style.lineHeight = '1.5';
		messageContent.style.color = 'var(--vscode-input-foreground)';
		messageContent.style.whiteSpace = 'pre-wrap';
		messageContent.style.wordBreak = 'break-word';

		messageBox.appendChild(messageContent);
		messageHeader.appendChild(messageBox);
		page.appendChild(messageHeader);

		// AI response area (scrollable within page, initially empty)
		const aiResponseArea = $('.vybe-ai-response-area');
		aiResponseArea.setAttribute('data-response-for', message.id);
		aiResponseArea.style.flex = '1'; // Take remaining space
		aiResponseArea.style.overflow = 'auto'; // Scrollable for long AI responses
		aiResponseArea.style.padding = '0 10px 16px 10px';
		page.appendChild(aiResponseArea);

		return page;
	}

	private addUserMessage(content: string): void {
		// Increment message counter
		this.userMessageCount++;

		// Create message object
		const message = {
			id: `msg-${Date.now()}`,
			type: 'user' as const,
			content,
			timestamp: Date.now()
		};
		this.messages.push(message);

		// Create a new PAGE for this message (will contain user message + AI response)
		const messagePage = this.createMessagePage(message, this.userMessageCount);
		this.messagePages.set(message.id, messagePage);
		this.contentContainer.appendChild(messagePage);

		// Scroll to this page immediately
		requestAnimationFrame(() => {
			messagePage.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}


	private addAiMessage(content: string): void {
		// Create message object
		const message = {
			id: `msg-ai-${Date.now()}`,
			type: 'ai' as const,
			content,
			timestamp: Date.now()
		};
		this.messages.push(message);

		// Find the most recent user message ID to add this AI response to its page
		const userMessages = this.messages.filter(m => m.type === 'user');
		const lastUserMessage = userMessages[userMessages.length - 1];

		if (lastUserMessage) {
			const messagePage = this.messagePages.get(lastUserMessage.id);
			if (messagePage) {
				// Find the AI response area within this page
				const aiResponseArea = messagePage.querySelector(`[data-response-for="${lastUserMessage.id}"]`) as HTMLElement;
				if (aiResponseArea) {
					// Create AI content
					const aiContent = $('.vybe-ai-response-content');
					aiContent.textContent = message.content;
					aiContent.style.fontSize = '13px';
					aiContent.style.lineHeight = '1.6';
					aiContent.style.color = 'var(--vscode-foreground)';
					aiContent.style.whiteSpace = 'pre-wrap';
					aiContent.style.wordBreak = 'break-word';
					aiContent.style.opacity = '0.9';

					aiResponseArea.appendChild(aiContent);
				}
			}
		}
	}
}

