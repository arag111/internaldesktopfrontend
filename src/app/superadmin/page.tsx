'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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
      const response = await fetch('http://localhost:5002/api/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const companyList = data.companies || [];
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
      const response = await fetch(`http://localhost:5002/api/companies/${companyId}/suspend`, {
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
      const response = await fetch(`http://localhost:5002/api/companies/${editingCompany._id}`, {
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
      const response = await fetch('http://localhost:5002/api/companies', {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              margin: '0 0 5px 0'
            }}>
              Super Admin Dashboard
            </h1>
            <p style={{
              margin: 0,
              opacity: 0.9
            }}>
              Manage all companies and system settings
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
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
              letterSpacing: '0.5px'
            }}>
              Total Companies
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2d3748',
              margin: 0
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
              letterSpacing: '0.5px'
            }}>
              Active Companies
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2d3748',
              margin: 0
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
              letterSpacing: '0.5px'
            }}>
              Total Users
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2d3748',
              margin: 0
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
              letterSpacing: '0.5px'
            }}>
              Storage Used
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2d3748',
              margin: 0
            }}>
              {loading ? '...' : `${(stats.totalStorage / 1024).toFixed(1)} GB`}
            </p>
          </div>
        </div>

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
                margin: '0 0 5px 0'
              }}>
                Companies Management
              </h2>
              <p style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '14px'
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
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '16px' }}>+</span>
              Add Company
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: '#6b7280', fontSize: '16px' }}>Loading companies...</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead style={{ background: '#f3f4f6' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Users</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
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
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                            {company.name}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '12px' }}>
                            {company.email}
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: '11px' }}>
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
                          textTransform: 'uppercase'
                        }}>
                          {company.subscription?.plan || 'free'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#374151', fontSize: '14px' }}>
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
                            fontWeight: '600'
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
                            fontWeight: '600'
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
                            fontWeight: '600'
                          }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                              cursor: 'pointer'
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
                              cursor: 'pointer'
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
                paddingBottom: '10px'
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
                    marginBottom: '5px'
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
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px'
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
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '5px'
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
                      fontSize: '14px'
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
                      marginBottom: '5px'
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
                          password: editingCompany.adminUser?.password || ''
                        }
                      })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '5px'
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
                          password: e.target.value
                        }
                      })}
                      placeholder="Leave blank to keep current password"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
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
                paddingBottom: '10px'
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
                    marginBottom: '5px'
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
                      fontSize: '14px'
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
                    marginBottom: '5px'
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
                      fontSize: '14px'
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
                    marginBottom: '5px'
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
                      fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                      marginBottom: '5px'
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
                        fontSize: '14px'
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
                  }}
                >
                  Create Company
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}