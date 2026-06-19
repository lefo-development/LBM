import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

/** Profile type matching the Rust enum */
export type ProfileType = "encrypted" | "guest";

/** Profile info returned from Tauri backend (no sensitive data) */
export interface ProfileInfo {
  id: string;
  username: string;
  profile_type: ProfileType;
  created_at: string;
}

/** Application state for routing */
export type AppView = "loading" | "login" | "recovery" | "dashboard";

interface AuthState {
  /** Current view/page */
  view: AppView;
  /** Current profile info (null if not authenticated) */
  profile: ProfileInfo | null;
  /** Recovery words (temporarily stored during account creation flow) */
  recoveryWords: string[] | null;
  /** Error message */
  error: string | null;
  /** Loading state */
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  /** Create a password-protected encrypted profile */
  createEncryptedAccount: (username: string, password: string) => Promise<void>;
  /** Create a guest (password-less) profile */
  createGuestAccount: () => Promise<void>;
  /** Login with username and password */
  loginWithPassword: (username: string, password: string) => Promise<void>;
  /** Save recovery codes to a file via native dialog */
  saveRecoveryFile: (username: string, words: string[]) => Promise<string>;
  /** Confirm recovery words have been saved, proceed to dashboard */
  confirmRecovery: () => void;
  /** Clear any error */
  clearError: () => void;
  /** Log out and return to login screen */
  logout: () => void;
  /** Get all existing profiles */
  getAllProfiles: () => Promise<ProfileInfo[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    view: "loading",
    profile: null,
    recoveryWords: null,
    error: null,
    isLoading: true,
  });

  // Check for existing profile on app startup
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const exists: boolean = await invoke("check_profile_exists");
        if (exists) {
          // Load the active profile
          const profile: ProfileInfo = await invoke("get_current_profile");
          if (profile.profile_type === "guest") {
            // Guest profiles auto-login
            setState({
              view: "dashboard",
              profile,
              recoveryWords: null,
              error: null,
              isLoading: false,
            });
          } else {
            // Encrypted profiles need password — for now go to login
            // TODO: In the future, show a password prompt instead of full login
            setState({
              view: "login",
              profile: null,
              recoveryWords: null,
              error: null,
              isLoading: false,
            });
          }
        } else {
          // No profile — show login/signup
          setState({
            view: "login",
            profile: null,
            recoveryWords: null,
            error: null,
            isLoading: false,
          });
        }
      } catch (err) {
        setState({
          view: "login",
          profile: null,
          recoveryWords: null,
          error: null,
          isLoading: false,
        });
      }
    };

    checkExistingProfile();
  }, []);

  const createEncryptedAccount = useCallback(
    async (username: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const words: string[] = await invoke("create_encrypted_profile", {
          username,
          password,
        });

        // Profile created — show recovery modal before going to dashboard
        const profile: ProfileInfo = await invoke("get_current_profile");
        setState({
          view: "recovery",
          profile,
          recoveryWords: words,
          error: null,
          isLoading: false,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: String(err),
          isLoading: false,
        }));
      }
    },
    []
  );

  const createGuestAccount = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const profile: ProfileInfo = await invoke("create_guest_profile");
      setState({
        view: "dashboard",
        profile,
        recoveryWords: null,
        error: null,
        isLoading: false,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: String(err),
        isLoading: false,
      }));
    }
  }, []);

  const loginWithPassword = useCallback(
    async (username: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const profile: ProfileInfo = await invoke("login_with_password", {
          username,
          password,
        });
        setState({
          view: "dashboard",
          profile,
          recoveryWords: null,
          error: null,
          isLoading: false,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: String(err),
          isLoading: false,
        }));
      }
    },
    []
  );

  const saveRecoveryFile = useCallback(
    async (username: string, words: string[]): Promise<string> => {
      return await invoke("save_recovery_file", { username, words });
    },
    []
  );

  const confirmRecovery = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: "dashboard",
      recoveryWords: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const logout = useCallback(() => {
    setState({
      view: "login",
      profile: null,
      recoveryWords: null,
      error: null,
      isLoading: false,
    });
  }, []);

  const getAllProfiles = useCallback(async (): Promise<ProfileInfo[]> => {
    try {
      return await invoke("get_all_profiles");
    } catch (err) {
      console.error("Failed to get profiles", err);
      return [];
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        createEncryptedAccount,
        createGuestAccount,
        loginWithPassword,
        saveRecoveryFile,
        confirmRecovery,
        clearError,
        logout,
        getAllProfiles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
