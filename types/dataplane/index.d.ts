export class PutObjectCommand extends MedoroDataplaneCommand {
    /**
     * @param {object} params
     * @param {string} params.key - The key (path) for the request.
     * @param {import('../lib/schemas').ApiPutRequestValidationPolicy} params.policy - The validation policy for the request.
     * @param {Blob | ArrayBuffer | string} [params.content] - The content of the object.
     */
    constructor({ key, policy, content }: {
        key: string;
        policy: import("../lib/schemas").ApiPutRequestValidationPolicy;
        content?: string | Blob | ArrayBuffer | undefined;
    });
    get policy(): {
        apiPutV1: {
            conditions: Record<string, string | number | {
                startsWith: string;
            } | {
                endsWith: string;
            } | {
                lte: number;
            } | {
                gte: number;
            } | {
                oneOf: (string | number)[];
            } | {
                range: [number, number];
            }>;
            accessControl: "public" | "private";
        };
    };
    get content(): string | Blob | ArrayBuffer | undefined;
    #private;
}
export class GetObjectCommand extends MedoroDataplaneCommand {
    /**
     * @param {object} params
     * @param {string} params.key - The key (path) for the request.
     */
    constructor({ key }: {
        key: string;
    });
}
export class DeleteObjectCommand extends MedoroDataplaneCommand {
    /**
     * @param {object} params
     * @param {string} params.key - The key (path) for the request.
     */
    constructor({ key }: {
        key: string;
    });
}
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
     * @param {object} params
     * @param {MedoroDataplaneCommand} params.command - The Command object to sign.
     * @param {number} [params.expiresInSeconds] - The number of seconds until the signature expires.
     * @returns {Promise<Result<{ signedUrl: URL }, MedoroDataplaneClientError>>}
     */
    createSignedUrl({ command, expiresInSeconds }: {
        command: MedoroDataplaneCommand;
        expiresInSeconds?: number | undefined;
    }): Promise<Result<{
        signedUrl: URL;
    }, MedoroDataplaneClientError>>;
    /**
     * Parses a JSON response from the Medoro API, handling success and error formats.
     * @private
     * @template T - The expected type of the success data.
     * @param {Response} response - The fetch API Response object.
     * @returns {Promise<Result<{ success: true; data: T; }, MedoroDataplaneClientError>>}
     */
    private parseJsonResponse;
    /**
     * Sends a Command to Medoro.
     * @param {object} params - The parameters for the request.
     * @param {MedoroDataplaneCommand} params.command - The Command object to send.
     * @returns {Promise<Result<Response, MedoroDataplaneClientError>>}
     */
    send({ command }: {
        command: MedoroDataplaneCommand;
    }): Promise<Result<Response, MedoroDataplaneClientError>>;
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
declare class MedoroDataplaneCommand {
    /**
     * @param {object} params
     * @param {'PUT' | 'GET' | 'DELETE'} params.method - The HTTP method for the request.
     * @param {Headers} [params.headers] - The headers for the request.
     * @param {string} params.key - The key (path) for the request.
     */
    constructor({ method, headers, key }: {
        method: "PUT" | "GET" | "DELETE";
        headers?: Headers | undefined;
        key: string;
    });
    get method(): "PUT" | "GET" | "DELETE";
    get key(): string;
    get headers(): Headers;
    #private;
}
import { Result } from 'neverthrow';
export {};
