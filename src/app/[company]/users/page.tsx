'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '@/app/components/Navbar';
import { baseUrl } from '@/app/utils/config';
import CompanySidebar from '@/app/components/CompanySidebar';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  jobRole?: string;
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
    manager: '',
    desktop: '',
    teams: '',
    tracktype: 'punchin-punchout',
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.username || !formData.email || !formData.role || (!selectedUser && !formData.password)) {
      setError('Username, Email, Role, and Password (for new users) are mandatory.');
      return;
    }

    try {
      // Prepare payload with teams converted to array
      const payload = {
        ...formData,
        teams: formData.teams ? formData.teams.split(',').map((t: string) => t.trim()).filter(t => t) : [],
      };

      if (selectedUser) {
        // Update user
        await axios.put(`${baseUrl}/api/users/${selectedUser.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('User updated successfully!');
      } else {
        // Create user
        await axios.post(`${baseUrl}/api/users/signup`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('User created successfully!');
      }
      setFormData({ name: '', username: '', email: '', password: '', role: '', jobRole: '', manager: '', desktop: '', teams: '', tracktype: '24x7' });
      setSelectedUser(null);
      fetchUsers();
      fetchCompanyInfo();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Submit error:', err);

      // Extract error message from response
      if (err.response?.status === 403 && err.response?.data?.msg) {
        // User limit exceeded error
        setError(err.response.data.msg);
      } else if (err.response?.data?.msg) {
        // Other errors
        setError(err.response.data.msg);
      } else {
        // Generic error
        setError('Failed to save user. Please try again.');
      }
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
      manager: user.manager,
      desktop: user.desktop,
      teams: user.teams.join(', '),
      tracktype: user.tracktype,
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <CompanySidebar />

        <div className="ml-64 mt-16 flex-1 p-6 overflow-y-auto">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6 bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#096eb6] rounded-full flex items-center justify-center text-white">
                👥
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#075a96]">Team Management</h1>
                <p className="text-gray-600 text-sm">Manage your team members and their access levels</p>
              </div>
            </div>

            {company && company.subscription && (
              <div className="bg-[#096eb6] text-white p-4 rounded-lg min-w-[280px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm opacity-90">User Capacity</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{users.length}</span>
                  <span className="opacity-80">/ {company.subscription.userLimit}</span>
                </div>
                <div className="text-xs opacity-80 mt-1">
                  {company.subscription.userLimit - users.length} slots remaining
                </div>
              </div>
            )}
          </div>

          {/* User Form Section */}
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#096eb6] rounded-full flex items-center justify-center text-white">
                {selectedUser ? '✏️' : '+'}
              </div>
              <h2 className="text-xl font-semibold text-[#075a96]">
                {selectedUser ? 'Edit Team Member' : 'Add New Team Member'}
              </h2>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="text-red-700 text-sm">
                  <strong>Error:</strong> {error}
                  <span
                    onClick={() => setError('')}
                    className="float-right cursor-pointer font-bold hover:opacity-70"
                  >
                    ✕
                  </span>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <div className="text-green-700 text-sm">
                  <strong>Success:</strong> {success}
                  <span
                    onClick={() => setSuccess('')}
                    className="float-right cursor-pointer font-bold hover:opacity-70"
                  >
                    ✕
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                className="border rounded-md p-2"
              />
              <input
                name="username"
                placeholder="Username *"
                value={formData.username}
                onChange={handleInputChange}
                className="border rounded-md p-2"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address *"
                value={formData.email}
                onChange={handleInputChange}
                className="border rounded-md p-2"
                required
              />
              {!selectedUser && (
                <input
                  name="password"
                  type="password"
                  placeholder="Password *"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="border rounded-md p-2"
                  required
                />
              )}
              <input
                name="role"
                placeholder="Role *"
                value={formData.role}
                onChange={handleInputChange}
                className="border rounded-md p-2"
                required
              />
              <select
                name="jobRole"
                value={formData.jobRole}
                onChange={handleInputChange}
                className="border rounded-md p-2"
              >
                <option value="">Select Job Role (Optional)</option>
                <option value="Software Developer">Software Developer</option>
                <option value="Designer">Designer</option>
                <option value="Manager">Manager</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Marketing">Marketing</option>
              </select>
              <input
                name="manager"
                placeholder="Manager"
                value={formData.manager}
                onChange={handleInputChange}
                className="border rounded-md p-2"
              />
              <input
                name="desktop"
                placeholder="Desktop"
                value={formData.desktop}
                onChange={handleInputChange}
                className="border rounded-md p-2"
              />
              <input
                name="teams"
                placeholder="Teams (comma separated)"
                value={formData.teams}
                onChange={handleInputChange}
                className="border rounded-md p-2"
              />
              <select
                name="tracktype"
                value={formData.tracktype}
                onChange={handleInputChange}
                className="border rounded-md p-2"
              >
                <option value="punchin-punchout">Punch In - Punch Out</option>
                <option value="24x7">24x7 Tracking</option>
              </select>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleSubmit} className="px-6 py-2">
                {selectedUser ? 'Update Member' : 'Add Member'}
              </button>
              {selectedUser && (
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setFormData({ name: '', username: '', email: '', password: '', role: '', manager: '', desktop: '', teams: '', tracktype: 'punchin-punchout' });
                  }}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* Users Table Section */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-[#075a96]">Team Members ({users.length})</h3>
                {company && company.subscription && users.length >= company.subscription.userLimit && (
                  <span className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded border border-red-300">
                    User limit reached - Upgrade plan to add more
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Member</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Username</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Track Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Desktop</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#075a96]">Teams</th>
                    <th className="px-4 py-3 text-center font-semibold text-[#075a96]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#096eb6] rounded-full flex items-center justify-center text-white text-sm">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name || user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.username}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded border ${user.tracktype === '24x7' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                          {user.tracktype === '24x7' ? '24x7' : 'Punch In/Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.desktop || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{user.teams.length > 0 ? user.teams.join(', ') : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-3 py-1 text-sm bg-transparent text-[#075a96] hover:bg-blue-50 border-none"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-3 py-1 text-sm bg-transparent text-red-600 hover:bg-red-50 border-none"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
