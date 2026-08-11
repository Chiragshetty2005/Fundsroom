import { randomUUID } from 'crypto';
import path from 'path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../config/env.js';

// Initialize AWS S3 Client with explicit credentials if provided, or default IAM role
export const s3Client = new S3Client({
  region: env.AWS_REGION || 'us-east-1',
  ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export const S3_BUCKET = env.AWS_S3_BUCKET;

/**
 * Checks if S3 is configured with bucket name
 */
export function isS3Configured(): boolean {
  return Boolean(env.AWS_S3_BUCKET && env.AWS_S3_BUCKET.trim() !== '');
}

/**
 * Extracts standard file extension from original name or mime type
 */
function getFileExtension(file: Express.Multer.File): string {
  const extFromFilename = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extFromFilename)) {
    return extFromFilename === 'jpeg' ? 'jpg' : extFromFilename;
  }

  switch (file.mimetype) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

/**
 * Uploads a product image buffer to S3 (or data URI if S3 is not configured)
 * Returns the unique object key (e.g. products/{productId}/{uuid}.{ext})
 */
export async function uploadProductImage(
  productId: string,
  file: Express.Multer.File,
): Promise<string> {
  const ext = getFileExtension(file);
  const key = `products/${productId}/${randomUUID()}.${ext}`;

  if (isS3Configured()) {
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);
    return key;
  }

  // Fallback for local testing when S3 bucket is not yet provisioned:
  // Store base64 data URI so image upload works locally out-of-the-box
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

/**
 * Deletes a product image from S3 if an object key is present
 */
export async function deleteProductImage(imageUrlOrKey: string | null | undefined): Promise<void> {
  if (!imageUrlOrKey || !isS3Configured()) {
    return;
  }

  // Ignore data URIs or external URLs
  if (imageUrlOrKey.startsWith('data:') || imageUrlOrKey.startsWith('http://') || imageUrlOrKey.startsWith('https://')) {
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: imageUrlOrKey,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete S3 object key "${imageUrlOrKey}":`, error);
  }
}

/**
 * Resolves a stored image key to a signed GET URL (expires in 1 hour) or returns direct URL/data URI
 */
export async function resolveProductImageUrl(
  imageUrlOrKey: string | null | undefined,
): Promise<string | null> {
  if (!imageUrlOrKey) {
    return null;
  }

  // If already a signed URL, public URL, or data URI, return as-is
  if (
    imageUrlOrKey.startsWith('http://') ||
    imageUrlOrKey.startsWith('https://') ||
    imageUrlOrKey.startsWith('data:')
  ) {
    return imageUrlOrKey;
  }

  if (!isS3Configured()) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: imageUrlOrKey,
    });

    // Generate signed GET URL with 1-hour expiration
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error(`Failed to generate signed URL for key "${imageUrlOrKey}":`, error);
    return null;
  }
}

/**
 * Helper to resolve imageUrl on single or array of products
 */
export async function attachSignedProductImageUrl<T extends { imageUrl?: string | null }>(
  product: T,
): Promise<T> {
  if (!product.imageUrl) {
    return product;
  }

  const resolved = await resolveProductImageUrl(product.imageUrl);
  return {
    ...product,
    imageUrl: resolved,
  };
}

export async function attachSignedProductImages<T extends { imageUrl?: string | null }>(
  products: T[],
): Promise<T[]> {
  return Promise.all(products.map((p) => attachSignedProductImageUrl(p)));
}
