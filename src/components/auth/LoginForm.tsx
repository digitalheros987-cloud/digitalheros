'use client';

import { useState } from 'react';
import { login } from '@/actions/auth';
import Link from 'next/link';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col space-y-4 w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center">Log In</h2>

      {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded" data-testid="auth-error">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-black text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </button>

      <p className="text-sm text-center">
        Don&apos;t have an account? <Link href="/register" className="text-blue-600 hover:underline">Sign up</Link>
      </p>
    </form>
  );
}
