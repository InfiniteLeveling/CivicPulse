"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type OAuthProvider = "google" | "github" | "facebook";

interface OAuthProvidersProps {
  mode?: "login" | "register";
  nextPath?: string | null;
  disabled?: boolean;
  onError?: (message: string) => void;
}

const PROVIDERS: Array<{
  id: OAuthProvider;
  label: string;
}> = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "facebook", label: "Facebook" },
];

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.04 21.2 7.2 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.02 14.03A7.2 7.2 0 0 1 4.64 12c0-.7.13-1.39.38-2.03V6.83H1.01A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.01 5.17l4.01-3.14Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.2 0 3.04 2.8 1.01 6.83l4.01 3.14C6 6.94 8.75 4.75 12 4.75Z"
        />
      </svg>
    );
  }

  if (provider === "github") {
    return (
      <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    );
  }

  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
      />
    </svg>
  );
}

export function OAuthProviders({
  mode = "login",
  nextPath,
  disabled = false,
  onError,
}: OAuthProvidersProps) {
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(null);

  async function handleOAuth(provider: OAuthProvider) {
    if (activeProvider || disabled) return;

    if (!isSupabaseConfigured()) {
      const msg = "Authentication service is not configured yet.";
      onError?.(msg);
      toast.error("Sign-In Unavailable", { description: msg });
      return;
    }

    setActiveProvider(provider);
    try {
      const supabase = createClient();
      const callbackUrl = new URL("/auth/confirm", window.location.origin);
      if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
        callbackUrl.searchParams.set("next", nextPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setActiveProvider(null);
        const msg =
          error.message || `Could not start ${provider} authentication.`;
        onError?.(msg);
        toast.error("Social Sign-In Failed", { description: msg });
      }
    } catch (err: unknown) {
      setActiveProvider(null);
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to connect to authentication provider.";
      onError?.(msg);
      toast.error("Social Sign-In Failed", { description: msg });
    }
  }

  const actionLabel = mode === "register" ? "Continue with" : "Sign in with";

  return (
    <div className="grid gap-3">
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-border" />
        <span className="mx-3 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
          Or continue with
        </span>
        <div className="flex-grow border-t border-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PROVIDERS.map((provider) => {
          const isBusy = activeProvider === provider.id;
          return (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              disabled={disabled || activeProvider !== null}
              onClick={() => handleOAuth(provider.id)}
              aria-label={`${actionLabel} ${provider.label}`}
              className="w-full gap-2 font-medium text-xs h-10"
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ProviderIcon provider={provider.id} />
              )}
              <span>{provider.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
