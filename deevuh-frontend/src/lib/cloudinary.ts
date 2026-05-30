/**
 * Cloudinary image optimization helper.
 * Transforms Cloudinary URLs with auto-format, quality, and responsive widths.
 */
export const cloudinaryUrl = (
  url: string,
  options?: { width?: number; height?: number; quality?: string }
): string => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const { width = 400, quality = 'auto' } = options || {};
  const transforms = `f_auto,q_${quality},w_${width}`;

  return url.replace('/upload/', `/upload/${transforms}/`);
};

/**
 * Generate srcset for responsive images.
 */
export const cloudinarySrcSet = (url: string, widths: number[] = [320, 640, 960, 1280]): string => {
  return widths
    .map((w) => `${cloudinaryUrl(url, { width: w })} ${w}w`)
    .join(', ');
};

export default cloudinaryUrl;
