'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { loginSchema, registerSchema } from '@/lib/validations/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const result = loginSchema.safeParse({ email, password });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  let targetPath = '/profile';
  if (signInData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', signInData.user.id)
      .single();

    if (profile?.role === 'admin') {
      targetPath = '/admin';
    }
  }

  revalidatePath('/', 'layout');
  redirect(targetPath);
}

export async function register(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  const result = registerSchema.safeParse({ email, password, fullName });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = createClient();
  let { data: authData, error: authError } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
  });

  // If Supabase email rate limit is exceeded, use the admin client to create and auto-confirm the user
  let autoConfirmed = false;
  if (authError && (authError.message?.toLowerCase().includes('rate limit') || authError.status === 429)) {
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const adminRes = await supabaseAdmin.auth.admin.createUser({
      email: result.data.email,
      password: result.data.password,
      email_confirm: true,
      user_metadata: { full_name: result.data.fullName },
    });

    if (adminRes.error) {
      return { error: adminRes.error.message };
    }

    authData = { user: adminRes.data.user, session: null };
    authError = null;
    autoConfirmed = true;
  } else if (authError) {
    return { error: authError.message };
  }

  if (authData?.user) {
    // Create profile using service role to bypass RLS since users cannot insert their own profiles by default
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      email: result.data.email,
      full_name: result.data.fullName,
      role: 'user', // strictly set to 'user', admins manage this
      status: 'active',
    });

    if (profileError && profileError.code !== '23505') {
      console.error('Profile creation failed:', profileError);
      return { error: 'Registration succeeded but profile creation failed. Please contact support.' };
    }
  }

  // If auto-confirmed or session is active, sign in and redirect
  if (autoConfirmed) {
    await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    revalidatePath('/', 'layout');
    redirect('/profile');
  }

  // If session is null and not auto-confirmed, email confirmation is required
  if (!authData.session) {
    return { success: true, message: 'Registration successful! Please check your email to confirm your account before logging in.' };
  }

  revalidatePath('/', 'layout');
  redirect('/profile');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
