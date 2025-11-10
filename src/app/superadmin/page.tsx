'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { baseUrl } from '../utils/config';
import { Home, Building2, Menu, X, BarChart3, Plus } from 'lucide-react';
import Image from 'next/image';

interface Company {
  _id: string;
  name: string;
  email: string;
  slug: string;
  adminUser?: {
    username: string;
    password?: string;
    adminEmail: string;
    adminName: string;
  };
  subscription?: {
    plan: string;
    userLimit: number;
    storageLimit: number;
  };
  stats?: {
    currentUsers: number;
    storageUsed: number;
  };
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastActiveDate?: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '',
    email: '',
    slug: '',
    adminUser: {
      username: '',
      password: '',
      adminEmail: '',
      adminName: ''
    },
    subscription: {
      plan: 'free',
      userLimit: 10,
      storageLimit: 1024
    },
    isActive: true
  });
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    totalStorage: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'superadmin') {
      router.push('/');
      return;
    }

    fetchCompanies();
  }, [router]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/companies`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const companyList = data.companies || [];
        console.log('Companies data:', companyList); // Debug log
        setCompanies(companyList);

        // Calculate real stats
        const activeCompanies = companyList.filter((c: Company) => c.isActive && !c.isSuspended).length;
        const totalUsers = companyList.reduce((sum: number, c: Company) => sum + (c.stats?.currentUsers || 0), 0);
        const totalStorage = companyList.reduce((sum: number, c: Company) => sum + (c.stats?.storageUsed || 0), 0);

        setStats({
          totalCompanies: companyList.length,
          activeCompanies,
          totalUsers,
          totalStorage
        });
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendCompany = async (companyId: string, suspend: boolean) => {
    try {
      const response = await fetch(`${baseUrl}/api/companies/${companyId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ suspend, reason: suspend ? 'Manual suspension' : null })
      });

      if (response.ok) {
        fetchCompanies(); // Refresh the data
      }
    } catch (error) {
      console.error('Suspend company error:', error);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany({ ...company });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;

    try {
      const response = await fetch(`${baseUrl}/api/companies/${editingCompany._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: editingCompany.name,
          email: editingCompany.email,
          slug: editingCompany.slug,
          adminUser: editingCompany.adminUser,
          subscription: editingCompany.subscription,
          isActive: editingCompany.isActive
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingCompany(null);
        fetchCompanies(); // Refresh the data
      }
    } catch (error) {
      console.error('Edit company error:', error);
    }
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingCompany(null);
  };

  const handleAddCompany = () => {
    setShowAddModal(true);
  };

  const handleSaveNewCompany = async () => {
    if (!newCompany.name || !newCompany.email || !newCompany.slug || !newCompany.adminUser?.username || !newCompany.adminUser?.password || !newCompany.adminUser?.adminEmail || !newCompany.adminUser?.adminName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCompany)
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewCompany({
          name: '',
          email: '',
          slug: '',
          adminUser: {
            username: '',
            password: '',
            adminEmail: '',
            adminName: ''
          },
          subscription: {
            plan: 'free',
            userLimit: 10,
            storageLimit: 1024
          },
          isActive: true
        });
        fetchCompanies(); // Refresh the data
      } else {
        const error = await response.json();
        // Backend returns 'msg' property, not 'message'
        alert(`Error: ${error.msg || error.message || 'Failed to create company'}`);
      }
    } catch (error) {
      console.error('Add company error:', error);
      alert('Error creating company');
    }
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setNewCompany({
      name: '',
      email: '',
      slug: '',
      adminUser: {
        username: '',
        password: '',
        adminEmail: '',
        adminName: ''
      },
      subscription: {
        plan: 'free',
        userLimit: 10,
        storageLimit: 1024
      },
      isActive: true
    });
  };

  const handleLoginAsCompanyAdmin = async (company: Company) => {
    // Debug log to see what admin data is available
    console.log('Company admin data:', company.adminUser);
    console.log('Full company data:', company);

    try {
      // Call backend API to get company admin login token
      // Let backend handle finding the admin user for this company
      const response = await fetch(`${baseUrl}/api/users/login-as-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          companyId: Number(company._id), // Ensure companyId is sent as a number
          companySlug: company.slug,
          companyName: company.name
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Store the company admin token and role
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', 'admin');
        localStorage.setItem('companyId', company._id);
        localStorage.setItem('companyName', company.name);
        localStorage.setItem('username', data.adminUsername || 'admin'); // Use returned admin username

        // Redirect to company admin dashboard
        router.push('/admin');
      } else {
        const error = await response.json();
        // Backend returns 'msg' property, not 'message'
        alert(`Failed to login as company admin: ${error.msg || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Login as company admin error:', error);
      alert('Error logging in as company admin');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const getPlanColor = (plan?: string) => {
    const colors = {
      free: '#9CA3AF',
      basic: '#3B82F6',
      premium: '#8B5CF6',
      professional: '#10B981',
      enterprise: '#F59E0B'
    };
    return colors[plan as keyof typeof colors] || '#9CA3AF';
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'companies', label: 'Companies', icon: Building2 }
  ];

  const renderContent = () => {
    if (activeMenu === 'companies') {
      return (
        <div>
          {/* Companies Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Banner Section */}
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
              <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-0.5">
                  Companies Management
                </h2>
                  <p className="text-sm text-slate-500">
                  Manage all registered companies and their settings
                </p>
                </div>
              </div>
              <button
                onClick={handleAddCompany}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 text-sm font-medium"
              >
                <Plus className="w-4 h-4 text-slate-900" />
                Add Company
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center">
                <div className="text-slate-500 text-sm">Loading companies...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {company.name}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">
                              {company.email}
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              /{company.slug}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="px-2 py-1 rounded text-[11px] font-semibold text-white uppercase"
                            style={{ backgroundColor: getPlanColor(company.subscription?.plan) }}
                          >
                            {company.subscription?.plan || 'free'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-900 text-sm">
                          {company.stats?.currentUsers || 0} / {company.subscription?.userLimit || 10}
                        </td>
                        <td className="px-4 py-4">
                          {company.isSuspended ? (
                            <span className="px-2 py-1 rounded text-[11px] font-semibold bg-red-50 text-red-600">
                              Suspended
                            </span>
                          ) : company.isActive ? (
                            <span className="px-2 py-1 rounded text-[11px] font-semibold bg-green-50 text-green-600">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-[11px] font-semibold bg-yellow-50 text-yellow-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleLoginAsCompanyAdmin(company)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 text-xs font-medium"
                            >
                              Login as Admin
                            </button>
                            <button
                              onClick={() => handleEditCompany(company)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSuspendCompany(company._id, !company.isSuspended)}
                              className={`px-3 py-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 text-xs font-medium ${
                                company.isSuspended ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {company.isSuspended ? 'Activate' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default dashboard content
    return (
      <div>
        {/* Welcome Message */}
        <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-0.5">
            Welcome to Super Admin Dashboard
          </h1>
              <p className="text-sm text-slate-500">
            Manage all companies and system settings from here
          </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Companies</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{loading ? '...' : stats.totalCompanies}</p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Companies</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{loading ? '...' : stats.activeCompanies}</p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Home className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Users</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{loading ? '...' : stats.totalUsers}</p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Storage Used</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{loading ? '...' : `${(stats.totalStorage / 1024).toFixed(1)} GB`}</p>
          </div>
        </div>

        {/* New Section: Company Activity and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Company Last Active Dates */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Recent Company Activity
            </h3>
            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="text-slate-500 text-sm">
                  Loading activity...
                </div>
              ) : companies.length > 0 ? (
                companies.slice(0, 5).map((company) => {
                  // Check if company is inactive based on DATABASE STATUS FLAGS
                  let isInactive = false;

                  // Debug log for each company
                  console.log(`Company ${company.name}:`, {
                    isActive: company.isActive,
                    isSuspended: company.isSuspended,
                    createdAt: company.createdAt
                  });

                  // Simple rule: If company is suspended OR not active in database, mark as inactive
                  if (company.isSuspended || !company.isActive) {
                    isInactive = true;
                    console.log(`${company.name} - INACTIVE (isSuspended: ${company.isSuspended}, isActive: ${company.isActive})`);
                  } else {
                    isInactive = false;
                    console.log(`${company.name} - ACTIVE (isActive: true, isSuspended: false)`);
                  }

                  return (
                    <div key={company._id} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {company.name}
                          {isInactive ? (
                            <span className="ml-2 text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                              INACTIVE
                            </span>
                          ) : (
                            <span className="ml-2 text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {company.email}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold text-right">
                        {new Date(company.createdAt).toLocaleDateString()}
                        <div className="text-[10px] mt-0.5 text-slate-500 font-normal">
                          Created {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-sm text-center">
                  No companies found
                </div>
              )}
            </div>
          </div>

          {/* Simple Analytics Chart */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Company Status Overview
            </h3>
            <div className="h-[250px] flex items-end gap-4 py-5">
              {/* Active Companies Bar */}
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-green-500 rounded-t transition-all duration-300 min-h-[20px]"
                  style={{ height: `${(stats.activeCompanies / Math.max(stats.totalCompanies, 1)) * 150}px` }}
                ></div>
                <div className="mt-2.5 text-xs font-semibold text-slate-900 text-center">
                  Active<br/>({stats.activeCompanies})
                </div>
              </div>

              {/* Inactive Companies Bar */}
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-orange-500 rounded-t transition-all duration-300 min-h-[20px]"
                  style={{ height: `${((stats.totalCompanies - stats.activeCompanies) / Math.max(stats.totalCompanies, 1)) * 150}px` }}
                ></div>
                <div className="mt-2.5 text-xs font-semibold text-slate-900 text-center">
                  Inactive<br/>({stats.totalCompanies - stats.activeCompanies})
                </div>
              </div>

              {/* Total Users Bar */}
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-[20px]"
                  style={{ height: `${Math.min((stats.totalUsers / 100) * 150, 150)}px` }}
                ></div>
                <div className="mt-2.5 text-xs font-semibold text-slate-900 text-center">
                  Users<br/>({stats.totalUsers})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white px-5 py-4 sticky top-0 z-50 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="bg-white border border-slate-200 p-2 rounded-lg cursor-pointer flex items-center justify-center hover:bg-slate-50 transition-colors duration-200"
              >
                <Menu size={20} className="text-slate-700" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.webp"
                alt="Track Nexus Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-white hover:bg-white text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-70px)]">
        {/* Sidebar */}
        <div
          className={`bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-64' : 'w-0'}`}
        >
          <div className="p-5 min-w-[256px]">
            {/* Close button in sidebar */}
            <div className="pb-5 mb-5 border-b border-slate-200">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors duration-200 text-sm font-medium text-slate-700"
              >
                <X size={20} />
                <span>Close Sidebar</span>
              </button>
            </div>
            <nav>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setSidebarOpen(false); // Auto-close on mobile
                    }}
                    className={`
                      w-full flex items-center gap-3 px-5 py-3 rounded-lg cursor-pointer transition-colors duration-200 text-sm font-medium
                      ${isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </div>
      </div>

      {/* Edit Company Modal */}
      {showEditModal && editingCompany && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '10px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#374151',
              marginBottom: '20px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '10px',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Edit Company
            </h2>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '5px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({
                    ...editingCompany,
                    name: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '5px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingCompany.email}
                  onChange={(e) => setEditingCompany({
                    ...editingCompany,
                    email: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '5px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Slug
                </label>
                <input
                  type="text"
                  value={editingCompany.slug}
                  onChange={(e) => setEditingCompany({
                    ...editingCompany,
                    slug: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Admin Username
                  </label>
                  <input
                    type="text"
                    value={editingCompany.adminUser?.username || ''}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      adminUser: {
                        ...editingCompany.adminUser,
                        username: e.target.value,
                        password: editingCompany.adminUser?.password || '',
                        adminEmail: editingCompany.adminUser?.adminEmail || '',
                        adminName: editingCompany.adminUser?.adminName || ''
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={editingCompany.adminUser?.password || ''}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      adminUser: {
                        ...editingCompany.adminUser,
                        username: editingCompany.adminUser?.username || '',
                        password: e.target.value,
                        adminEmail: editingCompany.adminUser?.adminEmail || '',
                        adminName: editingCompany.adminUser?.adminName || ''
                      }
                    })}
                    placeholder="Leave blank to keep current password"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Subscription Plan
                  </label>
                  <select
                    value={editingCompany.subscription?.plan || 'free'}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      subscription: {
                        ...editingCompany.subscription,
                        plan: e.target.value,
                        userLimit: editingCompany.subscription?.userLimit || 10,
                        storageLimit: editingCompany.subscription?.storageLimit || 1024
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    User Limit
                  </label>
                  <input
                    type="number"
                    value={editingCompany.subscription?.userLimit || 10}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      subscription: {
                        ...editingCompany.subscription,
                        plan: editingCompany.subscription?.plan || 'free',
                        userLimit: parseInt(e.target.value),
                        storageLimit: editingCompany.subscription?.storageLimit || 1024
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  <input
                    type="checkbox"
                    checked={editingCompany.isActive}
                    onChange={(e) => setEditingCompany({
                      ...editingCompany,
                      isActive: e.target.checked
                    })}
                    style={{ marginRight: '8px' }}
                  />
                  Company Active
                </label>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              marginTop: '25px',
              paddingTop: '15px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={handleCloseEdit}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '10px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#374151',
              marginBottom: '20px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '10px',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Add New Company
            </h2>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '5px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newCompany.name || ''}
                  onChange={(e) => setNewCompany({
                    ...newCompany,
                    name: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '5px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newCompany.email || ''}
                  onChange={(e) => setNewCompany({
                    ...newCompany,
                    email: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '5px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Slug *
                </label>
                <input
                  type="text"
                  value={newCompany.slug || ''}
                  onChange={(e) => setNewCompany({
                    ...newCompany,
                    slug: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Admin Name *
                  </label>
                  <input
                    type="text"
                    value={newCompany.adminUser?.adminName || ''}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      adminUser: {
                        ...newCompany.adminUser,
                        adminName: e.target.value,
                        adminEmail: newCompany.adminUser?.adminEmail || '',
                        username: newCompany.adminUser?.username || '',
                        password: newCompany.adminUser?.password || ''
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Admin Email *
                  </label>
                  <input
                    type="email"
                    value={newCompany.adminUser?.adminEmail || ''}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      adminUser: {
                        ...newCompany.adminUser,
                        adminName: newCompany.adminUser?.adminName || '',
                        adminEmail: e.target.value,
                        username: newCompany.adminUser?.username || '',
                        password: newCompany.adminUser?.password || ''
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Admin Username *
                  </label>
                  <input
                    type="text"
                    value={newCompany.adminUser?.username || ''}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      adminUser: {
                        ...newCompany.adminUser,
                        adminName: newCompany.adminUser?.adminName || '',
                        adminEmail: newCompany.adminUser?.adminEmail || '',
                        username: e.target.value,
                        password: newCompany.adminUser?.password || ''
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    value={newCompany.adminUser?.password || ''}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      adminUser: {
                        ...newCompany.adminUser,
                        adminName: newCompany.adminUser?.adminName || '',
                        adminEmail: newCompany.adminUser?.adminEmail || '',
                        username: newCompany.adminUser?.username || '',
                        password: e.target.value
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    Subscription Plan
                  </label>
                  <select
                    value={newCompany.subscription?.plan || 'free'}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      subscription: {
                        ...newCompany.subscription,
                        plan: e.target.value,
                        userLimit: newCompany.subscription?.userLimit || 10,
                        storageLimit: newCompany.subscription?.storageLimit || 1024
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px',
                    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                  }}>
                    User Limit
                  </label>
                  <input
                    type="number"
                    value={newCompany.subscription?.userLimit || 10}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      subscription: {
                        ...newCompany.subscription,
                        plan: newCompany.subscription?.plan || 'free',
                        userLimit: parseInt(e.target.value),
                        storageLimit: newCompany.subscription?.storageLimit || 1024
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  <input
                    type="checkbox"
                    checked={newCompany.isActive || false}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      isActive: e.target.checked
                    })}
                    style={{ marginRight: '8px' }}
                  />
                  Company Active
                </label>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              marginTop: '25px',
              paddingTop: '15px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={handleCloseAdd}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewCompany}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}
              >
                Create Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}