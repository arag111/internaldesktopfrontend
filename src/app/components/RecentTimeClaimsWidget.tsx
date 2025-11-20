'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress, Button, Divider } from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import { format } from 'date-fns';

interface TimeClaim {
  activityId: number;
  idleEventId: number;
  userId: number;
  userName: string;
  userEmail: string;
  date: string;
  reason: string;
  durationInMinutes: number;
  status: string;
  claimRequestedAt: string;
  startedAt: string;
  endedAt: string;
}

export default function RecentTimeClaimsWidget() {
  const [claims, setClaims] = useState<TimeClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingClaim, setProcessingClaim] = useState<number | null>(null);

  useEffect(() => {
    fetchRecentClaims();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentClaims, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentClaims = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${baseUrl}/idle/recent?limit=5&status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClaims(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch recent claims:', error);
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (activityId: number, idleEventId: number, status: 'approved' | 'rejected') => {
    try {
      setProcessingClaim(idleEventId);
      const token = localStorage.getItem('token');
      await axios.put(
        `${baseUrl}/idle/update/${activityId}/${idleEventId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the claim from the list with optimistic update
      setClaims((prev) => prev.filter((claim) => claim.idleEventId !== idleEventId));
      setProcessingClaim(null);
    } catch (error) {
      console.error('Failed to update claim status:', error);
      setProcessingClaim(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format actual duration from start/end times (more accurate)
  const formatActualDuration = (startedAt: string, endedAt: string) => {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const diffMs = end.getTime() - start.getTime();

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    // Show hours only if > 0
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    // Show minutes and seconds
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    // Show seconds only
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
      <Typography variant="h6" sx={{
          fontWeight: 600,
          color: '#111827',
          fontSize: '1.125rem',
          mb: 0.5
        }}>
          Recent Time Claims ({claims.length})
        </Typography>

        {claims.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
            <AccessTime sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">
              No pending time claims
            </Typography>
          </Box>
        ) : (
          <Box>
            {claims.map((claim, index) => (
              <React.Fragment key={claim.idleEventId}>
                {index > 0 && <Divider sx={{ my: 1.5 }} />}
                {/* Single Line Layout */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  py: 1
                }}>
                  {/* Left Section: Name */}
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '100px' }}>
                    {claim.userName}
                  </Typography>

                  {/* Middle Section: Time Range and Reason */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {format(new Date(claim.startedAt), 'h:mm a')} → {format(new Date(claim.endedAt), 'h:mm a')}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.8125rem',
                        fontStyle: claim.reason === 'No reason provided' ? 'italic' : 'normal',
                        opacity: claim.reason === 'No reason provided' ? 0.6 : 0.9,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {claim.reason}
                    </Typography>
                  </Box>

                  {/* Duration */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      minWidth: '50px'
                    }}
                  >
                    {formatActualDuration(claim.startedAt, claim.endedAt)}
                  </Typography>

                  {/* Status Badge */}
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: '#fee2e2',
                      display: 'inline-flex',
                      alignItems: 'center',
                      minWidth: '70px',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#991b1b',
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                        textTransform: 'capitalize'
                      }}
                    >
                      {claim.status}
                    </Typography>
                  </Box>

                  {/* Right Section: Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={processingClaim === claim.idleEventId}
                      onClick={() => handleStatusUpdate(claim.activityId, claim.idleEventId, 'approved')}
                      sx={{
                        bgcolor: '#86efac !important',
                        color: '#065f46 !important',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 2,
                        py: 0.5,
                        minWidth: '70px',
                        boxShadow: 'none !important',
                        '&:hover': {
                          bgcolor: '#4ade80 !important',
                          boxShadow: 'none !important'
                        },
                        '&:disabled': {
                          bgcolor: '#e5e7eb !important',
                          color: '#9ca3af !important'
                        }
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={processingClaim === claim.idleEventId}
                      onClick={() => handleStatusUpdate(claim.activityId, claim.idleEventId, 'rejected')}
                      sx={{
                        bgcolor: '#fca5a5 !important',
                        color: '#991b1b !important',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 2,
                        py: 0.5,
                        minWidth: '70px',
                        boxShadow: 'none !important',
                        '&:hover': {
                          bgcolor: '#f87171 !important',
                          boxShadow: 'none !important'
                        },
                        '&:disabled': {
                          bgcolor: '#e5e7eb !important',
                          color: '#9ca3af !important'
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                </Box>
              </React.Fragment>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
