import { CheckResult, GenerateUUIDv4, Schema, SchemaHelper, removeObjectProperties } from '@guardian/interfaces';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, StateField } from '@policy-engine/helpers/decorators';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyRequestBlock, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { EventBlock } from '@policy-engine/helpers/decorators/event-block';
import {
    VcDocument as VcDocumentCollection,
    DIDDocument,
    DIDMessage,
    MessageAction,
    MessageServer,
    KeyType,
    VcHelper,
} from '@guardian/common';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import deepEqual from 'deep-equal';

/**
 * Request VC document block
 */
@EventBlock({
    blockType: 'requestVcDocumentBlock',
    commonBlock: false,
    about: {
        label: 'Request',
        title: `Add 'Request' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
            PolicyInputEventType.RestoreEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class RequestVcDocumentBlock {
    /**
     * Block state
     */
    @StateField()
    public readonly state: { [key: string]: any } = { active: true };

    /**
     * Schema
     * @private
     */
    private _schema: Schema;

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        const schemaIRI = ref.options.schema;
        if (!schemaIRI) {
            throw new BlockActionError(
                `Schema IRI is empty`,
                ref.blockType,
                ref.uuid
            );
        }
        const schema = await PolicyUtils.loadSchemaByID(ref, schemaIRI);
        if (!schema) {
            throw new BlockActionError(
                `Can not find schema with IRI: ${schemaIRI}`,
                ref.blockType,
                ref.uuid
            );
        }
        this._schema = new Schema(schema);
    }

    /**
     * Get Validators
     */
    protected getValidators(): IPolicyValidatorBlock[] {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const validators: IPolicyValidatorBlock[] = [];
        for (const child of ref.children) {
            if (child.blockClassName === 'ValidatorBlock') {
                validators.push(child as IPolicyValidatorBlock);
            }
        }
        return validators;
    }

    /**
     * Validate Documents
     * @param user
     * @param state
     */
    protected async validateDocuments(
        user: IPolicyUser,
        state: IPolicyEventState
    ): Promise<string> {
        const validators = this.getValidators();
        for (const validator of validators) {
            const error = await validator.run({
                type: null,
                inputType: null,
                outputType: null,
                policyId: null,
                source: null,
                sourceId: null,
                target: null,
                targetId: null,
                user,
                data: state
            });
            if (error) {
                return error;
            }
        }
        return null;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        const sources = await ref.getSources(user);
        const restoreData = this.state[user.id] && this.state[user.id].restoreData;

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            schema: this._schema,
            presetSchema: options.presetSchema,
            presetFields: options.presetFields,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || [],
            data: sources && sources.length && sources[0] || null,
            restoreData
        };
    }

    /**
     * Get Relationships
     * @param ref
     * @param refId
     */
    private async getRelationships(ref: AnyBlockType, refId: any): Promise<VcDocumentCollection> {
        try {
            return await PolicyUtils.getRelationships(ref, ref.policyId, refId);
        } catch (error) {
            ref.error(PolicyUtils.getErrorMessage(error));
            throw new BlockActionError('Invalid relationships', ref.blockType, ref.uuid);
        }
    }

    /**
     * Set block data
     * @param user
     * @param _data
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async setData(user: IPolicyUser, _data: IPolicyDocument): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        ref.log(`setData`);

        if (this.state.hasOwnProperty(user.id)) {
            delete this.state[user.id].restoreData;
        }

        if (!user.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        try {
            const document = _data.document;
            const documentRef = await this.getRelationships(ref, _data.ref);
            const presetCheck = await this.checkPreset(ref, document, documentRef)
            if (!presetCheck.valid) {
                throw new BlockActionError(
                    JSON.stringify(presetCheck.error),
                    ref.blockType,
                    ref.uuid
                );
            }

            SchemaHelper.updateObjectContext(this._schema, document);

            const _vcHelper = new VcHelper();
            const idType = ref.options.idType;
            const hederaAccount = await PolicyUtils.getHederaAccount(ref, user.did);
            const id = await this.generateId(
                idType, user, hederaAccount.hederaAccountId, hederaAccount.hederaAccountKey
            );
            const credentialSubject = document;
            credentialSubject.policyId = ref.policyId;
            if (id) {
                credentialSubject.id = id;
            }
            if (documentRef) {
                credentialSubject.ref = PolicyUtils.getSubjectId(documentRef);
            }
            if (ref.dryRun) {
                _vcHelper.addDryRunContext(credentialSubject);
            }

            const res = await _vcHelper.verifySubject(credentialSubject);
            if (!res.ok) {
                throw new BlockActionError(JSON.stringify(res.error), ref.blockType, ref.uuid);
            }

            const groupContext = await PolicyUtils.getGroupContext(ref, user);
            const vc = await _vcHelper.createVC(
                user.did,
                hederaAccount.hederaAccountKey,
                credentialSubject,
                groupContext
            );
            let item = PolicyUtils.createVC(ref, user, vc);
            const accounts = PolicyUtils.getHederaAccounts(
                vc,
                hederaAccount.hederaAccountId,
                this._schema
            );
            const schemaIRI = ref.options.schema;
            item.type = schemaIRI;
            item.schema = schemaIRI;
            item.accounts = accounts;
            item = PolicyUtils.setDocumentRef(item, documentRef);

            const state: IPolicyEventState = { data: item };
            const error = await this.validateDocuments(user, state);
            if (error) {
                throw new BlockActionError(error, ref.blockType, ref.uuid);
            }

            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);

            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                documents: ExternalDocuments(item)
            }));

            return item;
        } catch (error) {
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Save data to restore
     * @param event Event
     * @returns
     */
    @ActionCallback({
        type: PolicyInputEventType.RestoreEvent
    })
    async restoreAction(event: IPolicyEvent<IPolicyEventState>) {
        const user = event?.user;
        const vcDocument = event?.data?.data;
        if (!vcDocument || !user) {
            return;
        }
        let blockState: any;
        if (!this.state.hasOwnProperty(user.id)) {
            blockState = {};
            this.state[user.id] = blockState;
        } else {
            blockState = this.state[user.id];
        }
        blockState.restoreData = vcDocument;
    }

    /**
     * Generate id
     * @param idType
     * @param user
     * @param userHederaAccount
     * @param userHederaKey
     */
    async generateId(idType: string, user: IPolicyUser, userHederaAccount: string, userHederaKey: string): Promise<string | undefined> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (idType === 'UUID') {
                return GenerateUUIDv4();
            }
            if (idType === 'DID') {
                const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null);

                const didObject = await DIDDocument.create(null, topic.topicId);
                const did = didObject.getDid();
                const key = didObject.getPrivateKeyString();

                const message = new DIDMessage(MessageAction.CreateDID);
                message.setDocument(didObject);

                const client = new MessageServer(userHederaAccount, userHederaKey, ref.dryRun);
                const messageResult = await client
                    .setTopicObject(topic)
                    .sendMessage(message);

                const item = PolicyUtils.createDID(ref, user, didObject);
                item.messageId = messageResult.getId();
                item.topicId = messageResult.getTopicId();

                await ref.databaseServer.saveDid(item);

                await PolicyUtils.setAccountKey(ref, user.did, KeyType.KEY, did, key);
                return did;
            }
            if (idType === 'OWNER') {
                return user.did;
            }
            return undefined;
        } catch (error) {
            ref.error(`generateId: ${idType} : ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Check modified readonly fields
     * @param ref
     * @param document Current document
     * @param documentRef Preset document
     */
    private async checkPreset(
        ref: AnyBlockType,
        document: any,
        documentRef: VcDocumentCollection
    ): Promise<CheckResult> {
        if (
            ref.options.presetFields &&
            ref.options.presetFields.length &&
            ref.options.presetSchema
        ) {
            const readonly = ref.options.presetFields.filter(
                (item: any) => item.readonly && item.value
            );
            if (!readonly.length || !document || !documentRef) {
                return { valid: true };
            }

            const presetDocument =
                PolicyUtils.getCredentialSubject(documentRef);
            if (!presetDocument) {
                return {
                    error: 'Readonly preset fields can not be verified.',
                    valid: false,
                };
            }

            const presetDocumentCopy = removeObjectProperties(
                ['@context'],
                JSON.parse(JSON.stringify(presetDocument))
            );
            for (const field of readonly) {
                if (
                    !deepEqual(
                        document[field.name],
                        presetDocumentCopy[field.value]
                    )
                ) {
                    return {
                        error: `Readonly preset field (${field.name}) can not be modified.`,
                        valid: false,
                    };
                }
            }
        }

        return { valid: true };
    }
}
