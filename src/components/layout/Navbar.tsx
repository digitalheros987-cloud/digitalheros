'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/actions/auth';

export function Navbar({ 
  isLoggedIn, 
  isAdmin 
}: { 
  isLoggedIn: boolean; 
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't render public navbar on admin pages since they have their own dedicated header
  if (pathname.startsWith('/admin')) return null;

  const links = [
    { href: '/', label: 'Home' },
    { href: '/charities', label: 'Charity Partners' },
  ];

  if (isLoggedIn) {
    links.push({ href: '/dashboard', label: 'Dashboard' });
  }

  return (
    <nav className="w-full bg-brand-bg border-b-2 border-brand-text relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-display font-black text-2xl md:text-3xl uppercase tracking-tighter text-brand-text group-hover:text-brand-accent transition-colors">
                Digital Heroes
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            <div className="flex items-center gap-6 mr-4">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors ${
                      isActive 
                        ? 'text-brand-accent underline underline-offset-8 decoration-2' 
                        : 'text-brand-text hover:text-brand-accent'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {isLoggedIn ? (
              <div className="flex items-center gap-4 pl-6 border-l-2 border-brand-text">
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="text-xs font-bold uppercase tracking-widest text-brand-bg bg-brand-text px-4 py-2 hover:bg-brand-primary transition-colors"
                  >
                    Admin Console
                  </Link>
                )}
                <form action={logout}>
                  <button type="submit" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-text hover:text-brand-accent transition-colors">
                    Log out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-4 pl-6 border-l-2 border-brand-text">
                <Link 
                  href="/login" 
                  className="text-sm font-bold uppercase tracking-widest text-brand-text hover:text-brand-accent transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest bg-brand-text text-brand-bg px-5 py-2.5 hover:bg-brand-primary transition-colors border-2 border-brand-text"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-brand-text hover:text-brand-accent transition-colors focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-brand-bg border-b-2 border-brand-text"
          >
            <div className="px-4 pt-4 pb-6 space-y-4">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-3 text-lg font-bold uppercase tracking-widest ${
                      isActive ? 'text-brand-accent bg-[#EAEAEA]' : 'text-brand-text hover:bg-[#EAEAEA]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              {!isLoggedIn ? (
                <div className="pt-6 border-t-2 border-brand-text flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 text-lg font-bold uppercase tracking-widest text-brand-text border-2 border-brand-text"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 text-lg font-bold uppercase tracking-widest text-brand-bg bg-brand-text"
                  >
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="pt-6 border-t-2 border-brand-text flex flex-col gap-3">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-3 text-lg font-bold uppercase tracking-widest text-brand-bg bg-brand-text"
                    >
                      Admin Console
                    </Link>
                  )}
                  <form action={logout}>
                    <button 
                      type="submit" 
                      className="w-full text-left px-3 py-3 text-lg font-bold uppercase tracking-widest text-brand-accent"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
