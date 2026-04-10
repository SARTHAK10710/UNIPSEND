import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA6STNNLXyD15qn5FsNWcm9C250v0qQzNA",
  projectId: "unispend-37a68",
  storageBucket: "unispend-37a68.firebasestorage.app",
  appId: "1:656078903939:android:9e6c17fa0be45503f619b6",
};

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
const auth = isFirstInit
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

export { app, auth };
