'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';

interface TeamStatus {
  total: number;
  active: number;
  idle: number;
  onBreak: number;
  offline: number;
}

export default function WhosInOutWidget() {
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTeamStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTeamStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${baseUrl}/api/activity/team-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch team status:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{
        backgroundColor: 'white',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!teamStatus) return null;

  const statusItems = [
    {
      label: 'ACTIVE',
      count: teamStatus.active,
      percentage: Math.round((teamStatus.active / teamStatus.total) * 100) || 0,
      color: '#10b981',
      emoji: '🟢'
    },
    {
      label: 'IDLE',
      count: teamStatus.idle,
      percentage: Math.round((teamStatus.idle / teamStatus.total) * 100) || 0,
      color: '#f59e0b',
      emoji: '🟡'
    },
    {
      label: 'BREAK',
      count: teamStatus.onBreak,
      percentage: Math.round((teamStatus.onBreak / teamStatus.total) * 100) || 0,
      color: '#f97316',
      emoji: '🟠'
    },
    {
      label: 'OFFLINE',
      count: teamStatus.offline,
      percentage: Math.round((teamStatus.offline / teamStatus.total) * 100) || 0,
      color: '#6b7280',
      emoji: '⚫'
    }
  ];

  return (
    <Card sx={{
      backgroundColor: 'white',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{
          fontWeight: 600,
          color: '#111827',
          fontSize: '1.125rem',
          mb: 0.5
        }}>
          Who's in/out
        </Typography>
        <Typography variant="body2" sx={{
          color: '#6b7280',
          mb: 3,
          fontSize: '0.875rem'
        }}>
          {teamStatus.total} members
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {statusItems.map((item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: '8px',
                bgcolor: '#f9fafb',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#f3f4f6',
                  transform: 'translateX(4px)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: item.color,
                  boxShadow: `0 0 8px ${item.color}40`
                }} />
                <Typography sx={{
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {item.label}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: '#111827'
                }}>
                  {item.count}
                </Typography>
                <Typography sx={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  color: item.color,
                  minWidth: '45px',
                  textAlign: 'right'
                }}>
                  {item.percentage}%
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
