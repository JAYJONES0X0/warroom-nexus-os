import { useState } from 'react';
import { supabase, getServerUrl } from '../../utils/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface AuthPageProps {
  onAuth: (session: any) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
      } else {
        toast.success('Signed in successfully');
        onAuth(data.session);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${getServerUrl()}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Signup error:', data);
        toast.error(`Sign up failed: ${data.error || 'Unknown error'}`);
      } else {
        toast.success('Account created! Please sign in.');
        setIsSignUp(false);
        setPassword(''); // Clear password field
      }
    } catch (err: any) {
      console.error('Signup exception:', err);
      toast.error(`Error: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="size-full flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <span className="text-2xl font-bold text-red-500">WN</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">WARROOM NEXUS</h1>
          <p className="text-sm text-zinc-400">Autonomous Financial Reasoning Engine</p>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="name" className="text-zinc-300">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-zinc-400 hover:text-white"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </Card>
    </div>
  );
}