/**
 * Cloudinary utility functions for optimized image delivery in emails
 */

const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dako0myhk';

/**
 * Generate an optimized Cloudinary URL for email display
 * @param publicId - The public ID of the image in Cloudinary
 * @param options - Optional transformation parameters
 * @returns Optimized Cloudinary URL
 */
export function generateCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
    gravity?: 'auto' | 'center' | 'face' | 'faces';
  } = {}
): string {
  const {
    width = 300,
    height = 200,
    quality = 'auto:good',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto'
  } = options;

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `g_${gravity}`,
    `q_${quality}`,
    `f_${format}`
  ].join(',');

  return `${CLOUDINARY_BASE_URL}/image/fetch/${transformations}/${encodeURIComponent(publicId)}`;
}

/**
 * Generate a meal image URL optimized for email display
 * @param imageUrl - Original image URL (can be any URL)
 * @param options - Optional transformation parameters
 * @returns Optimized Cloudinary URL for the image
 */
export function generateMealImageUrl(
  imageUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  const {
    width = 300,
    height = 300,
    quality = 'auto:good',
    format = 'auto'
  } = options;

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_fill`,
    `g_auto`,
    `q_${quality}`,
    `f_${format}`
  ].join(',');

  // Use Cloudinary's image fetch feature to optimize any external image
  return `${CLOUDINARY_BASE_URL}/image/fetch/${transformations}/${encodeURIComponent(imageUrl)}`;
}

/**
 * Generate a thumbnail image URL for meal cards in emails
 * @param imageUrl - Original image URL
 * @returns Optimized thumbnail URL
 */
export function generateMealThumbnailUrl(imageUrl: string): string {
  return generateMealImageUrl(imageUrl, {
    width: 80,
    height: 80,
    quality: 'auto:good',
    format: 'auto'
  });
}

/**
 * Generate a hero image URL for meal headers in emails
 * @param imageUrl - Original image URL
 * @returns Optimized hero image URL
 */
export function generateMealHeroUrl(imageUrl: string): string {
  return generateMealImageUrl(imageUrl, {
    width: 400,
    height: 250,
    quality: 'auto:best',
    format: 'auto'
  });
}
