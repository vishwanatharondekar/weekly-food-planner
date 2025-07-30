import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MealData } from './storage';
import { DAYS_OF_WEEK, ALL_MEAL_TYPES, getWeekDays, getMealDisplayName, DEFAULT_MEAL_SETTINGS, type MealSettings } from './utils';

export interface PDFMealPlan {
  weekStartDate: string;
  meals: MealData;
  userInfo?: {
    name?: string;
    email?: string;
  };
  mealSettings?: MealSettings;
}

// Helper function to generate direct YouTube video URL for a recipe
function generateDirectYouTubeURL(mealName: string): string {
  if (!mealName || !mealName.trim()) return '';
  
  // Clean the meal name and create a focused search query
  const cleanMealName = mealName.trim().replace(/[^\w\s]/g, '');
  
  // Create a more specific search that's likely to find recipe videos
  const searchQuery = `${cleanMealName} recipe tutorial cooking`;
  const encodedQuery = encodeURIComponent(searchQuery);
  
  // Use YouTube's search with additional parameters for better video results:
  // - sp=EgIQAQ%253D%253D filters for videos only
  // - type=video ensures we get videos
  // This format often shows the most relevant cooking video first
  const url = `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIQAQ%253D%253D`;
  
  return url;
}

export function generateMealPlanPDF(mealPlan: PDFMealPlan): void {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Get enabled meal types from settings or use all meal types as fallback
    const enabledMealTypes = mealPlan.mealSettings?.enabledMealTypes || ALL_MEAL_TYPES;
  
    // Modern color palette - simplified for compatibility
    const colors = {
      primary: [52, 152, 219] as [number, number, number],
      secondary: [155, 89, 182] as [number, number, number],
      accent: [231, 76, 60] as [number, number, number],
      success: [46, 204, 113] as [number, number, number],
      text: [44, 62, 80] as [number, number, number],
      textLight: [127, 140, 141] as [number, number, number],
      background: [236, 240, 241] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      lightBlue: [174, 214, 241] as [number, number, number]
    };

    // Add subtle background
    doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Modern header with gradient effect
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 55, 'F');
    
    // Add header shadow effect
    doc.setFillColor(colors.primary[0] - 20, colors.primary[1] - 20, colors.primary[2] - 20);
    doc.rect(0, 52, pageWidth, 3, 'F');

    // Main title with better typography
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Weekly Meal Plan', pageWidth / 2, 25, { align: 'center' });
    
    // Subtitle with week range
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`,
      pageWidth / 2,
      40,
      { align: 'center' }
    );

    // User info card
    let currentY = 70;
    if (mealPlan.userInfo?.name) {
      // User info card with rounded corners effect
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.rect(15, currentY - 5, pageWidth - 30, 25, 'F');
      
      // Card border
      doc.setDrawColor(colors.lightBlue[0], colors.lightBlue[1], colors.lightBlue[2]);
      doc.setLineWidth(1);
      doc.rect(15, currentY - 5, pageWidth - 30, 25, 'S');
      
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Prepared for:', 20, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(mealPlan.userInfo.name, 65, currentY + 5);
      
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      doc.setFontSize(9);
      doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, 20, currentY + 13);
      currentY += 35;
    }

    // Prepare table data with clickable meal names
    const tableData: (string | { content: string, link: string })[][] = [];
    
    DAYS_OF_WEEK.forEach((day, index) => {
      const dayDate = weekDays[index];
      const dayName = `${day.charAt(0).toUpperCase() + day.slice(1)}`;
      const dateStr = format(dayDate, 'MMM d');
      
      const row: (string | { content: string, link: string })[] = [
        `${dayName}\n${dateStr}`
      ];
      
      // Add meals with YouTube links
      enabledMealTypes.forEach(mealType => {
        const meal = mealPlan.meals[day]?.[mealType] || '';
        if (meal.trim()) {
          const youtubeURL = generateDirectYouTubeURL(meal);
          // Handle long meal names by adding line breaks for better display
          let displayMeal = meal.trim();
          if (displayMeal.length > 25) {
            // Split long meal names at word boundaries for better display
            const words = displayMeal.split(' ');
            if (words.length > 3) {
              const midPoint = Math.ceil(words.length / 2);
              displayMeal = words.slice(0, midPoint).join(' ') + '\n' + words.slice(midPoint).join(' ');
            }
          }
          row.push({
            content: displayMeal,
            link: youtubeURL
          });
        } else {
          row.push('');
        }
      });
      
      tableData.push(row);
    });

    // Create enhanced table headers
    const tableHeaders = [
      'Day',
      ...enabledMealTypes.map(mealType => getMealDisplayName(mealType))
    ];

      // Dynamic column sizing with better proportions for longer food names
  const dayColumnWidth = 25;

    // Create beautiful modern table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData.map(row => row.map(cell => typeof cell === 'object' ? '' : cell)),
      startY: currentY,
      theme: 'plain',
      styles: {
        fontSize: 1, // Tiny font to effectively hide all default text
        cellPadding: { top: 8, right: 6, bottom: 10, left: 6 },
        lineColor: colors.lightBlue,
        lineWidth: 0.5,
        textColor: [255, 255, 255], // White text (invisible on white background)
        minCellHeight: 30,
        valign: 'top'
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 20
      },
      columnStyles: {
        0: { 
          cellWidth: dayColumnWidth, 
          fontStyle: 'bold',
          fillColor: colors.secondary,
          textColor: [255, 255, 255], // Hide default text
          halign: 'center',
          valign: 'middle',
          fontSize: 1
        },
        ...enabledMealTypes.reduce((styles, _, index) => {
          styles[index + 1] = { 
            textColor: [255, 255, 255], // Hide default text
            fillColor: index % 2 === 0 ? colors.white : colors.lightBlue,
            fontSize: 1,
            valign: 'middle',
            halign: 'center'
          };
          return styles;
        }, {} as any)
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250] as [number, number, number]
      },
      margin: { left: 20, right: 20 },
      didDrawCell: function(data) {
        // Custom text rendering for all cells to avoid double rendering
        if (data.section === 'body') {
          if (data.column.index === 0) {
            // Day column: render day and date
            const rowData = tableData[data.row.index];
            const dayText = rowData[0] as string; // This contains "Monday\nJul 29" format
            
            doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            
            // Split day and date, render them separately
            const lines = dayText.split('\n');
            const lineHeight = 12;
            const startY = data.cell.y + data.cell.height / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2;
            
            lines.forEach((line, index) => {
              doc.text(line, data.cell.x + data.cell.width / 2, startY + (index * lineHeight), { 
                align: 'center'
              });
            });
          } else {
            // Meal columns: render meal names
            const rowData = tableData[data.row.index];
            const cellData = rowData[data.column.index];
            
            if (typeof cellData === 'object' && cellData.link) {
              // Clickable meal: render in blue with link
              const lines = cellData.content.split('\n');
              const lineHeight = 10;
              const totalTextHeight = lines.length * lineHeight;
              const startY = data.cell.y + data.cell.height / 2 - totalTextHeight / 2 + lineHeight / 2;
              
              // Add clickable link over the text area with some padding
              try {
                doc.link(data.cell.x + 3, data.cell.y + 3, data.cell.width - 6, data.cell.height - 6, { 
                  url: cellData.link 
                });
              } catch (error) {
                // Link creation failed but continue
              }
              
              // Render clickable text in blue
              doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              
              lines.forEach((line, index) => {
                doc.text(line, data.cell.x + data.cell.width / 2, startY + (index * lineHeight), { 
                  align: 'center'
                });
              });
            } else if (typeof cellData === 'string' && cellData.trim()) {
              // Non-clickable meal: render in normal color
              const lines = cellData.split('\n');
              const lineHeight = 10;
              const totalTextHeight = lines.length * lineHeight;
              const startY = data.cell.y + data.cell.height / 2 - totalTextHeight / 2 + lineHeight / 2;
              
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              
              lines.forEach((line, index) => {
                doc.text(line, data.cell.x + data.cell.width / 2, startY + (index * lineHeight), { 
                  align: 'center'
                });
              });
            }
            // If cell is empty, don't render anything
          }
        }
      }
    });

    // Modern instructions card
    const finalY = (doc as any).lastAutoTable?.finalY || currentY;
    currentY = finalY + 20;
    
    // Instructions card
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(20, currentY, pageWidth - 40, 35, 'F');
    
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('How to Use This Meal Plan', pageWidth / 2, currentY + 12, { align: 'center' });
    
      doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Blue meal names are clickable - click to watch cooking tutorial videos!', pageWidth / 2, currentY + 25, { align: 'center' });

    // Modern tips section
    currentY += 50;
    
    doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.rect(20, currentY, pageWidth - 40, 60, 'F');
    doc.setDrawColor(colors.lightBlue[0], colors.lightBlue[1], colors.lightBlue[2]);
    doc.rect(20, currentY, pageWidth - 40, 60, 'S');
    
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Helpful Tips', 25, currentY + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
      const tips = [
    '• Check for allergies and dietary restrictions before cooking',
    '• Adjust portion sizes according to your family size',
    '• Feel free to substitute ingredients based on availability',
    '• Blue meal names are clickable for cooking video tutorials'
  ];
    
    tips.forEach((tip, index) => {
      doc.text(tip, 25, currentY + 25 + (index * 8));
    });

    // Modern footer
    doc.setFillColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Generated by Weekly Food Planner App - Your Smart Cooking Companion',
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );

    // Enhanced filename
    const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');
    const userName = mealPlan.userInfo?.name ? `-${mealPlan.userInfo.name.replace(/\s+/g, '-')}` : '';
    const filename = `weekly-meal-plan-${weekStartFormatted}${userName}.pdf`;
    
    // Save the PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating meal plan PDF:', error);
    alert('Failed to generate meal plan PDF. Please try again.');
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

    // Modern header with gradient effect
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(0, 0, pageWidth, 55, 'F');
  
    // Add header shadow effect
    doc.setFillColor(colors.success[0] - 20, colors.success[1] - 20, colors.success[2] - 20);
    doc.rect(0, 52, pageWidth, 3, 'F');

    // Main title
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart Shopping List', pageWidth / 2, 25, { align: 'center' });
  
    // Subtitle
    const weekStart = new Date(mealPlan.weekStartDate);
    const weekDays = getWeekDays(weekStart);
    const weekEnd = weekDays[6];
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
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
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Shopping list for:', 20, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(mealPlan.userInfo.name, 75, currentY + 5);
      
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      doc.setFontSize(9);
      doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, 20, currentY + 13);
      currentY += 35;
    }

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
        const result = await extractIngredientsFromMeals(allMeals);
        
        // Modern shopping list title
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Your Organized Shopping List', 20, currentY);
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
          doc.setFont('helvetica', 'bold');
          doc.text('Complete Ingredients List', 25, currentY + 13);
          
          // Shopping list content
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          let listY = currentY + 30;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
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
          doc.setFont('helvetica', 'bold');
          doc.text('Shopping List', 25, currentY + 15);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
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

    // Modern tips section
  const tipsY = Math.min(currentY + 20, pageHeight - 80);
  
  doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.rect(20, tipsY, pageWidth - 40, 35, 'F');
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart Shopping Tips', pageWidth / 2, tipsY + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Check items off as you shop • Buy fresh produce last • Compare prices for deals', pageWidth / 2, tipsY + 25, { align: 'center' });

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
