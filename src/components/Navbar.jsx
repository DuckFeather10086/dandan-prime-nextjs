'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGithub, FaCog, FaArrowLeft } from 'react-icons/fa';
import { useNavbar } from '@/context/NavbarContext';

export default function Navbar() {
  const pathname = usePathname();
  const { navbarProps } = useNavbar();
  const { showBackToSeason, seasonId } = navbarProps;
  const isPlayerPage = pathname?.startsWith('/play/');
  return (
    <div className="navbar bg-base-100 text-base-content shadow-lg">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">
          DanDan Prime
        </Link>
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">主页</Link></li>
          {isPlayerPage && showBackToSeason && seasonId && (
            <li>
              <Link href={`/season/${seasonId}`} className="flex items-center gap-1">
                <FaArrowLeft className="mr-1" />
                返回番剧
              </Link>
            </li>
          )}
        </ul>
      </div>
      <div className="flex-none gap-2">
        <a 
          href="https://github.com/DuckFeather10086/dandan-prime" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-ghost btn-circle"
          aria-label="GitHub"
        >
          <FaGithub className="w-5 h-5" />
        </a>
        <Link 
          href="/settings" 
          className="btn btn-ghost btn-circle"
          aria-label="Settings"
        >
          <FaCog className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
