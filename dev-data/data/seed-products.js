/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
const fs = require('fs');
const dotenv = require('dotenv');
const { faker } = require('@faker-js/faker');
const axios = require('axios');
const path = require('path');
const https = require('https');

dotenv.config();
const { UNSPLASH_ACCESS_KEY } = process.env;

// Ensure images directory exists
const ensureDirectories = () => {
  const dirs = [path.join(__dirname, '../../public/img/products')];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

// Product categories with their specifications
const CATEGORIES = {
  't-shirts': {
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    brands: ['Exclusive Basics', 'Urban Threads', 'ComfortWear', 'Cotton Club'],
    priceRange: [19.99, 49.99],
    tags: ['casual', 'cotton', 'everyday', 'comfortable', 'essential'],
    unsplashQuery: 't-shirt',
  },
  shirts: {
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    brands: [
      'Exclusive Formal',
      'Smart Shirts',
      'Executive Wear',
      'Classic Fit',
    ],
    priceRange: [39.99, 89.99],
    tags: ['formal', 'business', 'cotton', 'oxford', 'dress'],
    unsplashQuery: 'dress shirt',
  },
  polos: {
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    brands: ['Exclusive Premium', 'Polo Club', 'Sport Elite', 'Classic Polo'],
    priceRange: [34.99, 69.99],
    tags: ['polo', 'smart-casual', 'sports', 'summer', 'cotton'],
    unsplashQuery: 'polo shirt',
  },
  jeans: {
    sizes: ['28', '30', '32', '34', '36', '38'],
    brands: ['Exclusive Denim', 'Urban Jeans', 'Denim Co', 'Premium Fit'],
    priceRange: [59.99, 129.99],
    tags: ['jeans', 'denim', 'casual', 'slim-fit', 'comfortable'],
    unsplashQuery: 'jeans denim',
  },
  shorts: {
    sizes: ['S', 'M', 'L', 'XL'],
    brands: ['Exclusive Outdoor', 'Summer Wear', 'Active Shorts', 'Casual Co'],
    priceRange: [29.99, 59.99],
    tags: ['shorts', 'summer', 'casual', 'comfortable', 'outdoor'],
    unsplashQuery: 'shorts men',
  },
  trousers: {
    sizes: ['30', '32', '34', '36', '38'],
    brands: [
      'Exclusive Essentials',
      'Business Line',
      'Smart Trousers',
      'Classic Fit',
    ],
    priceRange: [49.99, 99.99],
    tags: ['trousers', 'business', 'formal', 'chinos', 'versatile'],
    unsplashQuery: 'trousers pants',
  },
  activewear: {
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    brands: [
      'Exclusive Sports',
      'Athletic Pro',
      'Performance Wear',
      'Active Fit',
    ],
    priceRange: [34.99, 79.99],
    tags: ['sports', 'athletic', 'performance', 'workout', 'gym'],
    unsplashQuery: 'sportswear athletic',
  },
  fragrances: {
    sizes: null,
    brands: [
      'Exclusive Scents',
      'Signature',
      'Premium Fragrance',
      'Elite Cologne',
    ],
    priceRange: [59.99, 149.99],
    tags: ['fragrance', 'cologne', 'perfume', 'luxury', 'scent'],
    unsplashQuery: 'perfume cologne',
  },
  shoes: {
    sizes: null,
    brands: [
      'Exclusive Footwear',
      'Urban Steps',
      'Comfort Walk',
      'Style Shoes',
    ],
    priceRange: [79.99, 199.99],
    tags: ['shoes', 'footwear', 'sneakers', 'casual', 'comfortable'],
    unsplashQuery: 'sneakers shoes',
  },
  underwear: {
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    brands: [
      'Exclusive Comfort',
      'Essential Wear',
      'Comfort Plus',
      'Daily Basics',
    ],
    priceRange: [19.99, 44.99],
    tags: ['underwear', 'essentials', 'cotton', 'comfortable', 'daily'],
    unsplashQuery: 'clothing fabric',
  },
};

// Product name templates
const PRODUCT_NAMES = {
  't-shirts': [
    'Classic Cotton T-Shirt',
    'Premium V-Neck Tee',
    'Crew Neck Essential',
    'Graphic Print T-Shirt',
    'Striped Casual Tee',
    'Plain Everyday T-Shirt',
    'Vintage Wash Tee',
    'Slim Fit T-Shirt',
  ],
  shirts: [
    'Oxford Button-Down Shirt',
    'Slim Fit Dress Shirt',
    'Casual Linen Shirt',
    'Flannel Check Shirt',
    'Formal Business Shirt',
    'Chambray Work Shirt',
    'Poplin Easy-Care Shirt',
  ],
  polos: [
    'Classic Pique Polo',
    'Premium Cotton Polo',
    'Striped Sports Polo',
    'Contrast Collar Polo',
    'Athletic Fit Polo',
    'Modern Polo Shirt',
  ],
  jeans: [
    'Slim Fit Dark Jeans',
    'Straight Leg Denim',
    'Relaxed Comfort Jeans',
    'Skinny Stretch Jeans',
    'Boot Cut Classic Jeans',
    'Vintage Wash Denim',
  ],
  shorts: [
    'Cargo Utility Shorts',
    'Chino Smart Shorts',
    'Athletic Training Shorts',
    'Denim Casual Shorts',
    'Swim Board Shorts',
    'Hybrid Active Shorts',
  ],
  trousers: [
    'Slim Fit Chinos',
    'Pleated Dress Pants',
    'Casual Comfort Trousers',
    'Stretch Business Pants',
    'Flat Front Chinos',
    'Tailored Fit Trousers',
  ],
  activewear: [
    'Performance Training Tee',
    'Athletic Running Shorts',
    'Compression Sports Shirt',
    'Moisture-Wicking Tank',
    'Gym Training Joggers',
    'Breathable Workout Shirt',
  ],
  fragrances: [
    'Signature Eau de Toilette',
    'Premium Sport Cologne',
    "Classic Men's Fragrance",
    'Luxury Parfum',
    'Fresh Daily Cologne',
    'Evening Scent',
  ],
  shoes: [
    'Leather Court Sneakers',
    'Canvas Low-Top Shoes',
    'Running Performance Trainers',
    'Casual Slip-On Sneakers',
    'High-Top Classic Shoes',
    'Athletic Training Shoes',
  ],
  underwear: [
    'Cotton Boxer Briefs Pack',
    'Classic Comfort Boxers',
    'Athletic Support Briefs',
    'Everyday Trunks',
    'Premium Cotton Underwear',
  ],
};

// Colors for variety
const COLORS = [
  'Black',
  'White',
  'Navy',
  'Gray',
  'Blue',
  'Red',
  'Green',
  'Khaki',
  'Brown',
  'Charcoal',
  'Olive',
  'Burgundy',
];

// Download image from URL
const downloadImage = (url, filepath) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filepath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete incomplete file
          reject(err);
        });
      })
      .on('error', reject);
  });

// Fetch image from Unsplash
const fetchUnsplashImage = async (query, index, isCover = false) => {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('⚠️  No Unsplash API key found. Using placeholder images.');
    return null;
  }

  try {
    const response = await axios.get('https://api.unsplash.com/photos/random', {
      params: {
        query,
        orientation: 'squarish',
        content_filter: 'high',
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    const imageUrl = response.data.urls.regular;
    const filename = `${query.replace(/\s+/g, '-')}-${index}-${isCover ? 'cover' : 'alt'}-${Date.now()}.jpg`;
    const filepath = path.join(
      __dirname,
      '../../public/img/products',
      filename,
    );

    await downloadImage(imageUrl, filepath);
    return filename;
  } catch (error) {
    console.error(`Failed to fetch image for ${query}:`, error.message);
    return null;
  }
};

// Generate product title
function generateProductTitle(category) {
  const names = PRODUCT_NAMES[category];
  const name = names[Math.floor(Math.random() * names.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return `${color} ${name}`;
}

// Generate realistic description
function generateDescription(category, title, brand) {
  const materials = [
    '100% cotton',
    'premium cotton blend',
    'high-quality fabric',
    'breathable material',
    'soft cotton',
  ];
  const features = [
    'designed for comfort',
    'perfect for everyday wear',
    'durable construction',
    'modern fit',
    'easy care',
    'wrinkle-resistant',
    'pre-shrunk',
    'colorfast',
  ];

  const material = materials[Math.floor(Math.random() * materials.length)];
  const feature1 = features[Math.floor(Math.random() * features.length)];
  const feature2 = features[Math.floor(Math.random() * features.length)];

  return `${title} by ${brand}. Crafted from ${material}, ${feature1}. Features ${feature2} for lasting quality. ${faker.commerce.productDescription()}`;
}

// Generate single product
async function generateProduct(category, index, downloadImages = true) {
  const categoryData = CATEGORIES[category];
  const { priceRange } = categoryData;
  const basePrice = parseFloat(
    (Math.random() * (priceRange[1] - priceRange[0]) + priceRange[0]).toFixed(
      2,
    ),
  );

  // 35% chance of being on sale
  const onSale = Math.random() > 0.65;
  const salePrice = onSale
    ? parseFloat((basePrice * (0.65 + Math.random() * 0.25)).toFixed(2))
    : null;
  const discount = onSale
    ? Math.round(((basePrice - salePrice) / basePrice) * 100)
    : 0;

  // Stock between 0 and 200 (10% chance of low stock)
  const lowStock = Math.random() > 0.9;
  const stock = lowStock
    ? Math.floor(Math.random() * 10)
    : Math.floor(Math.random() * 200) + 20;

  // 25% chance of being featured
  const isFeatured = Math.random() > 0.75;

  // Random brand
  const brand =
    categoryData.brands[Math.floor(Math.random() * categoryData.brands.length)];

  // Random tags (2-4 tags)
  const numTags = 2 + Math.floor(Math.random() * 3);
  const tags = [...categoryData.tags]
    .sort(() => 0.5 - Math.random())
    .slice(0, numTags);

  // Random ratings (weighted toward higher ratings)
  const ratingsAverage = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
  const ratingsQuantity = Math.floor(Math.random() * 500) + 10;

  const title = generateProductTitle(category);

  // Download images if enabled
  let imageCover = 'default-product.jpg';
  // eslint-disable-next-line prefer-const
  let images = [];

  if (downloadImages) {
    console.log(`  📸 Downloading images for: ${title}...`);
    try {
      const coverImage = await fetchUnsplashImage(
        categoryData.unsplashQuery,
        index,
        true,
      );
      if (coverImage) imageCover = coverImage;

      // Download 2 additional images
      const img1 = await fetchUnsplashImage(
        categoryData.unsplashQuery,
        index + 1000,
        false,
      );
      const img2 = await fetchUnsplashImage(
        categoryData.unsplashQuery,
        index + 2000,
        false,
      );

      if (img1) images.push(img1);
      if (img2) images.push(img2);

      console.log(`  ✅ Images downloaded`);
    } catch (error) {
      console.error(`  ❌ Image download failed:`, error.message);
    }
  }

  const product = {
    title,
    description: generateDescription(category, title, brand),
    price: basePrice,
    category,
    stock,
    brand,
    tags,
    imageCover,
    images,
    isFeatured,
    ratingsAverage,
    ratingsQuantity,
  };

  // Add size for categories that need it
  if (categoryData.sizes) {
    product.size =
      categoryData.sizes[Math.floor(Math.random() * categoryData.sizes.length)];
  }

  // Add sale data if on sale
  if (onSale) {
    product.onSale = true;
    product.salePrice = salePrice;
    product.discount = discount;

    // Sale dates: start yesterday, end 30 days from now
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    product.saleStartDate = startDate.toISOString();
    product.saleEndDate = endDate.toISOString();
  }

  return product;
}

// Generate all products
async function generateAllProducts(downloadImages = true) {
  const products = [];

  console.log('\n🏭 Generating products...\n');

  await Object.keys(CATEGORIES).reduce(async (previous, category) => {
    await previous;

    const numProducts = 8 + Math.floor(Math.random() * 5); // 8-12 products per category
    console.log(`📦 ${category}: Generating ${numProducts} products...`);

    await Array.from({ length: numProducts }).reduce(async (prev, _, i) => {
      await prev;

      const product = await generateProduct(category, i, downloadImages);
      products.push(product);
    }, Promise.resolve());

    console.log(`✅ ${category}: Complete\n`);
  }, Promise.resolve());

  return products;
}

// Main execution
(async () => {
  try {
    console.log('🚀 Starting product generation...\n');

    // Ensure directories exist
    ensureDirectories();

    // Check if we should download images
    const downloadImages = !!UNSPLASH_ACCESS_KEY;

    if (!downloadImages) {
      console.log('⚠️  UNSPLASH_ACCESS_KEY not found in .env');
      console.log('⚠️  Products will be created with placeholder images');
      console.log(
        '⚠️  To download real images, add UNSPLASH_ACCESS_KEY to .env\n',
      );
    }

    // Generate products
    const products = await generateAllProducts(downloadImages);

    // Save to JSON
    const outputPath = path.join(__dirname, 'products.json');
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));

    console.log('\n✅ Generation complete!');
    console.log(`📁 Saved ${products.length} products to: ${outputPath}`);

    // Statistics
    console.log('\n📊 Statistics:');
    console.log(`  Total products: ${products.length}`);
    console.log(`  Featured: ${products.filter((p) => p.isFeatured).length}`);
    console.log(`  On sale: ${products.filter((p) => p.onSale).length}`);
    console.log(
      `  Low stock (<10): ${products.filter((p) => p.stock < 10).length}`,
    );

    console.log('\nBreakdown by category:');
    Object.keys(CATEGORIES).forEach((category) => {
      const count = products.filter((p) => p.category === category).length;
      const onSale = products.filter(
        (p) => p.category === category && p.onSale,
      ).length;
      const featured = products.filter(
        (p) => p.category === category && p.isFeatured,
      ).length;
      console.log(
        `  ${category}: ${count} products (${onSale} on sale, ${featured} featured)`,
      );
    });

    console.log('\n✨ Run "npm run seed:import" to add products to database');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
