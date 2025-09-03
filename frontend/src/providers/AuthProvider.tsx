"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: pathname =', pathname, 'isChecking =', isChecking);
    
    // Skip auth check for signin page - allow access immediately
    if (pathname === '/signin' || pathname === '/signin/') {
      console.log('AuthProvider: Signin page detected, allowing access');
      setIsChecking(false);
      return;
    }

    // Check if user is authenticated
    const savedUser = localStorage.getItem("space_user");
    console.log('AuthProvider: savedUser =', savedUser);
    
    if (!savedUser) {
      // Not authenticated, redirect to signin
      console.log('AuthProvider: No saved user, redirecting to signin');
      router.push('/signin');
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      console.log('AuthProvider: userData =', userData);
      
      if (!userData.username || !userData.userId) {
        // Invalid user data, redirect to signin
        console.log('AuthProvider: Invalid user data, redirecting to signin');
        localStorage.removeItem("space_user");
        router.push('/signin');
        return;
      }
      // User is authenticated, allow access
      console.log('AuthProvider: User authenticated, allowing access');
      setIsChecking(false);
    } catch (error) {
      // Invalid JSON, redirect to signin
      console.log('AuthProvider: JSON parse error, redirecting to signin');
      localStorage.removeItem("space_user");
      router.push('/signin');
      return;
    }
  }, [pathname, router]);

  // Show loading while checking auth (only for protected routes)
  if (isChecking && pathname !== '/signin' && pathname !== '/signin/') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
