import { createClient } from '@/lib/supabase/server';
import { getCharityById } from '@/lib/services/charities';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Calendar, Info } from 'lucide-react';

export default async function CharityProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: charity, error } = await getCharityById(supabase, params.id);

  if (error || !charity) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="bg-brand-bg flex-1 flex flex-col w-full text-brand-text">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24 w-full">
        <div className="mb-12">
          <Link href="/charities" className="text-sm font-bold uppercase tracking-widest text-brand-text hover:text-brand-accent flex items-center gap-2 w-max">
            <ArrowLeft className="w-5 h-5" /> Back to Directory
          </Link>
        </div>
        
        <article className="border-2 border-brand-text bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-brand-text">
            
            {/* LEFT: TEXT CONTENT */}
            <div className="p-8 lg:p-16 flex flex-col justify-between">
              <div>
                {charity.is_spotlight && (
                  <span className="inline-block px-3 py-1 border-2 border-brand-text text-sm font-bold uppercase tracking-widest w-max bg-brand-accent text-white mb-8">
                    Featured Partner
                  </span>
                )}
                
                <h1 className="font-display font-black text-5xl md:text-6xl lg:text-7xl uppercase tracking-tighter leading-[0.9] mb-8">
                  {charity.name}
                </h1>
                
                <div className="text-lg font-medium leading-relaxed max-w-xl text-brand-muted whitespace-pre-wrap border-l-4 border-brand-text pl-6 mb-12">
                  {charity.description}
                </div>
              </div>
            </div>

            {/* RIGHT: IMAGE & STATS */}
            <div className="flex flex-col divide-y-2 divide-brand-text">
              {/* Header Image */}
              {charity.image_url ? (
                <div className="w-full h-[400px] lg:h-[500px] bg-brand-bg">
                  <img 
                    src={charity.image_url} 
                    alt={charity.name} 
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
              ) : (
                <div className="w-full h-[400px] lg:h-[500px] bg-brand-primary flex items-center justify-center border-b-2 border-brand-text overflow-hidden relative">
                   <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                  <span className="font-display font-black text-8xl text-brand-bg opacity-30 transform -rotate-12 uppercase tracking-tighter">
                    {charity.name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Data Rows */}
              {(charity.upcoming_events || charity.golf_events) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-brand-text bg-brand-bg">
                  
                  {charity.upcoming_events && (
                    <div className="p-8">
                      <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> Events
                      </h3>
                      <p className="text-brand-muted font-medium whitespace-pre-wrap">
                        {charity.upcoming_events}
                      </p>
                    </div>
                  )}

                  {charity.golf_events && (
                    <div className="p-8">
                      <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5" /> Golf Events
                      </h3>
                      <p className="text-brand-muted font-medium whitespace-pre-wrap">
                        {charity.golf_events}
                      </p>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          </div>

          {/* CTA Footer */}
          <div className="border-t-2 border-brand-text p-8 lg:p-12 bg-brand-text text-brand-bg flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display font-bold text-3xl uppercase tracking-tighter">Support {charity.name}</h3>
              <p className="text-brand-muted mt-2">Select this cause in your dashboard to allocate your monthly contribution.</p>
            </div>
            {user ? (
              <Link 
                href="/dashboard"
                className="px-8 py-4 bg-brand-accent text-white font-bold uppercase tracking-widest hover:bg-white hover:text-brand-text transition-colors border-2 border-transparent hover:border-brand-text whitespace-nowrap"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link 
                href="/register"
                className="px-8 py-4 bg-brand-accent text-white font-bold uppercase tracking-widest hover:bg-white hover:text-brand-text transition-colors border-2 border-transparent hover:border-brand-text whitespace-nowrap"
              >
                Sign up to support
              </Link>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
