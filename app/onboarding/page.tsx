import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { TopicService } from '@/lib/services/topicService';
import OnboardingWizard from '@/components/OnboardingWizard';

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const topics = await new TopicService(supabase).listAll();

  return <OnboardingWizard nickname={profile.nickname} topics={topics} />;
}
