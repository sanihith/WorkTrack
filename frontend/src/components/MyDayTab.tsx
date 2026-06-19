import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Avatar, IconButton, Tooltip } from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  WbSunny as SunIcon,
  WbSunnyOutlined as SunOutlinedIcon,
  Star as StarIcon,
  StarOutlined as StarOutlineIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon
} from '@mui/icons-material';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import apiClient from '../api/apiClient';
import DueDateBadge from './DueDateBadge';
import { useAuth } from '../context/AuthContext';
import { getStatusLabel } from '../utils/statusUtils';
import dayjs from 'dayjs';

const MyDayTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');

  const { data: myDayTasks, isLoading } = useQuery({
    queryKey: ['myDay', user?.id],
    queryFn: () => apiClient.get('/requests/my-day', { params: { userId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  const toggleMyDayMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-my-day`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['myDay', user?.id] });
      const previous = queryClient.getQueryData(['myDay', user?.id]);
      queryClient.setQueryData(['myDay', user?.id], (old: any) =>
        old?.filter((t: any) => t.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['myDay', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
    }
  });

  const toggleImportantMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-important`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['myDay', user?.id] });
      const previous = queryClient.getQueryData(['myDay', user?.id]);
      queryClient.setQueryData(['myDay', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isImportant: !t.isImportant } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['myDay', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
    }
  });

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading focus tasks...</Typography>;

  const todayStr = dayjs().format('dddd, MMMM D');

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-h)', mb: 0.5 }}>My Day</Typography>
          <Typography variant="body1" color="text.secondary">{todayStr}</Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          unique-id="view-toggle-myday"
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
          sx={{ bgcolor: 'var(--accent-bg)', borderRadius: 2 }}
        >
          <ToggleButton value="GRID" sx={{ border: 'none', borderRadius: '8px !important' }}>
            <GridIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="LIST" sx={{ border: 'none', borderRadius: '8px !important' }}>
            <ListIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {myDayTasks?.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 4, border: '2px dashed var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <SunOutlinedIcon sx={{ fontSize: 40, color: 'var(--accent)', opacity: 0.6 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)', mb: 1 }}>Focus on your day</Typography>
          <Typography variant="body2" color="text.secondary">Tasks you add to My Day appear here.</Typography>
        </Box>
      ) : viewMode === 'GRID' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {myDayTasks?.map((task: any) => (
            <Card
              key={task.id}
              sx={{ borderRadius: 3, boxShadow: 'var(--shadow)', border: task.isImportant ? '2px solid var(--warning)' : '1px solid var(--border)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                '&:hover': { transform: 'translateY(-6px)', boxShadow: 'var(--shadow-lg)', borderColor: 'var(--accent)' },
                '&::before': task.status === 'OPEN' ? { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent)' } : task.status === 'IN_PROGRESS' ? { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' } : task.status === 'COMPLETED' ? { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--success)' } : {}
              }}
              onClick={() => navigate(`/request/${task.id}`)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ pr: 8, flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)', mb: 0.5, lineHeight: 1.3 }}>{task.subject}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <CalendarIcon sx={{ fontSize: 13, color: 'var(--text-muted)' }} />
                      <DueDateBadge dueDate={task.requestedByDate} />
                    </Box>
                  </Box>
                  <Box sx={{ position: 'absolute', top: 16, right: 12, display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Remove from My Day">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(task.id); }} sx={{ color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.12)', '&:hover': { bgcolor: 'rgba(245,158,11,0.18)' } }}>
                        <SunIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={task.isImportant ? "Remove Important" : "Mark as Important"}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(task.id); }} sx={{ color: task.isImportant ? '#ef4444' : 'text.disabled', bgcolor: task.isImportant ? 'rgba(239,68,68,0.1)' : 'transparent', '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' } }}>
                        {task.isImportant ? <StarIcon sx={{ fontSize: 18 }} /> : <StarOutlineIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: '2.5em', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.explanation}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid var(--border)' }}>
                  <Chip label={getStatusLabel(task.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5, bgcolor: task.status === 'COMPLETED' ? 'var(--success)' : task.status === 'REJECTED' ? 'var(--error)' : task.status === 'IN_PROGRESS' ? 'rgba(245,158,11,0.12)' : 'var(--accent-bg)', color: task.status === 'COMPLETED' || task.status === 'REJECTED' ? '#fff' : task.status === 'IN_PROGRESS' ? '#b45309' : 'var(--accent)', border: 'none', '& .MuiChip-label': { px: 1.5 } }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'var(--accent)' }}>{task.assignedTo?.name?.[0] || task.createdBy?.name?.[0] || '?'}</Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem' }}>{task.assignedTo?.name || task.createdBy?.name || 'Unassigned'}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Box sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', '& th': { color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase', border: 'none', py: 1.5 } }}>
                  <TableCell>Task</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell align="right">Focus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myDayTasks?.map((task: any) => (
                  <TableRow key={task.id} onClick={() => navigate(`/request/${task.id}`)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'var(--accent-bg)' }, '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5 }}><Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.875rem' }}>{task.subject}</Typography></TableCell>
                    <TableCell sx={{ py: 1.5 }}><Chip label={getStatusLabel(task.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5, bgcolor: task.status === 'COMPLETED' ? 'var(--success)' : task.status === 'REJECTED' ? 'var(--error)' : task.status === 'IN_PROGRESS' ? 'rgba(245,158,11,0.12)' : 'var(--accent-bg)', color: task.status === 'COMPLETED' || task.status === 'REJECTED' ? '#fff' : task.status === 'IN_PROGRESS' ? '#b45309' : 'var(--accent)', border: 'none' }} /></TableCell>
                    <TableCell sx={{ py: 1.5 }}><DueDateBadge dueDate={task.requestedByDate} /></TableCell>
                    <TableCell sx={{ py: 1.5 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'var(--accent)' }}>{task.createdBy?.name?.[0]}</Avatar><Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{task.createdBy?.name}</Typography></Box></TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}><Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}><IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(task.id); }} sx={{ color: '#f59e0b' }}><SunIcon sx={{ fontSize: 18 }} /></IconButton><IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(task.id); }} sx={{ color: task.isImportant ? '#ef4444' : 'text.disabled' }}>{task.isImportant ? <StarIcon sx={{ fontSize: 18 }} /> : <StarOutlineIcon sx={{ fontSize: 18 }} />}</IconButton></Box></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MyDayTab;
