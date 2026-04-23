import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { BillingProfile } from "@/modules/central-cobranca/types";

interface BillingAuthContextValue {
  profile: BillingProfile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const BillingAuthContext = createContext<BillingAuthContextValue | null>(null);

const demoProfile: BillingProfile = {
  id: "demo-profile",
  email: "financeiro@4uconnect.demo",
  fullName: "Equipe Financeira Demo",
  role: "admin",
  active: true,
};

async function loadProfile(userId: string): Promise<BillingProfile | null> {
  if (!supabase) {
    return demoProfile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email ?? "",
    fullName: data.full_name ?? "Usuário",
    role: data.role === "financeiro" ? "financeiro" : "admin",
    active: Boolean(data.is_active),
  };
}

export function BillingAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<BillingProfile | null>(isSupabaseConfigured ? null : demoProfile);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        const p = await loadProfile(data.session.user.id);
        if (mounted) setProfile(p ?? { ...demoProfile, id: data.session.user.id, email: data.session.user.email ?? "" });
      }
      if (mounted) setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        setProfile(await loadProfile(nextSession.user.id));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      profile,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      signIn: async (email: string, password: string) => {
        if (!isSupabaseConfigured || !supabase) {
          setProfile({
            ...demoProfile,
            email,
            fullName: email.split("@")[0] || demoProfile.fullName,
          });
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        if (!isSupabaseConfigured || !supabase) {
          setProfile(demoProfile);
          return;
        }

        await supabase.auth.signOut();
      },
    }),
    [loading, profile, session],
  );

  return <BillingAuthContext.Provider value={value}>{children}</BillingAuthContext.Provider>;
}

export function useBillingAuth() {
  const context = useContext(BillingAuthContext);
  if (!context) {
    throw new Error("useBillingAuth must be used within BillingAuthProvider");
  }
  return context;
}
