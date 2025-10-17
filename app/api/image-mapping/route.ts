import { NextRequest, NextResponse } from 'next/server';

// Internal proxy endpoint for image mapping API
// This eliminates CORS issues by making server-side requests to the Lambda URL

export async function POST(request: NextRequest) {
  try {
    // Get the Lambda URL from environment variables
    const lambdaUrl = process.env.IMAGE_MAPPING_LAMBDA_URL;
    
    if (!lambdaUrl) {
      console.error('IMAGE_MAPPING_LAMBDA_URL environment variable not configured');
      return NextResponse.json(
        { error: 'Image mapping service not configured' },
        { status: 500 }
      );
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    if (!body || !Array.isArray(body.mealNames)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { mealNames: string[] }' },
        { status: 400 }
      );
    }

    if (body.mealNames.length === 0) {
      return NextResponse.json({});
    }

    console.log(`Proxying image mapping request for ${body.mealNames.length} meals:`, body.mealNames);

    // Make the request to the Lambda URL
    const startTime = Date.now();
    
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Lambda response time: ${duration}ms, status: ${response.status}`);

    if (!response.ok) {
      console.error(`Lambda API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Image mapping service unavailable' },
        { status: 502 }
      );
    }

    // Parse the response from Lambda
    const data = await response.json();
    
    // Validate the response format
    if (typeof data !== 'object' || data === null) {
      console.warn('Invalid response format from Lambda API');
      return NextResponse.json({});
    }

    const imageCount = Object.keys(data).length;
    console.log(`Successfully mapped ${imageCount}/${body.mealNames.length} meals to images`);

    // Return the response from Lambda
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in image mapping proxy:', error);
    
    // Return empty object on error to avoid breaking the UI
    return NextResponse.json({});
  }
}

// Handle OPTIONS requests for CORS (though this shouldn't be needed for internal calls)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
