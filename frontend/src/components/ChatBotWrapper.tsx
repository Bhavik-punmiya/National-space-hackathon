"use client";
import { useEffect, useState } from 'react';
import { ChatBot } from './ChatBot';

export default function ChatBotWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const savedUser = localStorage.getItem("space_user");
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          if (userData.username && userData.userId) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    // Check initially
    checkAuth();

    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "space_user") {
        checkAuth();
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleCustomEvent = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleCustomEvent);
    };
  }, []);

  // Only show ChatBot when authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <ChatBot />;
}
