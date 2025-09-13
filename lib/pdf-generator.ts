import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MealData } from './storage';
import { DAYS_OF_WEEK, ALL_MEAL_TYPES, getWeekDays, getMealDisplayName, DEFAULT_MEAL_SETTINGS, type MealSettings } from './utils';
import { getVideoURLForRecipe } from './video-url-utils';

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

export async function generateMealPlanPDF(mealPlan: PDFMealPlan): Promise<void> {
  try {
    // Create PDF in landscape orientation
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Get enabled meal types from settings or use all meal types as fallback
    const enabledMealTypes = mealPlan.mealSettings?.enabledMealTypes || ALL_MEAL_TYPES;
  
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
    doc.setFont('helvetica', 'bold');
    doc.text('Weekly Meal Plan', pageWidth / 2, 18, { align: 'center' });
    
    // Week range
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
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
          
          row.push({
            content: meal.trim(),
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
      doc.setFont('helvetica', 'normal');
      doc.text('No meals planned for this week.', pageWidth / 2, currentY + 20, { align: 'center' });
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
              doc.setFont('helvetica', 'bold');
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

                doc.setFont('helvetica', 'normal');
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
                doc.setFont('helvetica', 'normal');
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
      doc.setFont('helvetica', 'normal');
      doc.text('Note: Blue meal names are clickable and link to recipe videos', 20, finalY + 10);
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
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
  
    // Get enabled meal types from settings or use all meal types as fallback
    const enabledMealTypes = mealPlan.mealSettings?.enabledMealTypes || ALL_MEAL_TYPES;
  
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
    doc.setFont('helvetica', 'bold');
    doc.text('Shopping List', pageWidth / 2, 12, { align: 'center' });
  
    // Subtitle - more compact
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`,
      pageWidth / 2,
      20,
      { align: 'center' }
    );

    let currentY = 30;

    // Extract all meals (only from enabled meal types)
    const allMeals: string[] = [];
    DAYS_OF_WEEK.forEach(day => {
      enabledMealTypes.forEach(mealType => {
        const meal = mealPlan.meals[day]?.[mealType];
        if (meal && meal.trim()) {
          allMeals.push(meal);
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
      doc.setFont('helvetica', 'bold');
      doc.text('No Meals Planned', pageWidth / 2, currentY + 35, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Plan some meals first to generate your shopping list!', pageWidth / 2, currentY + 55, { align: 'center' });
    } else {
      try {
        // Use AI to extract ingredients
        // const result = await extractIngredientsFromMeals(allMeals);
        const result = {"grouped":[{"Poha":["flattened rice","onions","potatoes","peanuts"]},{"Mug Matki Suki Bhaji":["moong beans","moth beans","onions","tomatoes"]},{"Godi Dal":["toor dal","jaggery","tamarind"]},{"Chapati":["wheat flour"]},{"Rice":["rice"]},{"Vanga Fry":["brinjal"]},{"Sabudana Khichdi":["sago","potatoes","peanuts"]},{"Tomato Bhaji":["tomatoes","onions"]},{"Godi Dal rice chapati":["toor dal","rice","wheat flour","jaggery"]},{"Suran Fry":["elephant foot yam"]},{"Half Fry Chapati":["eggs","wheat flour"]},{"Kolambi Bhaji":["prawns","onions","tomatoes","coconut"]},{"Tikhat Dal":["toor dal","onions","tomatoes"]},{"Papad":["papad"]},{"Egg Shakshuka":["eggs","tomatoes","onions","bell peppers"]},{"Sandwich":["bread","cucumber","tomatoes","onions","potatoes"]},{"Aaloo Palak":["potatoes","spinach","onions","tomatoes"]},{"Kadi":["yogurt","gram flour"]},{"Koshimbir":["cucumber","tomatoes","onions","yogurt"]},{"Loncha":["pickle"]},{"Besan Poli Chapati":["gram flour","jaggery","wheat flour"]},{"Tondli":["ivy gourd","potatoes"]},{"Kakadi Salad":["cucumber","peanuts"]},{"Idli Chutney":["idli rice","urad dal","coconut"]},{"Masala Khichdi":["rice","moong dal","mixed vegetables","onions","tomatoes"]},{"Pav Bhaji":["pav","potatoes","onions","tomatoes","mixed vegetables","butter"]},{"Misal Pav":["pav","moth beans","onions","tomatoes","farsan"]},{"Chicken Biryani":["chicken","basmati rice","onions","tomatoes","yogurt"]},{"Raita":["yogurt","cucumber","onions"]}],"consolidated":["basmati rice","bell peppers","bread","brinjal","butter","chicken","coconut","cucumber","eggs","elephant foot yam","farsan","flattened rice","gram flour","idli rice","ivy gourd","jaggery","mixed vegetables","moong beans","moong dal","moth beans","onions","papad","pav","peanuts","pickle","potatoes","prawns","rice","sago","spinach","tamarind","tomatoes","toor dal","urad dal","wheat flour","yogurt"]}

        console.log('result : ')
        console.log(JSON.stringify(result));
        
        // Create organized layout with modern cards
        if (result.grouped && result.grouped.length > 0 && result.consolidated && result.consolidated.length > 0) {
          // Main shopping list card - more compact
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
          doc.setFont('helvetica', 'bold');
          doc.text('Unified Ingredients List', 20, currentY + 10);
          
          // Shopping list content - more compact
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          let listY = currentY + 20;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          
          // Create organized columns - use 4 columns for better space utilization
          const itemsPerColumn = Math.ceil(result.consolidated.length / 4);
          const columns = [
            result.consolidated.slice(0, itemsPerColumn),
            result.consolidated.slice(itemsPerColumn, itemsPerColumn * 2),
            result.consolidated.slice(itemsPerColumn * 2, itemsPerColumn * 3),
            result.consolidated.slice(itemsPerColumn * 3)
          ];
          
          const maxItems = Math.max(...columns.map(col => col.length));
          for (let i = 0; i < maxItems; i++) {
            let xPos = 20;
            const columnWidth = (pageWidth - 50) / 4;
            columns.forEach((column, colIndex) => {
              if (column[i] && listY < currentY + unifiedListHeight - 5) {
                const cleanIngredient = column[i].replace(/[&]/g, 'and').trim();
                // Add smaller checkbox
                doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.rect(xPos, listY - 2, 3, 3, 'FD');
                doc.text(cleanIngredient, xPos + 6, listY);
              }
              xPos += columnWidth;
            });
            listY += 5;
          }
          
          currentY += unifiedListHeight + 8;

          // Add new section: Ingredients by Meal - more compact
          const ingredientsByMealHeight = Math.min(pageHeight - currentY - 30, 15 + (result.grouped.length * 14));
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
          doc.setFont('helvetica', 'bold');
          doc.text('Ingredients by Meal', 20, currentY + 10);
          
          // Ingredients by meal content - more compact
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          let mealY = currentY + 20;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          
          result.grouped.forEach((mealGroup: any, index: number) => {
            if (mealY > currentY + ingredientsByMealHeight - 10) return; // Don't overflow
            
            const mealName = Object.keys(mealGroup)[0];
            const ingredients = mealGroup[mealName];
            
            // Meal name - more compact
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.text(`${mealName}:`, 20, mealY);
            
            // Ingredients for this meal - more compact
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            
            let ingredientX = 25;
            let ingredientY = mealY + 4;
            let lineCount = 0;
            
            ingredients.forEach((ingredient: string, ingIndex: number) => {
              if (ingredientX + doc.getTextWidth(ingredient) > pageWidth - 50) {
                ingredientX = 25;
                ingredientY += 6;
                lineCount++;
              }
              
              if (lineCount < 3) { // Allow 3 lines per meal for more ingredients
                const cleanIngredient = ingredient.replace(/[&]/g, 'and').trim();
                // Add smaller checkbox
                doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.rect(ingredientX, ingredientY - 1, 2, 2, 'FD');
                doc.text(cleanIngredient, ingredientX + 4, ingredientY);
                ingredientX += doc.getTextWidth(cleanIngredient) + 8;
              }
            });
            
            mealY += 12;
          });
          
          currentY += ingredientsByMealHeight + 5;
        } else if (result.consolidated && result.consolidated.length > 0) {
          // Fallback: Only consolidated list with modern styling - more compact
          const fallbackHeight = 50;
          doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
          doc.rect(15, currentY, pageWidth - 30, fallbackHeight, 'F');
          doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.setLineWidth(1);
          doc.rect(15, currentY, pageWidth - 30, fallbackHeight, 'S');
          
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Unified Ingredients List', 20, currentY + 10);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          
          let itemY = currentY + 18;
          result.consolidated.forEach((ingredient: string) => {
            if (itemY < currentY + fallbackHeight - 5) {
              const cleanIngredient = ingredient.replace(/[&]/g, 'and').trim();
              // Add smaller checkbox
              doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
              doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.rect(20, itemY - 2, 3, 3, 'FD');
              doc.text(cleanIngredient, 26, itemY);
              itemY += 5;
            }
          });
          
          currentY += fallbackHeight + 8;

          // Add grouped ingredients section if available - more compact
          if (result.grouped && result.grouped.length > 0) {
            const ingredientsByMealHeight = Math.min(pageHeight - currentY - 30, 15 + (result.grouped.length * 14));
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
            doc.setFont('helvetica', 'bold');
            doc.text('Ingredients by Meal', 20, currentY + 10);
            
            // Ingredients by meal content - more compact
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            let mealY = currentY + 20;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            result.grouped.forEach((mealGroup: any, index: number) => {
              if (mealY > currentY + ingredientsByMealHeight - 10) return; // Don't overflow
              
              const mealName = Object.keys(mealGroup)[0];
              const ingredients = mealGroup[mealName];
              
              // Meal name - more compact
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
              doc.text(`${mealName}:`, 20, mealY);
              
              // Ingredients for this meal - more compact
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6);
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              
              let ingredientX = 25;
              let ingredientY = mealY + 2;
              let lineCount = 0;
              
              ingredients.forEach((ingredient: string, ingIndex: number) => {
                if (ingredientX + doc.getTextWidth(ingredient) > pageWidth - 50) {
                  ingredientX = 25;
                  ingredientY += 6;
                  lineCount++;
                }
                
                if (lineCount < 3) { // Allow 3 lines per meal for more ingredients
                  const cleanIngredient = ingredient.replace(/[&]/g, 'and').trim();
                  // Add smaller checkbox
                  doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
                  doc.setDrawColor(colors.text[0], colors.text[1], colors.text[2]);
                  doc.rect(ingredientX, ingredientY - 1, 2, 2, 'FD');
                  doc.text(cleanIngredient, ingredientX + 4, ingredientY);
                  ingredientX += doc.getTextWidth(cleanIngredient) + 8;
                }
              });
              
              mealY += 14;
            });
            
            currentY += ingredientsByMealHeight + 5;
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
        doc.setFont('helvetica', 'bold');
        doc.text('Your Planned Meals', 25, currentY + 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
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
  doc.setFont('helvetica', 'normal');
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
