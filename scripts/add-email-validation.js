const fs = require('fs');
const path = require('path');

/**
 * Validates if an email address is valid and not from known invalid patterns
 * @param email The email address to validate
 * @returns true if email is valid and should receive emails, false otherwise
 */
function isValidEmailForSending(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Convert to lowercase for consistent checking
  const lowerEmail = email.toLowerCase().trim();

  // Known invalid email patterns to skip
  const invalidPatterns = [
    // Test emails
    /^test@/,
    /^testing@/,
    /^demo@/,
    /^example@/,
    /^sample@/,
    /@test\./,
    /@testing\./,
    /@example\./,
    /@sample\./,
    
    // Temporary/disposable email domains
    /@10minutemail\./,
    /@guerrillamail\./,
    /@mailinator\./,
    /@tempmail\./,
    /@throwaway\./,
    /@disposable\./,
    /@temp-mail\./,
    /@fakeinbox\./,
    /@yopmail\./,
    /@maildrop\./,
    
    // Invalid/placeholder domains
    /@invalid\./,
    /@placeholder\./,
    /@fake\./,
    /@dummy\./,
    /@localhost$/,
    /@127\.0\.0\.1$/,
    
    // Common typos in popular domains
    /@gmial\./,
    /@gmai\./,
    /@yahooo\./,
    /@hotmial\./,
    /@outlok\./,
    
    // No-reply and system emails
    /^noreply@/,
    /^no-reply@/,
    /^donotreply@/,
    /^do-not-reply@/,
    /^system@/,
    /^admin@.*\.local$/,
    /^root@.*\.local$/,
  ];

  // Check against invalid patterns
  for (const pattern of invalidPatterns) {
    if (pattern.test(lowerEmail)) {
      return false;
    }
  }

  // Additional checks for obviously fake emails
  if (
    lowerEmail.includes('asdf') ||
    lowerEmail.includes('qwerty') ||
    lowerEmail.includes('123456') ||
    lowerEmail.includes('abcdef') ||
    lowerEmail.match(/^[a-z]\@/) || // Single character before @
    lowerEmail.match(/\@[a-z]\./) // Single character domain
  ) {
    return false;
  }

  return true;
}

// Parse CSV line considering quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result.map(field => field.replace(/^"|"$/g, '').trim());
}

// Escape CSV field if needed
function escapeCSVField(field) {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Find the CSV file
const projectRoot = path.join(__dirname, '..');
const files = fs.readdirSync(projectRoot);
const csvFile = files.find(f => f.startsWith('users-export-') && f.endsWith('.csv'));

if (!csvFile) {
  console.error('No CSV file found matching pattern users-export-*.csv');
  process.exit(1);
}

const csvPath = path.join(projectRoot, csvFile);
console.log(`Processing file: ${csvFile}`);

// Read the CSV file
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

if (lines.length === 0) {
  console.error('CSV file is empty');
  process.exit(1);
}

// Parse header
const headerFields = parseCSVLine(lines[0]);
const emailIndex = headerFields.findIndex(h => h.toLowerCase() === 'email');

if (emailIndex === -1) {
  console.error('Email column not found in CSV');
  process.exit(1);
}

console.log(`Found email column at index ${emailIndex}`);

// Add new column header
const newHeader = [...headerFields, 'Email Valid'];
const outputLines = [newHeader.map(escapeCSVField).join(',')];

// Process each data row
let validCount = 0;
let invalidCount = 0;

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  
  if (fields.length > emailIndex) {
    const email = fields[emailIndex];
    const isValid = isValidEmailForSending(email);
    
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
    
    const newFields = [...fields, isValid ? 'valid' : 'invalid'];
    outputLines.push(newFields.map(escapeCSVField).join(','));
  }
}

// Create output filename with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const outputFilename = `users-export-validated-${timestamp}.csv`;
const outputPath = path.join(projectRoot, outputFilename);

// Write the new CSV
fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');

console.log(`\nValidation complete!`);
console.log(`✓ Valid emails: ${validCount}`);
console.log(`✗ Invalid emails: ${invalidCount}`);
console.log(`Total processed: ${validCount + invalidCount}`);
console.log(`\nOutput saved to: ${outputFilename}`);

