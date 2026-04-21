/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { requireSupabase } from '@/lib/supabase';
import { fetchPhoneVerificationStatus } from '@/lib/authApi';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  phoneVerified: boolean;
  verificationLoading: boolean;
  refreshPhoneVerification: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  phoneVerified: false,
  verificationLoading: false,
  refreshPhoneVerification: async () => false,
});

const PHONE_VERIFY_CACHE_PREFIX = 'gfm_phone_verified_';

function getPhoneVerificationCache(userId: string): boolean | null {
  try {
    const raw = localStorage.getItem(`${PHONE_VERIFY_CACHE_PREFIX}${userId}`);
    if (raw === null) {
      return null;
    }
    return raw === '1';
  } catch {
    return null;
  }
}

function setPhoneVerificationCache(userId: string, value: boolean) {
  try {
    localStorage.setItem(`${PHONE_VERIFY_CACHE_PREFIX}${userId}`, value ? '1' : '0');
  } catch {
    // Ignore storage write failures.
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    const hydratePhoneVerification = async (nextUser: User | null) => {
      if (!nextUser) {
        if (mounted) {
          setPhoneVerified(false);
          setVerificationLoading(false);
        }
        return;
      }

      const cachedStatus = getPhoneVerificationCache(nextUser.id);
      const metadataStatus = nextUser.user_metadata?.phone_verified === true;

      if (cachedStatus !== null) {
        if (mounted) {
          setPhoneVerified(cachedStatus);
          setVerificationLoading(false);
        }
        return;
      }

      if (metadataStatus) {
        if (mounted) {
          setPhoneVerified(true);
          setVerificationLoading(false);
        }
        setPhoneVerificationCache(nextUser.id, true);
        return;
      }

      if (mounted) {
        setVerificationLoading(true);
      }

      const isVerified = await fetchPhoneVerificationStatus(nextUser.id);
      if (mounted) {
        setPhoneVerified(isVerified);
        setVerificationLoading(false);
      }
      setPhoneVerificationCache(nextUser.id, isVerified);
    };

    const initialize = async () => {
      try {
        const supabase = requireSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const nextUser = session?.user ?? null;
        setSession(session);
        setUser(nextUser);
        await hydratePhoneVerification(nextUser);
        setLoading(false);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event: string, incomingSession: Session | null) => {
            if (!mounted) return;
            const incomingUser = incomingSession?.user ?? null;
            setSession(incomingSession);
            setUser(incomingUser);
            await hydratePhoneVerification(incomingUser);
            setLoading(false);
          }
        );
        unsubscribe = () => subscription.unsubscribe();
      } catch {
        if (!mounted) return;
        setLoading(false);
        setPhoneVerified(false);
        setVerificationLoading(false);
      }
    };

    void initialize();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const refreshPhoneVerification = async () => {
    if (!user) {
      setPhoneVerified(false);
      return false;
    }

    setVerificationLoading(true);
    const isVerified = await fetchPhoneVerificationStatus(user.id);
    setPhoneVerified(isVerified);
    setVerificationLoading(false);
    setPhoneVerificationCache(user.id, isVerified);
    return isVerified;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, phoneVerified, verificationLoading, refreshPhoneVerification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
