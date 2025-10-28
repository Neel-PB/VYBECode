/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IHeaders } from '../../../base/parts/request/common/request.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { getServiceMachineId } from './serviceMachineId.js';
import { IFileService } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService, TelemetryLevel } from '../../telemetry/common/telemetry.js';
import { getTelemetryLevel, supportsTelemetry } from '../../telemetry/common/telemetryUtils.js';

export async function resolveMarketplaceHeaders(version: string,
	productService: IProductService,
	environmentService: IEnvironmentService,
	configurationService: IConfigurationService,
	fileService: IFileService,
	storageService: IStorageService | undefined,
	telemetryService: ITelemetryService): Promise<IHeaders> {

	const headers: IHeaders = {
		'X-Market-Client-Id': `VSCode ${version}`,
		// VYBE: Use official VS Code User-Agent to avoid marketplace rejection
		'User-Agent': `VSCode ${version} (Visual Studio Code)`
	};

	// VYBE: Always add service machine ID and session ID - marketplace requires VSCode-SessionId
	const serviceMachineId = await getServiceMachineId(environmentService, fileService, storageService);

	if (supportsTelemetry(productService, environmentService) && getTelemetryLevel(configurationService) === TelemetryLevel.USAGE) {
		headers['X-Market-User-Id'] = serviceMachineId;
	}

	// Marketplace will reject the request if there is no VSCode-SessionId header
	headers['VSCode-SessionId'] = telemetryService.machineId || serviceMachineId;

	return headers;
}
