/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';

export const IVybeModeService = createDecorator<IVybeModeService>('vybeModeService');

export interface IVybeModeService {
	readonly _serviceBrand: undefined;

	readonly isVybeMode: boolean;
	readonly onDidChangeMode: Event<boolean>;

	setMode(isVybeMode: boolean): void;
	toggleMode(): void;
}

const VYBE_MODE_STORAGE_KEY = 'workbench.vybeMode.enabled';

export class VybeModeService extends Disposable implements IVybeModeService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeMode = this._register(new Emitter<boolean>());
	readonly onDidChangeMode = this._onDidChangeMode.event;

	private _isVybeMode: boolean;
	get isVybeMode(): boolean {
		return this._isVybeMode;
	}

	constructor(
		@IStorageService private readonly storageService: IStorageService
	) {
		super();

		this._isVybeMode = this.storageService.getBoolean(VYBE_MODE_STORAGE_KEY, StorageScope.PROFILE, false);
	}

	toggleMode(): void {
		this.setMode(!this._isVybeMode);
	}

	setMode(isVybeMode: boolean): void {
		if (this._isVybeMode === isVybeMode) {
			return;
		}

		this._isVybeMode = isVybeMode;
		this.storageService.store(VYBE_MODE_STORAGE_KEY, isVybeMode, StorageScope.PROFILE, StorageTarget.USER);
		this._onDidChangeMode.fire(isVybeMode);
	}
}

registerSingleton(IVybeModeService, VybeModeService, InstantiationType.Delayed);

