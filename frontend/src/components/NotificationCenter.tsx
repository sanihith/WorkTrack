import {
  Box,
  IconButton,
  Badge
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: () => apiClient.get('/notifications/unread-count').then(res => res.data),
    refetchInterval: 5000,
    enabled: !!user
  });

  return (
    <Box>
      <IconButton 
        onClick={() => navigate('/notifications')} 
        size="small"
        aria-label="Notifications"
      >
        <Badge badgeContent={unreadCount} color="error" overlap="circular">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Box>
  );
};

export default NotificationCenter;