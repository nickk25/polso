# packages/storage — @polso/storage

Cloudflare R2 (S3-compatible) client for invoice and export file storage.

## What it exports

```typescript
uploadFile(key, body, contentType?)         // generic upload → UploadResult
uploadInvoice(orgId, expenseId, fileName, body, contentType)  // keys: invoices/{org}/{expense}/{file}
uploadExport(orgId, exportId, fileName, body, contentType)    // keys: exports/{org}/{export}/{file}
getSignedDownloadUrl(key, expiresIn?)       // presigned GET URL (default 1 hour)
getSignedUploadUrl(key, contentType, expiresIn?) // presigned PUT URL for direct browser uploads
getFile(key)                                // → { body: Uint8Array, contentType? }
deleteFile(key)                             // delete single object
deleteFiles(prefix)                         // delete all objects matching prefix

// Also exported (advanced use)
getR2Client()    // lazy S3Client — throws a clear error if R2_* env vars are missing
getBucketName()  // string from env (validated)
```

## Environment variables

```env
R2_ENDPOINT          # Cloudflare R2 endpoint (https://<account>.r2.cloudflarestorage.com)
R2_ACCESS_KEY_ID     # R2 API token access key
R2_SECRET_ACCESS_KEY # R2 API token secret
R2_BUCKET_NAME       # Bucket name
```

## Key structure

- Invoices: `invoices/{organizationId}/{expenseId}/{fileName}`
- Exports: `exports/{organizationId}/{exportId}/{fileName}`

## Dependencies

`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@types/node` (for `Buffer`/`process.env`).
