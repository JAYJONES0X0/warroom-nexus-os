import { useState, useEffect } from 'react';
import { supabase, getServerUrl } from '../utils/supabase';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-black">
        <div className="text-red-500">Loading WARROOM NEXUS...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AuthPage onAuth={(session) => setSession(session)} />
        <Toaster theme="dark" />
      </>
    );
  }

  return (
    <>
      <Dashboard session={session} />
      <Toaster theme="dark" />
    </>
  );
}
