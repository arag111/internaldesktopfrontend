'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '@/app/components/Navbar';
import { baseUrl } from '@/app/utils/config';
import Sidebar from '../components/Sidebar';

interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  manager: string;
  teams: string[];
  desktop: string;
  lastActive: string;
  tracktype?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<any>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: '',
    manager: '',
    desktop: '',
    teams: '',
    tracktype: 'punchin-punchout',
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchUsers();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.email || !formData.role || (!selectedUser && !formData.password)) {
      alert('Username, Email, Role, and Password (for new users) are mandatory.');
      return;
    }

    try {
      if (selectedUser) {
        // Update user
        await axios.put(`${baseUrl}/api/users/${selectedUser._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create user
        const payload = {
          ...formData,
          teams: formData.teams.split(',').map((t: string) => t.trim()),
        };
        await axios.post(`${baseUrl}/api/users/signup`, payload);
      }
      setFormData({ name: '', username: '', email: '', password: '', role: '', manager: '', desktop: '', teams: '', tracktype: '24x7' });
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      manager: user.manager,
      desktop: user.desktop,
      teams: user.teams.join(', '),
      tracktype: user.tracktype,
    });
  };

  const handleDelete = async (id: string) => {
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
    <>
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
          <Navbar />
    
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
      <div className=" ml-60 mt-1 pt-20 px-6 pb-6 bg-gray-100 min-h-screen overflow-y-auto">
        <h1 className="text-3xl font-bold text-[#075a96] mb-6">User Management</h1>

        <div className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[#075a96]">{selectedUser ? 'Edit User' : 'Add New User'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} className="p-2 border rounded-md" />
            <input type="text" name="username" placeholder="Username *" value={formData.username} onChange={handleInputChange} className="p-2 border rounded-md" required />
            <input type="email" name="email" placeholder="Email *" value={formData.email} onChange={handleInputChange} className="p-2 border rounded-md" required />
            {!selectedUser && (
              <input type="password" name="password" placeholder="Password *" value={formData.password} onChange={handleInputChange} className="p-2 border rounded-md" required />
            )}
            <input type="text" name="role" placeholder="Role *" value={formData.role} onChange={handleInputChange} className="p-2 border rounded-md" required />
            <input type="text" name="manager" placeholder="Manager" value={formData.manager} onChange={handleInputChange} className="p-2 border rounded-md" />
            <input type="text" name="desktop" placeholder="Desktop" value={formData.desktop} onChange={handleInputChange} className="p-2 border rounded-md" />
            <input type="text" name="teams" placeholder="Teams (comma separated)" value={formData.teams} onChange={handleInputChange} className="p-2 border rounded-md" />
            <select name="tracktype" value={formData.tracktype} onChange={handleInputChange} className="p-2 border rounded-md">
              <option value="punchin-punchout">PunchIn-PunchOut</option>
              <option value="24x7">24x7</option>
            </select>
          </div>
          <button onClick={handleSubmit} className="mt-4 bg-[#075a96] text-white px-4 py-2 rounded-md shadow hover:bg-blue-700">
            {selectedUser ? 'Update User' : 'Add User'}
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-[#075a96]">User List</h2>
          <table className="w-full text-left border">
            <thead>
              <tr className="bg-gray-100 text-sm">
                <th className="p-2">Name</th>
                <th className="p-2">Username</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Track Type</th>
                <th className="p-2">Desktop</th>
                <th className="p-2">Teams</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-t text-sm">
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">{user.username}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2">{user.tracktype}</td>
                  <td className="p-2">{user.desktop}</td>
                  <td className="p-2">{user.teams.join(', ')}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:underline mb-2">Edit</button>
                    <button onClick={() => handleDelete(user._id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
    </>
  );
}
