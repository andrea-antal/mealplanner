/**
 * Login page with magic link authentication.
 * New users need an invite code during beta.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, CheckCircle, Ticket } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(email, inviteCode || undefined);

    setIsSubmitting(false);

    if (result.success) {
      setSent(true);
    } else if (result.needsInviteCode && !showInviteCode) {
      // New user without invite code - show the invite code field
      setShowInviteCode(true);
      setError('New account! Please enter your invite code.');
    } else {
      setError(result.message);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
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
                setInviteCode('');
                setShowInviteCode(false);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to Meal Planner</CardTitle>
          <CardDescription>
            {showInviteCode
              ? "Enter your invite code to create an account."
              : "Enter your email and we'll send you a magic link to sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoFocus={!showInviteCode}
                />
              </div>
            </div>

            {showInviteCode && (
              <div className="space-y-2">
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="MEAL-XXXXXX"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Don't have an invite code? Ask the person who told you about Meal Planner!
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !email || (showInviteCode && !inviteCode)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {showInviteCode ? 'Validating...' : 'Sending...'}
                </>
              ) : (
                'Send magic link'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>No password needed. Just click the link in your email.</p>
          </div>

          {!showInviteCode && (
            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="text-xs"
                onClick={() => setShowInviteCode(true)}
              >
                Have an invite code?
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
