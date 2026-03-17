import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

type LocationState = { from?: { pathname?: string } };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const st = (location.state ?? {}) as LocationState;
    return st.from?.pathname ?? "/dashboard";
  }, [location.state]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (!email || !password) {
        toast.error("Enter email and password");
        return;
      }

      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is enabled, then sign in.");
        setMode("signin");
        setPassword("");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "Login failed";
      const msg =
        raw.toLowerCase().includes("fetch") || raw.toLowerCase().includes("timeout")
          ? "Network error contacting Supabase. Check your internet/VPN/firewall and try again."
          : raw;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) throw error;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Google login failed";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Use your email/password or continue with Google."
                : "Create an account using email/password."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">OR</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              Continue with Google
            </Button>

            <div className="text-sm text-muted-foreground">
              {mode === "signin" ? (
                <button className="hover:text-foreground" onClick={() => setMode("signup")}>
                  Need an account? Sign up
                </button>
              ) : (
                <button className="hover:text-foreground" onClick={() => setMode("signin")}>
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
