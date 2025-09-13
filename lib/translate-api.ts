export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getLanguageByName = (name: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.name === name || lang.nativeName === name);
};

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResponse {
  translatedText: string;
  detectedLanguage?: string;
}

// Cache interface for storing translations
interface TranslationCache {
  [key: string]: {
    translatedText: string;
    detectedLanguage?: string;
    timestamp: number;
  };
}

export class TranslateAPI {
  private apiKey: string;
  private baseUrl: string;
  private cache: TranslationCache = {};
  private cacheExpiryMs: number = 24 * 60 * 60 * 1000; // 24 hours default
  
  // Singleton instance
  private static instance: TranslateAPI | null = null;

  constructor(apiKey: string, cacheExpiryMs?: number) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://translation.googleapis.com/language/translate/v2';
    if (cacheExpiryMs) {
      this.cacheExpiryMs = cacheExpiryMs;
    }
  }

  // Singleton getInstance method
  public static getInstance(apiKey: string, cacheExpiryMs?: number): TranslateAPI {
    if (!TranslateAPI.instance) {
      TranslateAPI.instance = new TranslateAPI(apiKey, cacheExpiryMs);
    }
    return TranslateAPI.instance;
  }

  // Reset singleton instance (useful for testing or when API key changes)
  public static resetInstance(): void {
    TranslateAPI.instance = null;
  }

  // Generate cache key for a translation request
  private getCacheKey(text: string, targetLanguage: string, sourceLanguage?: string): string {
    const source = sourceLanguage || 'auto';
    return `${text}:${targetLanguage}:${source}`;
  }

  // Check if cache entry is valid (not expired)
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheExpiryMs;
  }

  // Get translation from cache if available and valid
  private getFromCache(text: string, targetLanguage: string, sourceLanguage?: string): TranslationResponse | null {
    const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
    const cached = this.cache[cacheKey];
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return {
        translatedText: cached.translatedText,
        detectedLanguage: cached.detectedLanguage
      };
    }
    
    return null;
  }

  // Store translation in cache
  private storeInCache(text: string, targetLanguage: string, sourceLanguage: string, response: TranslationResponse): void {
    const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
    this.cache[cacheKey] = {
      translatedText: response.translatedText,
      detectedLanguage: response.detectedLanguage,
      timestamp: Date.now()
    };
  }

  // Clear expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete = Object.keys(this.cache).filter(key => 
      now - this.cache[key].timestamp >= this.cacheExpiryMs
    );
    
    keysToDelete.forEach(key => {
      delete this.cache[key];
    });
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  // Get cache statistics
  public getCacheStats(): { totalEntries: number; expiredEntries: number; validEntries: number } {
    this.cleanupCache();
    const now = Date.now();
    const totalEntries = Object.keys(this.cache).length;
    const expiredEntries = Object.values(this.cache).filter(entry => 
      now - entry.timestamp >= this.cacheExpiryMs
    ).length;
    const validEntries = totalEntries - expiredEntries;
    
    return { totalEntries, expiredEntries, validEntries };
  }

  // Clear entire cache
  public clearCache(): void {
    this.cache = {};
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    // Check cache first
    const cached = this.getFromCache(request.text, request.targetLanguage, request.sourceLanguage);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: request.text,
          target: request.targetLanguage,
          source: request.sourceLanguage || 'auto',
          format: 'text'
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.translations && data.data.translations.length > 0) {
        const result = {
          translatedText: data.data.translations[0].translatedText,
          detectedLanguage: data.data.translations[0].detectedSourceLanguage
        };
        
        // Store in cache
        this.storeInCache(request.text, request.targetLanguage, request.sourceLanguage || 'auto', result);
        return result;
      }

      throw new Error('No translation data received');
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  async translateBatch(texts: string[], targetLanguage: string, sourceLanguage?: string): Promise<string[]> {
    // Check cache first for each text
    const results: string[] = [];
    const textsToTranslate: { text: string; index: number }[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cached = this.getFromCache(text, targetLanguage, sourceLanguage);

      if (cached) {
        results[i] = cached.translatedText;
      } else {
        textsToTranslate.push({ text, index: i });
      }
    }
    
    // If all texts are cached, return immediately
    if (textsToTranslate.length === 0) {
      return results;
    }
    
    // Translate only the texts that aren't cached
    if (textsToTranslate.length > 0) {
      try {
        const textsToTranslateArray = textsToTranslate.map(item => item.text);
        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: textsToTranslateArray,
            target: targetLanguage,
            source: sourceLanguage || 'auto',
            format: 'text'
          }),
        });

        if (!response.ok) {
          throw new Error(`Batch translation failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.data && data.data.translations) {
          // Store new translations in cache and fill results
          for (let i = 0; i < textsToTranslate.length; i++) {
            const { text, index } = textsToTranslate[i];
            const translation = data.data.translations[i];
            
            if (translation) {
              const result = {
                translatedText: translation.translatedText,
                detectedLanguage: translation.detectedSourceLanguage
              };
              
              // Store in cache
              this.storeInCache(text, targetLanguage, sourceLanguage || 'auto', result);
              
              // Fill the result at the correct index
              results[index] = result.translatedText;
            }
          }
        } else {
          throw new Error('No batch translation data received');
        }
      } catch (error) {
        console.error('Batch translation error:', error);
        throw error;
      }
    }
    
    return results;
  }
}

// Fallback translation function for when API is not available
export const fallbackTranslate = (text: string, targetLanguage: string): string => {
  // Simple fallback - return original text with a note
  if (targetLanguage === 'en') {
    return text;
  }
  
  // For demo purposes, you could add some basic translations here
  const basicTranslations: { [key: string]: { [key: string]: string } } = {
    'hi': {
      'Breakfast': 'नाश्ता',
      'Lunch': 'दोपहर का भोजन',
      'Dinner': 'रात का भोजन',
      'Snack': 'नाश्ता',
      'Weekly Meal Plan': 'साप्ताहिक भोजन योजना',
      'Shopping List': 'खरीदारी की सूची',
      'Day': 'दिन',
      'Smart Shopping List': 'स्मार्ट खरीदारी सूची',
      'Shopping list for:': 'के लिए खरीदारी सूची:',
      'No Meals Planned': 'कोई भोजन योजनाबद्ध नहीं',
      'Note: Blue meal names are clickable and link to recipe videos': 'नोट: नीले रंग के भोजन के नाम क्लिक करने योग्य हैं और रेसिपी वीडियो से जुड़े हैं',
      'Your Organized Shopping List': 'आपकी व्यवस्थित खरीदारी सूची',
      'Complete Ingredients List': 'पूरी सामग्री की सूची',
      'Plan some meals first to generate your shopping list!': 'अपनी खरीदारी सूची बनाने के लिए पहले कुछ भोजन योजना बनाएं!'
    },
    'mr': {
      'Breakfast': 'नाश्ता',
      'Lunch': 'दुपारचे जेवण',
      'Dinner': 'रात्रीचे जेवण',
      'Snack': 'नाश्ता',
      'Weekly Meal Plan': 'साप्ताहिक जेवण योजना',
      'Shopping List': 'खरेदीची यादी',
      'Day': 'दिवस',
      'Smart Shopping List': 'स्मार्ट खरेदी यादी',
      'Shopping list for:': 'साठी खरेदी यादी:',
      'No Meals Planned': 'कोणतेही जेवण नियोजित नाही',
      'Note: Blue meal names are clickable and link to recipe videos': 'टीप: निळ्या रंगातील जेवणाचे नाव क्लिक करण्यायोग्य आहेत आणि रेसिपी व्हिडिओशी जोडलेले आहेत',
      'Your Organized Shopping List': 'तुमची व्यवस्थित खरेदी यादी',
      'Complete Ingredients List': 'पूर्ण सामग्री यादी',
      'Plan some meals first to generate your shopping list!': 'तुमची खरेदी यादी तयार करण्यासाठी प्रथम काही जेवणे योजना करा!'
    },
    'bn': {
      'Breakfast': 'সকালের নাস্তা',
      'Lunch': 'দুপুরের খাবার',
      'Dinner': 'রাতের খাবার',
      'Snack': 'নাস্তা',
      'Weekly Meal Plan': 'সাপ্তাহিক খাবার পরিকল্পনা',
      'Shopping List': 'কেনাকাটার তালিকা',
      'Day': 'দিন',
      'Smart Shopping List': 'স্মার্ট কেনাকাটার তালিকা',
      'Shopping list for:': 'জন্য কেনাকাটার তালিকা:',
      'No Meals Planned': 'কোন খাবার পরিকল্পনা করা হয়নি',
      'Note: Blue meal names are clickable and link to recipe videos': 'নোট: নীল রঙের খাবারের নামগুলি ক্লিকযোগ্য এবং রেসিপি ভিডিওর সাথে সংযুক্ত'
    },
    'te': {
      'Breakfast': 'అల్పాహారం',
      'Lunch': 'మధ్యాహ్న భోజనం',
      'Dinner': 'రాత్రి భోజనం',
      'Snack': 'చిరుతిండి',
      'Weekly Meal Plan': 'వారపు ఆహార ప్రణాళిక',
      'Shopping List': 'కొనుగోలు జాబితా',
      'Day': 'రోజు',
      'Smart Shopping List': 'స్మార్ట్ కొనుగోలు జాబితా',
      'Shopping list for:': 'కోసం కొనుగోలు జాబితా:',
      'No Meals Planned': 'ఏ ఆహారం ప్రణాళిక చేయబడలేదు'
    },
    'ta': {
      'Breakfast': 'காலை உணவு',
      'Lunch': 'மதிய உணவு',
      'Dinner': 'மாலை உணவு',
      'Snack': 'சிற்றுணவு',
      'Weekly Meal Plan': 'வாராந்திர உணவு திட்டம்',
      'Shopping List': 'வாங்கும் பட்டியல்',
      'Day': 'நாள்',
      'Smart Shopping List': 'ஸ்மார்ட் வாங்கும் பட்டியல்',
      'Shopping list for:': 'க்கான வாங்கும் பட்டியல்:',
      'No Meals Planned': 'எந்த உணவும் திட்டமிடப்படவில்லை'
    },
    'gu': {
      'Breakfast': 'નાસ્તો',
      'Lunch': 'બપોરનો ભોજન',
      'Dinner': 'રાતનો ભોજન',
      'Snack': 'નાસ્તો',
      'Weekly Meal Plan': 'સાપ્તાહિક ભોજન યોજના',
      'Shopping List': 'ખરીદીની યાદી',
      'Day': 'દિવસ',
      'Smart Shopping List': 'સ્માર્ટ ખરીદીની યાદી',
      'Shopping list for:': 'માટે ખરીદીની યાદી:',
      'No Meals Planned': 'કોઈ ભોજન યોજના નથી'
    },
    'kn': {
      'Breakfast': 'ಅಲ್ಪಾಹಾರ',
      'Lunch': 'ಮಧ್ಯಾಹ್ನದ ಊಟ',
      'Dinner': 'ರಾತ್ರಿಯ ಊಟ',
      'Snack': 'ತಿಂಡಿ',
      'Weekly Meal Plan': 'ವಾರದ ಆಹಾರ ಯೋಜನೆ',
      'Shopping List': 'ಖರೀದಿ ಪಟ್ಟಿ',
      'Day': 'ದಿನ',
      'Smart Shopping List': 'ಸ್ಮಾರ್ಟ್ ಖರೀದಿ ಪಟ್ಟಿ',
      'Shopping list for:': 'ಗಾಗಿ ಖರೀದಿ ಪಟ್ಟಿ:',
      'No Meals Planned': 'ಯಾವುದೇ ಆಹಾರ ಯೋಜನೆ ಇಲ್ಲ'
    },
    'ml': {
      'Breakfast': 'പ്രഭാത ഭക്ഷണം',
      'Lunch': 'ഉച്ചഭക്ഷണം',
      'Dinner': 'രാത്രി ഭക്ഷണം',
      'Snack': 'ലഘു ഭക്ഷണം',
      'Weekly Meal Plan': 'വാര ഭക്ഷണ പദ്ധതി',
      'Shopping List': 'ഷോപ്പിംഗ് ലിസ്റ്റ്',
      'Day': 'ദിവസം',
      'Smart Shopping List': 'സ്മാർട്ട് ഷോപ്പിംഗ് ലിസ്റ്റ്',
      'Shopping list for:': 'എന്നതിനുള്ള ഷോപ്പിംഗ് ലിസ്റ്റ്:',
      'No Meals Planned': 'ഭക്ഷണം ഒരുക്കിയിട്ടില്ല'
    },
    'pa': {
      'Breakfast': 'ਨਾਸ਼ਤਾ',
      'Lunch': 'ਦੁਪਹਿਰ ਦਾ ਖਾਣਾ',
      'Dinner': 'ਰਾਤ ਦਾ ਖਾਣਾ',
      'Snack': 'ਨਾਸ਼ਤਾ',
      'Weekly Meal Plan': 'ਹਫ਼ਤਾਵਾਰ ਖਾਣੇ ਦੀ ਯੋਜਨਾ',
      'Shopping List': 'ਖਰੀਦਦਾਰੀ ਦੀ ਸੂਚੀ',
      'Day': 'ਦਿਨ',
      'Smart Shopping List': 'ਸਮਾਰਟ ਖਰੀਦਦਾਰੀ ਸੂਚੀ',
      'Shopping list for:': 'ਲਈ ਖਰੀਦਦਾਰੀ ਸੂਚੀ:',
      'No Meals Planned': 'ਕੋਈ ਖਾਣਾ ਯੋਜਨਾਬੱਧ ਨਹੀਂ'
    },
    'ur': {
      'Breakfast': 'ناشتہ',
      'Lunch': 'دوپہر کا کھانا',
      'Dinner': 'رات کا کھانا',
      'Snack': 'ناشتہ',
      'Weekly Meal Plan': 'ہفتہ وار کھانے کی منصوبہ بندی',
      'Shopping List': 'خریداری کی فہرست',
      'Day': 'دن',
      'Smart Shopping List': 'سمارٹ خریداری کی فہرست',
      'Shopping list for:': 'کے لیے خریداری کی فہرست:',
      'No Meals Planned': 'کوئی کھانا منصوبہ بندی نہیں'
    },
    'or': {
      'Breakfast': 'ପ୍ରଭାତ ଭୋଜନ',
      'Lunch': 'ମଧ୍ୟାହ୍ନ ଭୋଜନ',
      'Dinner': 'ରାତି ଭୋଜନ',
      'Snack': 'ହଳକା ଭୋଜନ',
      'Weekly Meal Plan': 'ସାପ୍ତାହିକ ଭୋଜନ ଯୋଜନା',
      'Shopping List': 'କିଣାକଟା ତାଲିକା',
      'Day': 'ଦିନ',
      'Smart Shopping List': 'ସ୍ମାର୍ଟ କିଣାକଟା ତାଲିକା',
      'Shopping list for:': 'ପାଇଁ କିଣାକଟା ତାଲିକା:',
      'No Meals Planned': 'କୌଣସି ଭୋଜନ ଯୋଜନା ନାହିଁ'
    },
    'as': {
      'Breakfast': 'পুৱাৰ আহাৰ',
      'Lunch': 'দুপৰীয়াৰ আহাৰ',
      'Dinner': 'ৰাতিৰ আহাৰ',
      'Snack': 'জলপান',
      'Weekly Meal Plan': 'সাপ্তাহিক আহাৰৰ পৰিকল্পনা',
      'Shopping List': 'কিনা-কটাৰ তালিকা',
      'Day': 'দিন',
      'Smart Shopping List': 'স্মাৰ্ট কিনা-কটাৰ তালিকা',
      'Shopping list for:': 'ৰ বাবে কিনা-কটাৰ তালিকা:',
      'No Meals Planned': 'কোনো আহাৰৰ পৰিকল্পনা নাই'
    },
    'ne': {
      'Breakfast': 'बिहानको खाना',
      'Lunch': 'दिउँसोको खाना',
      'Dinner': 'रातको खाना',
      'Snack': 'खाजा',
      'Weekly Meal Plan': 'हप्ताको खाना योजना',
      'Shopping List': 'किनमेल सूची',
      'Day': 'दिन',
      'Smart Shopping List': 'स्मार्ट किनमेल सूची',
      'Shopping list for:': 'को लागि किनमेल सूची:',
      'No Meals Planned': 'कुनै खाना योजना गरिएको छैन'
    },
    'si': {
      'Breakfast': 'උදෑසන ආහාර',
      'Lunch': 'දහවල් ආහාර',
      'Dinner': 'රාත්‍රී ආහාර',
      'Snack': 'බොජුන',
      'Weekly Meal Plan': 'සතිපතා ආහාර සැලසුම',
      'Shopping List': 'සාප්පු ලැයිස්තුව',
      'Day': 'දවස',
      'Smart Shopping List': 'ස්මාර්ට් සාප්පු ලැයිස්තුව',
      'Shopping list for:': 'සඳහා සාප්පු ලැයිස්තුව:',
      'No Meals Planned': 'කිසිදු ආහාර සැලසුමක් නැත'
    },
    'my': {
      'Breakfast': 'နံနက်စာ',
      'Lunch': 'နေ့လည်စာ',
      'Dinner': 'ညစာ',
      'Snack': 'သားရေစာ',
      'Weekly Meal Plan': 'အပတ်စဉ် အစားအသောက် အစီအစဉ်',
      'Shopping List': 'စျေးဝယ်စာရင်း',
      'Day': 'နေ့',
      'Smart Shopping List': 'စမတ်စျေးဝယ်စာရင်း',
      'Shopping list for:': 'အတွက် စျေးဝယ်စာရင်း:',
      'No Meals Planned': 'အစားအသောက် အစီအစဉ် မရှိ'
    },
    'km': {
      'Breakfast': 'អាហារពេលព្រឹក',
      'Lunch': 'អាហារថ្ងៃត្រង់',
      'Dinner': 'អាហារពេលល្ងាច',
      'Snack': 'អាហារសម្រន់',
      'Weekly Meal Plan': 'ផែនការអាហារប្រចាំងសប្តាហ៍',
      'Shopping List': 'បញ្ជីទិញទំនិញ',
      'Day': 'ថ្ងៃ',
      'Smart Shopping List': 'បញ្ជីទិញទំនិញឆ្លាត',
      'Shopping list for:': 'បញ្ជីទិញទំនិញសម្រាប់:',
      'No Meals Planned': 'គ្មានអាហារត្រូវធ្វើផែនការ'
    },
    'lo': {
      'Breakfast': 'ອາຫານເຊົ້າ',
      'Lunch': 'ອາຫານທ່ຽງ',
      'Dinner': 'ອາຫານແລງ',
      'Snack': 'ອາຫານວ່າງ',
      'Weekly Meal Plan': 'ແຜນອາຫານປະຈຳອາທິດ',
      'Shopping List': 'ລາຍການຊື້ເຄື່ອງ',
      'Day': 'ມື້',
      'Smart Shopping List': 'ລາຍການຊື້ເຄື່ອງສະຫຼາດ',
      'Shopping list for:': 'ລາຍການຊື້ເຄື່ອງສຳລັບ:',
      'No Meals Planned': 'ບໍ່ມີອາຫານທີ່ວາງແຜນໄວ້'
    },
    'th': {
      'Breakfast': 'อาหารเช้า',
      'Lunch': 'อาหารกลางวัน',
      'Dinner': 'อาหารเย็น',
      'Snack': 'อาหารว่าง',
      'Weekly Meal Plan': 'แผนมื้ออาหารรายสัปดาห์',
      'Shopping List': 'รายการซื้อของ',
      'Day': 'วัน',
      'Smart Shopping List': 'รายการซื้อของอัจฉริยะ',
      'Shopping list for:': 'รายการซื้อของสำหรับ:',
      'No Meals Planned': 'ไม่มีมื้ออาหารที่วางแผนไว้'
    },
    'vi': {
      'Breakfast': 'Bữa sáng',
      'Lunch': 'Bữa trưa',
      'Dinner': 'Bữa tối',
      'Snack': 'Bữa phụ',
      'Weekly Meal Plan': 'Kế hoạch bữa ăn hàng tuần',
      'Shopping List': 'Danh sách mua sắm',
      'Day': 'Ngày',
      'Smart Shopping List': 'Danh sách mua sắm thông minh',
      'Shopping list for:': 'Danh sách mua sắm cho:',
      'No Meals Planned': 'Không có bữa ăn nào được lên kế hoạch'
    },
    'id': {
      'Breakfast': 'Sarapan',
      'Lunch': 'Makan siang',
      'Dinner': 'Makan malam',
      'Snack': 'Cemilan',
      'Weekly Meal Plan': 'Rencana Makan Mingguan',
      'Shopping List': 'Daftar Belanja',
      'Day': 'Hari',
      'Smart Shopping List': 'Daftar Belanja Pintar',
      'Shopping list for:': 'Daftar belanja untuk:',
      'No Meals Planned': 'Tidak Ada Makanan yang Direncanakan'
    },
    'ms': {
      'Breakfast': 'Sarapan',
      'Lunch': 'Makan tengahari',
      'Dinner': 'Makan malam',
      'Snack': 'Snek',
      'Weekly Meal Plan': 'Pelan Makan Mingguan',
      'Shopping List': 'Senarai Beli-belah',
      'Day': 'Hari',
      'Smart Shopping List': 'Senarai Beli-belah Pintar',
      'Shopping list for:': 'Senarai beli-belah untuk:',
      'No Meals Planned': 'Tiada Makanan yang Dirancang'
    },
    'zh': {
      'Breakfast': '早餐',
      'Lunch': '午餐',
      'Dinner': '晚餐',
      'Snack': '小吃',
      'Weekly Meal Plan': '每周膳食计划',
      'Shopping List': '购物清单',
      'Day': '天',
      'Smart Shopping List': '智能购物清单',
      'Shopping list for:': '购物清单：',
      'No Meals Planned': '没有计划的餐食'
    },
    'ja': {
      'Breakfast': '朝食',
      'Lunch': '昼食',
      'Dinner': '夕食',
      'Snack': 'スナック',
      'Weekly Meal Plan': '週間食事計画',
      'Shopping List': '買い物リスト',
      'Day': '日',
      'Smart Shopping List': 'スマート買い物リスト',
      'Shopping list for:': '買い物リスト：',
      'No Meals Planned': '計画された食事はありません'
    },
    'ko': {
      'Breakfast': '아침 식사',
      'Lunch': '점심 식사',
      'Dinner': '저녁 식사',
      'Snack': '간식',
      'Weekly Meal Plan': '주간 식사 계획',
      'Shopping List': '쇼핑 목록',
      'Day': '날',
      'Smart Shopping List': '스마트 쇼핑 목록',
      'Shopping list for:': '쇼핑 목록:',
      'No Meals Planned': '계획된 식사가 없습니다'
    },
    'es': {
      'Breakfast': 'Desayuno',
      'Lunch': 'Almuerzo',
      'Dinner': 'Cena',
      'Snack': 'Merienda',
      'Weekly Meal Plan': 'Plan de Comidas Semanal',
      'Shopping List': 'Lista de Compras',
      'Day': 'Día',
      'Smart Shopping List': 'Lista de Compras Inteligente',
      'Shopping list for:': 'Lista de compras para:',
      'No Meals Planned': 'No Hay Comidas Planificadas'
    },
    'fr': {
      'Breakfast': 'Petit-déjeuner',
      'Lunch': 'Déjeuner',
      'Dinner': 'Dîner',
      'Snack': 'Goûter',
      'Weekly Meal Plan': 'Plan de Repas Hebdomadaire',
      'Shopping List': 'Liste de Courses',
      'Day': 'Jour',
      'Smart Shopping List': 'Liste de Courses Intelligente',
      'Shopping list for:': 'Liste de courses pour:',
      'No Meals Planned': 'Aucun Repas Planifié'
    },
    'de': {
      'Breakfast': 'Frühstück',
      'Lunch': 'Mittagessen',
      'Dinner': 'Abendessen',
      'Snack': 'Snack',
      'Weekly Meal Plan': 'Wöchentlicher Essensplan',
      'Shopping List': 'Einkaufsliste',
      'Day': 'Tag',
      'Smart Shopping List': 'Intelligente Einkaufsliste',
      'Shopping list for:': 'Einkaufsliste für:',
      'No Meals Planned': 'Keine Mahlzeiten Geplant'
    },
    'it': {
      'Breakfast': 'Colazione',
      'Lunch': 'Pranzo',
      'Dinner': 'Cena',
      'Snack': 'Spuntino',
      'Weekly Meal Plan': 'Piano Pasti Settimanale',
      'Shopping List': 'Lista della Spesa',
      'Day': 'Giorno',
      'Smart Shopping List': 'Lista della Spesa Intelligente',
      'Shopping list for:': 'Lista della spesa per:',
      'No Meals Planned': 'Nessun Pasto Pianificato'
    },
    'pt': {
      'Breakfast': 'Café da manhã',
      'Lunch': 'Almoço',
      'Dinner': 'Jantar',
      'Snack': 'Lanche',
      'Weekly Meal Plan': 'Plano de Refeições Semanal',
      'Shopping List': 'Lista de Compras',
      'Day': 'Dia',
      'Smart Shopping List': 'Lista de Compras Inteligente',
      'Shopping list for:': 'Lista de compras para:',
      'No Meals Planned': 'Nenhuma Refeição Planejada'
    },
    'ru': {
      'Breakfast': 'Завтрак',
      'Lunch': 'Обед',
      'Dinner': 'Ужин',
      'Snack': 'Перекус',
      'Weekly Meal Plan': 'Недельный план питания',
      'Shopping List': 'Список покупок',
      'Day': 'День',
      'Smart Shopping List': 'Умный список покупок',
      'Shopping list for:': 'Список покупок для:',
      'No Meals Planned': 'Питание не запланировано'
    },
    'ar': {
      'Breakfast': 'الإفطار',
      'Lunch': 'الغداء',
      'Dinner': 'العشاء',
      'Snack': 'وجبة خفيفة',
      'Weekly Meal Plan': 'خطة الوجبات الأسبوعية',
      'Shopping List': 'قائمة التسوق',
      'Day': 'اليوم',
      'Smart Shopping List': 'قائمة تسوق ذكية',
      'Shopping list for:': 'قائمة التسوق لـ:',
      'No Meals Planned': 'لا توجد وجبات مخططة'
    }
  };

  const translations = basicTranslations[targetLanguage];
  if (translations && translations[text]) {
    return translations[text];
  }

  return text; // Return original if no translation found
}; 