'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { baseUrl } from '../utils/config';
import { Home, Building2, Menu, X } from 'lucide-react';
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
        alert(`Error: ${error.message || 'Failed to create company'}`);
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
          companyId: company._id,
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
        alert(`Failed to login as company admin: ${error.message || 'Unknown error'}`);
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
          <div style={{
            background: 'white',
            borderRadius: '10px',
            boxShadow: '0 2px 15px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 5px 0',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Companies Management
                </h2>
                <p style={{
                  color: '#6b7280',
                  margin: 0,
                  fontSize: '14px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Manage all registered companies and their settings
                </p>
              </div>
              <button
                onClick={handleAddCompany}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}
              >
                <span style={{ fontSize: '16px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>+</span>
                Add Company
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ color: '#6b7280', fontSize: '16px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Loading companies...</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead style={{ background: '#f3f4f6' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Company</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Plan</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Users</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id} style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}>
                        <td style={{ padding: '16px' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
                              {company.name}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '12px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
                              {company.email}
                            </div>
                            <div style={{ color: '#9ca3af', fontSize: '11px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
                              /{company.slug}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: getPlanColor(company.subscription?.plan),
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                          }}>
                            {company.subscription?.plan || 'free'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: '#374151', fontSize: '14px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
                          {company.stats?.currentUsers || 0} / {company.subscription?.userLimit || 10}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {company.isSuspended ? (
                            <span style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                            }}>
                              Suspended
                            </span>
                          ) : company.isActive ? (
                            <span style={{
                              background: '#dcfce7',
                              color: '#16a34a',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                            }}>
                              Active
                            </span>
                          ) : (
                            <span style={{
                              background: '#fef3c7',
                              color: '#d97706',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                            }}>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleLoginAsCompanyAdmin(company)}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                              }}
                            >
                              Login as Admin
                            </button>
                            <button
                              onClick={() => handleEditCompany(company)}
                              style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSuspendCompany(company._id, !company.isSuspended)}
                              style={{
                                background: company.isSuspended ? '#16a34a' : '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                              }}
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
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
        }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#374151',
            margin: '0',
            fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
          }}>
            Welcome to Super Admin Dashboard
          </h1>
          <p style={{
            color: '#6b7280',
            margin: '8px 0 0 0',
            fontSize: '14px',
            fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
          }}>
            Manage all companies and system settings from here
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
            borderLeft: '4px solid #667eea'
          }}>
            <h3 style={{
              color: '#667eea',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Total Companies
            </h3>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#2d3748',
              margin: 0,
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              {loading ? '...' : stats.totalCompanies}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
            borderLeft: '4px solid #48bb78'
          }}>
            <h3 style={{
              color: '#48bb78',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Active Companies
            </h3>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#2d3748',
              margin: 0,
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              {loading ? '...' : stats.activeCompanies}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
            borderLeft: '4px solid #764ba2'
          }}>
            <h3 style={{
              color: '#764ba2',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Total Users
            </h3>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#2d3748',
              margin: 0,
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              {loading ? '...' : stats.totalUsers}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
            borderLeft: '4px solid #f6ad55'
          }}>
            <h3 style={{
              color: '#f6ad55',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Storage Used
            </h3>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#2d3748',
              margin: 0,
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              {loading ? '...' : `${(stats.totalStorage / 1024).toFixed(1)} GB`}
            </p>
          </div>
        </div>

        {/* New Section: Company Activity and Analytics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Company Last Active Dates */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 15px 0',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Recent Company Activity
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>
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
                    <div key={company._id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: isInactive ? '#dc2626' : '#16a34a', // RED for inactive, GREEN for active
                          fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                        }}>
                          {company.name}
                          {isInactive ? (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: '500'
                            }}>
                              INACTIVE
                            </span>
                          ) : (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              background: '#dcfce7',
                              color: '#16a34a',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: '500'
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isInactive ? '#dc2626' : '#16a34a', // RED for inactive, GREEN for active
                          fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                        }}>
                          {company.email}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: isInactive ? '#dc2626' : '#16a34a', // RED for inactive, GREEN for active
                        fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
                        fontWeight: '600'
                      }}>
                        {new Date(company.createdAt).toLocaleDateString()}
                        <div style={{
                          fontSize: '10px',
                          marginTop: '2px',
                          color: isInactive ? '#dc2626' : '#16a34a'
                        }}>
                          Created {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  textAlign: 'center',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  No companies found
                </div>
              )}
            </div>
          </div>

          {/* Simple Analytics Chart */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 15px 0',
              fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
            }}>
              Company Status Overview
            </h3>
            <div style={{ height: '250px', display: 'flex', alignItems: 'end', gap: '15px', padding: '20px 0' }}>
              {/* Active Companies Bar */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${(stats.activeCompanies / Math.max(stats.totalCompanies, 1)) * 150}px`,
                  backgroundColor: '#48bb78',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '20px',
                  transition: 'height 0.3s ease'
                }}></div>
                <div style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  textAlign: 'center',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Active<br/>({stats.activeCompanies})
                </div>
              </div>

              {/* Inactive Companies Bar */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${((stats.totalCompanies - stats.activeCompanies) / Math.max(stats.totalCompanies, 1)) * 150}px`,
                  backgroundColor: '#f6ad55',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '20px',
                  transition: 'height 0.3s ease'
                }}></div>
                <div style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  textAlign: 'center',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
                  Inactive<br/>({stats.totalCompanies - stats.activeCompanies})
                </div>
              </div>

              {/* Total Users Bar */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.min((stats.totalUsers / 100) * 150, 150)}px`,
                  backgroundColor: '#667eea',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '20px',
                  transition: 'height 0.3s ease'
                }}></div>
                <div style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  textAlign: 'center',
                  fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                }}>
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '15px 20px',
        color: '#374151',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Menu size={20} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Image
                src="/logo.webp"
                alt="Track Nexus Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
          </div>
          <button onClick={handleLogout} style={{
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
          }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? '250px' : '0',
          background: 'white',
          boxShadow: sidebarOpen ? '2px 0 10px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderRight: sidebarOpen ? '1px solid #e5e7eb' : 'none'
        }}>
          <div style={{ padding: '20px 0', minWidth: '250px' }}>
            {/* Close button in sidebar */}
            <div style={{
              padding: '0 20px 20px 20px',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%'
                }}
              >
                <X size={20} />
                <span style={{ marginLeft: '8px', fontFamily: 'Poppins, system-ui, -apple-system, sans-serif' }}>Close Sidebar</span>
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
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 20px',
                      background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                      color: isActive ? 'white' : '#374151',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderLeft: isActive ? '4px solid #667eea' : '4px solid transparent',
                      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
                    }}
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
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
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