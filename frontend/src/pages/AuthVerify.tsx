/**
 * Auth verification page - handles magic link callbacks.
 *
 * When user clicks the magic link in their email, they land here.
 * This page verifies the token and redirects to the app.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const { verify } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please request a new login link.');
      return;
    }

    const verifyToken = async () => {
      const result = await verify(token);

      if (result.success) {
        setStatus('success');
        setMessage('Login successful! Redirecting...');
        // Redirect after a short delay to show success state
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    };

    verifyToken();
  }, [searchParams, verify, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying your login...</CardTitle>
              <CardDescription>Please wait while we sign you in.</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Welcome back!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Verification failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === 'error' && (
          <CardContent className="text-center">
            <Button onClick={() => navigate('/login')}>
              Request new login link
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
