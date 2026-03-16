import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import {
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
const firebaseConfig = {
  apiKey: "AIzaSyA6STNNLXyD15qn5FsNWcm9C250v0qQzNA",
  projectId: "unispend-37a68",
  storageBucket: "unispend-37a68.firebasestorage.app",
  appId: "1:656078903939:android:9e6c17fa0be45503f619b6",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasConnectedBank, setHasConnectedBank] = useState(false);
  const [bankCheckLoading, setBankCheckLoading] = useState(true);
  const [skippedBank, setSkippedBank] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setUser(firebaseUser);
        setToken(idToken);
        await AsyncStorage.setItem("authToken", idToken);

        try {
          await authAPI.register({});
        } catch (e) {}

        // Check if bankSetupCompleted flag exists
        const bankSetupDone = await AsyncStorage.getItem("bankSetupCompleted");
        setHasConnectedBank(bankSetupDone === "true");
        setBankCheckLoading(false);
      } else {
        setUser(null);
        setToken(null);
        setHasConnectedBank(false);
        setSkippedBank(false);
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("bankSetupCompleted");
        setBankCheckLoading(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      await AsyncStorage.setItem("authToken", idToken);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      await AsyncStorage.setItem("authToken", idToken);
      try {
        await authAPI.register({});
      } catch (regErr) {
        console.warn("Backend register call failed:", regErr.message);
      }
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (idToken) => {
    try {
      setError(null);
      setLoading(true);
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const firebaseToken = await result.user.getIdToken();
      setToken(firebaseToken);
      await AsyncStorage.setItem("authToken", firebaseToken);
      try {
        await authAPI.register({});
      } catch (regErr) {
        console.warn("Backend register call failed:", regErr.message);
      }
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("bankSetupCompleted");
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshToken = async () => {
    if (auth.currentUser) {
      const newToken = await auth.currentUser.getIdToken(true);
      setToken(newToken);
      await AsyncStorage.setItem("authToken", newToken);
      return newToken;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        hasConnectedBank,
        setHasConnectedBank,
        bankCheckLoading,
        skippedBank,
        setSkippedBank,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
