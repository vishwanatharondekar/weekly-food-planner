/**
 * Test script to verify cuisines.json reading functionality
 * 
 * Usage:
 *   node scripts/test-cuisines-reading.js
 */

// We'll implement a simple version of readImagesFromCuisines for testing
// since we can't easily import from the main script

async function readImagesFromCuisines(filePath) {
  const fs = require('fs');
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  console.log(`Reading cuisines data from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const cuisinesData = JSON.parse(fileContent);
  
  if (!Array.isArray(cuisinesData)) {
    throw new Error('Invalid cuisines.json format - expected array');
  }

  const images = [];
  const maxItems = 100; // Limit for testing
  const itemsToProcess = Math.min(cuisinesData.length, maxItems);
  
  console.log(`Processing ${itemsToProcess} items from ${cuisinesData.length} total items`);

  for (let i = 0; i < itemsToProcess; i++) {
    const item = cuisinesData[i];
    
    // Skip items without imageUrl
    if (!item.imageUrl) {
      console.warn(`Skipping item ${i} - missing imageUrl: ${item.name}`);
      continue;
    }

    // Parse vegetarian status from diet field
    const isVegetarian = item.diet === 'Vegetarian';
    
    // Create image object
    const image = {
      id: `cuisine_${i}`,
      url: item.imageUrl,
      name: item.name || '',
      isVegetarian: isVegetarian,
      description: item.description || '',
      cuisine: item.cuisine || '',
      course: item.course || '',
      diet: item.diet || ''
    };

    images.push(image);
  }

  console.log(`Read ${images.length} valid images from cuisines.json`);
  return images;
}

async function testCuisinesReading() {
  try {
    console.log('🧪 Testing cuisines.json reading...');
    
    const inputFile = require('path').join(__dirname, '..', 'data', 'cuisines.json');
    console.log(`📁 Reading from: ${inputFile}`);
    
    const images = await readImagesFromCuisines(inputFile);
    
    console.log(`\n📊 Results:`);
    console.log(`   Total images: ${images.length}`);
    
    if (images.length > 0) {
      const vegetarianCount = images.filter(img => img.isVegetarian).length;
      const nonVegetarianCount = images.length - vegetarianCount;
      
      console.log(`   Vegetarian: ${vegetarianCount}`);
      console.log(`   Non-vegetarian: ${nonVegetarianCount}`);
      
      console.log(`\n🔍 Sample images:`);
      images.slice(0, 5).forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.name}`);
        console.log(`      URL: ${img.url}`);
        console.log(`      Vegetarian: ${img.isVegetarian}`);
        console.log(`      Cuisine: ${img.cuisine}`);
        console.log(`      Course: ${img.course}`);
        console.log('');
      });
      
      // Check for any missing data
      const missingUrls = images.filter(img => !img.url).length;
      const missingNames = images.filter(img => !img.name).length;
      
      if (missingUrls > 0) {
        console.log(`⚠️  Warning: ${missingUrls} images missing URLs`);
      }
      if (missingNames > 0) {
        console.log(`⚠️  Warning: ${missingNames} images missing names`);
      }
      
      console.log('✅ Test completed successfully!');
    } else {
      console.log('❌ No images found in cuisines.json');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testCuisinesReading();
}

module.exports = { testCuisinesReading };
