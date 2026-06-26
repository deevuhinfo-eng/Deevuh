async function main() {
  const urls = [
    "https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114640/deevuh/products/beige%20outfit/5th%20Picture.jpg.jpg",
    "https://res.cloudinary.com/dnj50tf7s/image/upload/v1780114640/deevuh/products/beige%20outfit/5th%20Picture.jpg",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'GET' });
      console.log(`URL: ${url} -> Status: ${res.status}`);
    } catch (e: any) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

main();
