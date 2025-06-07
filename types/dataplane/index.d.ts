/**
 * Configuration for the Medoro client.
 * @typedef {object} MedoroDataplaneClientConfig
 * @property {string} origin - The origin URL for the Medoro bucket (e.g., 'https://your-bucket.content-serve.com').
 * @property {CryptoKeyPair} [keyPair] - The Ed25519 CryptoKeyPair for signing requests. Required for authenticated operations.
 * @property {string} [keyId] - The ID of the public key associated with the keyPair. Required for authenticated operations.
 */
/**
 * @typedef {object} MedoroDataplaneClientError
 * @property {string} type - The category of the error (e.g., 'validation', 'access_denied', 'unknown').
 * @property {string} message - A human-readable message describing the error.
 * @property {string} [code] - An optional error code for programmatic handling.
 * @property {unknown} [context] - Optional additional context for the error.
 */
/**
 * Medoro JavaScript Client SDK.
 * Provides methods to interact with the Medoro storage service.
 */
export class MedoroDataplaneClient {
    /**
     * Creates an instance of MedoroClient.
     * @param {object} config - The client configuration.
     * @param {string} config.origin - The base URL for Medoro operations.
     * @param {CryptoKey} config.privateKey - The private key for signing requests.
     * @param {string} config.keyId - The ID associated with the private key.
     */
    constructor({ origin, privateKey, keyId }: {
        origin: string;
        privateKey: CryptoKey;
        keyId: string;
    });
    /**
     * Signs a request with the provided key pair using http-msg-sig and returns the signed URL.
     * @private
     * @param {object} params
     * @param {{ method: string, headers: Headers, url: URL }} params.requestParams - The Request object to sign.
     * @param {(string|{component: '@query-param', parameters: { name: string }})[]} params.signatureInputs - Array of signature components (e.g., ['@method', '@path']).
     * @returns {Promise<Result<{ signedUrl: URL }, MedoroDataplaneClientError>>}
     */
    private createSignedUrl;
    /**
     * Parses a JSON response from the Medoro API, handling success and error formats.
     * @private
     * @template T - The expected type of the success data.
     * @param {Response} response - The fetch API Response object.
     * @returns {Promise<Result<{ success: true; data: T; }, MedoroDataplaneClientError>>}
     */
    private parseJsonResponse;
    /**
     * Uploads an object to Medoro.
     * @param {object} params - The parameters for the object upload.
     * @param {string} params.key - The key (path) for the object.
     * @param {Blob | ArrayBuffer | string} params.content - The content of the object.
     * @param {import('../lib/schemas').ApiPutRequestValidationPolicy} params.policy - The validation policy for the PUT request.
     * @returns {Promise<Result<{ key: string, bucket: string, accessControl: string, message: string }, MedoroDataplaneClientError>>}
     */
    putObject({ key, content, policy }: {
        key: string;
        content: Blob | ArrayBuffer | string;
        policy: import("../lib/schemas").ApiPutRequestValidationPolicy;
    }): Promise<Result<{
        key: string;
        bucket: string;
        accessControl: string;
        message: string;
    }, MedoroDataplaneClientError>>;
    /**
     * Retrieves an object from Medoro.
     * @param {object} params - The parameters for retrieving the object.
     * @param {string} params.key - The key (path) of the object to retrieve.
     * @returns {Promise<Result<Response, MedoroDataplaneClientError>>}
     */
    getObject({ key }: {
        key: string;
    }): Promise<Result<Response, MedoroDataplaneClientError>>;
    /**
     * Deletes an object from Medoro.
     * @param {object} params - The parameters for deleting the object.
     * @param {string} params.key - The key (path) of the object to delete.
     * @returns {Promise<Result<{ key: string, bucket: string, message: string }, MedoroDataplaneClientError>>}
     */
    deleteObject({ key }: {
        key: string;
    }): Promise<Result<{
        key: string;
        bucket: string;
        message: string;
    }, MedoroDataplaneClientError>>;
    #private;
}
/**
 * Configuration for the Medoro client.
 */
export type MedoroDataplaneClientConfig = {
    /**
     * - The origin URL for the Medoro bucket (e.g., 'https://your-bucket.content-serve.com').
     */
    origin: string;
    /**
     * - The Ed25519 CryptoKeyPair for signing requests. Required for authenticated operations.
     */
    keyPair?: CryptoKeyPair | undefined;
    /**
     * - The ID of the public key associated with the keyPair. Required for authenticated operations.
     */
    keyId?: string | undefined;
};
export type MedoroDataplaneClientError = {
    /**
     * - The category of the error (e.g., 'validation', 'access_denied', 'unknown').
     */
    type: string;
    /**
     * - A human-readable message describing the error.
     */
    message: string;
    /**
     * - An optional error code for programmatic handling.
     */
    code?: string | undefined;
    /**
     * - Optional additional context for the error.
     */
    context?: unknown;
};
import { Result } from 'neverthrow';
