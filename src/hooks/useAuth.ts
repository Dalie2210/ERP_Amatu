"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
}

/**
 * Hook to get the current authenticated user and their role.
 * Role is fetched from the `users` table in Supabase.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ user: null, role: null, isLoading: false });
        return;
      }

      // Fetch role from our users table
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      setState({
        user,
        role: (profile?.role as UserRole) ?? null,
        isLoading: false,
      });
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        getUser();
      } else {
        setState({ user: null, role: null, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
