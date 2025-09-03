"use client";
import React, { useState, useEffect } from "react";
import { User, Lock, LogIn } from "lucide-react";
import toast from "react-hot-toast";

interface SignInProps {
  onSignIn: (username: string, userId: string) => void;
}

export default function SignIn({ onSignIn }: SignInProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already signed in
  useEffect(() => {
    const savedUser = localStorage.getItem("space_user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        onSignIn(userData.username, userData.userId);
      } catch (error) {
        localStorage.removeItem("space_user");
      }
    }
  }, [onSignIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SignIn: Form submitted with username:', username, 'password length:', password.length);
    
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    try {
      // Try to authenticate with backend
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';
      console.log('SignIn: Attempting login with baseUrl =', baseUrl);
      
      // First try to login
      const requestBody = { username, password };
      console.log('SignIn: Sending login request with body:', requestBody);
      
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log('SignIn: Login response status:', response.status);
      const responseData = await response.json();
      console.log('SignIn: Login response data:', responseData);

      if (response.ok && responseData.success) {
        // Save user data to localStorage
        const userData = {
          username: responseData.user.username,
          userId: responseData.user.user_id,
          role: responseData.user.role,
          fullName: responseData.user.full_name,
        };
        localStorage.setItem("space_user", JSON.stringify(userData));
        
        // Dispatch custom event to notify ChatBotWrapper
        window.dispatchEvent(new Event('authStateChanged'));
        
        toast.success(`Welcome back, ${responseData.user.full_name || responseData.user.username}!`);
        onSignIn(responseData.user.username, responseData.user.user_id);
              } else {
          // Login failed, show error message
          toast.error(responseData.message || "Login failed");
          
          // If user doesn't exist, create a test user
          console.log('SignIn: Attempting to create test user...');
        const createResponse = await fetch(`${baseUrl}/api/auth/create-test-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        console.log('SignIn: Create user response status:', createResponse.status);
        const createData = await createResponse.json();
        console.log('SignIn: Create user response data:', createData);

        if (createResponse.ok && createData.success) {
          // Save user data to localStorage
          const userData = {
            username: createData.user.username,
            userId: createData.user.user_id,
            role: createData.user.role,
            fullName: createData.user.full_name,
          };
          localStorage.setItem("space_user", JSON.stringify(userData));
          
          // Dispatch custom event to notify ChatBotWrapper
          window.dispatchEvent(new Event('authStateChanged'));
          
          toast.success(`Welcome, ${createData.user.full_name || createData.user.username}! Account created successfully.`);
          onSignIn(createData.user.username, createData.user.user_id);
        } else {
          toast.error(createData.message || "Failed to create user");
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-24 w-24 flex items-center justify-center mb-4">
            <img src="/isro-logo.svg" alt="ISRO Logo" className="h-20 w-20" />
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome to Bhartiya Antariksh Space Station</h2>
          <p className="mt-2 text-gray-400">Sign in to access the inventory system</p>
        </div>

        {/* Sign In Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} method="POST">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={20} className="text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn size={20} className="mr-2" />
                  Sign In
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              If you don't have an account, one will be created automatically
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
