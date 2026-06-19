import { useState } from 'react';
import { 
  Typography, 
  Box, 
  Chip, 
  Avatar, 
  Card, 
  CardContent,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
  LinearProgress,
  Stack
} from '@mui/material';
import { 
  Email as EmailIcon,
  Badge as BadgeIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  TaskAlt as TaskIcon,
  WbSunny as SunIcon,
  WbSunnyOutlined as SunOutlinedIcon,
  Star as StarIcon,
  StarOutlined as StarOutlineIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { getStatusLabel } from '../utils/statusUtils';

const PerformanceView = ({ userId }: { userId: number }) => {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['reporteeTasks', userId],
    queryFn: () => apiClient.get('/requests/todos', { params: { userId } }).then(res => res.data),
  });

  const toggleMyDayMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-my-day`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reporteeTasks', userId] });
      const previous = queryClient.getQueryData(['reporteeTasks', userId]);
      queryClient.setQueryData(['reporteeTasks', userId], (old: any) => 
        old?.map((t: any) => t.id === id ? { ...t, isMyDay: !t.isMyDay } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['reporteeTasks', userId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reporteeTasks', userId] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['myDay'] });
      queryClient.invalidateQueries({ queryKey: ['important'] });
    }
  });

  const toggleImportantMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-important`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reporteeTasks', userId] });
      const previous = queryClient.getQueryData(['reporteeTasks', userId]);
      queryClient.setQueryData(['reporteeTasks', userId], (old: any) => 
        old?.map((t: any) => t.id === id ? { ...t, isImportant: !t.isImportant } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['reporteeTasks', userId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reporteeTasks', userId] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['myDay'] });
      queryClient.invalidateQueries({ queryKey: ['important'] });
    }
  });

  if (isLoading) return <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />;

  if (!tasks?.length) return (
    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center', fontStyle: 'italic' }}>
      No tasks assigned to this member.
    </Typography>
  );

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t: any) => t.status === 'COMPLETED').length,
    pending: tasks.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
    rejected: tasks.filter((t: any) => t.status === 'REJECTED').length,
  };

  const progress = (stats.completed / stats.total) * 100;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TaskIcon sx={{ fontSize: 18, color: 'var(--accent)' }} />
        Task Progress
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{stats.completed} / {stats.total} Completed</Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{Math.round(progress)}%</Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            bgcolor: 'var(--accent-bg)',
            '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: progress === 100 ? 'var(--success)' : 'var(--accent)' }
          }} 
        />
      </Box>

      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>
        Assigned Tasks
      </Typography>

      <Stack spacing={1}>
        {tasks.map((task: any) => (
          <Box 
            key={task.id}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.02)',
              border: '1px solid var(--border)'
            }}
          >
            <Box sx={{ flex: 1, mr: 2, overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.subject}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Due: {task.requestedByDate}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="small" 
                onClick={() => toggleMyDayMutation.mutate(task.id)}
                sx={{ color: task.isMyDay ? 'var(--warning)' : 'text.disabled', p: 0.5 }}
              >
                {task.isMyDay ? <SunIcon sx={{ fontSize: 16 }} /> : <SunOutlinedIcon sx={{ fontSize: 16 }} />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => toggleImportantMutation.mutate(task.id)}
                sx={{ color: task.isImportant ? 'var(--warning)' : 'text.disabled', p: 0.5 }}
              >
                {task.isImportant ? <StarIcon sx={{ fontSize: 16 }} /> : <StarOutlineIcon sx={{ fontSize: 16 }} />}
              </IconButton>
              <Chip 
                label={getStatusLabel(task.status)} 
                size="small" 
                sx={{ 
                  height: 20, 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  bgcolor: task.status === 'COMPLETED' ? 'var(--success)' : 
                           task.status === 'REJECTED' ? 'var(--error)' : 
                             'var(--accent-bg)',
                    color: task.status === 'COMPLETED' || task.status === 'REJECTED' ? '#fff' : 'var(--text-h)',
                }} 
              />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const ReporteesTab = () => {
  const { user } = useAuth();
  const [expandedReportee, setExpandedReportee] = useState<number | null>(null);

  const { data: reportees, isLoading } = useQuery({
    queryKey: ['reportees', user?.id],
    queryFn: () => apiClient.get('/users/reportees', { params: { managerId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading team members...</Typography>;

  if (!reportees?.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'var(--accent-bg)', borderRadius: 4, border: '2px dashed var(--border)' }}>
        <Typography variant="h6" color="text.secondary">No reportees found.</Typography>
      </Box>
    );
  }

  const toggleExpand = (id: number) => {
    setExpandedReportee(expandedReportee === id ? null : id);
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: expandedReportee ? '1fr' : '1fr 1fr', lg: expandedReportee ? '1fr 1fr' : '1fr 1fr 1fr' }, gap: 3 }}>
      {reportees.map((emp: any) => (
        <Card 
          key={emp.id} 
          sx={{ 
            borderRadius: 3, 
            boxShadow: 'var(--shadow)', 
            border: '1px solid var(--border)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            gridColumn: expandedReportee === emp.id ? { md: 'span 2', lg: 'span 2' } : 'auto',
            '&:hover': { boxShadow: 'var(--shadow-lg)' }
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'var(--accent-bg)', 
                  color: 'var(--accent)', 
                  width: 56, 
                  height: 56,
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}
              >
                {emp.name?.[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                  Reportee
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)', lineHeight: 1.2 }}>
                  {emp.name}
                </Typography>
                <Chip 
                  label={emp.role || 'USER'} 
                  size="small" 
                  variant="outlined" 
                  sx={{ mt: 0.5, fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} 
                />
              </Box>
              <Tooltip title={expandedReportee === emp.id ? "Hide Performance" : "View Performance"}>
                <IconButton 
                  onClick={() => toggleExpand(emp.id)}
                  sx={{ 
                    bgcolor: expandedReportee === emp.id ? 'var(--accent-bg)' : 'transparent',
                    color: expandedReportee === emp.id ? 'var(--accent)' : 'inherit',
                    '&:hover': { bgcolor: 'var(--accent-bg)' }
                  }}
                >
                  {expandedReportee === emp.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">{emp.email}</Typography>
              </Box>
              {emp.employeeId && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">ID: {emp.employeeId}</Typography>
                </Box>
              )}
            </Box>

            <Collapse in={expandedReportee === emp.id} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 3 }} />
              <PerformanceView userId={emp.id} />
            </Collapse>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ReporteesTab;