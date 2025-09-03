"use client";
import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Settings, LogOut, Calendar } from 'lucide-react';

interface UserDropdownProps {
  username: string;
  onSignOut: () => void;
}

export default function UserDropdown({ username, onSignOut }: UserDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle navigation to different pages
  const handleNavigation = (page: string) => {
    setShowDropdown(false);
    switch (page) {
      case 'profile':
        // TODO: Navigate to profile page
        break;
      case 'scheduled-tasks':
        window.location.href = '/scheduled-tasks';
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium">{username}</span>
        <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>
      
      {/* User Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => handleNavigation('profile')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Settings size={16} className="mr-3" />
              Profile
            </button>
            <button
              onClick={() => handleNavigation('scheduled-tasks')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Calendar size={16} className="mr-3" />
              Scheduled Tasks
            </button>
            <div className="border-t border-gray-700 my-1"></div>
            <button
              onClick={onSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
            >
              <LogOut size={16} className="mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
