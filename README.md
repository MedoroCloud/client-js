# Medoro JavaScript Client SDK

## Overview

The `@medoro/client` is a JavaScript SDK designed to facilitate interaction with the Medoro object storage service. It provides a convenient way to upload, retrieve, and delete objects, handling authentication and API response validation seamlessly.

## Features

- **Object Management**: Use command objects (`PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`) with a unified `send` method to interact with Medoro storage.
- **Authentication**: Supports Ed25519 key pair-based signing for secure requests.
- **Structured Error Handling**: Leverages `neverthrow`'s `Result` and `ResultAsync` types for explicit and type-safe error management.
- **API Response Validation**: Integrates `Zod` schemas to ensure API responses conform to expected structures, providing robust data validation.

## Installation

To install the Medoro JavaScript Client SDK, use npm:

```bash
npm install @medoro/client
```

## Usage

### Initializing the Client

To use the client, you need to provide the `origin` URL of your Medoro bucket. For authenticated operations, you will also need an Ed25519 `privateKey` (a `CryptoKey` object) and a `keyId`.

```javascript
import { MedoroDataplaneClient } from '@medoro/client';

// Example: Generate a key pair (for demonstration purposes)
// In a real application, you would load your private key securely.

const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true, // extractable
    ['sign', 'verify']
  );

const client = new MedoroDataplaneClient({
  origin: 'https://your-bucket.content-serve.com',
  privateKey: keyPair.privateKey,
  keyId: 'your-key-id',
});
```

### Sending Commands

All interactions with the Medoro API are performed by creating a command object and passing it to the `client.send()` method. This unifies the API and provides a clear structure for requests.

#### `PutObjectCommand` - Uploading an Object

```javascript
const key = '/my-document.txt';
const content = 'Hello Medoro! This is my first object.';

const command = new PutObjectCommand({
  key,
  content,
  policy: {
    apiPutV1: {
      conditions: { 'Content-Length': { lte: 1024 }, 'Content-Type': 'text/plain' },
      accessControl: 'public',
    },
  },
});

const result = await client.send({ command });

if (result.isOk()) {
  console.log('Object uploaded successfully:', result.value);
} else {
  console.error('Failed to upload object:', result.error);
}
```

#### `GetObjectCommand` - Retrieving an Object (Authenticated)

The `GetObjectCommand` always attempts to sign the request, thus requiring the client to be initialized with a `privateKey` and `keyId`.

```javascript
const key = '/my-document.txt';

const command = new GetObjectCommand({ key });
const result = await client.send({ command });

if (result.isOk()) {
  const response = result.value; // This is a Response object
  console.log('Object content:', await response.text());
} else {
  console.error('Failed to retrieve object:', result.error);
}
```

#### `DeleteObjectCommand` - Deleting an Object

```javascript
const key = '/my-document.txt';

const command = new DeleteObjectCommand({ key });
const result = await client.send({ command });

if (result.isOk()) {
  console.log('Object deleted successfully:', result.value);
} else {
  console.error('Failed to delete object:', result.error);
}
```

### `createSignedUrl` - Generating Signed URLs

Medoro allows you to generate signed URLs for direct client-side interaction (e.g., browser to Medoro uploads). The `createSignedUrl` method takes a command object and returns a URL that includes the necessary signature for authentication.

```javascript
const key = '/my-image.jpg';
const command = new GetObjectCommand({ key });

const result = await client.createSignedUrl({ command });

if (result.isOk()) {
  const signedUrl = result.value.signedUrl;
  console.log('Generated Signed URL:', signedUrl.toString());
  // You can now use this URL for direct access, e.g., in an <img> tag or a fetch request
} else {
  console.error('Failed to generate signed URL:', result.error);
}

// For a PutObjectCommand, the signed URL would be used for a direct PUT request
const uploadKey = '/my-document-for-upload.txt';
const uploadCommand = new PutObjectCommand({
  key: uploadKey,
  content: 'Content to upload',
  policy: {
    apiPutV1: {
      conditions: { 'Content-Length': { lte: 1024 }, 'Content-Type': 'text/plain' },
      accessControl: 'public',
    },
  },
});

const uploadResult = await client.createSignedUrl({ command: uploadCommand });

if (uploadResult.isOk()) {
  const signedUploadUrl = uploadResult.value.signedUrl;
  console.log('Generated Signed Upload URL:', signedUploadUrl.toString());
  // Use this URL with fetch to perform a direct PUT upload
  // await fetch(signedUploadUrl, { method: 'PUT', body: uploadCommand.content });
} else {
  console.error('Failed to generate signed upload URL:', uploadResult.error);
}
```

## Error Handling

The Medoro Client SDK uses `neverthrow`'s `Result` and `ResultAsync` types for all operations that can fail. This provides explicit error handling, making error paths clear and type-safe.

Functions will return `ok(value)` on success or `err(errorObject)` on failure. Error objects typically have a `type`, `message`, and optionally `code` and `context` properties, following a consistent structure.

Example error structure:

```javascript
{
  type: 'network_error',
  message: 'Network request failed',
  // ... other properties like 'code', 'context', or 'details'
}
```

API responses are validated against `Zod` schemas. If an API response does not conform to the expected structure, a `validation_error` will be returned in the `Result`.

## Development

### Running Tests

To run the test suite, use:

```bash
npm test
```

### Running Coverage

To run tests with code coverage, use:

```bash
npm run coverage
```
