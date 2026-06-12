export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  images: string[];
  sizes: string[];
  details: string[];
}

/**
 * Static product data with Cloudinary CDN image URLs.
 * These images are served from Cloudinary for optimal performance.
 * 
 * NOTE: This static data is used for the storefront display.
 * The backend database is the source of truth for inventory and pricing.
 */
export const PRODUCTS: Product[] = [
  {
    id: "baby-blue-coordset",
    title: "The Vatavaran Coordset",
    price: 1999,
    category: "Coordset",
    description: "Some outfits instantly feel like summer—and this is one of them.\n\nMeet our Vatavaran Co-ord Set, crafted in a dreamy baby blue hue that's made for sunny brunches, vacation mornings, summer dates, and every moment you want to feel effortlessly pretty. Designed to be both flattering and comfortable, this set combines a feminine silhouette with thoughtful details you'll actually appreciate.\n\nThe back features adjustable straps, allowing you to customize the fit according to your comfort and body shape. And because confidence is the best accessory, the skirt comes with built-in shorts underneath, giving you the freedom to move, twirl, and enjoy your day without a second thought.\n\nCrafted from premium Banana Crepe fabric, it's lightweight, breathable, and perfect for warm-weather dressing while maintaining an elegant drape.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114405/deevuh/products/baby%20blue%20coordset/1%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114415/deevuh/products/baby%20blue%20coordset/2%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114427/deevuh/products/baby%20blue%20coordset/3%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114437/deevuh/products/baby%20blue%20coordset/4%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114451/deevuh/products/baby%20blue%20coordset/5%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114461/deevuh/products/baby%20blue%20coordset/6%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114476/deevuh/products/baby%20blue%20coordset/7%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114509/deevuh/products/baby%20blue%20coordset/dsc_0108.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114538/deevuh/products/baby%20blue%20coordset/dsc_0121.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114566/deevuh/products/baby%20blue%20coordset/dsc_0127.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    details: [
      "Two-piece co-ord set in soft baby blue",
      "Adjustable back straps for a customizable fit",
      "Built-in shorts underneath the skirt",
      "Lightweight & breathable premium Banana Crepe fabric",
      "Minimal stretch for a structured silhouette",
      "Perfect for brunch dates, vacations, summer outings & special occasions",
      "Proudly made in India",
      "Gentle hand wash recommended · Avoid frequent machine washing",
      "Iron on low to medium heat · Do not use high heat directly on fabric"
    ]
  },
  {
    id: "beige-outfit",
    title: "Beige Tailored Set",
    price: 2699,
    category: "Casual Luxury",
    description: "An understated and minimalist beige outfit, tailored for maximum comfort and an effortless editorial aesthetic. Features a clean drape, structured lines, and ultra-soft premium fabric. Perfectly styled as a monochrome statement or split as versatile separates for high-end casual wear.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114588/deevuh/products/beige%20outfit/1%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114602/deevuh/products/beige%20outfit/2%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114613/deevuh/products/beige%20outfit/3%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114656/deevuh/products/beige%20outfit/6%20picture.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    details: [
      "100% premium soft-touch luxury viscose-blend",
      "Structured dropped shoulders with tailored sleeves",
      "Clean hem finishes with subtle side slits",
      "Designed for a relaxed yet editorial silhouette",
      "Handcrafted locally in India"
    ]
  },
  {
    id: "brown-coordset",
    title: "The Mocha Brown Coordset",
    price: 2199,
    category: "Coordset",
    description: "For the woman who walks into a room and owns it.\n\nTailored, polished, and effortlessly chic, our Mocha Co-ord Set is designed for the modern corporate baddie who loves power dressing without sacrificing comfort. The rich mocha brown hue brings timeless sophistication, while the structured silhouette creates a look that's both confident and elegant.\n\nThe statement double-zipper top lets you style it your way—zipped up for a sleek office look or adjusted to create different necklines and moods. Paired with flattering bootcut pants, this set is made to take you from morning meetings to after-work plans with ease.\n\nCrafted in premium Banana Crepe fabric, it offers a beautiful fall, lightweight feel, and breathable comfort for all-day wear.\n\n✨ Because dressing for success should feel just as good as it looks. Powerful, versatile, and effortlessly chic—the set you'll keep reaching for on days when you mean business.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114670/deevuh/products/brown%20coordsets/1st%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114685/deevuh/products/brown%20coordsets/2nd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114701/deevuh/products/brown%20coordsets/3rd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114726/deevuh/products/brown%20coordsets/4th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114741/deevuh/products/brown%20coordsets/5th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114755/deevuh/products/brown%20coordsets/6th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114774/deevuh/products/brown%20coordsets/7th%20picture.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    details: [
      "Two-piece co-ord set in rich mocha brown",
      "Versatile double-zipper top styleable in multiple ways",
      "Flattering high-waisted bootcut pants",
      "Lightweight & breathable premium Banana Crepe fabric",
      "Minimal stretch for a structured tailored silhouette",
      "Perfect for office wear, work meetings, coffee runs & elevated everyday styling",
      "Proudly made in India",
      "Gentle hand wash recommended · Avoid frequent machine washing",
      "Iron on low to medium heat · Do not use high heat directly on fabric"
    ]
  },
  {
    id: "dupatta-beige-outfit",
    title: "Beige Dupatta Set",
    price: 2199,
    category: "Traditional Luxury",
    description: "An exquisite cream-beige set featuring a beautifully crafted coordinating dupatta. Combining traditional grace with modern tailored cuts, this premium outfit offers a sophisticated drape, intricate hand-stitch detailing along the borders, and an ultra-luxurious feel against the skin.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114854/deevuh/products/dupatta%20beige%20outfit/1st%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114863/deevuh/products/dupatta%20beige%20outfit/2nd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114880/deevuh/products/dupatta%20beige%20outfit/3rd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114893/deevuh/products/dupatta%20beige%20outfit/4th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114906/deevuh/products/dupatta%20beige%20outfit/5th%20picture.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    details: [
      "Premium handloom-finish organic cotton base",
      "Includes a semi-sheer lightweight matching dupatta",
      "Subtle gold zari embroidery highlight on neckline and borders",
      "Straight-cut tunic with relaxed tapered trousers",
      "Dry clean only for gold thread preservation"
    ]
  }
];

/**
 * Cloudinary URL transformer for image optimization.
 * Applies f_auto (format) and q_auto (quality) optimizations.
 */
export function optimizeCloudinaryUrl(url: string, width = 800): string {
  if (!url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
