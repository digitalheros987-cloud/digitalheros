'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden');

  return createAdminClient();
}

export async function addCharity(formData: FormData) {
  try {
    const admin = await verifyAdmin();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image_url = formData.get('image_url') as string || null;
    const upcoming_events = formData.get('upcoming_events') as string || null;
    const golf_events = formData.get('golf_events') as string || null;
    const is_active = formData.get('is_active') === 'true';
    const is_spotlight = formData.get('is_spotlight') === 'true';

    if (!name || !description) return { error: 'Name and description are required.' };

    const { error } = await admin.from('charities').insert({
      name,
      description,
      image_url,
      upcoming_events,
      golf_events,
      is_active,
      is_spotlight
    });

    if (error) return { error: error.message };

    revalidatePath('/admin/charities');
    revalidatePath('/charities');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateCharity(formData: FormData) {
  try {
    const admin = await verifyAdmin();

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image_url = formData.get('image_url') as string || null;
    const upcoming_events = formData.get('upcoming_events') as string || null;
    const golf_events = formData.get('golf_events') as string || null;
    const is_active = formData.get('is_active') === 'true';
    const is_spotlight = formData.get('is_spotlight') === 'true';

    if (!id || !name || !description) return { error: 'ID, name, and description are required.' };

    const { error } = await admin.from('charities').update({
      name,
      description,
      image_url,
      upcoming_events,
      golf_events,
      is_active,
      is_spotlight
    }).eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/admin/charities');
    revalidatePath('/charities');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteCharity(formData: FormData) {
  try {
    const admin = await verifyAdmin();
    const id = formData.get('id') as string;

    if (!id) return { error: 'ID is required.' };

    const { error } = await admin.from('charities').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { error: 'Cannot delete this charity because it is actively selected by users. Please deactivate it instead.' };
      }
      return { error: error.message };
    }

    revalidatePath('/admin/charities');
    revalidatePath('/charities');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
