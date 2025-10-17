#!/bin/bash

# Test script for the image mapping proxy endpoint using curl
# Make sure your Next.js development server is running on port 3000

echo "🧪 Testing Image Mapping Proxy Endpoint with curl..."
echo "📍 Endpoint: http://localhost:3000/api/image-mapping"
echo "⚠️  Make sure your Next.js development server is running on port 3000"
echo ""

# Test data
cat > /tmp/test-data.json << EOF
{
  "mealNames": [
    "Paneer Tikka Masala",
    "Chicken Biryani",
    "Dal Makhani",
    "Butter Chicken",
    "Palak Paneer"
  ]
}
EOF

echo "📝 Test meal names:"
echo "  - Paneer Tikka Masala"
echo "  - Chicken Biryani"
echo "  - Dal Makhani"
echo "  - Butter Chicken"
echo "  - Palak Paneer"
echo ""

# Make the request
echo "🚀 Making request..."
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d @/tmp/test-data.json \
  http://localhost:3000/api/image-mapping)

# Split response and status code
http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

echo "📊 HTTP Status: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
  echo "✅ Response Body:"
  echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
  
  # Count images found
  image_count=$(echo "$response_body" | jq 'length' 2>/dev/null || echo "0")
  echo ""
  echo "🖼️  Images found: $image_count/5"
  
  if [ "$image_count" -gt 0 ]; then
    echo "🎉 Test PASSED - Proxy endpoint is working correctly!"
  else
    echo "⚠️  Test WARNING - API responded but no images found"
  fi
else
  echo "❌ Test FAILED - HTTP $http_code"
  echo "Response: $response_body"
  
  if [ "$http_code" -eq 000 ]; then
    echo ""
    echo "💡 Make sure your Next.js development server is running:"
    echo "   npm run dev"
    echo "   or"
    echo "   yarn dev"
  fi
fi

# Clean up
rm -f /tmp/test-data.json
