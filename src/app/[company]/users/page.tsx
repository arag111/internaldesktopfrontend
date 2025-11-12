'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '@/app/components/Navbar';
import { baseUrl } from '@/app/utils/config';
import CompanySidebar from '@/app/components/CompanySidebar';
import { Users, UserPlus, Edit, Trash2, Search, Save, X, CheckCircle, XCircle, AlertCircle, Shield, Clock, Brain, Mail, User, Lock, Building2, Sparkles, Eye, EyeOff, ChevronDown } from 'lucide-react';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  jobRole?: string;
  productiveActivities?: any;
  unproductiveActivities?: any;
  manager: string;
  teams: string[];
  desktop: string;
  lastActive: string;
  tracktype?: string;
}

interface CompanyInfo {
  _id: string;
  name: string;
  subscription: {
    plan: string;
    userLimit: number;
  };
  stats: {
    currentUsers: number;
  };
}


export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: '',
    jobRole: '',
    productiveActivities: [],
    unproductiveActivities: [],
    manager: '',
    desktop: '',
    teams: '',
    tracktype: 'punchin-punchout',
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [generatingActivities, setGeneratingActivities] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchUsers();
    fetchCompanyInfo();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/companies/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompany(res.data.company);
    } catch (err) {
      console.error('Error fetching company info:', err);
    }
  };

  const generateActivitiesForJobRole = async (jobRole: string) => {
    if (!jobRole) {
      setToastMessage({ message: 'Please select a job role first', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    try {
      setGeneratingActivities(true);

      const res = await axios.post(
        `${baseUrl}/api/users/generate-activities`,
        { jobRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setFormData((prev: any) => ({
          ...prev,
          productiveActivities: res.data.data.productive,
          unproductiveActivities: res.data.data.unproductive,
        }));
        setToastMessage({ message: `AI generated ${res.data.data.productive.length} productive and ${res.data.data.unproductive.length} unproductive activities!`, type: 'success' });
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Error generating activities:', err);
      setToastMessage({ message: err.response?.data?.msg || 'Failed to generate activities', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setGeneratingActivities(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    // Auto-generate AI activities when job role is selected
    if (name === 'jobRole' && value && !selectedUser) {
      // Automatically trigger AI generation when a job role is selected (only for new users)
      generateActivitiesForJobRole(value);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Convert comma-separated string to array
    const activities = value.split('\n').map(line => line.trim()).filter(line => line);
    setFormData((prev: any) => ({ ...prev, [name]: activities }));
  };

  const handleSubmit = async () => {
    setFieldErrors({});

    const errors: Record<string, string> = {};
    
    if (!formData.username) {
      errors.username = 'Username is required';
    }
    if (!formData.email) {
      errors.email = 'Email is required';
    }
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    if (!selectedUser && !formData.password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // Prepare payload with teams converted to array
      const payload = {
        ...formData,
        teams: formData.teams ? formData.teams.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
      };

      // Log payload for debugging (remove sensitive data)
      console.log('Payload being sent:', {
        ...payload,
        password: payload.password ? '***' : undefined,
      });

      if (selectedUser) {
        // Update user
        await axios.put(`${baseUrl}/api/users/${selectedUser.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setToastMessage({ message: 'User updated successfully!', type: 'success' });
      } else {
        // Create user
        await axios.post(`${baseUrl}/api/users/signup`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setToastMessage({ message: 'User created successfully!', type: 'success' });
      }
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        role: '',
        jobRole: '',
        productiveActivities: [],
        unproductiveActivities: [],
        manager: '',
        desktop: '',
        teams: '',
        tracktype: '24x7'
      });
      setSelectedUser(null);
      setFieldErrors({});
      fetchUsers();
      fetchCompanyInfo();

      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      // Extract error message from response - silently handle without console errors
      let errorMessage = 'Failed to save user. Please try again.';
      let status: number | undefined;

      // Get status from either err.response.status or err.status
      if (err.response) {
        status = err.response.status;
        // Server responded with error
        const responseData = err.response.data;

        // Try multiple ways to extract error message
        if (responseData) {
          // Check if responseData is an object with properties
          if (typeof responseData === 'object' && responseData !== null) {
            // Check for common error message properties
            if (responseData.msg) {
              errorMessage = responseData.msg;
            } else if (responseData.message) {
              errorMessage = responseData.message;
            } else if (responseData.error) {
              errorMessage = typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error);
            } else if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
              errorMessage = responseData.errors[0].message || responseData.errors[0];
            } else if (Object.keys(responseData).length > 0) {
              // If object has keys but no standard error fields, try to extract meaningful info
              const firstKey = Object.keys(responseData)[0];
              errorMessage = responseData[firstKey] || JSON.stringify(responseData);
            }
          } else if (typeof responseData === 'string') {
            errorMessage = responseData;
          }
        }
      } else if (err.status) {
        // Error object has status directly (like in the user's error)
        status = err.status;
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection and try again.';
        setToastMessage({ message: errorMessage, type: 'error' });
        setTimeout(() => setToastMessage(null), 3000);
        return;
      } else {
        // Error setting up the request
        errorMessage = err.message || 'Unknown error occurred. Please try again.';
        setToastMessage({ message: errorMessage, type: 'error' });
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      // Add status code context if we still have generic message
      if ((errorMessage === 'Failed to save user. Please try again.' || !errorMessage) && status) {
        if (status === 400) {
          errorMessage = 'Bad request. Please check all required fields are filled correctly.';
        } else if (status === 403) {
          errorMessage = 'Access forbidden. You may have reached your user limit.';
        } else if (status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (status === 404) {
          errorMessage = 'Resource not found.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = `Request failed with status ${status}. Please try again.`;
        }
      }

      // Handle specific 400 errors with better messages
      if (status === 400) {
        // For 400 errors, check if it's likely a duplicate user error
        // Since the backend returns "User already exists in this company" but we might not see it in response
        // We'll show a helpful message for 400 errors when creating users
        if (!selectedUser) {
          // This is a create operation, so 400 likely means validation or duplicate
          if (errorMessage.includes('already exists') || errorMessage.includes('duplicate') || 
              (errorMessage.toLowerCase().includes('user') && errorMessage.toLowerCase().includes('exist'))) {
            errorMessage = 'User already exists in this company. Please use a different email or username.';
          } else if (errorMessage === 'Bad request. Please check all required fields are filled correctly.') {
            // Generic 400 - could be duplicate or validation
            errorMessage = 'User already exists or validation failed. Please check email, username, and all required fields.';
          }
        }
      }

      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      jobRole: user.jobRole || '',
      productiveActivities: user.productiveActivities || [],
      unproductiveActivities: user.unproductiveActivities || [],
      manager: user.manager || '',
      desktop: user.desktop || '',
      teams: user.teams.join(', '),
      tracktype: user.tracktype || 'punchin-punchout',
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToastMessage({ message: 'User deleted successfully', type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
      fetchUsers();
    } catch (err: any) {
      // Extract error message from response
      let errorMessage = 'Failed to delete user. Please try again.';
      
      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Calculate capacity percentage
  const capacityPercentage = company && company.subscription 
    ? (users.length / company.subscription.userLimit) * 100 
    : 0;

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <CompanySidebar />

        <div className="ml-64 mt-16 flex-1 p-8 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
          {/* Hero Banner Section */}
          <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                    Team Management
                  </h1>
                  <p className="text-sm text-slate-500">Manage your team members and their access levels</p>
                </div>
                    </div>

              {company && company.subscription && (
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">User Capacity</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{users.length}</span>
                      <span className="text-slate-600 text-sm">/ {company.subscription.userLimit}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      capacityPercentage >= 90 ? 'bg-red-50 text-red-700 border-red-200' :
                      capacityPercentage >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {Math.round(capacityPercentage)}%
                    </div>
                    <div className="w-24">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            capacityPercentage >= 90 ? 'bg-red-500' :
                            capacityPercentage >= 70 ? 'bg-yellow-500' :
                            'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                      ></div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {company.subscription.userLimit - users.length} slots remaining
                    </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* User Form Section */}
          <div className="bg-white rounded-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  {selectedUser ? <Edit className="w-4 h-4 text-blue-600" /> : <UserPlus className="w-4 h-4 text-blue-600" />}
              </div>
              <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-0.5">
                  {selectedUser ? 'Edit Team Member' : 'Add New Team Member'}
                </h2>
                  <p className="text-sm text-slate-500">
                  {selectedUser ? 'Update team member information' : 'Create a new team member account'}
                </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleSubmit} 
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 border border-slate-200 hover:border-slate-300 transition-colors duration-200 font-medium text-sm"
                >
                  <Save className="w-4 h-4 text-slate-900" />
                  <span>{selectedUser ? 'Update Member' : 'Add Member'}</span>
                </button>
                {selectedUser && (
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setFormData({ 
                        name: '', 
                        username: '', 
                        email: '', 
                        password: '', 
                        role: '', 
                        jobRole: '',
                        productiveActivities: [],
                        unproductiveActivities: [],
                        manager: '', 
                        desktop: '', 
                        teams: '', 
                        tracktype: 'punchin-punchout' 
                      });
                      setFieldErrors({});
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors duration-200 font-medium text-sm"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>


            {/* Form Fields - Section Cards */}
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">Full Name</label>
                  <input
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                  />
                </div>
                <div className="relative">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">
                      Username <span className="text-red-500">*</span>
                    </label>
                  <input
                    name="username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${fieldErrors.username ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                    required
                  />
                  {fieldErrors.username && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
                  )}
                </div>
                <div className="relative">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${fieldErrors.email ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                {!selectedUser && (
                  <div className="relative">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">
                        Password <span className="text-red-500">*</span>
                      </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={handleInputChange}
                          className={`w-full px-3 pr-10 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${fieldErrors.password ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-[70%] -translate-y-1/2 flex items-center justify-center hover:text-blue-600 transition-colors duration-200 cursor-pointer z-10"
                          style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', color: '#64748b' }}
                          title={showPassword ? "Hide password" : "Show password"}
                      >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

              {/* Role & Access Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Role & Access</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative flex flex-col">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">
                      Role <span className="text-red-500">*</span>
                    </label>
                  <input
                    name="role"
                    placeholder="Enter role (admin, manager, user)"
                    value={formData.role}
                    onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] box-border ${fieldErrors.role ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                      style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem', lineHeight: '1.5', display: 'block' }}
                    required
                  />
                  {fieldErrors.role && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>
                  )}
                </div>
                  <div className="relative flex flex-col">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">Job Role (Optional)</label>
                    <select
                      name="jobRole"
                      value={formData.jobRole}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 appearance-none cursor-pointer text-slate-900 text-sm h-[38px] leading-[1.5] box-border"
                      style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem', lineHeight: '1.5', display: 'block' }}
                    >
                      <option value="">Select Job Role</option>
                      <option value="Software Developer">Software Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="Manager">Manager</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                </div>
                <div className="relative flex flex-col">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">Manager</label>
                  <input
                    name="manager"
                    placeholder="Enter manager name"
                    value={formData.manager}
                    onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] box-border"
                  />
                </div>
                <div className="relative flex flex-col">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">Teams (comma separated)</label>
                  <input
                    name="teams"
                    placeholder="Enter teams separated by commas"
                    value={formData.teams}
                    onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] box-border"
                  />
                </div>
                </div>
              </div>

              {/* Tracking Settings Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
                  <h3 className="text-sm font-semibold text-slate-900">Tracking Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">Track Type</label>
                    <select
                      name="tracktype"
                      value={formData.tracktype}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 appearance-none cursor-pointer font-medium text-slate-900 text-sm h-[38px] leading-[1.5]"
                    >
                      <option value="punchin-punchout">Punch In - Punch Out</option>
                      <option value="24x7">24x7 Tracking</option>
                    </select>
                </div>
                <div className="relative">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight">Desktop</label>
                  <input
                    name="desktop"
                    placeholder="Enter desktop identifier"
                    value={formData.desktop}
                    onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                  />
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Generated Activity Lists Section */}
            {(formData.productiveActivities.length > 0 || formData.unproductiveActivities.length > 0) && (
              <div className="mt-6 space-y-6">
                {/* Section Divider: AI Productivity Criteria */}
                <div className="flex items-center justify-between pt-4 pb-3 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">AI Productivity Criteria</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Define what counts as productive/unproductive for {formData.jobRole}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => generateActivitiesForJobRole(formData.jobRole)}
                    disabled={generatingActivities}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                      generatingActivities
                        ? 'bg-slate-200 cursor-not-allowed text-slate-600'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {generatingActivities ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate with AI</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Productive Activities */}
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <label className="block text-sm font-semibold text-slate-700">
                        Productive Activities
                      </label>
                      <span className="ml-auto px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-semibold border border-green-200">
                        {Array.isArray(formData.productiveActivities) ? formData.productiveActivities.length : 0}
                      </span>
                    </div>
                    <textarea
                      name="productiveActivities"
                      value={Array.isArray(formData.productiveActivities) ? formData.productiveActivities.join('\n') : ''}
                      onChange={handleTextareaChange}
                      placeholder="Enter productive activities (one per line)&#10;Example:&#10;Code editors (VS Code, IntelliJ)&#10;Terminal and command line&#10;API testing (Postman, browser)&#10;Git and version control&#10;Documentation and research"
                      className="w-full h-48 border border-slate-200 rounded-lg p-4 text-sm font-mono focus:border-green-400 focus:ring-2 focus:ring-green-400/20 focus:outline-none transition-all duration-200 resize-vertical"
                    />
                  </div>

                  {/* Unproductive Activities */}
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <label className="block text-sm font-semibold text-slate-700">
                        Unproductive Activities
                      </label>
                      <span className="ml-auto px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs font-semibold border border-red-200">
                        {Array.isArray(formData.unproductiveActivities) ? formData.unproductiveActivities.length : 0}
                      </span>
                    </div>
                    <textarea
                      name="unproductiveActivities"
                      value={Array.isArray(formData.unproductiveActivities) ? formData.unproductiveActivities.join('\n') : ''}
                      onChange={handleTextareaChange}
                      placeholder="Enter unproductive activities (one per line)&#10;Example:&#10;Social media (Facebook, Twitter)&#10;Entertainment websites&#10;Gaming platforms&#10;Shopping sites&#10;Non-work videos"
                      className="w-full h-48 border border-slate-200 rounded-lg p-4 text-sm font-mono focus:border-red-400 focus:ring-2 focus:ring-red-400/20 focus:outline-none transition-all duration-200 resize-vertical"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> These lists help the AI accurately analyze productivity. You can edit them manually or regenerate with AI.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Users Table Section */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-0.5">
                    Team Members ({filteredUsers.length})
                  </h3>
                  <p className="text-xs text-slate-500">Manage and view all team members</p>
                </div>
                {company && company.subscription && users.length >= company.subscription.userLimit && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-xs font-medium text-red-800">User limit reached - Upgrade plan to add more</span>
                  </div>
                )}
              </div>

              {/* Search and Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search users by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">Filter by Role:</span>
                  <div className="flex gap-1.5">
                    {['all', 'admin', 'manager', 'user'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setFilterRole(role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 capitalize ${
                          filterRole === role
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead className="bg-slate-50 text-slate-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Member</th>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Track Type</th>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Desktop</th>
                    <th className="px-4 py-3 font-semibold text-xs text-left border-b border-slate-200 uppercase tracking-wider">Teams</th>
                    <th className="px-4 py-3 font-semibold text-xs text-center border-b border-slate-200 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white text-slate-700 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-10 h-10 text-slate-400" />
                          <p className="text-base font-semibold">No users found</p>
                          <p className="text-xs text-slate-500">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className="border-b border-slate-200 hover:bg-slate-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-semibold border border-blue-200">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900 text-sm">{user.name || user.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-sm">{user.username}</td>
                        <td className="px-4 py-3 text-slate-700 text-sm">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                            user.role === 'admin' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : user.role === 'manager'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                            user.tracktype === '24x7' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {user.tracktype === '24x7' ? '24x7' : 'Punch In/Out'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-sm">{user.desktop || '-'}</td>
                        <td className="px-4 py-3 text-slate-700 text-sm">
                          {user.teams.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.teams.slice(0, 2).map((team, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-slate-50 text-slate-700 rounded-md text-xs border border-slate-200">
                                  {team}
                                </span>
                              ))}
                              {user.teams.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-700 rounded-md text-xs border border-slate-200">
                                  +{user.teams.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => handleEdit(user)}
                              className=" text-white flex items-center justify-center transition-colors duration-200"
                              title="Edit User"
                            >
                              <Edit className="w-5 h-5 text-black" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className=" text-white flex items-center justify-center transition-colors duration-200"
                              title="Delete User"
                            >
                              <Trash2 className="w-5 h-5 text-black" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Popup */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success' 
                ? 'text-green-900' 
                : 'text-red-900'
            }`}>
              {toastMessage.message}
            </p>
            <button
              onClick={() => setToastMessage(null)}
              className={`hover:opacity-70 transition-colors flex-shrink-0 ${
                toastMessage.type === 'success' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
