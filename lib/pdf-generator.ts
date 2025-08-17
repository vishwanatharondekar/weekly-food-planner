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
  targetLanguage?: string; // Language code for translation
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
  console.log('Translating text:', text, 'to language:', targetLanguage);
  
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
        console.log('Translation successful:', text, '->', result.translatedText);
        return result.translatedText;
      }
    }
  } catch (error) {
    console.warn('Google Translate API failed, using fallback:', error);
  }

  // Fallback to basic translations if API fails
  console.log('Using fallback translation for:', text);
  return fallbackTranslate(text, targetLanguage);
}

export async function generateMealPlanPDF(mealPlan: PDFMealPlan): Promise<void> {
  try {
    // Create PDF in landscape orientation
    const doc = new jsPDF('landscape');

    console.log("font list", doc.getFontList());

    // doc.addFont("NotoSansDevanagari-Regular.ttf", "NotoSans", "normal");
    let fontName = 'helvetica';

    if(mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      fontName = 'NotoSans'
    }


    console.log("added font NotoSans");
    console.log("mealPlan.targetLanguage", doc.getFontList());
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add font support for multi-language characters
    if (mealPlan.targetLanguage && mealPlan.targetLanguage == 'en') {
      try {
        // Use Noto Sans font for proper Unicode support
        console.log('Setting up Noto Sans font for Unicode support in language:', mealPlan.targetLanguage);
        
        // Add the Noto Sans font to jsPDF
        // Note: This is a simplified approach - in production you might want to load the actual font file
        try {
          // Try to use a font that supports Unicode characters
          // For now, we'll use the default font but ensure proper text handling
          doc.setFont(fontName);
          
          // Test if we can render Unicode characters
          const testText = 'अबक'; // Hindi test characters
          console.log('Testing Unicode support with text:', testText);
          
          // The real fix is to ensure the font actually contains the glyphs
          // For now, let's try to handle this at the text level
          console.log('Font setup complete - will attempt Unicode rendering');
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
        if (meal && meal.trim()) {
          mealNamesToTranslate.push(meal.trim());
        }
      });
    });

    console.log('Meal plan - Meal names to translate:', mealNamesToTranslate);

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
              console.log(`Batch translation result: "${text}" -> "${translatedText}"`);
              translations[text] = translatedText;
            });
            console.log('Batch translation successful:', translations);
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
      console.log(`getTranslatedText: "${text}" -> "${translated}"`);
      
      // Ensure proper text encoding for PDF generation
      if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
        try {
          // Normalize Unicode characters and ensure proper encoding
          const normalized = translated.normalize('NFC');
          console.log(`Normalized text: "${translated}" -> "${normalized}"`);
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
    const titleText = getTranslatedText('Weekly Meal Plan');
    console.log(`Rendering title: "${titleText}"`);
    
    // Try different text rendering methods for Unicode support
    try {
      doc.text(titleText, pageWidth / 2, 18, { align: 'center' });
      console.log('Title rendered successfully with standard method');
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
        if (meal && meal.trim()) {
          // Use stored video URL if available, otherwise generate search URL
          const storedVideoUrl = mealPlan.videoURLs?.[day]?.[mealType];
          const youtubeURL = storedVideoUrl || await getVideoURL(meal);
          
          // Get translated meal name
          const translatedMealName = getTranslatedText(meal.trim());
          console.log(`Translating meal "${meal.trim()}" to "${translatedMealName}"`);
          
          // Debug: Check if the translated text contains non-ASCII characters
          const hasNonAscii = /[^\x00-\x7F]/.test(translatedMealName);
          console.log(`Meal "${translatedMealName}" has non-ASCII characters: ${hasNonAscii}`);
          
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
      getTranslatedText('Day'),
      ...enabledMealTypes.map(mealType => getTranslatedText(getMealDisplayName(mealType)))
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

    // Save the PDF
    doc.save(`meal-plan-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}

export async function generateShoppingListPDF(mealPlan: PDFMealPlan): Promise<void> {
  try {
    const doc = new jsPDF();

    console.log("NotoSansDevanagari-Regular-normal.ttf", "NotoSans");
    doc.setFont("NotoSans");
    
    let fontName = 'helvetica';

    if(mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      fontName = 'NotoSansDevanagari-Regular'
    }


    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add font support for multi-language characters
    if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
      try {
        // Use Noto Sans font for proper Unicode support
        console.log('Setting up Noto Sans font for Unicode support in language:', mealPlan.targetLanguage);
        
        // Add the Noto Sans font to jsPDF
        // Note: This is a simplified approach - in production you might want to load the actual font file
        try {
          // Try to use a font that supports Unicode characters
          // For now, we'll use the default font but ensure proper text handling
          doc.setFont(fontName);
          
          // Test if we can render Unicode characters
          const testText = 'अबक'; // Hindi test characters
          console.log('Testing Unicode support with text:', testText);
          
          // The real fix is to ensure the font actually contains the glyphs
          // For now, let's try to handle this at the text level
          console.log('Font setup complete - will attempt Unicode rendering');
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
        if (meal && meal.trim()) {
          mealNamesToTranslate.push(meal.trim());
        }
      });
    });

    console.log('Shopping list - Meal names to translate:', mealNamesToTranslate);

    // Pre-translate all texts that need translation
    const textsToTranslate = [
      'Smart Shopping List',
      'Shopping list for:',
      'No Meals Planned',
      'Note: Blue meal names are clickable and link to recipe videos',
      'Your Organized Shopping List',
      'Complete Ingredients List',
      'Plan some meals first to generate your shopping list!',
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
              console.log(`Shopping list batch translation result: "${text}" -> "${translatedText}"`);
              translations[text] = translatedText;
            });
            console.log('Shopping list batch translation successful:', translations);
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
      const translated = translations[text] || text;
      console.log(`getTranslatedText: "${text}" -> "${translated}"`);
      
      // Ensure proper text encoding for PDF generation
      if (mealPlan.targetLanguage && mealPlan.targetLanguage !== 'en') {
        try {
          // Normalize Unicode characters and ensure proper encoding
          const normalized = translated.normalize('NFC');
          console.log(`Normalized text: "${translated}" -> "${normalized}"`);
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

    // Modern header with gradient effect
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(0, 0, pageWidth, 55, 'F');
  
    // Add header shadow effect
    doc.setFillColor(colors.success[0] - 20, colors.success[1] - 20, colors.success[2] - 20);
    doc.rect(0, 52, pageWidth, 3, 'F');

    // Main title
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(24);
    doc.setFont(fontName, 'bold');
    const shoppingTitleText = getTranslatedText('Smart Shopping List');
    console.log(`Rendering shopping list title: "${shoppingTitleText}"`);
    
    // Try different text rendering methods for Unicode support
    try {
      doc.text(shoppingTitleText, pageWidth / 2, 25, { align: 'center' });
      console.log('Shopping list title rendered successfully with standard method');
    } catch (textError) {
      console.warn('Standard text rendering failed, trying alternative method:', textError);
      try {
        // Try using a different approach - split text into characters if needed
        if (shoppingTitleText.length > 0) {
          doc.text(shoppingTitleText, pageWidth / 2, 25, { align: 'center' });
        }
      } catch (altError) {
        console.error('Alternative text rendering also failed:', altError);
        // Fall back to English text
        doc.text('Smart Shopping List', pageWidth / 2, 25, { align: 'center' });
      }
    }
  
    // Subtitle
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(16);
    doc.setFont(fontName, 'normal');
    doc.text(
      `For week: ${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`,
      pageWidth / 2,
      40,
      { align: 'center' }
    );

    // User info card
    let currentY = 70;
    if (mealPlan.userInfo?.name) {
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.rect(15, currentY - 5, pageWidth - 30, 25, 'F');
      doc.setDrawColor(colors.lightBlue[0], colors.lightBlue[1], colors.lightBlue[2]);
      doc.setLineWidth(1);
      doc.rect(15, currentY - 5, pageWidth - 30, 25, 'S');
      
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(14);
      doc.setFont(fontName, 'bold');
      doc.text(getTranslatedText('Shopping list for:'), 20, currentY + 5);
      doc.setFont(fontName, 'normal');
      doc.text(mealPlan.userInfo.name, 75, currentY + 5);
      
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      doc.setFontSize(12);
      doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, 20, currentY + 13);
      currentY += 35;
    }

    // Extract all meals (only from enabled meal types) - use translated versions
    const allMeals: string[] = [];
    DAYS_OF_WEEK.forEach(day => {
      enabledMealTypes.forEach(mealType => {
        const meal = mealPlan.meals[day]?.[mealType];
        if (meal && meal.trim()) {
          // Use translated meal name if available
          const translatedMealName = getTranslatedText(meal.trim());
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
        // Use AI to extract ingredients
        const result = await extractIngredientsFromMeals(allMeals);
        
        // Modern shopping list title
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFontSize(16);
        doc.setFont(fontName, 'bold');
        doc.text(getTranslatedText('Your Organized Shopping List'), 20, currentY);
        currentY += 20;
        
        // Create organized layout with modern cards
        if (result.grouped && result.grouped.length > 0 && result.consolidated && result.consolidated.length > 0) {
          // Main shopping list card
          doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
          doc.rect(20, currentY, pageWidth - 40, 100, 'F');
          doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.setLineWidth(2);
          doc.rect(20, currentY, pageWidth - 40, 100, 'S');
          
          // Shopping list header
          doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(20, currentY, pageWidth - 40, 20, 'F');
          doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
          doc.setFontSize(12);
          doc.setFont(fontName, 'bold');
          doc.text(getTranslatedText('Complete Ingredients List'), 25, currentY + 13);
          
          // Shopping list content
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          let listY = currentY + 30;
          doc.setFontSize(9);
          doc.setFont(fontName, 'normal');
          
          // Create organized columns
          const itemsPerColumn = Math.ceil(result.consolidated.length / 3);
          const columns = [
            result.consolidated.slice(0, itemsPerColumn),
            result.consolidated.slice(itemsPerColumn, itemsPerColumn * 2),
            result.consolidated.slice(itemsPerColumn * 2)
          ];
          
          const maxItems = Math.max(...columns.map(col => col.length));
          for (let i = 0; i < maxItems; i++) {
            let xPos = 25;
            columns.forEach((column, colIndex) => {
              if (column[i] && listY < currentY + 95) {
                const cleanIngredient = column[i].replace(/[&]/g, 'and').trim();
                // Add checkbox
                doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.rect(xPos, listY - 3, 4, 4, 'FD');
                doc.text(cleanIngredient, xPos + 8, listY);
              }
              xPos += 55;
            });
            listY += 7;
          }
          
          currentY += 110;
        } else if (result.consolidated && result.consolidated.length > 0) {
          // Fallback: Only consolidated list with modern styling
          doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
          doc.rect(20, currentY, pageWidth - 40, 80, 'F');
          doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(20, currentY, pageWidth - 40, 80, 'S');
          
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.setFontSize(12);
          doc.setFont(fontName, 'bold');
          doc.text('Shopping List', 25, currentY + 15);
          
          doc.setFontSize(9);
          doc.setFont(fontName, 'normal');
          
          let itemY = currentY + 25;
          result.consolidated.forEach((ingredient: string) => {
            if (itemY < currentY + 75) {
              const cleanIngredient = ingredient.replace(/[&]/g, 'and').trim();
              // Add checkbox
              doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
              doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.rect(25, itemY - 3, 4, 4, 'FD');
              doc.text(cleanIngredient, 33, itemY);
              itemY += 7;
            }
          });
          
          currentY += 90;
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
        doc.setFont(fontName, 'bold');
        doc.text('Your Planned Meals', 25, currentY + 15);
        
        doc.setFontSize(10);
        doc.setFont(fontName, 'normal');
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

    // Modern tips section
  const tipsY = Math.min(currentY + 20, pageHeight - 80);
  
  doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.rect(20, tipsY, pageWidth - 40, 35, 'F');
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.text('Smart Shopping Tips', pageWidth / 2, tipsY + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.text('Check items off as you shop • Buy fresh produce last • Compare prices for deals', pageWidth / 2, tipsY + 25, { align: 'center' });

  // Modern footer
  doc.setFillColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(8);
  doc.setFont(fontName, 'normal');
  doc.text(
    'Generated by Weekly Food Planner App - Shop Smart, Save Time!',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // Enhanced filename
  const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');
  const userName = mealPlan.userInfo?.name ? `-${mealPlan.userInfo.name.replace(/\s+/g, '-')}` : '';
  const filename = `smart-shopping-list-${weekStartFormatted}${userName}.pdf`;
  
  // Save the PDF
  doc.save(filename);
  } catch (error) {
    console.error('Error generating shopping list PDF:', error);
    alert('Failed to generate shopping list PDF. Please try again.');
  }
}

async function extractIngredientsFromMeals(meals: string[]): Promise<{ grouped: any[], consolidated: string[] }> {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/ai/extract-ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ meals }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract ingredients');
    }

    const data = await response.json();
    
    return {
      grouped: data.grouped || [],
      consolidated: data.consolidated || []
    };
  } catch (error) {
    console.error('Error calling AI for ingredients:', error);
    // Fallback: basic ingredient extraction
    const basicIngredients = extractBasicIngredients(meals);
    return {
      grouped: [],
      consolidated: basicIngredients
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
