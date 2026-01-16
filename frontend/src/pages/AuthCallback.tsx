/**
 * Auth callback page for handling Supabase OAuth and magic link redirects.
 *
 * Handles:
 * - Token exchange with Supabase
 * - Invite code redemption (from sessionStorage for OAuth, user_metadata for magic link)
 * - Workspace migration for existing beta users
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleAuthCallback, useInviteCode } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your login...');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // First, let Supabase handle the token exchange
        const result = await handleAuthCallback();

        if (!result.success) {
          setStatus('error');
          setMessage(result.message || 'Login failed. Please try again.');
          return;
        }

        // Get the current session for additional processing
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setStatus('error');
          setMessage('Session not found. Please try again.');
          return;
        }

        // Check for pending invite code from OAuth signup flow (stored in sessionStorage)
        const pendingInviteCode = sessionStorage.getItem('pending_invite_code');
        const metadataInviteCode = session.user.user_metadata?.invite_code;
        const hasInviteCode = pendingInviteCode || metadataInviteCode;

        // Check if this is a new user by looking for existing profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        const isNewUser = !existingProfile;

        // SECURITY: New users MUST come through /signup with an invite code
        // If they used /login (no invite code), reject them
        if (isNewUser && !hasInviteCode) {
          // Sign them out and redirect to signup
          await supabase.auth.signOut();
          setStatus('error');
          setMessage('No account found. Please sign up with an invite code first.');
          return;
        }

        // Redeem invite code if present
        if (pendingInviteCode) {
          setMessage('Redeeming invite code...');
          await useInviteCode(pendingInviteCode, session.user.email || '');
          sessionStorage.removeItem('pending_invite_code');
        }

        if (isNewUser) {
          setIsNewUser(true);
        }

        // Attempt workspace migration for existing beta users
        // This is a no-op if no migration is pending for this email
        setMessage('Setting up your account...');
        try {
          console.log('Attempting migration for:', {
            email: session.user.email,
            new_workspace_id: session.user.id,
          });

          const migrationResponse = await fetch(`${API_BASE_URL}/auth/complete-migration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: session.user.email,
              new_workspace_id: session.user.id, // UUID
            }),
          });

          const migrationResult = await migrationResponse.json();
          console.log('Migration result:', migrationResult);

          if (migrationResult.migrated) {
            console.log(`Migrated data from ${migrationResult.from_workspace} to ${migrationResult.to_workspace}`);
          }
        } catch (migrationError) {
          // Migration endpoint might not exist yet, that's OK
          console.error('Migration check failed:', migrationError);
        }

        // Success!
        setStatus('success');
        setMessage(isNewUser ? 'Account created! Redirecting...' : 'Login successful! Redirecting...');

        // Short delay for user feedback, then redirect
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: status === 'loading' ? 'hsl(var(--muted))' :
                status === 'success' ? 'hsl(142 76% 95%)' : 'hsl(0 84% 95%)'
            }}
          >
            {status === 'loading' && (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Signing you in...'}
            {status === 'success' && (isNewUser ? 'Welcome!' : 'Welcome back!')}
            {status === 'error' && 'Login failed'}
          </CardTitle>
          <CardDescription className="text-base">
            {message}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="text-center space-y-2">
            {message.includes('invite code') ? (
              <Button onClick={() => navigate('/signup')}>
                Sign up with invite code
              </Button>
            ) : (
              <Button onClick={() => navigate('/login')}>
                Try again
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
