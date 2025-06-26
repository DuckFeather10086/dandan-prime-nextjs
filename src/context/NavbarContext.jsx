'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const NavbarContext = createContext();

export function NavbarProvider({ children }) {
  const [navbarProps, setNavbarProps] = useState({
    showBackToSeason: false,
    seasonId: '',
  });

  return (
    <NavbarContext.Provider value={{ navbarProps, setNavbarProps }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error('useNavbar must be used within a NavbarProvider');
  }
  return context;
}
