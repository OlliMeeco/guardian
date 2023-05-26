import { Guardians } from '@helpers/guardians';
import { IToken, ITokenInfo, UserRole } from '@guardian/interfaces';
import { Logger, RunFunctionAsync } from '@guardian/common';
import { PolicyEngine } from '@helpers/policy-engine';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { prepareValidationResponse } from '@middlewares/validation';
import { Controller, Delete, Get, Post, Put, Req, Response } from '@nestjs/common';

/**
 * Token route
 */
// export const tokenAPI = Router();

/**
 * Connect policies to tokens
 * @param tokens
 * @param map
 * @param policyId
 * @param notEmpty
 */
function setTokensPolicies<T>(tokens: any[], map: any[], policyId?: any, notEmpty?: boolean): T[] {
    if (!tokens) {
        return [];
    }
    for (const token of tokens) {
        token.policies = token.policies || [];
        token.policyIds = token.policyIds || [];
        for (const policyObject of map) {
            if (policyObject.tokenIds.includes(token.tokenId)) {
                token.policies.push(`${policyObject.name} (${policyObject.version || 'DRAFT'})`);
                token.policyIds.push(policyObject.id.toString());
            }
        }
    }
    if (policyId) {
        tokens = tokens.filter(t => t.policyIds.includes(policyId));
    }
    if (notEmpty) {
        tokens = tokens.filter(t => !!t.policyIds.length);
    }
    return tokens;

}

/**
 * Set policy in dynamic tokens
 * @param tokens
 * @param engineService
 */
async function setDynamicTokenPolicy(tokens: any[], engineService?: PolicyEngine): Promise<any> {
    if (!tokens || !engineService) {
        return tokens;
    }
    for (const token of tokens) {
        if (!token.policyId) {
            continue;
        }
        const policy = await engineService.getPolicy({
            filters: {
                id: token.policyId,
            }
        });
        token.policies = [`${policy.name} (${policy.version || 'DRAFT'})`];
        token.policyIds = [policy.id];
    }
    return tokens;
}

@Controller('tokens')
export class TokensApi {
    @Get('/')
    async getTokens(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();

            const user = req.user;
            const policyId = req.query?.policy;

            let tokens: IToken[] = [];
            if (user.role === UserRole.STANDARD_REGISTRY) {
                tokens = await guardians.getTokens({ did: user.did });
                const map = await engineService.getTokensMap(user.did);
                tokens = await setDynamicTokenPolicy(tokens, engineService);
                tokens = setTokensPolicies(tokens, map, policyId, false);
            } else if (user.did) {
                tokens = await guardians.getAssociatedTokens(user.did);
                const map = await engineService.getTokensMap(user.parent, 'PUBLISH');
                tokens = await setDynamicTokenPolicy(tokens, engineService);
                tokens = setTokensPolicies(tokens, map, policyId, true);
            }
            return res.json(tokens);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/')
    async newToken(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const engineService = new PolicyEngine();
            const user = req.user;

            if (!user.did) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }

            let tokens = (await guardians.setToken({
                token: req.body,
                owner: user.did
            }));

            tokens = await guardians.getTokens({ did: user.did });
            const map = await engineService.getTokensMap(user.did);
            tokens = setTokensPolicies(tokens, map);

            return res.status(201).json(tokens);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Post('/push')
    async pushTokenAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Create token');
        const user = req.user;
        if (!user.did) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }

        const token = req.body;
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.setTokenAsync(token, user.did, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Put('/push')
    async updateTokenAsync(@Req() req, @Response() res): Promise<any> {
        try {
            const taskManager = new TaskManager();
            const { taskId, expectation } = taskManager.start('Update token');

            const user = req.user;
            const token = req.body;

            if (!user.did) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }

            if (!token.tokenId) {
                return res.status(422).json(prepareValidationResponse('The field tokenId is required'));
            }

            const guardians = new Guardians();
            const tokenObject = await guardians.getTokenById(token.tokenId);

            if (!tokenObject) {
                throw new Error('Token not found')
                // return next(createError(404, 'Token not found'));
            }

            if (tokenObject.owner !== user.did) {
                throw new Error('Invalid creator.')
                // return next(createError(403, 'Invalid creator.'));
            }

            RunFunctionAsync<ServiceError>(async () => {
                await guardians.updateTokenAsync(token, taskId);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(taskId, { code: error.code || 500, message: error.message });
            });

            return res.status(202).send({ taskId, expectation });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Delete('/push/:tokenId')
    async deleteTokenAsync(@Req() req, @Response() res): Promise<any> {
        try {
            const taskManager = new TaskManager();
            const { taskId, expectation } = taskManager.start('Update token');

            const user = req.user;
            const tokenId = req.params.tokenId;

            if (!user.did) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }

            const guardians = new Guardians();
            const tokenObject = await guardians.getTokenById(tokenId);

            if (!tokenObject) {
                throw new Error('Token does not exist.')
                // return next(createError(404, 'Token does not exist.'));
            }

            if (tokenObject.owner !== user.did) {
                throw new Error('Invalid creator.');
                // return next(createError(403, 'Invalid creator.'));
            }

            RunFunctionAsync<ServiceError>(async () => {
                await guardians.deleteTokenAsync(tokenId, taskId);
            }, async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(taskId, { code: error.code || 500, message: error.message });
            });

            return res.status(202).send({ taskId, expectation });
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @Put('/:tokenId/associate')
    async associateToken(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const status = await guardians.associateToken(tokenId, userDid);
            return res.json(status);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not found')
                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token does not exist.')
                // return next(createError(404, 'Token not found'));
            }
            throw error;
        }
    }

    @Put('/push/:tokenId/associate')
    async associateTokenAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Associate/dissociate token');

        const tokenId = req.params.tokenId;
        const userDid = req.user.did;
        if (!userDid) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.associateTokenAsync(tokenId, userDid, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Put('/:tokenId/dissociate')
    async dissociateToken(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const status = await guardians.dissociateToken(tokenId, userDid);
            return res.json(status);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not found')

                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token does not exist.')

                // return next(createError(404, 'Token not found'));
            }
            throw error;
        }
    }

    @Put('/push/:tokenId/dissociate')
    async dissociateTokenAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Associate/dissociate token');

        const tokenId = req.params.tokenId;
        const userDid = req.user.did;
        if (!userDid) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }
        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.dissociateTokenAsync(tokenId, userDid, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    /**
     * @deprecated
     */
    @Put('/:tokenId/:username/grantKyc')
    async grantKycOld(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const owner = req.user.did;
            if (!owner) {
                return res.status(500).json({ code: 500, message: 'User not registered' });
                return;
            }
            const result = await guardians.grantKycToken(tokenId, username, owner);
            return res.status(200).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return res.status(500).json({ code: error.code || 500, message: error.message });
        }
    }

    /**
     * @deprecated
     */
    @Put('/:tokenId/:username/grantKyc')
    async grantKycOld2(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const owner = req.user.did;
            if (!owner) {
                return res.status(500).json({ code: 500, message: 'User not registered' });
            }
            const result = await guardians.grantKycToken(tokenId, username, owner);
            res.status(200).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return res.status(500).json({ code: error.code || 500, message: error.message });
        }
    }

    @Put('/:tokenId/:username/grant-kyc')
    async grantKyc(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            return res.json(await guardians.grantKycToken(tokenId, username, userDid));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not found')
                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token not found')
                // return next(createError(404, 'Token not found'));
            }
            throw error;
        }
    }

    /**
     * @deprecated
     */
    @Put('/push/:tokenId/:username/grantKyc')
    async grantKycAsyncOld(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Grant KYC');

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            return res.status(500).json({ code: 500, message: 'User not registered' });
            return;
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.grantKycTokenAsync(tokenId, username, owner, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(200).send({ taskId, expectation });
    }

    @Put('/push/:tokenId/:username/grant-kyc')
    async grantKycAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Grant KYC');

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const userDid = req.user.did;
        if (!userDid) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.grantKycTokenAsync(tokenId, username, userDid, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    /**
     * @deprecated
     */
    @Put('/:tokenId/:username/revokeKyc')
    async revokeKycOld(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const owner = req.user.did;
            if (!owner) {
                return res.status(500).json({ code: 500, message: 'User not registered' });
                return;
            }
            const result = await guardians.revokeKycToken(tokenId, username, owner);
            res.status(200).json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return res.status(500).json({ code: error.code || 500, message: error.message });
        }
    }

    @Put('/:tokenId/:username/revoke-kyc')
    async revokeKyc(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.revokeKycToken(tokenId, username, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not found')
                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token not found')
                // return next(createError(404, 'Token not found'));
            }
            throw error;
        }
    }

    /**
     * @deprecated
     */
    @Put('/push/:tokenId/:username/revokeKyc')
    async revokeKycAsyncOld(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Revoke KYC');

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const owner = req.user.did;
        if (!owner) {
            return res.status(500).json({ code: 500, message: 'User not registered' });
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.revokeKycTokenAsync(tokenId, username, owner, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(200).send({ taskId, expectation });
    }

    @Put('/push/:tokenId/:username/revoke-kyc')
    async revokeKycAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Revoke KYC');

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const userDid = req.user.did;
        if (!userDid) {
            throw new Error('User not registered');
            // return next(createError(422, 'User not registered'));
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.revokeKycTokenAsync(tokenId, username, userDid, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Put('/:tokenId/:username/freeze')
    async freezeToken(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.freezeToken(tokenId, username, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not registered');
                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token not registered');
                // return next(createError(404, 'Token not found'));
            }
            throw error
        }
    }

    @Put('/:tokenId/:username/unfreeze')
    async unfreezeToken(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.unfreezeToken(tokenId, username, userDid);
            return res.json(result);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not registered');
                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token not registered');
                // return next(createError(404, 'Token not found'));
            }
            throw error;
        }
    }

    @Put('/push/:tokenId/:username/freeze')
    async freezeTokenAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Freeze Token');

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const userDid = req.user.did;
        if (!userDid) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.freezeTokenAsync(tokenId, username, userDid, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Put('/push/:tokenId/:username/unfreeze')
    async unfreezeTokenAsync(@Req() req, @Response() res): Promise<any> {
        const taskManager = new TaskManager();
        const { taskId, expectation } = taskManager.start('Freeze Token');

        const tokenId = req.params.tokenId;
        const username = req.params.username;
        const userDid = req.user.did;
        if (!userDid) {
            return res.status(422).json(prepareValidationResponse('User not registered'));
        }

        RunFunctionAsync<ServiceError>(async () => {
            const guardians = new Guardians();
            await guardians.freezeTokenAsync(tokenId, username, userDid, taskId);
        }, async (error) => {
            new Logger().error(error, ['API_GATEWAY']);
            taskManager.addError(taskId, { code: error.code || 500, message: error.message });
        });

        return res.status(202).send({ taskId, expectation });
    }

    @Get('/:tokenId/:username/info')
    async getTokenInfo(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            const tokenId = req.params.tokenId;
            const username = req.params.username;
            const userDid = req.user.did;
            if (!userDid) {
                return res.status(422).json(prepareValidationResponse('User not registered'));
            }
            const result = await guardians.getInfoToken(tokenId, username, userDid);
            return res.json(result as ITokenInfo);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            if (error?.message?.toLowerCase().includes('user not found')) {
                throw new Error('User not registered');
                // return next(createError(404, 'User not found'));
            }
            if (error?.message?.toLowerCase().includes('token not found')) {
                throw new Error('Token not registered');
                // return next(createError(404, 'Token not found'));
            }
            throw error;
        }
    }
}
