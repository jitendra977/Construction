import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const storage = {
    setItem: async (key, value) => {
        if (isWeb) {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },
    getItem: async (key) => {
        if (isWeb) {
            return localStorage.getItem(key);
        } else {
            return await SecureStore.getItemAsync(key);
        }
    },
    deleteItem: async (key) => {
        if (isWeb) {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    },
    // Alias for compatibility
    removeItem: async (key) => {
        if (isWeb) {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
};

// Handle CommonJS/ESM interop if something is trying to access .default
storage.default = storage;

export default storage;
