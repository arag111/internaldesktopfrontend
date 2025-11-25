'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import {
  User, Settings, BarChart3, Camera, Calendar,
  LogOut, ChevronDown, Briefcase, Mail, Shield
} from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  jobRole?: string;
  companyId?: number;
  company?: {
    name: string;
    slug: string;
  };
}

interface UserProfileDropdownProps {
  userName: string;
  onLogout: () => void;
}

export default function UserProfileDropdown({ userName, onLogout }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (userProfile) return; // Already loaded

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseUrl}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(res.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Fallback to localStorage data
      setUserProfile({
        id: 0,
        name: localStorage.getItem('userName') || '',
        username: localStorage.getItem('username') || '',
        email: localStorage.getItem('userEmail') || '',
        role: localStorage.getItem('role') || '',
        jobRole: localStorage.getItem('jobRole') || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen && !userProfile) {
      fetchUserProfile();
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'manager':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Menu items based on role
  const getMenuItems = () => {
    const role = localStorage.getItem('role');
    const companyId = localStorage.getItem('companyId');
    const companySlug = userProfile?.company?.slug || 'company';

    const items = [];

    // Common items for all users
    if (role !== 'superadmin') {
      items.push(
        { icon: BarChart3, label: 'My Dashboard', href: `/${companySlug}/dashboard` },
        { icon: Calendar, label: 'My Attendance', href: `/${companySlug}/attendance` },
        { icon: Camera, label: 'My Screenshots', href: `/${companySlug}/monitoring` },
        { icon: BarChart3, label: 'My AI Report', href: `/${companySlug}/my-ai-report` }
      );
    }

    // Admin/Manager items
    if (role === 'admin' || role === 'manager') {
      items.push(
        { icon: Settings, label: 'Configuration', href: `/${companySlug}/configuration` },
        { icon: User, label: 'Manage Users', href: `/${companySlug}/users` }
      );
    }

    // Superadmin items
    if (role === 'superadmin') {
      items.push(
        { icon: Settings, label: 'Admin Panel', href: '/superadmin' }
      );
    }

    return items;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={toggleDropdown}
        className="relative group flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-br from-gray-50 to-white text-[#075a96] border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
      >
        <span className="text-gray-500 font-normal">Hi!</span>
        <span className="text-[#075a96]">{userName}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fadeSlideDown">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#075a96] mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading profile...</p>
            </div>
          ) : (
            <>
              {/* User Info Section */}
              <div className="px-6 py-4 bg-gradient-to-br from-[#075a96]/5 to-[#075a96]/10 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#075a96] to-[#0a6fb8] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {getInitials(userProfile?.name || userName)}
                  </div>

                  {/* User Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {userProfile?.name || userName}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      @{userProfile?.username || 'user'}
                    </p>
                  </div>
                </div>

                {/* Email & Role */}
                <div className="mt-3 space-y-2">
                  {userProfile?.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{userProfile.email}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gray-600" />
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(userProfile?.role || '')}`}>
                      {userProfile?.role || 'User'}
                    </span>

                    {userProfile?.jobRole && (
                      <>
                        <Briefcase className="w-3.5 h-3.5 text-gray-600 ml-1" />
                        <span className="text-xs text-gray-600 truncate">
                          {userProfile.jobRole}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {getMenuItems().map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      router.push(item.href);
                      setIsOpen(false);
                    }}
                    className="w-full px-6 py-3 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <item.icon className="w-4 h-4 text-gray-500" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full px-6 py-3 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes fadeSlideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeSlideDown {
          animation: fadeSlideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
