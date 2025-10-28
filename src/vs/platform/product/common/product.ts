/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { env } from '../../../base/common/process.js';
import { IProductConfiguration } from '../../../base/common/product.js';
import { ISandboxConfiguration } from '../../../base/parts/sandbox/common/sandboxTypes.js';

/**
 * @deprecated It is preferred that you use `IProductService` if you can. This
 * allows web embedders to override our defaults. But for things like `product.quality`,
 * the use is fine because that property is not overridable.
 */
let product: IProductConfiguration;

// Native sandbox environment
const vscodeGlobal = (globalThis as { vscode?: { context?: { configuration(): ISandboxConfiguration | undefined } } }).vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.context !== 'undefined') {
	console.log('[VYBE DEBUG] product.ts - Using SANDBOX path (renderer)');
	const configuration: ISandboxConfiguration | undefined = vscodeGlobal.context.configuration();
	if (configuration) {
		product = configuration.product;
		console.log('[VYBE DEBUG] product.ts - Sandbox product keys BEFORE fix:', Object.keys(product));
		console.log('[VYBE DEBUG] product.ts - Sandbox product.extensionsGallery BEFORE fix:', (product as any).extensionsGallery);

		// VYBE FIX: extensionsGallery is missing from sandbox config, inject it manually
		if (!(product as any).extensionsGallery) {
			console.log('[VYBE DEBUG] product.ts - INJECTING extensionsGallery into sandbox product');
			(product as any).extensionsGallery = {
				serviceUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery',
				itemUrl: 'https://marketplace.visualstudio.com/items',
				publisherUrl: 'https://marketplace.visualstudio.com/publishers',
				resourceUrlTemplate: 'https://{publisher}.gallery.vsassets.io/_apis/public/gallery/publisher/{publisher}/extension/{name}/{version}/assetbyname/{path}',
				controlUrl: 'https://az764295.vo.msecnd.net/extensions/marketplace.json',
				recommendationsUrl: 'https://az764295.vo.msecnd.net/extensions/workspaceRecommendations.json.gz',
				nlsBaseUrl: 'https://www.vscode-unpkg.net/_lp/',
				extensionUrlTemplate: 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{name}/{version}/vspackage'
			};
			console.log('[VYBE DEBUG] product.ts - Sandbox product.extensionsGallery AFTER injection:', (product as any).extensionsGallery);
		}
	} else {
		throw new Error('Sandbox: unable to resolve product configuration from preload script.');
	}
}
// _VSCODE environment
else if (globalThis._VSCODE_PRODUCT_JSON && globalThis._VSCODE_PACKAGE_JSON) {
	// Obtain values from product.json and package.json-data
	product = globalThis._VSCODE_PRODUCT_JSON as unknown as IProductConfiguration;
	console.log('[VYBE DEBUG] product.ts - globalThis._VSCODE_PRODUCT_JSON has extensionsGallery:', !!(product as any).extensionsGallery);
	console.log('[VYBE DEBUG] product.ts - extensionsGallery.serviceUrl:', (product as any).extensionsGallery?.serviceUrl);

	// Running out of sources
	if (env['VSCODE_DEV']) {
		console.log('[VYBE DEBUG] product.ts - VSCODE_DEV detected, modifying product...');
		Object.assign(product, {
			nameShort: `${product.nameShort} Dev`,
			nameLong: `${product.nameLong} Dev`,
			dataFolderName: `${product.dataFolderName}-dev`,
			serverDataFolderName: product.serverDataFolderName ? `${product.serverDataFolderName}-dev` : undefined
		});
		console.log('[VYBE DEBUG] product.ts - After VSCODE_DEV modify, extensionsGallery still exists:', !!(product as any).extensionsGallery);
	}

	// Version is added during built time, but we still
	// want to have it running out of sources so we
	// read it from package.json only when we need it.
	if (!product.version) {
		const pkg = globalThis._VSCODE_PACKAGE_JSON as { version: string };

		Object.assign(product, {
			version: pkg.version
		});
	}
}

// Web environment or unknown
else {
	console.log('[VYBE DEBUG] product.ts - Using FALLBACK/WEB path');

	// Built time configuration (do NOT modify)
	// eslint-disable-next-line local/code-no-dangerous-type-assertions
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } as unknown as IProductConfiguration;

	// Running out of sources
	if (Object.keys(product).length === 0) {
		console.log('[VYBE DEBUG] product.ts - Fallback product is empty, using defaults');
		Object.assign(product, {
			version: '1.104.0-dev',
			nameShort: 'Code - OSS Dev',
			nameLong: 'Code - OSS Dev',
			applicationName: 'code-oss',
			dataFolderName: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
			licenseName: 'MIT',
			licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
			serverLicenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt'
		});
	}
	console.log('[VYBE DEBUG] product.ts - Fallback product keys:', Object.keys(product));
	console.log('[VYBE DEBUG] product.ts - Fallback product.extensionsGallery:', (product as any).extensionsGallery);
}

export default product;
