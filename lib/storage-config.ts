import storageWrapper, { IndexedDBStorageProvider, FirebaseStorageProvider } from './storage-wrapper';

// Storage provider types
export type StorageProviderType = 'indexeddb' | 'firebase';

// Storage configuration
export interface StorageConfig {
  provider: StorageProviderType;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

// Default configuration
const getDefaultConfig = (): StorageConfig => {
  // Check if Firebase is configured
  const hasFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                           process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (hasFirebaseConfig) {
    return {
      provider: 'firebase',
      firebaseConfig: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      }
    };
  }
  
  return { provider: 'indexeddb' };
};

// Function to configure storage
export const configureStorage = (config: StorageConfig) => {
  switch (config.provider) {
    case 'firebase':
      storageWrapper.setProvider(new FirebaseStorageProvider());
            break;
    case 'indexeddb':
      storageWrapper.setProvider(new IndexedDBStorageProvider());
            break;
    default:
      throw new Error(`Unknown storage provider: ${config.provider}`);
  }
};

// Initialize with default configuration
configureStorage(getDefaultConfig());

// Export configuration functions
export { getDefaultConfig }; 