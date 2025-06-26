'use client';

import { useEffect } from 'react';
import { useNavbar } from '@/context/NavbarContext';

export function useUpdateNavbar({ showBackToSeason = false, seasonId = '' } = {}) {
  const { setNavbarProps } = useNavbar();

  useEffect(() => {
    setNavbarProps({
      showBackToSeason,
      seasonId,
    });

    // Clean up when the component unmounts
    return () => {
      setNavbarProps({
        showBackToSeason: false,
        seasonId: '',
      });
    };
  }, [showBackToSeason, seasonId, setNavbarProps]);
}
