import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Uploads a file buffer to Cloudinary with compression transformations.
 */
export const uploadImageToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = 'deevuh/products'
): Promise<UploadResult> => {
  return new Promise<UploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload returned empty result'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes an asset from Cloudinary by its public ID.
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Robustly extracts the Cloudinary public ID from a URL string,
 * ignoring format extensions and transformation tags.
 */
export const extractPublicId = (url: string): string | null => {
  try {
    if (!url || !url.includes('/upload/')) return null;
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    const pathAndFilename = parts[1];
    const segments = pathAndFilename.split('/');
    
    // Filter out version numbers and transformation strings
    const publicIdSegments = segments.filter((seg) => {
      // Filter out version segments (e.g. "v1780114405")
      if (seg.startsWith('v') && /^\d+$/.test(seg.substring(1))) return false;
      // Filter out transform segments (e.g. contains comma parameter like "f_auto,q_auto")
      if (seg.includes(',')) return false;
      // Filter out common transform prefix tags
      if (/^(w|h|f|q|c|r|g|b|e|fl|l|u|pg|dl|p|o|p_)\_/.test(seg)) return false;
      return true;
    });

    const joined = publicIdSegments.join('/');
    // Remove trailing file extension
    const dotIndex = joined.lastIndexOf('.');
    const withoutExtension = dotIndex !== -1 ? joined.substring(0, dotIndex) : joined;

    return decodeURIComponent(withoutExtension);
  } catch (error) {
    console.error('Failed to parse Cloudinary URL:', url, error);
    return null;
  }
};
