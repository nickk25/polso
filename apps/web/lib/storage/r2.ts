import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME!

export interface UploadResult {
  key: string
  url: string
  size: number
}

/**
 * Upload a file to R2
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await r2Client.send(command)

  // Get the public URL or generate a signed URL
  const url = await getSignedDownloadUrl(key)

  return {
    key,
    url,
    size: typeof body === "string" ? Buffer.byteLength(body) : body.length,
  }
}

/**
 * Upload an invoice file
 */
export async function uploadInvoice(
  organizationId: string,
  expenseId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  const key = `invoices/${organizationId}/${expenseId}/${fileName}`
  return uploadFile(key, body, contentType)
}

/**
 * Upload an export file
 */
export async function uploadExport(
  organizationId: string,
  exportId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  const key = `exports/${organizationId}/${exportId}/${fileName}`
  return uploadFile(key, body, contentType)
}

/**
 * Get a signed download URL (valid for 1 hour)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(r2Client, command, { expiresIn })
}

/**
 * Get a signed upload URL for direct browser uploads
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(r2Client, command, { expiresIn })
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await r2Client.send(command)
}

/**
 * Delete all files with a given prefix
 */
export async function deleteFiles(prefix: string): Promise<void> {
  // List all objects with the prefix
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  })

  const response = await r2Client.send(listCommand)

  if (!response.Contents || response.Contents.length === 0) {
    return
  }

  // Delete each object
  for (const object of response.Contents) {
    if (object.Key) {
      await deleteFile(object.Key)
    }
  }
}

/**
 * Get file content
 */
export async function getFile(key: string): Promise<{
  body: Uint8Array
  contentType?: string
}> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const response = await r2Client.send(command)

  if (!response.Body) {
    throw new Error("File not found")
  }

  const body = await response.Body.transformToByteArray()

  return {
    body,
    contentType: response.ContentType,
  }
}

export { r2Client, BUCKET_NAME }
