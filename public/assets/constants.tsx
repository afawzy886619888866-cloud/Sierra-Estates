// Public constants for asset management
export const ASSET_CDN_PREFIX = process.env.NEXT_PUBLIC_CDN_URL || '/assets';
export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
export const MAX_ASSET_SIZE = 10 * 1024 * 1024; // 10MB
