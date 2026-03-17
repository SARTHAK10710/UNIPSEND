import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { userAPI } from '../services/api';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // profile data from postgres
  const [profile, setProfile] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch user profile from backend
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setRiskData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [profileRes, riskRes] = await Promise.allSettled([
      userAPI.getProfile(),
      userAPI.getRiskScore(),
    ]);

    if (profileRes.status === 'fulfilled') {
      console.log(
        '[UserContext] profile loaded:',
        profileRes.value.data,
      );
      setProfile(profileRes.value.data);
    } else {
      console.log(
        '[UserContext] profile error:',
        profileRes.reason?.message,
      );
      // fallback to Firebase user data
      setProfile({
        firebase_uid: user.uid,
        email: user.email,
        first_name: user.displayName?.split(' ')[0] || '',
        last_name: user.displayName?.split(' ')[1] || '',
        risk_score: 50,
        segment: 'balanced',
        has_connected_bank: false,
      });
      setError('Could not load profile');
    }

    if (riskRes.status === 'fulfilled') {
      setRiskData(riskRes.value.data);
    } else {
      setRiskData({
        risk_score: 50,
        segment: 'balanced',
        label: 'Moderate',
        description: 'You balance risk and reward',
      });
    }

    setIsLoading(false);
  }, [user]);

  // update profile name
  const updateProfile = useCallback(async (firstName, lastName) => {
    try {
      await userAPI.updateProfile({
        first_name: firstName,
        last_name: lastName,
      });
      setProfile((prev) => ({
        ...prev,
        first_name: firstName,
        last_name: lastName,
      }));
      return { success: true };
    } catch (err) {
      console.error('[UserContext] update error:', err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // update risk score after AI analysis
  const updateRiskScore = useCallback(async (score, segment) => {
    try {
      // Optimistically update local state
      setRiskData((prev) => ({
        ...prev,
        risk_score: score,
        segment,
        label: getRiskLabel(score),
      }));
      return { success: true };
    } catch (err) {
      console.error('[UserContext] risk update error:', err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // save FCM token for push notifications
  const saveFCMToken = useCallback(async (token) => {
    try {
      await userAPI.updateFcmToken(token);
      setProfile((prev) => ({
        ...prev,
        fcm_token: token,
      }));
      console.log('[UserContext] FCM token saved');
      return { success: true };
    } catch (err) {
      console.error('[UserContext] FCM token error:', err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // helper to calculate risk label
  const getRiskLabel = (score) => {
    if (score <= 33) return 'Conservative';
    if (score <= 66) return 'Moderate';
    return 'Aggressive';
  };

  // computed user display values
  const getFullName = () => {
    if (!profile) return user?.displayName || 'User';
    const first = profile.first_name || '';
    const last = profile.last_name || '';
    return (
      `${first} ${last}`.trim() ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'User'
    );
  };

  const getFirstName = () => {
    if (!profile) {
      return user?.displayName?.split(' ')[0] || 'User';
    }
    return (
      profile.first_name ||
      user?.displayName?.split(' ')[0] ||
      'User'
    );
  };

  const getInitials = () => {
    const name = getFullName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getEmail = () => {
    return profile?.email || user?.email || '';
  };

  const isBankConnected = () => {
    return profile?.has_connected_bank || false;
  };

  const getRiskScore = () => {
    return riskData?.risk_score || 50;
  };

  const getRiskSegment = () => {
    return riskData?.segment || 'balanced';
  };

  const getRiskLabelText = () => {
    return riskData?.label || 'Moderate';
  };

  const getRiskDescription = () => {
    return riskData?.description || 'You balance risk and reward';
  };

  // fetch profile when user logs in
  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading, user?.uid]);

  // clear profile when user logs out
  useEffect(() => {
    if (!user && !authLoading) {
      setProfile(null);
      setRiskData(null);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  return (
    <UserContext.Provider
      value={{
        // raw data
        profile,
        riskData,

        // loading
        isLoading,
        error,

        // computed getters
        getFullName,
        getFirstName,
        getInitials,
        getEmail,
        isBankConnected,
        getRiskScore,
        getRiskSegment,
        getRiskLabelText,
        getRiskDescription,

        // actions
        updateProfile,
        updateRiskScore,
        saveFCMToken,
        refresh: fetchProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// custom hook for easy access
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used inside UserProvider');
  }
  return context;
};

export default UserContext;
