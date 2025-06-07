import assert from 'node:assert';
import { test, before, after, beforeEach, afterEach } from 'node:test';
import { MedoroClient } from '../src/index.js';
import { ok, err } from 'neverthrow';

test.suite('MedoroClient', () => {
  /** @type {MedoroClient} */
  let client;
  /** @type {import('node:test').Mock<typeof global.fetch>} */
  let fetchStub;

  beforeEach(async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      true, // extractable
      ['sign', 'verify']
    );

    client = new MedoroClient({
      origin: 'https://test-bucket.content-serve.com',
      privateKey: keyPair.privateKey,
      keyId: 'test-key-id',
    });

    fetchStub = test.mock.method(global, 'fetch');
  });

  afterEach(() => {
    test.mock.reset();
  });

  test.suite('putObject', () => {
    test('should successfully upload an object', async () => {
      const mockPutResponse = {
        success: true,
        data: {
          key: 'test-key',
          bucket: 'test-bucket',
          accessControl: 'public',
          message: 'Object uploaded successfully',
        }
      };
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify(mockPutResponse), { status: 200, ok: true })));

      const key = 'test-key';
      const content = 'Hello Medoro!';
      /** @type {import('../src/index.js').ApiPutRequestValidationPolicy} */
      const policy = {
        apiPutV1: {
          conditions: { content_length: { lte: 100 }, content_type: 'text/plain' },
          accessControl: 'public',
        },
      };

      const result = await client.putObject({ key, content, policy });
      assert.deepStrictEqual(result, ok(mockPutResponse.data));
      assert.strictEqual(fetchStub.mock.callCount(), 1);

      const request = fetchStub.mock.calls[0].arguments[0];
      assert.ok(request instanceof Request);
      assert.strictEqual(request.method, 'PUT');
      assert.ok(request.url.includes(`https://test-bucket.content-serve.com/${key}`));
      assert.ok(request.url.includes('x-medoro-policy='));
      assert.ok(request.url.includes('x-medoro-signature-input='));
      assert.ok(request.url.includes('x-medoro-signature='));
    });

    test('should return an error if authentication is missing for signed request', async () => {
      const unauthenticatedClient = new MedoroClient({
        origin: 'https://test-bucket.content-serve.com',
        privateKey: null,
        keyId: null,
      });

      const key = 'test-key';
      const content = 'Hello Medoro!';
      /** @type {import('../src/index.js').ApiPutRequestValidationPolicy} */
      const policy = {
        apiPutV1: {
          conditions: { content_length: { lte: 100 }, content_type: 'text/plain' },
          accessControl: 'public',
        },
      };

      const result = await unauthenticatedClient.putObject({ key, content, policy });
      assert.ok(result.isErr());
      assert.deepStrictEqual(result.error.type, 'signature_error');
      assert.deepStrictEqual(result.error.message, 'Failed to encode signature input dictionary');
      assert.deepStrictEqual(result.error.code, undefined);
    });

    test('should return an error for network issues', async () => {
      fetchStub.mock.mockImplementationOnce(() => Promise.reject(new TypeError('Network request failed')));

      const key = 'test-key';
      const content = 'Hello Medoro!';
      /** @type {import('../src/index.js').ApiPutRequestValidationPolicy} */
      const policy = {
        apiPutV1: {
          conditions: { content_length: { lte: 100 }, content_type: 'text/plain' },
          accessControl: 'public',
        },
      };

      const result = await client.putObject({ key, content, policy });
      assert.deepStrictEqual(result, err({
        type: 'network_error',
        message: 'Network error during PUT: Network request failed',
      }));
    });

    test('should return an API error for non-ok responses', async () => {
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify({ success: false, error: { type: 'api_error', message: 'Unauthorized', code: '401' } }), { status: 401, statusText: 'Unauthorized' })));

      const key = 'test-key';
      const content = 'Hello Medoro!';
      /** @type {import('../src/index.js').ApiPutRequestValidationPolicy} */
      const policy = {
        apiPutV1: {
          conditions: { content_length: { lte: 100 }, content_type: 'text/plain' },
          accessControl: 'public',
        },
      };

      const result = await client.putObject({ key, content, policy });
      assert.deepStrictEqual(result, err({
        type: 'api_error',
        message: 'Unauthorized',
        code: '401',
      }));
    });
  });

  test.suite('getObject', () => {
    test('should successfully retrieve an object', async () => {
      const mockBlob = new Blob(['mock content'], { type: 'text/plain' });
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(mockBlob, { status: 200, ok: true })));

      const key = 'test-key';
      const result = await client.getObject({ key });
      assert.ok(result.isOk());
      assert.ok(result.value instanceof Response);
      assert.strictEqual(result.value.status, 200);
      assert.strictEqual(await result.value.text(), 'mock content');
    });

    test('should retrieve an authenticated object', async () => {
      const mockBlob = new Blob(['mock content'], { type: 'text/plain' });
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(mockBlob, { status: 200, ok: true })));

      const key = 'test-key';
      const result = await client.getObject({ key, authenticated: true });
      assert.ok(result.isOk());
      assert.strictEqual(fetchStub.mock.callCount(), 1);

      const request = fetchStub.mock.calls[0].arguments[0];
      assert.ok(request.url.includes('x-medoro-signature-input='));
      assert.ok(request.url.includes('x-medoro-signature='));
    });

    test('should return an API error for non-ok responses', async () => {
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify({ success: false, error: { type: 'api_error', message: 'Not Found', code: '404' } }), { status: 404, statusText: 'Not Found' })));

      const key = 'test-key';
      const result = await client.getObject({ key });
      assert.ok(result.isErr());
      assert.deepStrictEqual(result.error, {
        type: 'api_error',
        message: 'Not Found',
        code: '404',
      });
    });

    test('should return an error for network issues during get', async () => {
      fetchStub.mock.mockImplementationOnce(() => Promise.reject(new TypeError('Network error during GET')));

      const key = 'test-key';
      const result = await client.getObject({ key });
      assert.deepStrictEqual(result, err({
        type: 'network_error',
        message: 'Network error during GET: Network error during GET',
      }));
    });
  });

  test.suite('deleteObject', () => {
    test('should successfully delete an object', async () => {
      const mockDeleteResponse = {
        success: true,
        data: {
        key: 'test-key',
        bucket: 'test-bucket',
        message: 'Object deleted successfully',
        }
      };
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify(mockDeleteResponse), { status: 200, ok: true })));

      const key = 'test-key';
      const result = await client.deleteObject({ key });
      assert.deepStrictEqual(result, ok(mockDeleteResponse.data));
      assert.strictEqual(fetchStub.mock.callCount(), 1);

      const request = fetchStub.mock.calls[0].arguments[0];
      assert.strictEqual(request.method, 'DELETE');
      assert.ok(request.url.includes(`https://test-bucket.content-serve.com/${key}`));
      assert.ok(request.url.includes('x-medoro-signature-input='));
      assert.ok(request.url.includes('x-medoro-signature='));
    });

    test('should return an API error for non-ok responses', async () => {
      fetchStub.mock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify({ success: false, error: { type: 'api_error', message: 'Forbidden', code: '403' } }), { status: 403, statusText: 'Forbidden' })));

      const key = 'test-key';
      const result = await client.deleteObject({ key });
      assert.deepStrictEqual(result, err({
        type: 'api_error',
        message: 'Forbidden',
        code: '403',
      }));
    });

    test('should return an error for network issues during delete', async () => {
      fetchStub.mock.mockImplementationOnce(() => Promise.reject(new TypeError('Network error during DELETE')));

      const key = 'test-key';
      const result = await client.deleteObject({ key });
      assert.deepStrictEqual(result, err({
        type: 'network_error',
        message: 'Network error during DELETE: Network error during DELETE',
      }));
    });
  });
});
