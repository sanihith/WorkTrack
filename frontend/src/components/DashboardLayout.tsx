import { useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Tabs,
  Tab,
  Avatar,
  IconButton,
  Divider
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import NewRequestPopup from './NewRequestPopup';
import NotificationCenter from './NotificationCenter';
import logo from '../assets/logo.jpeg';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab?: number;
  onTabChange?: (event: SyntheticEvent, newValue: number) => void;
  tabs?: { label: string }[];
}

const DashboardLayout = ({ children, activeTab, onTabChange, tabs }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const [showNewRequest, setShowNewRequest] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'var(--bg)' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'var(--header-gradient)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 4 }, height: 72 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 5 }}>
            <Box
              component="img"
              src={logo}
              alt="Logo"
              sx={{ height: 44, width: 'auto', display: { xs: 'none', sm: 'block' }, borderRadius: 2 }}
            />
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36, display: { xs: 'flex', sm: 'none' } }}>
              T
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                WorkTrack
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                Task Management
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
            {tabs && onTabChange !== undefined && activeTab !== undefined && (
              <Tabs
                value={activeTab}
                onChange={onTabChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                  height: 72,
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                    background: 'rgba(255,255,255,0.8)'
                  },
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    minWidth: 'auto',
                    px: 2.5,
                    height: 72,
                    flexShrink: 0,
                    color: 'rgba(255,255,255,0.65)',
                    '&.Mui-selected': { color: '#fff' },
                    '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.08)' }
                  }
                }}
              >
                {tabs.map((tab, index) => (
                  <Tab key={index} label={tab.label} />
                ))}
              </Tabs>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewRequest(true)}
              sx={{
                borderRadius: 2,
                px: { xs: 1.5, md: 2.5 },
                py: 1,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                background: '#fff',
                color: 'var(--accent)',
                '&:hover': {
                  background: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s',
                display: 'flex'
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New Request</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>+</Box>
            </Button>

            <NotificationCenter />

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', lg: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#fff' }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.65, fontSize: '0.7rem' }}>
                  {user?.role}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  border: '2px solid rgba(255,255,255,0.4)',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.8)' }
                }}
              >
                {user?.name?.split(' ')?.map((n: string) => n[0]).join('')}
              </Avatar>
              <IconButton
                onClick={logout}
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.1)' }
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 4, lg: 6 }, py: 4 }}>
        {children}
      </Box>

      <NewRequestPopup open={showNewRequest} onClose={() => setShowNewRequest(false)} />
    </Box>
  );
};

export default DashboardLayout;