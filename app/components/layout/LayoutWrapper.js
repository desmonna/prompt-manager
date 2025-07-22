'use client'

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <>
      {!isHomePage && <Navbar />}
      {children}
    </>
  );
}