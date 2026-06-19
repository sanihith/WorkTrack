import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Avatar, IconButton, Tooltip } from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  WbSunny as SunIcon,
  WbSunnyOutlined as SunOutlinedIcon,
  Star as StarIcon,
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

const ImportantTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');

  const { data: importantTasks, isLoading } = useQuery({
    queryKey: ['important', user?.id],
    queryFn: () => apiClient.get('/requests/important', { params: { userId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  const toggleMyDayMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-my-day`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['important', user?.id] });
      const previous = queryClient.getQueryData(['important', user?.id]);
      queryClient.setQueryData(['important', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isMyDay: !t.isMyDay } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['important', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
    }
  });

  const toggleImportantMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-important`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['important', user?.id] });
      const previous = queryClient.getQueryData(['important', user?.id]);
      queryClient.setQueryData(['important', user?.id], (old: any) =>
        old?.filter((t: any) => t.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['important', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
    }
  });

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading important tasks...</Typography>;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-h)', mb: 0.5 }}>Important</Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          unique-id="view-toggle-important"
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

      {importantTasks?.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'var(--accent-bg)', borderRadius: 4, border: '2px dashed var(--border)' }}>
          <StarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>High priority tasks</Typography>
          <Typography variant="body2" color="text.secondary">Tasks you mark as important appear here.</Typography>
        </Box>
      ) : viewMode === 'GRID' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {importantTasks?.map((task: any) => (
            <Card
              key={task.id}
              sx={{
                borderRadius: 3,
                boxShadow: 'var(--shadow)',
                border: '2px solid var(--warning)',
                transition: 'transform 0.2s',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 'var(--shadow-lg)' }
              }}
              onClick={() => navigate(`/request/${task.id}`)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ pr: 8 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)' }} gutterBottom>
                      {task.subject}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <DueDateBadge dueDate={task.requestedByDate} />
                    </Box>
                  </Box>
                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5 }}>
                    <Tooltip title={task.isMyDay ? "Remove from My Day" : "Add to My Day"}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMyDayMutation.mutate(task.id);
                        }}
                        sx={{ color: task.isMyDay ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {task.isMyDay ? <SunIcon sx={{ fontSize: 20 }} /> : <SunOutlinedIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Important">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImportantMutation.mutate(task.id);
                        }}
                        sx={{ color: 'var(--warning)' }}
                      >
                        <StarIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: '3em' }}>
                  {task.explanation}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={getStatusLabel(task.status)}
                      size="small"
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: task.status === 'COMPLETED' ? 'var(--success)' :
                                 task.status === 'REJECTED' ? 'var(--error)' :
                                 'var(--accent-bg)',
                        color: task.status === 'COMPLETED' || task.status === 'REJECTED' ? '#fff' : 'var(--text-h)',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Reportee</Typography>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{task.assignedTo?.name?.[0] || task.createdBy?.name?.[0] || '?'}</Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{task.assignedTo?.name || task.createdBy?.name || 'Unassigned'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{task.createdBy?.name?.[0]}</Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>By {task.createdBy?.name}</Typography>
                    </Box>
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
                  <TableCell>Author</TableCell>
                  <TableCell align="right">Focus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importantTasks?.map((task: any) => (
                  <TableRow key={task.id} onClick={() => navigate(`/request/${task.id}`)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'var(--accent-bg)' }, '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5 }}><Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.875rem' }}>{task.subject}</Typography></TableCell>
                    <TableCell sx={{ py: 1.5 }}><Chip label={getStatusLabel(task.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5, bgcolor: task.status === 'COMPLETED' ? 'var(--success)' : task.status === 'REJECTED' ? 'var(--error)' : 'var(--accent-bg)', color: task.status === 'COMPLETED' || task.status === 'REJECTED' ? '#fff' : 'var(--text-h)', border: 'none' }} /></TableCell>
                    <TableCell sx={{ py: 1.5 }}><DueDateBadge dueDate={task.requestedByDate} /></TableCell>
                    <TableCell sx={{ py: 1.5 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{task.createdBy?.name?.[0]}</Avatar><Typography variant="caption" sx={{ fontWeight: 500 }}>{task.createdBy?.name}</Typography></Box></TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}><Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}><IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(task.id); }} sx={{ color: task.isMyDay ? 'var(--warning)' : 'text.disabled' }}>{task.isMyDay ? <SunIcon sx={{ fontSize: 18 }} /> : <SunOutlinedIcon sx={{ fontSize: 18 }} />}</IconButton><IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(task.id); }} sx={{ color: 'var(--warning)' }}><StarIcon sx={{ fontSize: 18 }} /></IconButton></Box></TableCell>
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

export default ImportantTab;
