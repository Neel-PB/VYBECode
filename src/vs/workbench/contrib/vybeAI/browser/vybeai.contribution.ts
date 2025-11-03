/*---------------------------------------------------------------------------------------------
 *  VYBE AI Contribution - Registers VYBE AI Pane
 *  Copyright (c) VYBE. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainer, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { localize2 } from '../../../../nls.js';
import { VybeAiPaneWithCustomTitle } from './vybeAiPaneWithCustomTitle.js';
import { VYBE_AI_PANEL_ID, VYBE_AI_VIEW_ID } from '../common/vybeAiConstants.js';

const vybeAiViewContainer: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: VYBE_AI_PANEL_ID,
	title: localize2('vybeai.viewContainer.label', "VYBE AI"),
	icon: Codicon.sparkle,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VYBE_AI_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: VYBE_AI_PANEL_ID,
	hideIfEmpty: false,
	order: 0,
}, ViewContainerLocation.AuxiliaryBar, { isDefault: false });

const vybeAiViewDescriptor: IViewDescriptor = {
	id: VYBE_AI_VIEW_ID,
	containerIcon: vybeAiViewContainer.icon,
	containerTitle: vybeAiViewContainer.title.value,
	singleViewPaneContainerTitle: vybeAiViewContainer.title.value,
	name: localize2('vybeai.viewContainer.label', "VYBE AI"),
	canToggleVisibility: true,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(VybeAiPaneWithCustomTitle),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([vybeAiViewDescriptor], vybeAiViewContainer);
