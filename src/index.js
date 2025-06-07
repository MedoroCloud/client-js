import { Result, ResultAsync, ok, err } from 'neverthrow';
import { createSignatureForRequest as createSignatureFromHttpMsgSig } from 'http-msg-sig';
import { z } from 'zod/v4';

// Schema for success responses
const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any()
});

// Schema for error responses
const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    type: z.string(),
    message: z.string(),
    details: z.any().optional()
  })
});

// Combined schema for both response types
const ApiResponseSchema = z.discriminatedUnion('success', [
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema
]);

/**
 * Represents the structure of the API PUT request validation policy.
 * @typedef {object} ApiPutRequestValidationPolicy
 * @property {object} apiPutV1
 * @property {object} apiPutV1.conditions - Conditions for the PUT request.
 * @property {object} [apiPutV1.conditions.content_length] - Content length conditions.
 * @property {number} [apiPutV1.conditions.content_length.lte] - Max content length.
 * @property {string} [apiPutV1.conditions.content_type] - Expected content type.
 * @property {'public' | 'private'} apiPutV1.accessControl - Access control for the object.
 */

/**
 * Configuration for the Medoro client.
 * @typedef {object} MedoroClientConfig
 * @property {string} origin - The origin URL for the Medoro bucket (e.g., 'https://your-bucket.content-serve.com').
 * @property {CryptoKeyPair} [keyPair] - The Ed25519 CryptoKeyPair for signing requests. Required for authenticated operations.
 * @property {string} [keyId] - The ID of the public key associated with the keyPair. Required for authenticated operations.
 */

/**
 * @typedef {object} MedoroClientError
 * @property {string} type - The category of the error (e.g., 'validation', 'access_denied', 'unknown').
 * @property {string} message - A human-readable message describing the error.
 * @property {string} [code] - An optional error code for programmatic handling.
 * @property {unknown} [context] - Optional additional context for the error.
 */

/**
 * Medoro JavaScript Client SDK.
 * Provides methods to interact with the Medoro storage service.
 */
export class MedoroClient {
  /**
   * @type {string}
   */
  #origin;
  /**
   * @type {CryptoKey}
   */
  #privateKey;
  /**
   * @type {string}
   */
  #keyId;

  /**
   * Creates an instance of MedoroClient.
   * @param {object} config - The client configuration.
   * @param {string} config.origin - The base URL for Medoro operations.
   * @param {CryptoKey} config.privateKey - The private key for signing requests.
   * @param {string} config.keyId - The ID associated with the private key.
   */
  constructor({ origin, privateKey, keyId }) {
    this.#origin = origin;
    this.#privateKey = privateKey;
    this.#keyId = keyId;
  }

  /**
   * Helper to convert a base64 string to a Uint8Array.
   * @param {string} base64 - The base64 string.
   * @returns {Uint8Array}
   */
  base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Helper to convert a Uint8Array to a base64 string.
   * @param {Uint8Array} uint8Array - The Uint8Array.
   * @returns {string}
   */
  uint8ArrayToBase64(uint8Array) {
    return btoa(String.fromCharCode(...uint8Array));
  }

  /**
   * Signs a request with the provided key pair using http-msg-sig.
   * @private
   * @param {object} params
   * @param {Request} params.request - The Request object to sign.
   * @param {URL} params.url - The URL object to sign.
   * @param {(string|{component: '@query-param', parameters: { name: string }})[]} params.signatureInputs - Array of signature components (e.g., ['@method', '@path']).
   * @returns {Promise<Result<Request, MedoroClientError>>}
   */
  async authenticateRequest({ request, url, signatureInputs }) {
    const processedRequest = { ...request, url };

    const result = await createSignatureFromHttpMsgSig({
      signatureInputs,
      signatureLabel: 'medoro',
      additionalParams: { keyid: this.#keyId, alg: 'ed25519', created: Math.floor(Date.now() / 1000) },
      request: processedRequest,
      sign: async ({ signatureBase, ok, err }) => {
        const signatureResult = await ResultAsync.fromPromise(
          crypto.subtle.sign(
            { name: 'Ed25519' },
            this.#privateKey,
            new TextEncoder().encode(signatureBase),
          ),
          (e) => ({
            type: 'signature_error',
            message: `Failed to sign request: ${e instanceof Error ? e.message : String(e)}`,
          }),
        );

        if (signatureResult.isOk()) {
          return ok(signatureResult.value);
        } else {
          return err(signatureResult.error);
        }
      },
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const { signatureInput, signature } = result.value;
    url.searchParams.set('x-medoro-signature-input', signatureInput);
    url.searchParams.set('x-medoro-signature', signature);

    return ok(new Request(url, request));
  }

  /**
   * Parses a JSON response from the Medoro API, handling success and error formats.
   * @private
   * @template T - The expected type of the success data.
   * @param {Response} response - The fetch API Response object.
   * @returns {Promise<Result<{ success: true; data: T; }, MedoroClientError>>}
   */
  async parseJsonResponse(response) {
    const responseJsonResult = await ResultAsync.fromPromise(
      response.json(),
      (e) => ({
        type: 'json_parse_error',
        message: `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`,
        context: { status: response.status, statusText: response.statusText },
      }),
    );
    if (responseJsonResult.isErr()) {
      return err(responseJsonResult.error);
    }

    const rawData = responseJsonResult.value;
    // Validate and parse the JSON data according to our schema
    const parseResult = await ResultAsync.fromPromise(
      ApiResponseSchema.parseAsync(rawData),
      (e) => ({
        type: 'validation_error',
        message: `API response validation failed: ${e instanceof Error ? e.message : String(e)}`,
        context: { issues: e instanceof z.ZodError ? e.issues : undefined, rawData },
      }),
    );

    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const validatedData = parseResult.value;
    if (validatedData.success) {
      return ok({ success: true, data: validatedData.data });
    } else {
      return err(validatedData.error);
    }
  }

  /**
   * Uploads an object to Medoro.
   * @param {object} params - The parameters for the object upload.
   * @param {string} params.key - The key (path) for the object.
   * @param {Blob | ArrayBuffer | string} params.content - The content of the object.
   * @param {ApiPutRequestValidationPolicy} params.policy - The validation policy for the PUT request.
   * @returns {Promise<Result<{ key: string, bucket: string, accessControl: string, message: string }, MedoroClientError>>}
   */
  async putObject({ key, content, policy }) {
    const policyBase64 = btoa(JSON.stringify(policy));

    const headers = new Headers();
    if (typeof content === 'string') {
      headers.set('Content-Type', 'text/plain');
    } else if (content instanceof Blob) {
      headers.set('Content-Type', content.type || 'application/octet-stream');
    } else { // ArrayBuffer
      headers.set('Content-Type', 'application/octet-stream');
    }

    const requestUrl = new URL(key, this.#origin);
    requestUrl.searchParams.append('x-medoro-policy', policyBase64);
    const request = new Request(requestUrl, {
      method: 'PUT',
      headers: headers,
      body: content,
    });

    const resultOfAuthenticatedRequest = await this.authenticateRequest({
      request,
      url: requestUrl,
      signatureInputs: ['@method', '@scheme', '@authority', '@path', { component: '@query-param', parameters: { name: 'x-medoro-policy' } }],
    });
    if (resultOfAuthenticatedRequest.isErr()) {
      return err({
        type: 'signature_error',
        message: resultOfAuthenticatedRequest.error.message,
        code: resultOfAuthenticatedRequest.error.code,
        context: resultOfAuthenticatedRequest.error.context,
      })
    }

    const resultOfResponse = await ResultAsync.fromPromise(
      fetch(resultOfAuthenticatedRequest.value),
      (e) => ({
        type: 'network_error',
        message: `Network error during PUT: ${e instanceof Error ? e.message : String(e)}`,
      })
    );
    if (resultOfResponse.isErr()) {
      return err(resultOfResponse.error);
    }

    const parseResult = await this.parseJsonResponse(resultOfResponse.value);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    return ok(parseResult.value.data);
  }

  /**
   * Retrieves an object from Medoro.
   * @param {object} params - The parameters for retrieving the object.
   * @param {string} params.key - The key (path) of the object to retrieve.
   * @returns {Promise<Result<Response, MedoroClientError>>}
   */
  async getObject({ key }) {
    const requestUrl = new URL(key, this.#origin);
    const request = new Request(requestUrl, { method: 'GET' });

    const resultOfAuthenticatedRequest = await this.authenticateRequest({
      request,
      url: requestUrl,
      signatureInputs: ['@method', '@scheme', '@authority', '@path'],
    });
    if (resultOfAuthenticatedRequest.isErr()) {
      return err(resultOfAuthenticatedRequest.error);
    }

    const resultOfResponse = await ResultAsync.fromPromise(
      fetch(resultOfAuthenticatedRequest.value),
      (e) => ({
        type: 'network_error',
        message: `Network error during GET: ${e instanceof Error ? e.message : String(e)}`,
      })
    );
    if (resultOfResponse.isErr()) {
      return err(resultOfResponse.error);
    }

    if (!resultOfResponse.value.ok) {
      const errorParseResult = await this.parseJsonResponse(resultOfResponse.value);
      if (errorParseResult.isErr()) {
        return err(errorParseResult.error);
      }

      return err({
        type: 'api_error',
        message: 'API returned a non-ok response',
        code: String(resultOfResponse.value.status),
        context: resultOfResponse.value.statusText,
      });
    }

    return ok(resultOfResponse.value);
  }

  /**
   * Deletes an object from Medoro.
   * @param {object} params - The parameters for deleting the object.
   * @param {string} params.key - The key (path) of the object to delete.
   * @returns {Promise<Result<{ key: string, bucket: string, message: string }, MedoroClientError>>}
   */
  async deleteObject({ key }) {
    const requestUrl = new URL(key, this.#origin);
    const request = new Request(requestUrl, { method: 'DELETE' });

    const resultOfAuthenticatedRequest = await this.authenticateRequest({
      request,
      url: requestUrl,
      signatureInputs: ['@method', '@scheme', '@authority', '@path'],
    });
    if (resultOfAuthenticatedRequest.isErr()) {
      return err(resultOfAuthenticatedRequest.error);
    }

    const resultOfResponse = await ResultAsync.fromPromise(
      fetch(resultOfAuthenticatedRequest.value),
      (e) => ({
        type: 'network_error',
        message: `Network error during DELETE: ${e instanceof Error ? e.message : String(e)}`,
      })
    );
    if (resultOfResponse.isErr()) {
      return err(resultOfResponse.error);
    }

    const responseParseResult = await this.parseJsonResponse(resultOfResponse.value);
    if (responseParseResult.isErr()) {
      return err(responseParseResult.error);
    }

    return ok(responseParseResult.value.data);
  }
}
