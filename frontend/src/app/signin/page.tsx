"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SignIn from "../../components/SignIn";

export default function SignInPage() {
  const router = useRouter();

  // Check if user is already signed in on page load
  useEffect(() => {
    const savedUser = localStorage.getItem("space_user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData.username && userData.userId) {
          // User is already authenticated, redirect to home
          router.push("/");
        }
      } catch (error) {
        localStorage.removeItem("space_user");
      }
    }
  }, [router]);

  const handleSignIn = (username: string, userId: string) => {
    // After successful sign in, redirect to home page
    router.push("/");
  };

  return <SignIn onSignIn={handleSignIn} />;
}
