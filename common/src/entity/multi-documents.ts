import { BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { GenerateUUIDv4, IVC } from '@guardian/interfaces';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';

/**
 * MultiDocuments collection
 */
@Entity()
export class MultiDocuments extends BaseEntity {
    /**
     * Block UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Document Id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * User Id
     */
    @Property({ nullable: true })
    userId?: string;

    /**
     * (User DID)
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * username
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * group
     */
    @Property({ nullable: true })
    group?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * Document instance
     */
    @Property({ persist: false })
    document?: IVC;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Create document
     */
    @BeforeCreate()
    createDocument() {
        if (this.document) {
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.documentFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.document));
            fileStream.end();
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    updateDocument() {
        if (this.document) {
            if (this.documentFileId) {
                DataBaseHelper.gridFS
                    .delete(this.documentFileId)
                    .catch(console.error);
            }
            const fileStream = DataBaseHelper.gridFS.openUploadStream(
                GenerateUUIDv4()
            );
            this.documentFileId = fileStream.id;
            fileStream.write(JSON.stringify(this.document));
            fileStream.end();
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    async loadDocument() {
        if (this.documentFileId && !this.document) {
            const fileRS = DataBaseHelper.gridFS.openDownloadStream(
                this.documentFileId
            );
            const bufferArray = [];
            for await (const data of fileRS) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.document = JSON.parse(buffer.toString());
        }
    }
}
