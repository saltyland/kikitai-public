import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import OnboardingWizard from '@/components/OnboardingWizard';

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  return <OnboardingWizard nickname={profile.nickname} />;
}
