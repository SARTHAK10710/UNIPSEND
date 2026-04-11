import React, { createContext, useContext } from 'react';
import { useAIInsightsInternal } from '../hooks/useAIInsights';

// ─────────────────────────────────────────────────────────────
// AIInsightsContext
//
// Provides a single, shared instance of the AI insights data
// to all screens via React Context. This prevents each screen
// from creating its own useAIInsights() instance (which would
// cause duplicate API calls, race conditions, and stale
// fallback values like financial_health_score = 50).
// ─────────────────────────────────────────────────────────────

const AIInsightsContext = createContext(null);

export const AIInsightsProvider = ({ children }) => {
  const ai = useAIInsightsInternal();

  return (
    <AIInsightsContext.Provider value={ai}>
      {children}
    </AIInsightsContext.Provider>
  );
};

/**
 * Hook to consume the shared AI insights.
 * Must be used inside <AIInsightsProvider>.
 */
export const useSharedAIInsights = () => {
  const ctx = useContext(AIInsightsContext);
  if (!ctx) {
    throw new Error('useSharedAIInsights must be used inside <AIInsightsProvider>');
  }
  return ctx;
};

export default AIInsightsContext;
