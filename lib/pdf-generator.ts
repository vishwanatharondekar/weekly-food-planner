import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MealData } from './storage';
import { DAYS_OF_WEEK, ALL_MEAL_TYPES, getWeekDays, getMealDisplayName, DEFAULT_MEAL_SETTINGS, type MealSettings } from './utils';
import { getVideoURLForRecipe } from './video-url-utils';
import { fallbackTranslate } from './translate-api';

import "./../components/fonts/generated/NotoSans-normal"; // the generated file
import "./../components/fonts/generated/NotoSans-bold"; // the generated file


// Note: Font imports removed - will use alternative approach for Unicode support

// Helper function to capitalize first letter of each word
function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * PDF Generator for Weekly Meal Plans
 * 
 * OPTIMIZED SINGLE-PAGE LANDSCAPE LAYOUT:
 * Carefully balanced design that fits everything on one page:
 * 
 * | Day | Breakfast | Morning Snack | Lunch | Evening Snack | Dinner |
 * |-----|-----------|---------------|-------|---------------|--------|
 * | Mon | Pancakes  | Apple         | Salad | Yogurt        | Chicken|
 * | Tue | Oatmeal   | Banana        | Soup  | Nuts          | Pasta  |
 * | Wed | Eggs      | Orange        | Wrap  | Cheese        | Fish   |
 * 
 * Optimizations:
 * - Compact header (30px height)
 * - Balanced fonts (16px title, 10px headers, 8px content)
 * - Optimized padding and spacing
 * - Single-page guarantee with 18px cell height
 * - Efficient text wrapping for long meal names
 */
export interface PDFMealPlan {
  weekStartDate: string;
  meals: MealData;
  userInfo?: {
    name?: string;
    email?: string;
  };
  mealSettings?: MealSettings;
  videoURLs?: { [day: string]: { [mealType: string]: string } };
  imageURLs?: { [day: string]: { [mealType: string]: string } };
  targetLanguage?: string; // Language code for translation
  selectedIngredients?: string[];
  extractedIngredients?: {
    categorized: { [category: string]: { name: string, amount: number, unit: string }[] };
    dayWise?: { [day: string]: { [mealType: string]: { name: string, ingredients: { name: string, amount: number, unit: string }[] } } };
  };
}

// Helper function to derive consolidated from categorized
function deriveConsolidatedFromCategorized(categorized: { [category: string]: { name: string, amount: number, unit: string }[] }): string[] {
  const consolidated: string[] = [];
  if (categorized && typeof categorized === 'object') {
    Object.values(categorized).forEach((category) => {
      if (Array.isArray(category)) {
        category.forEach((item) => {
          if (item.name && !consolidated.includes(item.name)) {
            consolidated.push(item.name);
          }
        });
      }
    });
  }
  return consolidated;
}

// Helper function to derive weights from categorized
function deriveWeightsFromCategorized(categorized: { [category: string]: { name: string, amount: number, unit: string }[] }): { [ingredient: string]: { amount: number, unit: string } } {
  const weights: { [ingredient: string]: { amount: number, unit: string } } = {};
  if (categorized && typeof categorized === 'object') {
    Object.values(categorized).forEach((category) => {
      if (Array.isArray(category)) {
        category.forEach((item) => {
          if (item.name && item.amount !== undefined && item.unit) {
            weights[item.name] = { amount: item.amount, unit: item.unit };
          }
        });
      }
    });
  }
  return weights;
}

// Helper function to derive grouped format from dayWise or meals structure
function deriveGroupedFromDayWise(dayWise?: { [day: string]: { [mealType: string]: { name: string, ingredients: { name: string, amount: number, unit: string }[] } } }): any[] {
  if (!dayWise) return [];
  
  const grouped: any[] = [];
  Object.entries(dayWise).forEach(([day, dayMeals]) => {
    Object.entries(dayMeals).forEach(([mealType, mealData]) => {
      if (mealData?.name && mealData?.ingredients && Array.isArray(mealData.ingredients)) {
        const mealIngredients = mealData.ingredients.map((ing: any) => ing.name);
        if (mealIngredients.length > 0) {
          grouped.push({ [mealData.name]: mealIngredients });
        }
      }
    });
  });
  return grouped;
}

// Helper function to derive grouped format from meals structure (fallback)
function deriveGroupedFromMeals(meals: { [day: string]: { [mealType: string]: any } }, enabledMealTypes: string[]): any[] {
  const grouped: any[] = [];
  const mealMap = new Map<string, string[]>();
  
  DAYS_OF_WEEK.forEach(day => {
    enabledMealTypes.forEach(mealType => {
      const meal = meals[day]?.[mealType];
      const mealName = meal instanceof Object && 'name' in meal ? meal.name : meal;
      if (mealName) {
        if (!mealMap.has(mealName)) {
          mealMap.set(mealName, []);
        }
        // For now, we'll just create entries with empty ingredient arrays
        // The actual ingredients will come from consolidated list
      }
    });
  });
  
  // Convert map to grouped format
  mealMap.forEach((ingredients, mealName) => {
    grouped.push({ [mealName]: ingredients });
  });
  
  return grouped;
}

// Helper function to get video URL from meal data
async function getVideoURL(meal: any): Promise<string> {
  if (typeof meal === 'object' && meal.videoUrl) {
    return meal.videoUrl;
  }
  
  const mealName = typeof meal === 'string' ? meal : meal.name || '';
  if (!mealName.trim()) return '';
  
  // Use the new video URL system
  return await getVideoURLForRecipe(mealName);
}

// Helper function to translate text
async function translateText(text: string, targetLanguage?: string): Promise<string> {
  
  if (!targetLanguage || targetLanguage === 'en') {
    return text;
  }

  try {
    // Try to use Google Translate API first
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
        sourceLanguage: 'en'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.translatedText) {
        return result.translatedText;
      }
    }
  } catch (error) {
    console.warn('Google Translate API failed, using fallback:', error);
  }

  // Fallback to basic translations if API fails
  return fallbackTranslate(text, targetLanguage);
}

export async function generateMealPlanPDF(mealPlan: PDFMealPlan): Promise<void> {
  try {
    // Create PDF in landscape orientation
    const doc = new jsPDF('landscape');


    // doc.addFont("NotoSansDevanagari-Regular.ttf", "NotoSans", "normal");
    let fontName = 'helvetica';

    if(mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      fontName = 'NotoSans'
    }
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add font support for multi-language characters
    if (mealPlan.targetLanguage && mealPlan.targetLanguage == 'en') {
      try {
        // Use Noto Sans font for proper Unicode support
        
        // Add the Noto Sans font to jsPDF
        // Note: This is a simplified approach - in production you might want to load the actual font file
        try {
          // Try to use a font that supports Unicode characters
          // For now, we'll use the default font but ensure proper text handling
          doc.setFont(fontName);
          
          // Test if we can render Unicode characters
          const testText = 'अबक'; // Hindi test characters
          
          // The real fix is to ensure the font actually contains the glyphs
          // For now, let's try to handle this at the text level
        } catch (fontError) {
          console.warn('Font setup failed, using default:', fontError);
        }
      } catch (error) {
        console.warn('Font/encoding setup failed, using default:', error);
      }
    }
    
    // Get enabled meal types from settings or use all meal types as fallback
    const enabledMealTypes = mealPlan.mealSettings?.enabledMealTypes || ALL_MEAL_TYPES;

    // Collect all meal names that need translation
    const mealNamesToTranslate: string[] = [];
    DAYS_OF_WEEK.forEach(day => {
      enabledMealTypes.forEach(mealType => {
        const meal = mealPlan.meals[day]?.[mealType];
        if (meal && meal instanceof Object && 'name' in meal && meal.name.trim()) {
          mealNamesToTranslate.push(meal.name.trim());
        } else if (meal && typeof meal === 'string' && meal.trim()) {
          mealNamesToTranslate.push(meal.trim());
        }
      });
    });


    // Pre-translate all texts that need translation
    const textsToTranslate = [
      'Weekly Meal Plan',
      'Day',
      'No meals planned for this week.',
      'Note: Blue meal names are clickable and link to recipe videos',
      ...enabledMealTypes.map(mealType => getMealDisplayName(mealType)),
      ...mealNamesToTranslate
    ];

    let translations: { [key: string]: string } = {};
    
    if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      try {
        // Use batch translation API for efficiency
        const response = await fetch('/api/translate/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            texts: textsToTranslate,
            targetLanguage: mealPlan.targetLanguage,
            sourceLanguage: 'en'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.translatedTexts && result.translatedTexts.length === textsToTranslate.length) {
            textsToTranslate.forEach((text, index) => {
              const translatedText = result.translatedTexts[index];
              translations[text] = translatedText;
            });
          }
        }
      } catch (error) {
        console.warn('Batch translation failed, using individual translations:', error);
        // Fall back to individual translations
        for (const text of textsToTranslate) {
          translations[text] = await translateText(text, mealPlan.targetLanguage);
        }
      }
    }

    // Helper function to get translated text
    const getTranslatedText = (text: string): string => {
      const translated = translations[text] || text;
      
      // Ensure proper text encoding for PDF generation
      if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
        try {
          // Normalize Unicode characters and ensure proper encoding
          const normalized = translated.normalize('NFC');
          return normalized;
        } catch (error) {
          console.warn('Text normalization failed, using original:', error);
          return translated;
        }
      }
      
      return translated;
    };
  
    // Simple color palette
    const colors = {
      primary: [52, 152, 219] as [number, number, number],
      secondary: [155, 89, 182] as [number, number, number],
      text: [44, 62, 80] as [number, number, number],
      textLight: [127, 140, 141] as [number, number, number],
      background: [248, 249, 250] as [number, number, number],
      white: [255, 255, 255] as [number, number, number]
    };

    // Compact header
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Title
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(20);
    doc.setFont(fontName, 'bold');
    const titleText = 'Weekly Meal Plan';
    
    // Try different text rendering methods for Unicode support
    try {
      doc.text(titleText, pageWidth / 2, 18, { align: 'center' });
    } catch (textError) {
      console.warn('Standard text rendering failed, trying alternative method:', textError);
      try {
        // Try using a different approach - split text into characters if needed
        if (titleText.length > 0) {
          doc.text(titleText, pageWidth / 2, 18, { align: 'center' });
        }
      } catch (altError) {
        console.error('Alternative text rendering also failed:', altError);
        // Fall back to English text
        doc.text('Weekly Meal Plan', pageWidth / 2, 18, { align: 'center' });
      }
    }
    
    // Week range
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(14);
    doc.setFont(fontName, 'normal');
    doc.text(
      `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`,
      pageWidth / 2,
      26,
      { align: 'center' }
    );

    // Start table closer to header
    let currentY = 40;

    // Prepare table data with meals in columns
    const tableData: (string | { content: string, link: string })[][] = [];
    
    for (let dayIndex = 0; dayIndex < DAYS_OF_WEEK.length; dayIndex++) {
      const day = DAYS_OF_WEEK[dayIndex];
      const dayDate = weekDays[dayIndex];
      const dayName = `${day.charAt(0).toUpperCase() + day.slice(1)}`;
      const dateStr = format(dayDate, 'MMM d');
      
      const row: (string | { content: string, link: string })[] = [
        `${dayName}\n${dateStr}`
      ];
      
      // Add meals as columns
      for (const mealType of enabledMealTypes) {
        const meal = mealPlan.meals[day]?.[mealType] || '';
        const mealName = meal instanceof Object && 'name' in meal ? meal.name : meal;
        if (mealName) {
          // Use stored video URL if available, otherwise generate search URL
          const storedVideoUrl = mealPlan.videoURLs?.[day]?.[mealType];
          const youtubeURL = storedVideoUrl || await getVideoURL(meal);
          
          // Get translated meal name
          const translatedMealName = getTranslatedText(mealName);
          
          row.push({
            content: translatedMealName,
            link: youtubeURL
          });
        } else {
          row.push('');
        }
      }
      
      tableData.push(row);
    }

    // Check if we have any data to display
    if (tableData.length === 0) {
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(20);
      doc.setFont(fontName, 'normal');
      doc.text(getTranslatedText('No meals planned for this week.'), pageWidth / 2, currentY + 20, { align: 'center' });
      doc.save(`meal-plan-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
      return;
    }

    // Create table headers
    const tableHeaders = [
      'Day',
      ...enabledMealTypes.map(mealType => getMealDisplayName(mealType))
    ];

    // Calculate column widths for landscape
    const dayColumnWidth = 25;
    const mealColumnWidth = (pageWidth - 40 - dayColumnWidth) / enabledMealTypes.length;

    // Create compact table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData.map(row => row.map(cell => typeof cell === 'object' ? '' : cell)),
      startY: currentY,
      theme: 'plain',
      styles: {
        fontSize: 1, // Hide default text
        cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
        textColor: [255, 255, 255], // Hide default text
        minCellHeight: 18,
        valign: 'middle'
      },
      headStyles: {
        fillColor: colors.secondary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 14,
        halign: 'center'
      },
      columnStyles: {
        0: { 
          cellWidth: dayColumnWidth,
          textColor: [255, 255, 255], // Hide default text
          halign: 'center',
          fontSize: 1
        },
        ...enabledMealTypes.reduce((styles, _, index) => {
          styles[index + 1] = { 
            cellWidth: mealColumnWidth,
            textColor: [255, 255, 255], // Hide default text
            halign: 'center',
            fontSize: 1
          };
          return styles;
        }, {} as any)
      },
      margin: { left: 20, right: 20 },
      didDrawCell: function(data) {
        try {
          // Custom text rendering
          if (data.section === 'body') {
            const rowData = tableData[data.row.index];
            const cellData = rowData[data.column.index];

            if (data.column.index === 0) {
              // Day column
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.setFont(fontName, 'bold');
              doc.setFontSize(10);
              
              const lines = (cellData as string).split('\n');
              const lineHeight = 6;
              const startY = data.cell.y + data.cell.height / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2;
              
              lines.forEach((line, index) => {
                doc.text(line, data.cell.x + data.cell.width / 2, startY + (index * lineHeight), { 
                  align: 'center',
                  baseline: 'middle'
                });
              });
            } else {
              // Meal columns
              if (typeof cellData === 'object') {
                // Clickable meal
                try {
                  doc.link(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, { 
                    url: cellData.link 
                  });
                } catch (error) {
                  console.warn('Failed to create link:', error);
                }
                
                if(cellData.link) {
                  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                } else {
                  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                }

                doc.setFont(fontName, 'normal');
                doc.setFontSize(10);
                
                // Handle long meal names by wrapping text
                const maxWidth = data.cell.width - 2;
                const words = cellData.content.split(' ');
                let lines = [''];
                let currentLine = 0;
                
                words.forEach(word => {
                  const testLine = lines[currentLine] + (lines[currentLine] ? ' ' : '') + word;
                  const testWidth = doc.getTextWidth(testLine);
                  
                  if (testWidth <= maxWidth) {
                    lines[currentLine] = testLine;
                  } else {
                    currentLine++;
                    lines[currentLine] = word;
                  }
                });
                
                const lineHeight = 5;
                const totalHeight = lines.length * lineHeight;
                const startY = data.cell.y + data.cell.height / 2 - totalHeight / 2 + lineHeight / 2;
                
                lines.forEach((line, index) => {
                  doc.text(line, data.cell.x + data.cell.width / 2, startY + (index * lineHeight), { 
                    align: 'center',
                    baseline: 'middle'
                  });
                });
              } else if (typeof cellData === 'string' && cellData.trim()) {
                // Non-clickable meal
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.setFont(fontName, 'normal');
                doc.setFontSize(10);
                doc.text(cellData, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { 
                  align: 'center',
                  baseline: 'middle'
                });
              }
            }
          }
        } catch (error) {
          console.warn('Error rendering cell:', error);
        }
      }
    });

    // Add compact instructions at the bottom
    const finalY = (doc as any).lastAutoTable?.finalY || currentY;
    if (finalY && finalY < pageHeight - 15) {
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      doc.setFontSize(10);
      doc.setFont(fontName, 'normal');
      doc.text(getTranslatedText('Note: Blue meal names are clickable and link to recipe videos'), 20, finalY + 10);
    }

    const weekDetails = `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d')}`;
    // Save the PDF
    doc.save(`Meal Plan ${weekDetails}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

export async function generateShoppingListPDF(mealPlan: PDFMealPlan): Promise<void> {
  try {
    const doc = new jsPDF();
    let fontName = 'helvetica';
    // TODO : Temporary disabled localisation for Shopping List
    // if(false) {
    if(mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      fontName = 'NotoSans'
    }
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Get enabled meal types from settings or use all meal types as fallback
    const enabledMealTypes = mealPlan.mealSettings?.enabledMealTypes || ALL_MEAL_TYPES;

    // Collect all meal names (original, untranslated)
    const originalMealNames: string[] = [];
    DAYS_OF_WEEK.forEach(day => {
      enabledMealTypes.forEach(mealType => {
        const meal = mealPlan.meals[day]?.[mealType];
        const mealName = meal instanceof Object && 'name' in meal ? meal.name : meal;
        if (mealName) {
          originalMealNames.push(mealName);
        }
      });
    });

    // Use already extracted ingredients if available, otherwise extract from meal names
    let ingredientsResult: { categorized: { [category: string]: { name: string, amount: number, unit: string }[] }, dayWise?: { [day: string]: { [mealType: string]: { name: string, ingredients: { name: string, amount: number, unit: string }[] } } } } = { categorized: {} };
    
    if (mealPlan.extractedIngredients) {
      // Use the already extracted ingredients from the shopping list modal
      ingredientsResult = {
        categorized: mealPlan.extractedIngredients.categorized || {},
        dayWise: mealPlan.extractedIngredients.dayWise
      };
    } else if (originalMealNames.length > 0) {
      // Fallback to API call if extracted ingredients not provided
      try {
        // Convert meals to dayWiseMeals format for the API
        const dayWiseMeals: { [day: string]: { [mealType: string]: string } } = {};
        DAYS_OF_WEEK.forEach(day => {
          dayWiseMeals[day] = {};
          enabledMealTypes.forEach(mealType => {
            const meal = mealPlan.meals[day]?.[mealType];
            const mealName = meal instanceof Object && 'name' in meal ? meal.name : meal;
            if (mealName) {
              dayWiseMeals[day][mealType] = mealName;
            }
          });
        });
        
        ingredientsResult = await extractIngredientsFromMeals(
          originalMealNames, 
          mealPlan.mealSettings?.portions || 1,
          mealPlan.weekStartDate,
          dayWiseMeals
        );
      } catch (error) {
        console.error('Error extracting ingredients:', error);
      }
    }

    // Derive consolidated from categorized
    const consolidated = deriveConsolidatedFromCategorized(ingredientsResult.categorized || {});

    // Derive weights from categorized
    const weights = deriveWeightsFromCategorized(ingredientsResult.categorized || {});

    // Derive grouped from dayWise if available, otherwise from meals structure
    const grouped = ingredientsResult.dayWise 
      ? deriveGroupedFromDayWise(ingredientsResult.dayWise)
      : deriveGroupedFromMeals(mealPlan.meals, enabledMealTypes);

    // Now prepare all texts for translation (meals + ingredients + UI text)
    const allIngredients = consolidated;
    
    // Extract meal names from the grouped result for translation
    const groupedMealNames: string[] = [];
    if (grouped && Array.isArray(grouped)) {
      grouped.forEach((mealObj: any) => {
        const mealName = Object.keys(mealObj)[0];
        if (mealName) {
          groupedMealNames.push(mealName);
        }
      });
    }
    
    const textsToTranslate = [
      'Smart Shopping List',
      'Shopping list for:',
      'No Meals Planned',
      'Note: Blue meal names are clickable and link to recipe videos',
      'Your Organized Shopping List',
      'Complete Ingredients List',
      'Plan some meals first to generate your shopping list!',
      ...groupedMealNames.map(mealName => mealName.toLocaleLowerCase()),
      ...allIngredients
    ];

    let translations: { [key: string]: string } = {};
    
    // TODO : Temporary disabled localisation for Shopping List
    // if(false) {
    if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      try {
        // Use batch translation API for efficiency
        const response = await fetch('/api/translate/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            texts: textsToTranslate,
            targetLanguage: mealPlan.targetLanguage,
            sourceLanguage: 'en'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.translatedTexts && result.translatedTexts.length === textsToTranslate.length) {
            textsToTranslate.forEach((text, index) => {
              const translatedText = result.translatedTexts[index];
              translations[text] = translatedText;
            });
          }
        }
      } catch (error) {
        console.warn('Shopping list batch translation failed, using individual translations:', error);
        // Fall back to individual translations
        for (const text of textsToTranslate) {
          translations[text] = await translateText(text, mealPlan.targetLanguage);
        }
      }
    }

    // Helper function to get translated text
    const getTranslatedText = (text: string): string => {
      const translated = translations[text.toLocaleLowerCase()] || text;
      
      // Ensure proper text encoding for PDF generation
      if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
        try {
          // Normalize Unicode characters and ensure proper encoding
          const normalized = translated.normalize('NFC');
          return normalized;
        } catch (error) {
          console.warn('Text normalization failed, using original:', error);
          return translated;
        }
      }
      
      return translated;
    };
  
    // Modern color palette (same as meal plan)
    const colors = {
      primary: [52, 152, 219] as [number, number, number], // Modern blue
      secondary: [155, 89, 182] as [number, number, number], // Purple
      accent: [231, 76, 60] as [number, number, number], // Red
      success: [46, 204, 113] as [number, number, number], // Green
      text: [44, 62, 80] as [number, number, number], // Dark blue-gray
      textLight: [127, 140, 141] as [number, number, number], // Light gray
      background: [236, 240, 241] as [number, number, number], // Very light gray
      white: [255, 255, 255] as [number, number, number],
      lightBlue: [174, 214, 241] as [number, number, number] // Light blue
    };

    // Add subtle background
    doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Modern header with gradient effect - more compact
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
  
    // Main title - more compact
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(20);
    // doc.setFont('helvetica', 'bold');
    doc.text('Shopping List', pageWidth / 2, 12, { align: 'center' });
  
    // Subtitle - more compact
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(14);
    // doc.setFont('helvetica', 'normal');
    doc.text(
      `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`,
      pageWidth / 2,
      20,
      { align: 'center' }
    );

    let currentY = 30;

    // Use translated meal names for display
    const allMeals: string[] = [];
    DAYS_OF_WEEK.forEach(day => {
      enabledMealTypes.forEach(mealType => {
        const meal = mealPlan.meals[day]?.[mealType];
        const mealName = meal instanceof Object && 'name' in meal ? meal.name : meal; 
        if (mealName) {
          // Use translated meal name if available
          const translatedMealName = getTranslatedText(mealName);
          allMeals.push(translatedMealName);
        }
      });
    });



    if (allMeals.length === 0) {
      // No meals section with modern styling
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.rect(20, currentY, pageWidth - 40, 80, 'F');
      doc.setDrawColor(colors.lightBlue[0], colors.lightBlue[1], colors.lightBlue[2]);
      doc.rect(20, currentY, pageWidth - 40, 80, 'S');
      
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(16);
      doc.setFont(fontName, 'bold');
      doc.text(getTranslatedText('No Meals Planned'), pageWidth / 2, currentY + 35, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont(fontName, 'normal');
      doc.text(getTranslatedText('Plan some meals first to generate your shopping list!'), pageWidth / 2, currentY + 55, { align: 'center' });
    } else {
      try {
        // Use the already extracted ingredients result
        const result = {
          ...ingredientsResult,
          consolidated: consolidated
        };

        // Create organized layout with modern cards
        if (grouped && grouped.length > 0 && consolidated && consolidated.length > 0) {
          // Check if we have categorized data
          if (result.categorized && Object.keys(result.categorized).length > 0) {
            // Define category colors (same as modal)
            const getCategoryColors = (category: string) => {
              switch (category) {
                case 'Vegetables':
                  return { bg: [34, 197, 94], border: [22, 163, 74], text: [255, 255, 255] }; // Green
                case 'Fruits':
                  return { bg: [249, 115, 22], border: [234, 88, 12], text: [255, 255, 255] }; // Orange
                case 'Dairy & Eggs':
                  return { bg: [59, 130, 246], border: [37, 99, 235], text: [255, 255, 255] }; // Blue
                case 'Meat & Seafood':
                  return { bg: [239, 68, 68], border: [220, 38, 38], text: [255, 255, 255] }; // Red
                case 'Grains & Pulses':
                  return { bg: [234, 179, 8], border: [202, 138, 4], text: [255, 255, 255] }; // Yellow
                case 'Spices & Herbs':
                  return { bg: [147, 51, 234], border: [124, 58, 237], text: [255, 255, 255] }; // Purple
                case 'Pantry Items':
                  return { bg: [245, 158, 11], border: [217, 119, 6], text: [255, 255, 255] }; // Amber
                default:
                  return { bg: [107, 114, 128], border: [75, 85, 99], text: [255, 255, 255] }; // Gray
              }
            };

            // Display categorized ingredients with pagination
            const categorizedEntries = Object.entries(result.categorized).filter(([category, items]) => items.length > 0);
            let remainingCategories = [...categorizedEntries];
            let categoryPageIndex = 0;
            
            // Calculate height for each category
            const calculateCategoryHeight = (items: any[]) => {
              const itemsPerRow = 3;
              const rows = Math.ceil(items.length / itemsPerRow);
              return 12 + (rows * 8) + 8; // Header + items + padding
            };
            
            while (remainingCategories.length > 0) {
              // Add new page if not the first page
              if (categoryPageIndex > 0) {
                doc.addPage();
                currentY = 30; // Reset Y position for new page
              }
              
              // Calculate categories per page based on available height
              const availableHeight = pageHeight - currentY - 50; // 50px buffer for footer
              let totalHeight = 0;
              let categoriesToShow = 0;
              
              // Calculate how many categories can fit on this page
              for (let i = 0; i < remainingCategories.length; i++) {
                const [category, items] = remainingCategories[i];
                const categoryHeight = calculateCategoryHeight(items);
                if (totalHeight + categoryHeight <= availableHeight) {
                  totalHeight += categoryHeight;
                  categoriesToShow++;
                } else {
                  break;
                }
              }
              
              const pageCategories = remainingCategories.splice(0, categoriesToShow);
              
              // Render categories for this page
              pageCategories.forEach(([category, items]) => {
                const categoryColors = getCategoryColors(category);
                const categoryHeight = calculateCategoryHeight(items);
                
                // Category container
                doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                doc.rect(15, currentY, pageWidth - 30, categoryHeight, 'F');
                doc.setDrawColor(categoryColors.border[0], categoryColors.border[1], categoryColors.border[2]);
                doc.setLineWidth(1);
                doc.rect(15, currentY, pageWidth - 30, categoryHeight, 'S');
                
                // Category title with color
                doc.setFillColor(categoryColors.bg[0], categoryColors.bg[1], categoryColors.bg[2]);
                doc.rect(15, currentY, pageWidth - 30, 12, 'F');
                doc.setTextColor(categoryColors.text[0], categoryColors.text[1], categoryColors.text[2]);
                doc.setFontSize(10);
                doc.setFont(fontName, 'bold');
                doc.text(category, 20, currentY + 8);
                
                // Category items
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                let listY = currentY + 16;
                doc.setFontSize(8);
                doc.setFont(fontName, 'normal');
                
                const itemsPerRow = 3;
                // Display all items in organized rows
                for (let i = 0; i < items.length; i += itemsPerRow) {
                  let xPos = 20;
                  const rowItems = items.slice(i, i + itemsPerRow);
                  const columnWidth = (pageWidth - 50) / itemsPerRow;
                  
                  rowItems.forEach((item, colIndex) => {
                    const cleanIngredient = capitalizeWords(item.name.replace(/[&]/g, 'and').trim());
                    
                    // Add smaller checkbox
                    doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                    doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
                    doc.roundedRect(xPos, listY - 2, 2, 2, 1, 1, 'FD');
                    
                    // Display ingredient with weight
                    let displayText = getTranslatedText(cleanIngredient);
                    displayText += ` (${item.amount} ${item.unit})`;
                    doc.text(displayText, xPos + 6, listY);
                    
                    xPos += columnWidth;
                  });
                  listY += 8;
                }
                
                currentY += categoryHeight + 5;
              });
              
              categoryPageIndex++;
            }
          } else {
            // Fallback to unified list if no categorized data
            const unifiedListHeight = 60;
            doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
            doc.rect(15, currentY, pageWidth - 30, unifiedListHeight, 'F');
            doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.setLineWidth(1);
            doc.rect(15, currentY, pageWidth - 30, unifiedListHeight, 'S');
            
            // Shopping list header - more compact
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(15, currentY, pageWidth - 30, 15, 'F');
            doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
            doc.setFontSize(10);
            doc.setFont(fontName, 'bold');
            doc.text('Unified Ingredients List', 20, currentY + 10);
            
            // Shopping list content - more compact
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            let listY = currentY + 20;
            doc.setFontSize(8);
            doc.setFont(fontName, 'normal');

            // Create a map to count the number of meals each ingredient appears in
            const ingredientMealCount: { [ingredient: string]: number } = {};
            if (grouped && Array.isArray(grouped)) {
              grouped.forEach((mealObj: any) => {
                // Each mealObj is like { "Meal Name": [ingredients] }
                const ingredients = Object.values(mealObj)[0];
                if (Array.isArray(ingredients)) {
                  ingredients.forEach((ingredient: string) => {
                    const cleanIngredient = ingredient.trim().toLowerCase();
                    ingredientMealCount[cleanIngredient.trim()] = (ingredientMealCount[cleanIngredient.trim()] || 0) + 1;
                  });
                }
              });
            }
            
            // Sort consolidated by descending count in ingredientMealCount, then alphabetically
            consolidated.sort((a, b) => {
              const countA = ingredientMealCount[a.trim().toLowerCase()] || 0;
              const countB = ingredientMealCount[b.trim().toLowerCase()] || 0;
              if (countA !== countB) {
                return countB - countA; // Descending by count
              }
              // If counts are equal, sort alphabetically
              return a.localeCompare(b);
            });

            // Create organized columns - use 4 columns for better space utilization
            const itemsPerColumn = Math.ceil(consolidated.length / 4);
            const columns = [
              consolidated.slice(0, itemsPerColumn),
              consolidated.slice(itemsPerColumn, itemsPerColumn * 2),
              consolidated.slice(itemsPerColumn * 2, itemsPerColumn * 3),
              consolidated.slice(itemsPerColumn * 3)
            ];
            
            const maxItems = Math.max(...columns.map(col => col.length));
            for (let i = 0; i < maxItems; i++) {
              let xPos = 20;
              const columnWidth = (pageWidth - 50) / 4;
              columns.forEach((column, colIndex) => {
                if (column[i] && listY < currentY + unifiedListHeight - 5) {
                  const cleanIngredient = capitalizeWords(column[i].replace(/[&]/g, 'and').trim());
                  const weight = weights[column[i]];
                  
                  // Add smaller checkbox
                  doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                  doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
                  doc.roundedRect(xPos, listY - 2, 2, 2, 1, 1, 'FD');
                  
                  // Display ingredient with weight if available
                  let displayText = getTranslatedText(cleanIngredient);
                  if (weight) {
                    displayText += ` (${weight.amount} ${weight.unit})`;
                  }
                  doc.text(displayText, xPos + 6, listY);
                  doc.text(`(${ingredientMealCount[cleanIngredient.trim().toLowerCase()]})`, xPos + doc.getTextWidth(displayText) + 8, listY);
                }
                xPos += columnWidth;
              });
              listY += 5;
            }
            
            currentY += unifiedListHeight + 8;
          }

          // Add new section: Ingredients by Meal - with pagination
          let remainingMeals = [...grouped];
          let pageIndex = 0;

          // Calculate dynamic height for each meal based on ingredient count and line wrapping
          const calculateMealHeight = (mealGroup: any) => {
            const mealName = Object.keys(mealGroup)[0];
            const ingredients = mealGroup[mealName];
            const mealNameHeight = 10; // Height for meal name
            const ingredientLineHeight = 6; // Height per ingredient line
            const maxLineWidth = pageWidth - 50; // Available width for ingredients
            
            let totalIngredientHeight = 0;
            let currentLineWidth = 0;
            let lineCount = 0;
            
            ingredients.forEach((ingredient: string) => {
              const cleanIngredient = capitalizeWords(ingredient.replace(/[&]/g, 'and').trim());
              const translatedIngredient = getTranslatedText(cleanIngredient);
              const ingredientWidth = doc.getTextWidth(translatedIngredient) + 8; // +8 for spacing
              
              if (currentLineWidth + ingredientWidth > maxLineWidth) {
                currentLineWidth = ingredientWidth;
                lineCount++;
              } else {
                currentLineWidth += ingredientWidth;
              }
            });
            
            // Add one more line if we have any ingredients
            if (ingredients.length > 0) {
              lineCount++;
            }
            
            totalIngredientHeight = lineCount * ingredientLineHeight;
            return mealNameHeight + totalIngredientHeight + 5; // +5 for spacing
          };

          const totalMeals = grouped.length;
          const totalPages = Math.ceil(totalMeals / 10); // Estimate pages, will be adjusted dynamically

          
          while (remainingMeals.length > 0) {
            // Add new page if not the first page
            if (pageIndex > 0) {
              doc.addPage();
              currentY = 30; // Reset Y position for new page
            }
            
            // Calculate meals per page based on dynamic heights
            const availableHeight = pageHeight - currentY - 50; // 50px buffer for footer
            let totalHeight = 15; // Header height
            let mealsToShow = 0;
            
            // Calculate how many meals can fit on this page
            for (let i = 0; i < remainingMeals.length; i++) {
              const mealHeight = calculateMealHeight(remainingMeals[i]);
              if (totalHeight + mealHeight <= availableHeight) {
                totalHeight += mealHeight;
                mealsToShow++;
              } else {
                break;
              }
            }
            
            const pageMeals = remainingMeals.splice(0, mealsToShow);
            
            // Calculate total height for this page's meals
            const ingredientsByMealHeight = 15 + pageMeals.reduce((sum, meal) => sum + calculateMealHeight(meal), 0);
            doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
            doc.rect(15, currentY, pageWidth - 30, ingredientsByMealHeight, 'F');
            doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.setLineWidth(1);
            doc.rect(15, currentY, pageWidth - 30, ingredientsByMealHeight, 'S');
            
            // Section header - more compact
            doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.rect(15, currentY, pageWidth - 30, 15, 'F');
            doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
            doc.setFontSize(10);
            doc.text(`Ingredients by Meal (Page ${pageIndex + 1} of ${totalPages})`, 20, currentY + 10);
            
            // Ingredients by meal content - with dynamic positioning
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            let mealY = currentY + 20;
            doc.setFontSize(8);
            
            pageMeals.forEach((mealGroup: any, index: number) => {
              const mealName = Object.keys(mealGroup)[0];
              const ingredients = mealGroup[mealName];
              
              // Meal name - more compact (use translated meal name)
              const translatedMealName = getTranslatedText(mealName);
              doc.setFontSize(10);
              doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
              doc.text(`${translatedMealName}:`, 20, mealY);
              
              // Ingredients for this meal - with proper line wrapping
              doc.setFontSize(8);
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              
              let ingredientX = 25;
              let ingredientY = mealY + 5;
              const maxLineWidth = pageWidth - 50; // Available width for ingredients
              
              ingredients.forEach((ingredient: string, ingIndex: number) => {
                const cleanIngredient = capitalizeWords(ingredient.replace(/[&]/g, 'and').trim());
                const translatedIngredient = getTranslatedText(cleanIngredient);
                const ingredientWidth = doc.getTextWidth(translatedIngredient) + 8; // +8 for spacing
                
                // Check if ingredient fits on current line
                if (ingredientX + ingredientWidth > maxLineWidth) {
                  ingredientX = 25;
                  ingredientY += 6;
                }
                
                // Add smaller checkbox
                doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
                doc.roundedRect(ingredientX, ingredientY - 2, 2, 2, 1, 1, 'FD');
                doc.text(translatedIngredient, ingredientX + 4, ingredientY);
                ingredientX += ingredientWidth;
              });
              
              // Move to next meal position based on actual content height
              const mealHeight = calculateMealHeight(mealGroup);
              mealY += mealHeight;
            });
            
            currentY += ingredientsByMealHeight + 5;
            pageIndex++;
          }
        }
      } catch (error) {
        console.error('Error extracting ingredients:', error);
        // Fallback with modern styling
        doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
        doc.rect(20, currentY, pageWidth - 40, 60, 'F');
        doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.rect(20, currentY, pageWidth - 40, 60, 'S');
        
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFontSize(12);
        // doc.setFont(fontName, 'bold');
        doc.text('Your Planned Meals', 25, currentY + 15);
        
        doc.setFontSize(10);
        // doc.setFont(fontName, 'normal');
        let mealY = currentY + 25;
        allMeals.slice(0, 6).forEach((meal, index) => {
          if (mealY < currentY + 55) {
            doc.text(`• ${meal}`, 25, mealY);
            mealY += 8;
          }
        });
        
        currentY += 70;
      }
    }

  // Modern footer
  doc.setFillColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(8);
  // doc.setFont(fontName, 'normal');
  doc.text(
    'Generated by Weekly Food Planner App!',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // Enhanced filename
  const weekDetails = `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d')}`;
  const filename = `Shopping List ${weekDetails}.pdf`;
  
  // Save the PDF
  doc.save(filename);
  } catch (error) {
    console.error('Error generating shopping list PDF:', error);
    alert('Failed to generate shopping list PDF. Please try again.');
  }
}

async function extractIngredientsFromMeals(
  meals: string[], 
  portions: number = 1, 
  weekStartDate?: string,
  dayWiseMeals?: { [day: string]: { [mealType: string]: string } }
): Promise<{ categorized: { [category: string]: { name: string, amount: number, unit: string }[] }, dayWise?: { [day: string]: { [mealType: string]: { name: string, ingredients: { name: string, amount: number, unit: string }[] } } } }> {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    if (!weekStartDate) {
      throw new Error('weekStartDate is required for shopping list generation');
    }

    const response = await fetch('/api/ai/get-shopping-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        meals, 
        portions,
        weekStartDate,
        dayWiseMeals
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract ingredients');
    }

    const data = await response.json();

    return {
      categorized: data.categorized || {},
      dayWise: data.dayWise
    };
  } catch (error) {
    console.error('Error calling AI for ingredients:', error);
    // Fallback: basic ingredient extraction
    return {
      categorized: {}
    };
  }
}

function extractBasicIngredients(meals: string[]): string[] {
  const ingredients = new Set<string>();
  
  // Basic ingredient mapping for common Indian dishes
  const ingredientMap: { [key: string]: string[] } = {
    'baigan': ['brinjal', 'eggplant'],
    'paneer': ['paneer'],
    'egg': ['eggs'],
    'chicken': ['chicken'],
    'fish': ['fish'],
    'dal': ['lentils', 'dal'],
    'rice': ['rice'],
    'roti': ['wheat flour', 'atta'],
    'bread': ['bread'],
    'milk': ['milk'],
    'curd': ['curd', 'yogurt'],
    'tomato': ['tomatoes'],
    'onion': ['onions'],
    'potato': ['potatoes'],
    'carrot': ['carrots'],
    'cauliflower': ['cauliflower', 'gobi'],
    'spinach': ['spinach', 'palak'],
    'coriander': ['coriander', 'dhania'],
    'ginger': ['ginger'],
    'garlic': ['garlic'],
    'turmeric': ['turmeric powder'],
    'cumin': ['cumin seeds'],
    'mustard': ['mustard seeds'],
    'oil': ['cooking oil'],
    'ghee': ['ghee'],
    'salt': ['salt'],
    'sugar': ['sugar'],
    'chilli': ['red chilli powder'],
    'masala': ['garam masala'],
  };

  meals.forEach(meal => {
    const lowerMeal = meal.toLowerCase();
    
    // Check for exact matches
    for (const [key, ingredientList] of Object.entries(ingredientMap)) {
      if (lowerMeal.includes(key)) {
        ingredientList.forEach(ingredient => ingredients.add(ingredient));
      }
    }
    
    // Add common ingredients that are usually needed
    if (lowerMeal.includes('curry') || lowerMeal.includes('sabji') || lowerMeal.includes('sabzi')) {
      ingredients.add('onions');
      ingredients.add('tomatoes');
      ingredients.add('ginger');
      ingredients.add('garlic');
      ingredients.add('turmeric powder');
      ingredients.add('cooking oil');
    }
  });

  return Array.from(ingredients).sort();
}
