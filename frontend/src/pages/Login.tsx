/**
 * Login page for returning users.
 * Google OAuth as primary, magic link as fallback.
 * New users are directed to /signup.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);

    const result = await signInWithGoogle();

    if (!result.success) {
      setError(result.error || 'Failed to start Google sign-in');
      setIsSubmitting(false);
    }
    // On success, user is redirected to Google OAuth
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // For returning users, no invite code needed
    const result = await login(email);

    setIsSubmitting(false);

    if (result.success) {
      setSent(true);
    } else if (result.needsInviteCode) {
      // New user - redirect to signup
      setError("No account found with that email. Need to sign up?");
    } else {
      setError(result.message);
    }
  };

  // Email sent confirmation
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border border-border shadow-soft">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a login link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              Click the link in the email to sign in. The link expires in 15 minutes.
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
            >
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border border-border shadow-soft">
        {showEmailForm ? (
          <>
            <CardHeader className="text-center relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-4"
                onClick={() => {
                  setShowEmailForm(false);
                  setError(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <CardTitle className="text-2xl">Sign in with email</CardTitle>
              <CardDescription>
                We'll send you a magic link to sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm">
                    <p className="text-destructive">{error}</p>
                    {error.includes("No account found") && (
                      <Link to="/signup" className="text-primary hover:underline">
                        Sign up with an invite code
                      </Link>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send magic link'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your Meal Planner account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                onClick={handleGoogleLogin}
                className="w-full"
                disabled={isSubmitting}
                variant="outline"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Sign in with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Use email instead
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                New here?{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up with an invite code
                </Link>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
