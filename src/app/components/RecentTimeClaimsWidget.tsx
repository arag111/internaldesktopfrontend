'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress, IconButton, Divider } from '@mui/material';
import { CheckCircle, Cancel, AccessTime } from '@mui/icons-material';
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
                <Box sx={{ py: 1 }}>
                  {/* First Row: Name and Date */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {claim.userName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {format(new Date(claim.date), 'MMM d')}
                    </Typography>
                  </Box>

                  {/* Second Row: Time Range and Reason with Action Buttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                        {format(new Date(claim.startedAt), 'h:mm a')} → {format(new Date(claim.endedAt), 'h:mm a')}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.8125rem',
                          fontStyle: claim.reason === 'No reason provided' ? 'italic' : 'normal',
                          opacity: claim.reason === 'No reason provided' ? 0.6 : 0.9,
                        }}
                      >
                        {claim.reason}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        disabled={processingClaim === claim.idleEventId}
                        onClick={() => handleStatusUpdate(claim.activityId, claim.idleEventId, 'approved')}
                        sx={{
                          color: 'success.main',
                          '&:hover': { bgcolor: 'success.light', color: 'success.dark' }
                        }}
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={processingClaim === claim.idleEventId}
                        onClick={() => handleStatusUpdate(claim.activityId, claim.idleEventId, 'rejected')}
                        sx={{
                          color: 'error.main',
                          '&:hover': { bgcolor: 'error.light', color: 'error.dark' }
                        }}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Third Row: Actual Duration and Status Badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 700,
                        fontSize: '0.875rem'
                      }}
                    >
                      {formatActualDuration(claim.startedAt, claim.endedAt)}
                    </Typography>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'warning.light',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'warning.dark',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          textTransform: 'capitalize'
                        }}
                      >
                        {claim.status}
                      </Typography>
                    </Box>
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
