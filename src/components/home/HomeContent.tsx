'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Charity } from '@/lib/services/charities';

interface HomeContentProps {
  featured: Charity | null;
}

const reveal = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};

export function HomeContent({ featured }: HomeContentProps) {
  return (
    <div className="w-full flex flex-col items-center bg-brand-bg text-brand-text overflow-hidden">
      
      {/* 1. HERO SECTION - ASYMMETRICAL & EDITORIAL */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end"
        >
          <div className="lg:col-span-8 flex flex-col gap-6">
            <motion.h1 
              variants={reveal} 
              className="font-display font-black text-6xl sm:text-7xl lg:text-8xl xl:text-9xl tracking-tighter leading-[0.85] uppercase"
            >
              Your <br />
              Numbers.<br />
              Your <br />
              <span className="text-brand-accent">Impact.</span>
            </motion.h1>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-8 pb-4">
            <motion.p variants={reveal} className="text-lg md:text-xl font-medium leading-relaxed max-w-md border-l-4 border-brand-text pl-6">
              Participate in the ultimate performance draw. Submit your scores, match the winning numbers, and support vital charities along the way.
            </motion.p>
            <motion.div variants={reveal} className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="btn-primary flex items-center justify-center gap-2 group">
                Enter the Draw <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/charities" className="btn-secondary flex items-center justify-center">
                Explore Causes
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 2. HOW IT WORKS - EDITORIAL NUMBERING */}
      <section className="w-full border-y-2 border-brand-text bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y-2 md:divide-y-0 md:divide-x-2 divide-brand-text border-2 border-brand-text">
            
            <div className="p-8 lg:p-12 flex flex-col gap-12 hover:bg-brand-bg transition-colors">
              <span className="font-display font-black text-7xl text-brand-muted/30 tracking-tighter">01</span>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-widest mb-4">Choose Numbers</h3>
                <p className="text-lg font-medium text-brand-muted">Submit your valid Stableford scores. These form your unique entry combination for the monthly draw.</p>
              </div>
            </div>

            <div className="p-8 lg:p-12 flex flex-col gap-12 hover:bg-brand-bg transition-colors">
              <span className="font-display font-black text-7xl text-brand-muted/30 tracking-tighter">02</span>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-widest mb-4">Enter Draw</h3>
                <p className="text-lg font-medium text-brand-muted">Your active subscription automatically secures your place in the upcoming official prize pool.</p>
              </div>
            </div>

            <div className="p-8 lg:p-12 flex flex-col gap-12 hover:bg-brand-bg transition-colors bg-brand-primary text-white group">
              <span className="font-display font-black text-7xl text-white/30 tracking-tighter">03</span>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-widest mb-4">See Results</h3>
                <p className="text-lg font-medium text-white/80">Match your numbers to win cash prizes, while a percentage of the pool is distributed to charities.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CHARITY SPOTLIGHT - SPLIT SCREEN */}
      {featured && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="mb-12">
            <h2 className="font-display font-black text-4xl uppercase tracking-tighter">Featured Impact</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 border-2 border-brand-text group hover:shadow-brutal transition-shadow bg-white">
            <div className="p-8 lg:p-16 flex flex-col justify-between border-b-2 lg:border-b-0 lg:border-r-2 border-brand-text">
              <div className="flex flex-col gap-6">
                <span className="inline-block px-3 py-1 border-2 border-brand-text text-sm font-bold uppercase tracking-widest w-max bg-brand-accent text-white">
                  Spotlight
                </span>
                <h3 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tighter leading-tight">
                  {featured.name}
                </h3>
                <p className="text-lg font-medium leading-relaxed max-w-md">
                  {featured.description}
                </p>
              </div>
              <div className="mt-12">
                <Link href={`/charities/${featured.id}`} className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-brand-primary hover:text-brand-accent transition-colors">
                  View Full Profile <ArrowUpRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            
            {/* Visual placeholder for charity image - since we don't have real images in DB, we use a designed typographic placeholder */}
            <div className="bg-brand-primary p-8 lg:p-16 flex items-center justify-center min-h-[400px] relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              <span className="font-display font-black text-8xl text-brand-bg opacity-20 transform -rotate-12 uppercase tracking-tighter">
                IMPACT
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 4. TRANSPARENCY / CTA SECTION */}
      <section className="w-full bg-brand-text text-brand-bg py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <h2 className="font-display font-black text-5xl md:text-7xl uppercase tracking-tighter mb-8 leading-[0.9]">
            Real Results.<br/>
            Real Transparency.
          </h2>
          <p className="text-xl md:text-2xl font-medium text-brand-muted max-w-2xl mb-12">
            Every draw is mathematically verifiable. We combine competitive performance with philanthropic giving in a completely transparent ecosystem.
          </p>
          <Link href="/register" className="px-8 py-4 bg-brand-accent text-white font-bold uppercase tracking-widest hover:bg-white hover:text-brand-text transition-colors border-2 border-transparent hover:border-brand-text text-xl">
            Join the Next Draw
          </Link>
        </div>
      </section>

    </div>
  );
}
