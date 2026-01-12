/**
 * Auth callback page for handling Supabase magic link redirects.
 *
 * When a user clicks the magic link in their email, Supabase redirects
 * them here. This page handles the token exchange and redirects to
 * the main app on success.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleAuthCallback } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your login...');

  useEffect(() => {
    const processCallback = async () => {
      const result = await handleAuthCallback();

      if (result.success) {
        setStatus('success');
        setMessage('Login successful! Redirecting...');

        // Short delay for user feedback, then redirect
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setStatus('error');
        setMessage(result.message || 'Login failed. Please try again.');
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
            {status === 'success' && 'Welcome back!'}
            {status === 'error' && 'Login failed'}
          </CardTitle>
          <CardDescription className="text-base">
            {message}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="text-center">
            <Button onClick={() => navigate('/login')}>
              Try again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
