"use client";
import React, { useState } from "react";
import SignIn from "../../components/SignIn";

export default function TestAuthPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username: string, userId: string} | null>(null);

  const handleSignIn = (username: string, userId: string) => {
    setCurrentUser({ username, userId });
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem("space_user");
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-2xl">✓</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome!</h2>
          <p className="text-gray-300">You are now signed in as:</p>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-white font-medium">{currentUser?.username}</p>
            <p className="text-gray-400 text-sm">User ID: {currentUser?.userId}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <SignIn onSignIn={handleSignIn} />;
}
