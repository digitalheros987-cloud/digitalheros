'use client';

import { useState } from 'react';
import { register } from '@/actions/auth';
import Link from 'next/link';

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6 w-full max-w-md p-8 bg-brand-bg border-4 border-brand-text">
      <h2 className="font-display font-black text-4xl uppercase tracking-tighter text-center">Sign Up</h2>

      {error && <div className="p-4 text-sm font-bold uppercase tracking-widest text-white bg-brand-accent border-2 border-brand-text" data-testid="auth-error">{error}</div>}

      <div className="flex flex-col gap-2">
        <label className="font-bold uppercase tracking-widest text-sm text-brand-text" htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full p-4 border-2 border-brand-text bg-white font-medium focus:outline-none focus:ring-4 focus:ring-brand-primary/20 transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-bold uppercase tracking-widest text-sm text-brand-text" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full p-4 border-2 border-brand-text bg-white font-medium focus:outline-none focus:ring-4 focus:ring-brand-primary/20 transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-bold uppercase tracking-widest text-sm text-brand-text" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full p-4 border-2 border-brand-text bg-white font-medium focus:outline-none focus:ring-4 focus:ring-brand-primary/20 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full mt-4"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>

      <p className="text-sm font-bold uppercase tracking-widest text-center mt-2 text-brand-muted">
        Already have an account? <Link href="/login" className="text-brand-primary hover:text-brand-accent transition-colors underline decoration-2 underline-offset-4">Log in</Link>
      </p>
    </form>
  );
}
