import { Singleton } from '@helpers/decorators/singleton';
import {
    ApplicationStates,
    CommonSettings,
    GenerateUUIDv4,
    IArtifact,
    IChainItem,
    IDidObject,
    ISchema,
    IToken,
    ITokenInfo,
    IUser,
    IVCDocument,
    IVPDocument,
    MessageAPI,
    SuggestionsOrderPriority,
    ContractAPI,
    ContractType,
    RetireTokenPool,
    RetireTokenRequest,
    IContract,
    IRetireRequest,
    IRetirePool
} from '@guardian/interfaces';
import { NatsService } from '@guardian/common';
import { NewTask } from './task-manager';

/**
 * Filters type
 */
type IFilter = any;

/**
 * Items and count
 */
interface ResponseAndCount<U> {
    /**
     * Return count
     */
    count: number;
    /**
     * Schemas array
     */
    items: U[];
}

/**
 * Guardians service
 */
@Singleton
export class Guardians extends NatsService {
    /**
     * Queue name
     */
    public messageQueueName = 'guardians-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'guardians-queue-reply-' + GenerateUUIDv4();

    /**
     * Update settings
     *
     */
    public async updateSettings(settings: CommonSettings): Promise<void> {
        await this.sendMessage(MessageAPI.UPDATE_SETTINGS, settings);
    }

    /**
     * Get settings
     *
     */
    public async getSettings(): Promise<CommonSettings> {
        return await this.sendMessage<CommonSettings>(MessageAPI.GET_SETTINGS);
    }

    /**
     * Get environment name
     */
    public async getEnvironment(): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_ENVIRONMENT);
    }

    /**
     * Return DID Documents
     *
     * @param {Object} params - filters
     * @param {string} params.did - DID
     *
     * @returns {IDidObject[]} - DID Documents
     */
    public async getDidDocuments(params: IFilter): Promise<IDidObject[]> {
        return await this.sendMessage(MessageAPI.GET_DID_DOCUMENTS, params);
    }

    /**
     * Return VC Documents
     *
     * @param {Object} [params] - filters
     * @param {string} [params.type] - filter by type
     * @param {string} [params.owner] - filter by owner
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    public async getVcDocuments(params: IFilter): Promise<IVCDocument[]> {
        return await this.sendMessage(MessageAPI.GET_VC_DOCUMENTS, params);
    }

    /**
     * Return VP Documents
     *
     * @param {Object} [params] - filters
     *
     * @returns {ResponseAndCount<IVPDocument>} - VP Documents
     */
    public async getVpDocuments(params?: IFilter): Promise<ResponseAndCount<IVPDocument>> {
        return await this.sendMessage(MessageAPI.GET_VP_DOCUMENTS, params);
    }

    /**
     * Return tokens
     *
     * @param {Object} [params] - filters
     * @param {string} [params.tokenId] - token id
     * @param {string} [params.did] - user did
     *
     * @returns {IToken[]} - tokens
     */
    public async getTokens(params?: IFilter): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.GET_TOKENS, params);
    }

    /**
     * Return token
     *
     * @param {string} [tokenId] - token id
     *
     * @returns {IToken} - token
     */
    public async getTokenById(tokenId: string): Promise<IToken> {
        return await this.sendMessage(MessageAPI.GET_TOKEN, { tokenId });
    }

    /**
     * Return trust chain
     *
     * @param {string} id - hash or uuid
     *
     * @returns {IChainItem[]} - trust chain
     */
    public async getChain(id: string): Promise<IChainItem[]> {
        return await this.sendMessage(MessageAPI.GET_CHAIN, { id });
    }

    /**
     * Create new token
     *
     * @param {IToken} item - token
     *
     * @returns {IToken[]} - all tokens
     */
    public async setToken(item: IToken | any): Promise<IToken[]> {
        return await this.sendMessage(MessageAPI.SET_TOKEN, item);
    }

    /**
     * Async create new token
     * @param token
     * @param owner
     * @param task
     */
    public async setTokenAsync(token: IToken | any, owner: any, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.SET_TOKEN_ASYNC, { token, owner, task });
    }

    /**
     * Async create new token
     * @param token
     * @param task
     */
    public async updateTokenAsync(token: IToken | any, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.UPDATE_TOKEN_ASYNC, { token, task });
    }

    /**
     * Async create new token
     * @param tokenId
     * @param task
     */
    public async deleteTokenAsync(tokenId: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.DELETE_TOKEN_ASYNC, { tokenId, task });
    }

    /**
     * Freeze token
     * @param tokenId
     * @param username
     * @param owner
     * @returns {Promise<ITokenInfo>}
     */
    public async freezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN, {
            tokenId,
            username,
            owner,
            freeze: true,
        });
    }

    /**
     * Async Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async freezeTokenAsync(tokenId: string, username: string, owner: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            freeze: true,
            task,
        });
    }

    /**
     * Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     */
    public async unfreezeToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN, {
            tokenId,
            username,
            owner,
            freeze: false,
        });
    }

    /**
     * Async Unfreeze token
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async unfreezeTokenAsync(tokenId: string, username: string, owner: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.FREEZE_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            freeze: false,
            task,
        });
    }

    /**
     * Grant KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async grantKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN, {
            tokenId,
            username,
            owner,
            grant: true,
        });
    }

    /**
     * Async grant KYC
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async grantKycTokenAsync(tokenId: string, username: string, owner: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            grant: true,
            task,
        });
    }

    /**
     * Revoke KYC
     * @param tokenId
     * @param username
     * @param owner
     */
    public async revokeKycToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN, {
            tokenId,
            username,
            owner,
            grant: false,
        });
    }

    /**
     * Async revoke KYC
     * @param tokenId
     * @param username
     * @param owner
     * @param task
     */
    public async revokeKycTokenAsync(tokenId: string, username: string, owner: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.KYC_TOKEN_ASYNC, {
            tokenId,
            username,
            owner,
            grant: false,
            task,
        });
    }

    /**
     * Associate token
     * @param tokenId
     * @param did
     */
    public async associateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            did,
            associate: true,
        });
    }

    /**
     * Async associate token
     * @param tokenId
     * @param did
     * @param task
     */
    public async associateTokenAsync(tokenId: string, did: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            did,
            associate: true,
            task,
        });
    }

    /**
     * Dissociate token
     * @param tokenId
     * @param did
     */
    public async dissociateToken(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN, {
            tokenId,
            did,
            associate: false,
        });
    }

    /**
     * Async dissociate token
     * @param tokenId
     * @param did
     * @param task
     */
    public async dissociateTokenAsync(tokenId: string, did: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.ASSOCIATE_TOKEN_ASYNC, {
            tokenId,
            did,
            associate: false,
            task,
        });
    }

    /**
     * Get token info
     * @param tokenId
     * @param username
     * @param owner
     */
    public async getInfoToken(tokenId: string, username: string, owner: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.GET_INFO_TOKEN, {
            tokenId,
            username,
            owner
        });
    }

    /**
     * Get token serials
     * @param tokenId Token identifier
     * @param did DID
     * @returns Serials
     */
    public async getTokenSerials(tokenId: string, did: string): Promise<ITokenInfo> {
        return await this.sendMessage(MessageAPI.GET_SERIALS, {
            tokenId,
            did
        });
    }

    /**
     * Get associated tokens
     * @param did
     */
    public async getAssociatedTokens(did: string): Promise<ITokenInfo[]> {
        return await this.sendMessage(MessageAPI.GET_ASSOCIATED_TOKENS, { did });
    }

    /**
     * Create standard registry
     * @param profile
     */
    public async createStandardRegistryProfile(profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    /**
     * Create user
     * @param profile
     */
    public async createUserProfile(profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE, profile);
    }

    /**
     * Create user
     * @param username
     * @param profile
     */
    public async createUserProfileCommon(username: string, profile: IUser): Promise<string> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON, { username, profile });
    }

    /**
     * Async create user
     * @param username
     * @param profile
     * @param task
     */
    public async createUserProfileCommonAsync(username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_USER_PROFILE_COMMON_ASYNC, { username, profile, task });
    }

    /**
     * Restore user profile async
     * @param username
     * @param profile
     * @param task
     */
    public async restoreUserProfileCommonAsync(username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.RESTORE_USER_PROFILE_COMMON_ASYNC, { username, profile, task });
    }

    /**
     * Get all user topics
     * @param username
     * @param profile
     * @param task
     */
    public async getAllUserTopicsAsync(username: string, profile: IUser, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GET_ALL_USER_TOPICS_ASYNC, { username, profile, task });
    }

    /**
     * Get user balance
     * @param username
     */
    public async getUserBalance(username: string): Promise<string> {
        return await this.sendMessage(MessageAPI.GET_USER_BALANCE, { username });
    }

    /**
     * Get balance
     * @param username
     */
    public async getBalance(username: string): Promise<string> {
        const b = await this.sendMessage(MessageAPI.GET_BALANCE, { username });
        return b as string;
    }

    /**
     * Generate Demo Key
     *
     * @returns {any} Demo Key
     */
    public async generateDemoKey(role: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY, { role });
    }

    /**
     * Async generate Demo Key
     * @param role
     * @param task
     */
    public async generateDemoKeyAsync(role: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.GENERATE_DEMO_KEY_ASYNC, { role, task });
    }

    /**
     * Return schemas
     * @param {any} options
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByOwner(options: any): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS, options);
    }

    /**
     * Return schemas
     *
     * @param {Object} uuid - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSchemasByUUID(uuid: string): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMAS_BY_UUID, { uuid });
    }

    /**
     * Return schema by type
     *
     * @param {string} type - schema type
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByType(type: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA, { type });
    }

    /**
     * Return schema by id
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaById(id: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA, { id });
    }

    /**
     * Get schema parents
     * @param id Schema identifier
     * @returns Schemas
     */
    public async getSchemaParents(id: string, owner: string): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SCHEMA_PARENTS, { id, owner });
    }

    /**
     * Import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     *
     * @returns {any[]} - Schema Document
     */
    public async importSchemasByMessages(messageIds: string[], owner: string, topicId: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, { messageIds, owner, topicId });
    }

    /**
     * Async import schema
     *
     * @param {string[]} messageIds - schema uuid
     * @param {string} owner
     * @param {string} topicId
     * @param {NewTask} task
     */
    public async importSchemasByMessagesAsync(messageIds: string[], owner: string, topicId: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds, owner, topicId, task });
    }

    /**
     * Import schema
     *
     * @param {ISchema[]} files
     * @param {owner} owner
     * @param {string} topicId
     *
     * @returns {{ schemasMap: any[], errors: any[] }}
     */
    public async importSchemasByFile(
        files: any,
        owner: string,
        topicId: string
    ): Promise<{
        /**
         * New schema uuid
         */
        schemasMap: any[],
        /**
         * Errors
         */
        errors: any[]
    }> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE, { files, owner, topicId });
    }

    /**
     * Async import schema
     * @param {ISchema[]} files
     * @param {owner} owner
     * @param {string} topicId
     * @param {NewTask} task
     */
    public async importSchemasByFileAsync(
        files: any,
        owner: string,
        topicId: string,
        task: NewTask,
    ): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files, owner, topicId, task });
    }

    /**
     * Get schema preview
     *
     * @param {string} messageIds Message identifier
     *
     * @returns {any} Schema preview
     */
    public async previewSchemasByMessages(messageIds: string[]): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA, { messageIds });
    }

    /**
     * Async get schema preview
     *
     * @param {string} messageIds Message identifier
     * @param {NewTask} task Task
     */
    public async previewSchemasByMessagesAsync(messageIds: string[], task: NewTask): Promise<any> {
        return await this.sendMessage(MessageAPI.PREVIEW_SCHEMA_ASYNC, { messageIds, task });
    }

    /**
     * Get schema preview
     *
     * @param {ISchema[]} files
     *
     * @returns {ISchema[]} Schema preview
     */
    public async previewSchemasByFile(files: ISchema[]): Promise<ISchema[]> {
        return files;
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA, item);
    }

    /**
     * Async create or update schema
     * @param {ISchema} item - schema
     * @param {NewTask} task - task
     */
    public async createSchemaAsync(item: ISchema | any, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.CREATE_SCHEMA_ASYNC, { item, task });
    }

    /**
     * Create or update schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async updateSchema(item: ISchema | any): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.UPDATE_SCHEMA, item);
    }

    /**
     * Deleting a schema.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    public async deleteSchema(id: string, owner: string, needResult = false): Promise<ISchema[] | boolean> {
        return await this.sendMessage(MessageAPI.DELETE_SCHEMA, { id, owner, needResult });
    }

    /**
     * Changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     *
     * @returns {ISchema} - message
     */
    public async publishSchema(id: string, version: string, owner: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA, { id, version, owner });
    }

    /**
     * Async changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     * @param {NewTask} task - task
     *
     * @returns {ISchema} - message
     */
    public async publishSchemaAsync(id: string, version: string, owner: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.PUBLISH_SCHEMA_ASYNC, { id, version, owner, task });
    }

    /**
     * Export schemas
     *
     * @param {string[]} ids - schema ids
     *
     * @returns {any[]} - Exported schemas
     */
    public async exportSchemas(ids: string[]): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.EXPORT_SCHEMAS, ids);
    }

    /**
     * Get topic
     * @param filter
     */
    public async getTopic(filter: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_TOPIC, filter);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            return await this.sendMessage(MessageAPI.GET_STATUS);
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }

    /**
     * Get user roles in policy
     *
     * @param {string} did - User did
     *
     * @returns {any[]} - Policies and user roles
     */
    public async getUserRoles(did: string): Promise<string[]> {
        return await this.sendMessage(MessageAPI.GET_USER_ROLES, { did });
    }

    /**
     * Create system schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createSystemSchema(item: ISchema | any): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_SYSTEM_SCHEMA, item);
    }

    /**
     * Return schemas
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getSystemSchemas(
        owner: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMAS, {
            owner,
            pageIndex,
            pageSize
        });
    }

    /**
     * Changing the status of a schema on active.
     *
     * @param {string} id - schema id
     *
     * @returns {ISchema} - message
     */
    public async activeSchema(id: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.ACTIVE_SCHEMA, { id });
    }

    /**
     * Return schema by entity
     *
     * @param {string} entity - schema entity
     *
     * @returns {ISchema} - schema
     */
    public async getSchemaByEntity(entity: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_SYSTEM_SCHEMA, { entity });
    }

    /**
     * Return schemas (name\id)
     *
     * @param {string} owner - schemas owner
     *
     * @returns {any[]} - schemas
     */
    public async getListSchemas(owner: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_LIST_SCHEMAS, { owner });
    }

    /**
     * Return sub schemas
     *
     * @param {string} category - schemas category
     * @param {string} topicId - topic id
     * @param {string} owner - schemas owner
     *
     * @returns {ISchema[]} - schemas
     */
    public async getSubSchemas(category: string, topicId: string, owner: string): Promise<ISchema[]> {
        return await this.sendMessage(MessageAPI.GET_SUB_SCHEMAS, { topicId, owner, category });
    }

    /**
     * Upload Policy Artifacts
     *
     * @param {any} artifact - Artifact
     * @param {string} owner - Owner
     * @param {string} parentId - Policy Identifier
     *
     * @returns - Uploaded Artifacts
     */
    public async uploadArtifact(artifact: any, owner: string, parentId: string): Promise<IArtifact[]> {
        return await this.sendMessage(MessageAPI.UPLOAD_ARTIFACT, {
            owner,
            artifact,
            parentId
        });
    }

    /**
     * Get Policy Artifacts
     *
     * @param {any} options
     *
     * @returns - Artifact
     */
    public async getArtifacts(options: any): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_ARTIFACTS, options);
    }

    /**
     * Delete Artifact
     * @param artifactId Artifact Identifier
     * @param owner Owner
     * @returns Deleted Flag
     */
    public async deleteArtifact(artifactId, owner): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_ARTIFACT, {
            owner,
            artifactId
        });
    }

    /**
     * Add file to IPFS
     * @param buffer File
     * @returns CID, URL
     */
    public async addFileIpfs(buffer: any): Promise<{
        /**
         * CID
         */
        cid,
        /**
         * URL
         */
        url
    }> {
        return await this.sendMessage(MessageAPI.IPFS_ADD_FILE, buffer);
    }

    /**
     * Get file from IPFS
     * @param cid CID
     * @param responseType Response type
     * @returns File
     */
    public async getFileIpfs(cid: string, responseType: any): Promise<any> {
        return await this.sendMessage(MessageAPI.IPFS_GET_FILE, {
            cid, responseType
        });
    }

    /**
     * Compare documents
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareDocuments(
        user: any,
        type: any,
        ids: string[],
        eventsLvl: any,
        propLvl: any,
        childrenLvl: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_DOCUMENTS, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare tools
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareTools(
        user: any,
        type: any,
        ids: string[],
        eventsLvl: any,
        propLvl: any,
        childrenLvl: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_TOOLS, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare two policies
     * @param user
     * @param type
     * @param ids
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async comparePolicies(
        user: any,
        type: any,
        ids: string[],
        eventsLvl: any,
        propLvl: any,
        childrenLvl: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_POLICIES, {
            type,
            user,
            ids,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare two modules
     * @param user
     * @param type
     * @param moduleId1
     * @param moduleId2
     * @param eventsLvl
     * @param propLvl
     * @param childrenLvl
     * @param idLvl
     */
    public async compareModules(
        user: any,
        type: any,
        moduleId1: any,
        moduleId2: any,
        eventsLvl: any,
        propLvl: any,
        childrenLvl: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_MODULES, {
            type,
            user,
            moduleId1,
            moduleId2,
            eventsLvl,
            propLvl,
            childrenLvl,
            idLvl
        });
    }

    /**
     * Compare two schemas
     * @param user
     * @param type
     * @param schemaId1
     * @param schemaId2
     * @param idLvl
     */
    public async compareSchemas(
        user: any,
        type: any,
        schemaId1: any,
        schemaId2: any,
        idLvl: any,
    ) {
        return await this.sendMessage(MessageAPI.COMPARE_SCHEMAS, {
            user, type, schemaId1, schemaId2, idLvl
        });
    }

    /**
     * Search policies
     * @param user
     * @param type
     * @param policyId
     */
    public async searchPolicies(
        user: any,
        policyId: string
    ) {
        return await this.sendMessage(MessageAPI.SEARCH_POLICIES, {
            user,
            policyId
        });
    }

    //#region Contracts

    /**
     * Get contracts
     * @param owner
     * @param type
     * @param pageIndex
     * @param pageSize
     * @returns Contracts and count
     */
    public async getContracts(
        owner: string,
        type: ContractType = ContractType.RETIRE,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IContract[], number]> {
        return await this.sendMessage(ContractAPI.GET_CONTRACTS, {
            owner,
            pageIndex,
            pageSize,
            type,
        });
    }

    /**
     * Create contract
     * @param did
     * @param description
     * @param type
     * @returns Created contract
     */
    public async createContract(
        did: string,
        description: string,
        type: ContractType
    ): Promise<IContract> {
        return await this.sendMessage(ContractAPI.CREATE_CONTRACT, {
            did,
            description,
            type,
        });
    }

    /**
     * Import contract
     * @param did
     * @param contractId
     * @param description
     * @returns Imported contract
     */
    public async importContract(
        did: string,
        contractId: string,
        description: string
    ): Promise<IContract> {
        return await this.sendMessage(ContractAPI.IMPORT_CONTRACT, {
            did,
            contractId,
            description,
        });
    }

    /**
     * Get contract permissions
     * @param did
     * @param id
     * @returns Permissions
     */
    public async checkContractPermissions(
        did: string,
        id: string
    ): Promise<number> {
        return await this.sendMessage(ContractAPI.CONTRACT_PERMISSIONS, {
            id,
            did,
        });
    }

    /**
     * Remove contract
     * @param owner
     * @param id
     * @returns Successful operation
     */
    public async removeContract(owner: string, id: string): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_CONTRACT, {
            owner,
            id,
        });
    }

    /**
     * Get wipe requests
     * @param did
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Wipe requests and count
     */
    public async getWipeRequests(
        did: string,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[{ user: string }[], number]> {
        return await this.sendMessage(ContractAPI.GET_WIPE_REQUESTS, {
            did,
            contractId,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Enable wipe requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async enableWipeRequests(
        owner: string,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ENABLE_WIPE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Disable wipe requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async disableWipeRequests(
        owner: string,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.DISABLE_WIPE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Approve wipe request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async approveWipeRequest(
        owner: string,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.APPROVE_WIPE_REQUEST, {
            owner,
            requestId,
        });
    }

    /**
     * Reject wipe request
     * @param owner
     * @param requestId
     * @param ban
     * @returns Operation successful
     */
    public async rejectWipeRequest(
        owner: string,
        requestId: string,
        ban: boolean = false
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REJECT_WIPE_REQUEST, {
            owner,
            requestId,
            ban,
        });
    }

    /**
     * Clear wipe requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async clearWipeRequests(
        owner: string,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_WIPE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Add wipe admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addWipeAdmin(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove wipe admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeWipeAdmin(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Add wipe manager
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addWipeManager(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_MANAGER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove wipe manager
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeWipeManager(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_MANAGER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Add wipe wiper
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addWipeWiper(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_WIPE_WIPER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove wipe wiper
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeWipeWiper(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_WIPE_WIPER, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Sync retire pools
     * @param owner
     * @param id
     * @returns Sync date
     */
    public async syncRetirePools(owner: string, id: string): Promise<string> {
        return await this.sendMessage(ContractAPI.SYNC_RETIRE_POOLS, {
            owner,
            id,
        });
    }

    /**
     * Get retire requests
     * @param did
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Retire requests and count
     */
    public async getRetireRequests(
        did: string,
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IRetireRequest, number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_REQUESTS, {
            did,
            contractId,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Get retire pools
     * @param owner
     * @param tokens
     * @param contractId
     * @param pageIndex
     * @param pageSize
     * @returns Retire pools and count
     */
    public async getRetirePools(
        owner: string,
        tokens?: string[],
        contractId?: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IRetirePool, number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_POOLS, {
            owner,
            contractId,
            pageIndex,
            pageSize,
            tokens,
        });
    }

    /**
     * Clear retire requests
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async clearRetireRequests(
        owner: string,
        id: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_RETIRE_REQUESTS, {
            owner,
            id,
        });
    }

    /**
     * Clear retire pools
     * @param owner
     * @param id
     * @returns Operation successful
     */
    public async clearRetirePools(owner: string, id: string): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CLEAR_RETIRE_POOLS, {
            owner,
            id,
        });
    }

    /**
     * Set retire pool
     * @param owner
     * @param id
     * @param options
     * @returns Pool
     */
    public async setRetirePool(
        owner: string,
        id: string,
        options: { tokens: RetireTokenPool[]; immediately: boolean }
    ): Promise<IRetirePool> {
        return await this.sendMessage(ContractAPI.SET_RETIRE_POOLS, {
            owner,
            id,
            options,
        });
    }

    /**
     * Unset retire pool
     * @param owner
     * @param poolId
     * @returns Operation successful
     */
    public async unsetRetirePool(
        owner: string,
        poolId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.UNSET_RETIRE_POOLS, {
            owner,
            poolId,
        });
    }

    /**
     * Unset retire request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async unsetRetireRequest(
        owner: string,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.UNSET_RETIRE_REQUEST, {
            owner,
            requestId,
        });
    }

    /**
     * Retire tokens
     * @param did
     * @param poolId
     * @param tokens
     * @returns Tokens retired
     */
    public async retire(
        did: string,
        poolId: string,
        tokens: RetireTokenRequest[]
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.RETIRE, {
            did,
            poolId,
            tokens,
        });
    }

    /**
     * Approve retire request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async approveRetire(
        owner: string,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.APPROVE_RETIRE, {
            owner,
            requestId,
        });
    }

    /**
     * Cancel retire request
     * @param owner
     * @param requestId
     * @returns Operation successful
     */
    public async cancelRetire(
        owner: string,
        requestId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.CANCEL_RETIRE, {
            owner,
            requestId,
        });
    }

    /**
     * Add retire admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async addRetireAdmin(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.ADD_RETIRE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Remove retire admin
     * @param owner
     * @param id
     * @param hederaId
     * @returns Operation successful
     */
    public async removeRetireAdmin(
        owner: string,
        id: string,
        hederaId: string
    ): Promise<boolean> {
        return await this.sendMessage(ContractAPI.REMOVE_RETIRE_ADMIN, {
            owner,
            id,
            hederaId,
        });
    }

    /**
     * Get retire VCs
     * @param owner
     * @param pageIndex
     * @param pageSize
     * @returns Retire VCs and count
     */
    public async getRetireVCs(
        owner: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<[IVCDocument, number]> {
        return await this.sendMessage(ContractAPI.GET_RETIRE_VCS, {
            owner,
            pageIndex,
            pageSize,
        });
    }

    //#endregion

    /**
     * Create Module
     * @param module
     * @param owner
     * @returns module
     */
    public async createModule(module: any, owner: string): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_MODULE, { module, owner });
    }

    /**
     * Return modules
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getModule(params?: IFilter): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_MODULES, params);
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteModule(uuid: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_MODULES, { uuid, owner });
    }

    /**
     * Return modules
     * @param owner
     * @returns modules
     */
    public async getMenuModule(owner: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_MENU_MODULES, { owner });
    }

    /**
     * Update modules
     * @param uuid
     * @param module
     * @param owner
     * @returns module
     */
    public async updateModule(
        uuid: string,
        module: any,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_MODULES, { uuid, module, owner });
    }

    /**
     * Delete module
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async getModuleById(uuid: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.GET_MODULE, { uuid, owner });
    }

    /**
     * Get module export file
     * @param uuid
     * @param owner
     */
    public async exportModuleFile(uuid: string, owner: string) {
        const file = await this.sendMessage(MessageAPI.MODULE_EXPORT_FILE, { uuid, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get module export message id
     * @param uuid
     * @param owner
     */
    public async exportModuleMessage(uuid: string, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_EXPORT_MESSAGE, { uuid, owner });
    }

    /**
     * Load module file for import
     * @param zip
     * @param owner
     */
    public async importModuleFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE, { zip, owner });
    }

    /**
     * Import module from message
     * @param messageId
     * @param owner
     */
    public async importModuleMessage(messageId: string, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE, { messageId, owner });
    }

    /**
     * Get module info from file
     * @param zip
     * @param owner
     */
    public async previewModuleFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_FILE_PREVIEW, { zip, owner });
    }

    /**
     * Get module info from message
     * @param messageId
     * @param owner
     */
    public async previewModuleMessage(messageId: string, owner: string) {
        return await this.sendMessage(MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW, { messageId, owner });
    }

    /**
     * Publish module
     * @param uuid
     * @param owner
     * @param module
     */
    public async publishModule(uuid: string, owner: string, module: any) {
        return await this.sendMessage(MessageAPI.PUBLISH_MODULES, { uuid, owner, module });
    }

    /**
     * Publish module
     * @param owner
     * @param module
     */
    public async validateModule(owner: string, module: any) {
        return await this.sendMessage(MessageAPI.VALIDATE_MODULES, { owner, module });
    }

    /**
     * Create tool
     * @param tool
     * @param owner
     * @returns tool
     */
    public async createTool(tool: any, owner: string): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_TOOL, { tool, owner });
    }

    /**
     * Create tool
     * @param tool
     * @param owner
     * @param task
     * @returns tool
     */
    public async createToolAsync(tool: any, owner: string, task: NewTask): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_TOOL_ASYNC, { tool, owner, task });
    }

    /**
     * Return tools
     *
     * @param {IFilter} [params]
     *
     * @returns {ResponseAndCount<any>}
     */
    public async getTools(params?: IFilter): Promise<ResponseAndCount<any>> {
        return await this.sendMessage(MessageAPI.GET_TOOLS, params);
    }

    /**
     * Delete tool
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async deleteTool(id: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_TOOL, { id, owner });
    }

    /**
     * Delete tool
     * @param id
     * @param owner
     * @returns Operation Success
     */
    public async getToolById(id: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.GET_TOOL, { id, owner });
    }

    /**
     * Update tool
     * @param id
     * @param tool
     * @param owner
     * @returns tool
     */
    public async updateTool(
        id: string,
        tool: any,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_TOOL, { id, tool, owner });
    }

    /**
     * Publish tool
     * @param id
     * @param owner
     * @param tool
     */
    public async publishTool(id: string, owner: string, tool: any) {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL, { id, owner, tool });
    }

    /**
     * Async Publish tool
     * @param id
     * @param owner
     * @param tool
     * @param task
     */
    public async publishToolAsync(id: string, owner: string, tool: any, task: NewTask) {
        return await this.sendMessage(MessageAPI.PUBLISH_TOOL_ASYNC, { id, owner, tool, task });
    }

    /**
     * Publish tool
     * @param owner
     * @param tool
     */
    public async validateTool(owner: string, tool: any) {
        return await this.sendMessage(MessageAPI.VALIDATE_TOOL, { owner, tool });
    }

    /**
     * Return tools
     * @param owner
     * @returns tools
     */
    public async getMenuTool(owner: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_MENU_TOOLS, { owner });
    }

    /**
     * Get tool export file
     * @param id
     * @param owner
     */
    public async exportToolFile(id: string, owner: string) {
        const file = await this.sendMessage(MessageAPI.TOOL_EXPORT_FILE, { id, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Get tool export message id
     * @param id
     * @param owner
     */
    public async exportToolMessage(id: string, owner: string) {
        return await this.sendMessage(MessageAPI.TOOL_EXPORT_MESSAGE, { id, owner });
    }

    /**
     * Load tool file for import
     * @param zip
     * @param owner
     */
    public async importToolFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE, { zip, owner });
    }

    /**
     * Import tool from message
     * @param messageId
     * @param owner
     */
    public async importToolMessage(messageId: string, owner: string) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE, { messageId, owner });
    }

    /**
     * Get tool info from file
     * @param zip
     * @param owner
     */
    public async previewToolFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE_PREVIEW, { zip, owner });
    }

    /**
     * Get tool info from message
     * @param messageId
     * @param owner
     */
    public async previewToolMessage(messageId: string, owner: string) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE_PREVIEW, { messageId, owner });
    }

    /**
     * Load tool file for import
     * @param zip
     * @param owner
     * @param task
     */
    public async importToolFileAsync(zip: any, owner: string, task: NewTask) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_FILE_ASYNC, { zip, owner, task });
    }

    /**
     * Import tool from message
     * @param messageId
     * @param owner
     * @param task
     */
    public async importToolMessageAsync(messageId: string, owner: string, task: NewTask) {
        return await this.sendMessage(MessageAPI.TOOL_IMPORT_MESSAGE_ASYNC, { messageId, owner, task });
    }

    /**
     * Get map api key
     */
    public async getMapApiKey(): Promise<string> {
        return await this.sendMessage<string>(MessageAPI.GET_MAP_API_KEY);
    }

    /**
     * Create tag
     * @param tag
     * @param owner
     * @returns tag
     */
    public async createTag(tag: any, owner: string): Promise<any> {
        return await this.sendMessage<any>(MessageAPI.CREATE_TAG, { tag, owner });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async getTags(entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAGS, { entity, targets });
    }

    /**
     * Delete tag
     * @param uuid
     * @param owner
     * @returns Operation Success
     */
    public async deleteTag(uuid: string, owner: string): Promise<boolean> {
        return await this.sendMessage<any>(MessageAPI.DELETE_TAG, { uuid, owner });
    }

    /**
     * Export Tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async exportTags(entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.EXPORT_TAGS, { entity, targets });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async getTagCache(entity: string, targets: string[]): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_TAG_CACHE, { entity, targets });
    }

    /**
     * Return tags
     * @param entity
     * @param targets
     * @returns {any[]}
     */
    public async synchronizationTags(entity: string, target: string): Promise<any[]> {
        return await this.sendMessage<any>(MessageAPI.GET_SYNCHRONIZATION_TAGS, { entity, target });
    }

    /**
     * Return tag schemas
     * @param {string} owner
     * @param {string} [pageIndex]
     * @param {string} [pageSize]
     *
     * @returns {ISchema[]} - all schemas
     */
    public async getTagSchemas(
        owner: string,
        pageIndex?: any,
        pageSize?: any
    ): Promise<ResponseAndCount<ISchema>> {
        return await this.sendMessage(MessageAPI.GET_TAG_SCHEMAS, {
            owner,
            pageIndex,
            pageSize
        });
    }

    /**
     * Create tag schema
     *
     * @param {ISchema} item - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    public async createTagSchema(item: ISchema | any): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.CREATE_TAG_SCHEMA, item);
    }

    /**
     * Changing the status of a schema on PUBLISHED.
     *
     * @param {string} id - schema id
     * @param {string} version - schema version
     * @param {string} owner - schema message
     *
     * @returns {ISchema} - message
     */
    public async publishTagSchema(id: string, version: string, owner: string): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.PUBLISH_TAG_SCHEMA, { id, version, owner });
    }

    /**
     * Return published schemas
     *
     * @returns {ISchema[]} - schemas
     */
    public async getPublishedTagSchemas(): Promise<ISchema> {
        return await this.sendMessage(MessageAPI.GET_PUBLISHED_TAG_SCHEMAS);
    }

    /**
     * Create Theme
     * @param theme
     * @param owner
     * @returns theme
     */
    public async createTheme(theme: any, owner: string): Promise<any> {
        return await this.sendMessage(MessageAPI.CREATE_THEME, { theme, owner });
    }

    /**
     * Update Theme
     * @param themeId
     * @param theme
     * @param owner
     * @returns theme
     */
    public async updateTheme(
        themeId: string,
        theme: any,
        owner: string
    ): Promise<any> {
        return await this.sendMessage(MessageAPI.UPDATE_THEME, { themeId, theme, owner });
    }

    /**
     * Get themes
     * @param owner
     * @returns themes
     */
    public async getThemes(owner: string): Promise<any[]> {
        return await this.sendMessage(MessageAPI.GET_THEMES, { owner });
    }

    /**
     * Get theme by id
     * @param themeId
     * @returns theme
     */
    public async getThemeById(themeId: string): Promise<any> {
        return await this.sendMessage(MessageAPI.GET_THEME, { themeId });
    }

    /**
     * Delete theme
     * @param themeId
     * @param owner
     * @returns Operation Success
     */
    public async deleteTheme(themeId: string, owner: string): Promise<boolean> {
        return await this.sendMessage(MessageAPI.DELETE_THEME, { themeId, owner });
    }

    /**
     * Load theme file for import
     * @param zip
     * @param owner
     */
    public async importThemeFile(zip: any, owner: string) {
        return await this.sendMessage(MessageAPI.THEME_IMPORT_FILE, { zip, owner });
    }

    /**
     * Get theme export file
     * @param uuid
     * @param owner
     */
    public async exportThemeFile(themeId: string, owner: string) {
        const file = await this.sendMessage(MessageAPI.THEME_EXPORT_FILE, { themeId, owner }) as any;
        return Buffer.from(file, 'base64');
    }

    /**
     * Create policy by wizard
     * @param config Config
     * @returns Config
     */
    // tslint:disable-next-line:completed-docs
    public async wizardPolicyCreate(config: any, owner: string): Promise<{ wizardConfig: any; policyId: string; }> {
        return await this.sendMessage(MessageAPI.WIZARD_POLICY_CREATE, {
            owner,
            config,
        });
    }

    /**
     * Create policy by wizard
     * @param config Config
     * @param owner Owner
     * @param task Task
     * @returns Config
     */
    public async wizardPolicyCreateAsync(config: any, owner: string, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.WIZARD_POLICY_CREATE_ASYNC, {
            owner,
            config,
            task,
        });
    }

    /**
     * Create policy by wizard
     * @param config Config
     * @param owner Owner
     * @param task Task
     * @returns Config
     */
    public async wizardPolicyCreateAsyncNew(config: any, owner: string, saveState: boolean, task: NewTask): Promise<NewTask> {
        return await this.sendMessage(MessageAPI.WIZARD_POLICY_CREATE_ASYNC, {
            owner,
            config,
            saveState,
            task,
        });
    }

    /**
     * Get new policy config
     * @param policyId Policy Identifier
     * @param config Config
     * @returns Config
     */
    // tslint:disable-next-line:completed-docs
    public async wizardGetPolicyConfig(policyId: string, config: any, owner: string): Promise<{ wizardConfig: any; policyConfig: any; }> {
        return await this.sendMessage(MessageAPI.WIZARD_GET_POLICY_CONFIG, {
            policyId,
            config,
            owner,
        });
    }

    /**
     * Async create new branding json file
     * @param config Branding JSON string
     * @returns Branding JSON string
     */
    public async setBranding(config: string): Promise<any> {
        return await this.sendMessage(MessageAPI.STORE_BRANDING, { config });
    }

    /**
     * Gets the branding JSON.
     * @returns A Promise that resolves to an object containing the branding configuration,
     *          or null if the branding is not available.
     */
    // tslint:disable-next-line:completed-docs
    public async getBranding(): Promise<{ config: string } | null> {
        return await this.sendMessage(MessageAPI.GET_BRANDING);
    }

    /**
     * Policy suggestions
     * @param suggestionsInput
     */
    public async policySuggestions(
        suggestionsInput: any,
        user: any
    ): Promise<{ next: string, nested: string }> {
        return await this.sendMessage(MessageAPI.SUGGESTIONS, {
            user,
            suggestionsInput,
        });
    }

    /**
     * Set policy suggestions
     * @param suggestionsInput
     */
    public async setPolicySuggestionsConfig(
        items: SuggestionsOrderPriority[],
        user: any
    ): Promise<SuggestionsOrderPriority[]> {
        return await this.sendMessage(
            MessageAPI.SET_SUGGESTIONS_CONFIG,
            { items, user }
        );
    }

    /**
     * Policy suggestions
     * @param suggestionsInput
     */
    public async getPolicySuggestionsConfig(
        user: any
    ): Promise<SuggestionsOrderPriority[]> {
        return await this.sendMessage(
            MessageAPI.GET_SUGGESTIONS_CONFIG,
            { user }
        );
    }

    /**
     * Search same blocks
     * @param config
     * @param blockId
     * @param user
     */
    public async searchBlocks(
        config: any,
        blockId: string,
        user: any
    ): Promise<any[]> {
        return await this.sendMessage(MessageAPI.SEARCH_BLOCKS, { config, blockId, user });
    }
}
