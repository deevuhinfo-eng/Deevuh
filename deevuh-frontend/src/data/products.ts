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
    description: "The Vatavaran coordset top comes with a halter neck, adjustable straps, and a peplum fit that looks so flattering on. You can tighten or loosen it from the back to get your perfect fit. Paired with the cutest little skirt (don't worry, it has shorts underneath), so you can move around comfortably all day.\n\nBasically the outfit you'll keep reaching for when you want to look cute with zero effort.",
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
    sizes: ["XS", "S", "M", "L"],
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
    title: "The Korean Coordset",
    price: 2699,
    category: "Coordset",
    description: "Minimal effort. Maximum impact.\n\nDesigned for the girls who love clean silhouettes and elevated basics, our Korean Co-ord Set brings together modern tailoring and effortless sophistication. Featuring an asymmetrical waistcoat and relaxed flared Korean pants, this set strikes the perfect balance between structured and chic.\n\nThe asymmetrical cut adds a contemporary edge, creating a silhouette that feels unique yet timeless. Paired with flowy Korean-style pants that move beautifully with every step, this outfit is made for days when you want to look polished without trying too hard.\n\nCrafted in premium Banana Crepe fabric, it offers a lightweight feel, breathable comfort, and an elegant drape that flatters every movement.\n\nFor the days when you want your outfit to speak before you do. Modern, refined, and effortlessly stylish—this is the kind of set you'll keep reaching for, season after season.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114588/deevuh/products/beige%20outfit/1%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114602/deevuh/products/beige%20outfit/2%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114613/deevuh/products/beige%20outfit/3%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114656/deevuh/products/beige%20outfit/6%20picture.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L"],
    details: [
      "Two-piece co-ord set: Asymmetrical Waistcoat & Flared Pants",
      "Statement asymmetrical waistcoat with button closures",
      "Relaxed flared Korean-style pants",
      "Modern, tailored minimalist silhouette",
      "Lightweight and breathable Banana Crepe fabric",
      "Minimal stretch with a structured fall",
      "Easy to dress up or down",
      "Perfect for workdays, brunches, travel, dinner plans, and elevated everyday wear",
      "Proudly crafted in India",
      "Gentle hand wash recommended · Avoid frequent machine washing",
      "Iron on low to medium heat · Do not use high heat directly on fabric"
    ]
  },
  {
    id: "brown-coordset",
    title: "The Mocha Brown Coordset",
    price: 2199,
    category: "Coordset",
    description: "For the woman who walks into a room and owns it.\n\nTailored, polished, and effortlessly chic, our Mocha Co-ord Set is designed for the modern corporate baddie who loves power dressing without sacrificing comfort. The rich mocha brown hue brings timeless sophistication, while the structured silhouette creates a look that's both confident and elegant.\n\nThe statement double-zipper top lets you style it your way—zipped up for a sleek office look or adjusted to create different necklines and moods. Paired with flattering bootcut pants, this set is made to take you from morning meetings to after-work plans with ease.\n\nCrafted in premium Banana Crepe fabric, it offers a beautiful fall, lightweight feel, and breathable comfort for all-day wear.\n\nBecause dressing for success should feel just as good as it looks. Powerful, versatile, and effortlessly chic—the set you'll keep reaching for on days when you mean business.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114670/deevuh/products/brown%20coordsets/1st%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114685/deevuh/products/brown%20coordsets/2nd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114726/deevuh/products/brown%20coordsets/4th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114741/deevuh/products/brown%20coordsets/5th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114755/deevuh/products/brown%20coordsets/6th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114774/deevuh/products/brown%20coordsets/7th%20picture.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
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
    title: "The Rani Coordset",
    price: 2199,
    category: "Coordset",
    description: "A little tradition, a little modernity, and a whole lot of elegance.\n\nDesigned for the woman who loves timeless silhouettes with a contemporary touch, this three-piece set features a beautifully tailored deep U-neck waistcoat, flattering bootcut pants, and a flowing dupatta that completes the look effortlessly.\n\nThe waistcoat comes with an adjustable back tie, allowing you to customize the fit to your comfort while enhancing your natural silhouette. Thoughtfully designed to flatter, it creates a look that feels both sophisticated and feminine.\n\nCrafted in premium Banana Crepe fabric, the set is lightweight, breathable, and comfortable enough to wear through long celebrations, festive gatherings, intimate functions, or evening outings.\n\nMade for the woman who loves turning heads quietly. Classic, graceful, and effortlessly striking—this is the kind of outfit that feels memorable long after the occasion is over.",
    images: [
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114854/deevuh/products/dupatta%20beige%20outfit/1st%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114863/deevuh/products/dupatta%20beige%20outfit/2nd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114880/deevuh/products/dupatta%20beige%20outfit/3rd%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114893/deevuh/products/dupatta%20beige%20outfit/4th%20picture.jpg.jpg",
      "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114906/deevuh/products/dupatta%20beige%20outfit/5th%20picture.jpg.jpg"
    ],
    sizes: ["XS", "S", "M", "L"],
    details: [
      "Three-piece set: Waistcoat, Bootcut Pants & Dupatta",
      "Elegant deep U-neck waistcoat",
      "Adjustable back tie for a personalized fit",
      "Flattering high-waisted bootcut pants",
      "Lightweight and breathable Banana Crepe fabric",
      "Minimal stretch with a structured drape",
      "Perfect for festive gatherings, celebrations, dinners, and special occasions",
      "Proudly crafted in India",
      "Gentle hand wash recommended · Avoid frequent machine washing",
      "Iron on low to medium heat · Do not use high heat directly on fabric"
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
