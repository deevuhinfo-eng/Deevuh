/**
 * DEEVUH Cloudinary Image Migration Script
 * 
 * Uploads all local product images from public/products/ to Cloudinary
 * and generates a JSON mapping of local paths -> Cloudinary URLs.
 * 
 * Usage: node upload-to-cloudinary.js
 * 
 * Prerequisites:
 * - npm install cloudinary (in the project root or backend)
 * - Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars
 */

const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnj50tf7s',
  api_key: process.env.CLOUDINARY_API_KEY || '792413776692268',
  api_secret: process.env.CLOUDINARY_API_SECRET || '5dp3CGG4XmiHkJhPLXUChpQdr3E',
});

// Local product images directory
const PUBLIC_PRODUCTS_DIR = path.join(__dirname, 'deevuh-frontend', 'public', 'products');

// Cloudinary folder for organized storage
const CLOUDINARY_FOLDER = 'deevuh/products';

// Output file for URL mapping
const OUTPUT_FILE = path.join(__dirname, 'cloudinary-url-map.json');

const urlMap = {};
let uploadCount = 0;
let errorCount = 0;

async function uploadFile(localPath, cloudinaryPublicId) {
  try {
    console.log(`Uploading: ${path.basename(localPath)}`);
    const result = await cloudinary.uploader.upload(localPath, {
      public_id: cloudinaryPublicId,
      folder: CLOUDINARY_FOLDER,
      overwrite: false, // Don't re-upload if already exists
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
    });
    
    const localKey = localPath
      .replace(path.join(__dirname, 'deevuh-frontend', 'public'), '')
      .replace(/\\/g, '/');
    
    urlMap[localKey] = result.secure_url;
    uploadCount++;
    console.log(`  ✅ ${localKey} -> ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`  ❌ Failed to upload ${localPath}: ${error.message}`);
    errorCount++;
    return null;
  }
}

async function uploadDirectory(dirPath, relativePath = '') {
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively process subdirectories
      await uploadDirectory(fullPath, entryRelativePath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        // Create a clean public_id from the relative path
        const publicId = entryRelativePath
          .replace(/\\/g, '/')
          .replace(/\.[^.]+$/, '') // Remove extension
          .replace(/\s+/g, '-')    // Replace spaces with hyphens
          .toLowerCase();
        
        await uploadFile(fullPath, publicId);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
}

async function main() {
  console.log('🚀 DEEVUH Cloudinary Image Migration');
  console.log('=====================================\n');
  console.log(`Source: ${PUBLIC_PRODUCTS_DIR}`);
  console.log(`Destination: ${CLOUDINARY_FOLDER}\n`);
  
  if (!fs.existsSync(PUBLIC_PRODUCTS_DIR)) {
    console.error(`❌ Products directory not found: ${PUBLIC_PRODUCTS_DIR}`);
    process.exit(1);
  }

  await uploadDirectory(PUBLIC_PRODUCTS_DIR);
  
  // Save URL mapping to JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(urlMap, null, 2));
  
  console.log('\n=====================================');
  console.log(`✅ Migration Complete!`);
  console.log(`   Uploaded: ${uploadCount} images`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   URL map saved to: ${OUTPUT_FILE}`);
  console.log('\nNext steps:');
  console.log('1. Review cloudinary-url-map.json');
  console.log('2. Update deevuh-frontend/src/data/products.ts with Cloudinary URLs');
  console.log('3. Update prisma seed.ts with Cloudinary URLs');
}

main().catch(console.error);
