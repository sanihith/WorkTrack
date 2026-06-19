import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,                                                                                                                                         
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Notifications as NotificationsIcon, ArrowBack } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const NotificationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => apiClient.get('/notifications').then(res => res.data),
    refetchInterval: 5000,
    enabled: !!user,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: () => apiClient.get('/notifications/unread-count').then(res => res.data),
    refetchInterval: 5000,
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    }
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    }
  });

  const deleteNotification = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    }
  });

  const deleteAllNotifications = useMutation({
    mutationFn: () => Promise.all(notifications.map((n: any) => apiClient.delete(`/notifications/${n.id}`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    }
  });

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n: any) => !n.read)
    : notifications;

  const handleNotificationClick = (n: any) => {
    if (!n.read) {
      markAsRead.mutate(n.id);
    }
    if (n.requestId) {
      navigate(`/request/${n.requestId}`);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
          <Alert severity="error">Failed to load notifications.</Alert>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-h)' }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip 
                label={`${unreadCount} unread`} 
                size="small" 
                color="primary" 
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {unreadCount > 0 && (
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => markAllRead.mutate()}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Mark all as read
              </Button>
            )}
            {filteredNotifications.length > 0 && (
              <Button 
                variant="outlined" 
                color="error"
                size="small"
                onClick={() => {
                  if (confirm('Delete all notifications?')) {
                    deleteAllNotifications.mutate();
                  }
                }}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Delete all
              </Button>
            )}
          </Box>
        </Box>

        {/* Filter Tabs */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip 
            label={`All (${notifications.length})`}
            onClick={() => setFilter('all')}
            color={filter === 'all' ? 'primary' : 'default'}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip 
            label={`Unread (${unreadCount})`}
            onClick={() => setFilter('unread')}
            color={filter === 'unread' ? 'primary' : 'default'}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
        </Box>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {filter === 'unread' 
                ? 'You\'ve read all your notifications' 
                : 'When you get notifications, they\'ll appear here'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredNotifications.map((n: any) => (
              <ListItem
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                sx={{
                  bgcolor: n.read ? 'transparent' : 'rgba(91, 95, 199, 0.04)',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  mb: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    bgcolor: n.read ? 'rgba(0,0,0,0.02)' : 'rgba(91, 95, 199, 0.08)',
                    boxShadow: 'var(--shadow)'
                  }
                }}
                secondaryAction={
                  <IconButton 
                    edge="end"
                    className="deleteBtn"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      deleteNotification.mutate(n.id); 
                    }}
                    sx={{ 
                      color: 'text.secondary', 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': { color: 'error.main' },
                      '.MuiListItem-root:hover &': { opacity: 1 }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Box>
                      <Typography 
                        variant="body1" 
                        sx={{ fontWeight: n.read ? 400 : 700, mb: 0.5 }}
                      >
                        {n.message}
                      </Typography>
                      {n.senderName && (
                        <Typography 
                          variant="body2" 
                          sx={{ color: 'var(--accent)', fontWeight: 500 }}
                        >
                          From: {n.senderName}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {dayjs(n.createdAt).format('MMM D, YYYY [at] h:mm A')} ({dayjs(n.createdAt).fromNow()})
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default NotificationsPage;