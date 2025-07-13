import { Result, ResultAsync, ok, err } from 'neverthrow';
import { createSignatureForRequest } from 'http-msg-sig';
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

class MedoroDataplaneCommand {
  /**
   * @type {'PUT' | 'GET' | 'DELETE'}
   */
  #method;

  get method() {
    return this.#method;
  }

  /**
   * @type {string}
   */
  #key;

  get key() {
    return this.#key;
  }

  /**
   * @type {Headers}
   */
  #headers;

  get headers() {
    return this.#headers;
  }

  /**
   * @param {object} params
   * @param {'PUT' | 'GET' | 'DELETE'} params.method - The HTTP method for the request.
   * @param {Headers} [params.headers] - The headers for the request.
   * @param {string} params.key - The key (path) for the request.
   */
  constructor({ method, headers = new Headers(), key }) {
    this.#method = method;
    this.#key = key;
    this.#headers = headers;
  }
}

export class PutObjectCommand extends MedoroDataplaneCommand {
  /**
   * @type {import('../lib/schemas').ApiPutRequestValidationPolicy}
   */
  #policy;

  get policy() {
    return this.#policy;
  }

  /**
   * @type {Blob | ArrayBuffer | string | undefined}
   */
  #content;

  get content() {
    return this.#content;
  }

  /**
   * @param {object} params
   * @param {string} params.key - The key (path) for the request.
   * @param {import('../lib/schemas').ApiPutRequestValidationPolicy} params.policy - The validation policy for the request.
   * @param {Blob | ArrayBuffer | string} [params.content] - The content of the object.
   */
  constructor({ key, policy, content }) {
    super({ key, method: 'PUT' });
    this.#policy = policy;
    this.#content = content;
  }
}

export class GetObjectCommand extends MedoroDataplaneCommand {
  /**
   * @param {object} params
   * @param {string} params.key - The key (path) for the request.
   */
  constructor({ key }) {
    super({ key, method: 'GET' });
  }
}

export class DeleteObjectCommand extends MedoroDataplaneCommand {
  /**
   * @param {object} params
   * @param {string} params.key - The key (path) for the request.
   */
  constructor({ key }) {
    super({ key, method: 'DELETE' });
  }
}

/**
 * Medoro JavaScript Client SDK.
 * Provides methods to interact with the Medoro storage service.
 */
export class MedoroDataplaneClient {
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
   * Signs a request with the provided key pair using http-msg-sig and returns the signed URL.
   * @param {object} params
   * @param {MedoroDataplaneCommand} params.command - The Command object to sign.
   * @param {number} [params.expiresInSeconds] - The number of seconds until the signature expires.
   * @returns {Promise<Result<{ signedUrl: URL }, MedoroDataplaneClientError>>}
   */
  async createSignedUrl({ command, expiresInSeconds = 60 }) {
    if (expiresInSeconds < 10 || expiresInSeconds > 604800) {
      return err({
        type: 'validation',
        message: 'expiresInSeconds must be between 10 and 604800',
      });
    }

    const url = new URL(command.key, this.#origin);

    /** @type {(string | { component: '@query-param'; parameters: { name: string } })[]} */
    const signatureInputs = ['@method', '@scheme', '@authority', '@path'];
    if ('policy' in command) {
      signatureInputs.push({ component: '@query-param', parameters: { name: 'x-medoro-policy' } });
      url.searchParams.set('x-medoro-policy', btoa(JSON.stringify(command.policy)));
    }

    const resultOfSigning = await createSignatureForRequest({
      signatureInputs,
      signatureLabel: 'medoro',
      additionalParams: { keyid: this.#keyId, alg: 'ed25519', created: Math.floor(Date.now() / 1000), expires: Math.floor(Date.now() / 1000) + expiresInSeconds },
      request: {
        url,
        headers: command.headers,
        method: command.method,
      },
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
        }
        return err(signatureResult.error);
      },
    });

    if (resultOfSigning.isErr()) {
      return err(resultOfSigning.error);
    }

    const { signatureInput, signature } = resultOfSigning.value;
    const signedUrl = new URL(url);
    signedUrl.searchParams.set('x-medoro-signature-input', signatureInput);
    signedUrl.searchParams.set('x-medoro-signature', signature);

    return ok({ signedUrl, method: command.method });
  }

  /**
   * Parses a JSON response from the Medoro API, handling success and error formats.
   * @private
   * @template T - The expected type of the success data.
   * @param {Response} response - The fetch API Response object.
   * @returns {Promise<Result<{ success: true; data: T; }, MedoroDataplaneClientError>>}
   */
  async parseJsonResponse(response) {
    // check the content type of the response
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return err({
        type: 'json_parse_error',
        message: 'Response is not JSON',
        context: { status: response.status, statusText: response.statusText, contentType: response.headers.get('content-type'), content: await response.text() },
      });
    }

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
      // Augment the error with the HTTP status text for better context
      return err({
        ...validatedData.error,
        context: validatedData.error.details || response.statusText,
      });
    }
  }

  /**
   * Sends a Command to Medoro.
   * @param {object} params - The parameters for the request.
   * @param {MedoroDataplaneCommand} params.command - The Command object to send.
   * @returns {Promise<Result<Response, MedoroDataplaneClientError>>}
   */
  async send({ command }) {
    const resultOfSignedUrl = await this.createSignedUrl({ command });
    if (resultOfSignedUrl.isErr()) {
      return err(resultOfSignedUrl.error);
    }

    const body = command instanceof PutObjectCommand ? command.content : undefined;

    const resultOfResponse = await ResultAsync.fromPromise(
      fetch(resultOfSignedUrl.value.signedUrl, {
        method: command.method,
        headers: command.headers,
        body,
      }),
      (e) => ({
        type: 'network_error',
        message: `Network error during ${command.method}: ${e instanceof Error ? e.message : String(e)}`,
      })
    );
    if (resultOfResponse.isErr()) {
      return err(resultOfResponse.error);
    }

    if (command instanceof GetObjectCommand) {
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

    const parseResult = await this.parseJsonResponse(resultOfResponse.value);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    return ok(parseResult.value.data);
  }
}
