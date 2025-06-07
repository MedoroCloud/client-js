# Medoro JavaScript Client SDK

## Overview

The `@medoro/client` is a JavaScript SDK designed to facilitate interaction with the Medoro object storage service. It provides a convenient way to upload, retrieve, and delete objects, handling authentication and API response validation seamlessly.

## Features

- **Object Management**: Easily `putObject`, `getObject`, and `deleteObject` from Medoro storage.
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

### `putObject` - Uploading an Object

```javascript
const key = '/my-document.txt';
const content = 'Hello Medoro! This is my first object.';

const result = await client.putObject({
  key,
  content,
  policy: {
    apiPutV1: {
      conditions: { content_length: { lte: 1024 }, content_type: 'text/plain' },
      accessControl: 'public-read',
    },
  },
});

if (result.isOk()) {
  console.log('Object uploaded successfully:', result.value);
} else {
  console.error('Failed to upload object:', result.error);
}
```

### `getObject` - Retrieving an Object (Authenticated)

The `getObject` method always attempts to sign the request, thus requiring the client to be initialized with a `privateKey` and `keyId`.

```javascript
const key = '/my-document.txt';

const result = await client.getObject({ key });

if (result.isOk()) {
  const response = result.value; // This is a Response object
  console.log('Object content:', await response.text());
} else {
  console.error('Failed to retrieve object:', result.error);
}
```

### `deleteObject` - Deleting an Object

```javascript
const key = '/my-document.txt';

const result = await client.deleteObject({ key });

if (result.isOk()) {
  console.log('Object deleted successfully:', result.value);
} else {
  console.error('Failed to delete object:', result.error);
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
  // ... other properties like 'code' or 'context'
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
