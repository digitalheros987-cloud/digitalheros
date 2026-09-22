'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { Charity } from '@/lib/services/charities';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export function CharityDirectory({ initialCharities }: { initialCharities: Charity[] }) {
  const [search, setSearch] = useState('');

  const filteredCharities = useMemo(() => {
    return initialCharities.filter((c) => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [initialCharities, search]);

  return (
    <div className="w-full flex flex-col pt-12 md:pt-24 pb-32">
      
      {/* Header & Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <h1 className="font-display font-black text-6xl md:text-8xl uppercase tracking-tighter leading-[0.85]">
            Our <br />Partners
          </h1>
        </div>
        
        <div className="w-full md:max-w-md relative">
          <input
            type="text"
            placeholder="Search causes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-brand-text text-brand-text font-bold uppercase tracking-widest placeholder:text-brand-muted focus:outline-none focus:ring-0 focus:border-brand-primary transition-colors"
          />
          <Search className="w-6 h-6 text-brand-text absolute left-4 top-4" />
        </div>
      </div>

      {/* Directory Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full border-t-2 border-brand-text pt-16">
        <AnimatePresence mode="wait">
          {filteredCharities.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-brand-text"
            >
              <p className="text-2xl font-bold uppercase tracking-widest text-brand-muted">No charities found</p>
              <button 
                onClick={() => setSearch('')}
                className="mt-4 text-brand-accent hover:text-brand-primary font-bold uppercase tracking-widest underline decoration-2 underline-offset-4"
              >
                Clear search
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              variants={container} 
              initial="hidden" 
              animate="show" 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredCharities.map((charity) => (
                <motion.div key={charity.id} variants={item} className="h-full">
                  <Link 
                    href={`/charities/${charity.id}`}
                    className="group block h-full bg-white border-2 border-brand-text hover:shadow-brutal transition-all duration-300 flex flex-col"
                  >
                    {charity.image_url ? (
                      <div className="w-full h-48 border-b-2 border-brand-text overflow-hidden bg-brand-bg">
                        {/* Use img as requested in previous guidelines, Next/Image wasn't set up for external domains usually, keeping standard img for safety */}
                        <img 
                          src={charity.image_url} 
                          alt={charity.name} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 border-b-2 border-brand-text bg-brand-text flex items-center justify-center overflow-hidden relative">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}></div>
                        <Heart className="w-16 h-16 text-brand-bg opacity-50 transform group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    
                    <div className="p-6 flex flex-col flex-1 justify-between gap-6">
                      <div>
                        <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-2 line-clamp-2">
                          {charity.name}
                        </h3>
                        <p className="text-brand-muted font-medium line-clamp-3">
                          {charity.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between border-t-2 border-brand-bg pt-4 mt-auto">
                        <span className="text-sm font-bold uppercase tracking-widest text-brand-primary">View Details</span>
                        <ArrowRight className="w-5 h-5 text-brand-primary group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
