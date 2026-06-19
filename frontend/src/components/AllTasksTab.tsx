import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Typography, Box, Chip, Avatar, IconButton, Tooltip
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  WbSunny as SunIcon,
  WbSunnyOutlined as SunOutlinedIcon,
  Star as StarIcon,
  StarOutlined as StarOutlineIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import apiClient from '../api/apiClient';
import DueDateBadge from './DueDateBadge';
import { useAuth } from '../context/AuthContext';
import { getStatusLabel } from '../utils/statusUtils';

type SourceType = 'ALL' | 'REQUESTED' | 'TODO';

const AllTasksTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceType>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');

  const { data: requestedByMe, isLoading: loadingRequests } = useQuery({
    queryKey: ['requestedByMe', user?.id],
    queryFn: () => apiClient.get('/requests/my-requests', { params: { userId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  const { data: todos, isLoading: loadingTodos } = useQuery({
    queryKey: ['todos', user?.id],
    queryFn: () => apiClient.get('/requests/todos', { params: { userId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  // Merge & de-duplicate: todos that also appear in requestedByMe get both tags
  const allTasks = useMemo(() => {
    const requestedMap = new Map<number, any>();
    const todoMap = new Map<number, any>();

    (requestedByMe || []).forEach((r: any) => requestedMap.set(r.id, r));
    (todos || []).forEach((t: any) => todoMap.set(t.id, t));

    const merged = new Map<number, any>();

    requestedMap.forEach((task, id) => {
      merged.set(id, {
        ...task,
        _sources: todoMap.has(id) ? ['REQUESTED', 'TODO'] : ['REQUESTED'],
        _personLabel: task.assignedTo?.name || 'Unassigned',
        _personInitial: task.assignedTo?.name?.[0] || '?'
      });
    });

    todoMap.forEach((task, id) => {
      if (!merged.has(id)) {
        merged.set(id, {
          ...task,
          _sources: ['TODO'],
          _personLabel: task.createdBy?.name || 'Unknown',
          _personInitial: task.createdBy?.name?.[0] || '?'
        });
      }
    });

    return Array.from(merged.values());
  }, [requestedByMe, todos]);

  const filteredTasks = useMemo(() => {
    let list = allTasks;
    if (statusFilter !== 'ALL') {
      list = list.filter((t: any) => t.status === statusFilter);
    }
    if (sourceFilter !== 'ALL') {
      list = list.filter((t: any) => t._sources.includes(sourceFilter));
    }
    return list;
  }, [allTasks, statusFilter, sourceFilter]);

  // Optimistic toggle mutations that invalidate all relevant queries
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['requestedByMe', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
  };

  const toggleMyDayMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-my-day`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['requestedByMe', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['todos', user?.id] });
      const prevRequested = queryClient.getQueryData(['requestedByMe', user?.id]);
      const prevTodos = queryClient.getQueryData(['todos', user?.id]);
      queryClient.setQueryData(['requestedByMe', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isMyDay: !t.isMyDay } : t)
      );
      queryClient.setQueryData(['todos', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isMyDay: !t.isMyDay } : t)
      );
      return { prevRequested, prevTodos };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['requestedByMe', user?.id], context.prevRequested);
      queryClient.setQueryData(['todos', user?.id], context.prevTodos);
    },
    onSettled: invalidateAll
  });

  const toggleImportantMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-important`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['requestedByMe', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['todos', user?.id] });
      const prevRequested = queryClient.getQueryData(['requestedByMe', user?.id]);
      const prevTodos = queryClient.getQueryData(['todos', user?.id]);
      queryClient.setQueryData(['requestedByMe', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isImportant: !t.isImportant } : t)
      );
      queryClient.setQueryData(['todos', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isImportant: !t.isImportant } : t)
      );
      return { prevRequested, prevTodos };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['requestedByMe', user?.id], context.prevRequested);
      queryClient.setQueryData(['todos', user?.id], context.prevTodos);
    },
    onSettled: invalidateAll
  });

  const isLoading = loadingRequests || loadingTodos;
  if (isLoading) return <Typography sx={{ p: 4 }}>Loading all tasks...</Typography>;

  const statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
  const sourceOptions: { label: string; value: SourceType }[] = [
    { label: 'All Sources', value: 'ALL' },
    { label: 'Requested By Me', value: 'REQUESTED' },
    { label: 'Assigned To Me', value: 'TODO' }
  ];

  const getSourceChip = (sources: string[]) => {
    if (sources.includes('REQUESTED') && sources.includes('TODO')) {
      return (
        <Chip
          label="Both"
          size="small"
          sx={{
            fontWeight: 700, fontSize: '0.65rem',
            background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
            color: '#fff', border: 'none'
          }}
        />
      );
    }
    if (sources.includes('REQUESTED')) {
      return (
        <Chip
          label="Requested"
          size="small"
          sx={{
            fontWeight: 700, fontSize: '0.65rem',
            bgcolor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        />
      );
    }
    return (
      <Chip
        label="Assigned"
        size="small"
        sx={{
          fontWeight: 700, fontSize: '0.65rem',
          bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}
      />
    );
  };

  return (
    <Box>
      {/* Header with counts */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AssignmentIcon sx={{ fontSize: 28, color: 'var(--accent)' }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-h)' }}>
          All Tasks
        </Typography>
        <Chip
          label={`${allTasks.length} total`}
          size="small"
          sx={{ fontWeight: 700, bgcolor: 'var(--accent-bg)', color: 'var(--accent)' }}
        />
      </Box>

      {/* Filter bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filters */}
          {statusOptions.map((status) => (
            <Chip
              key={status}
              label={status === 'ALL' ? 'All Status' : getStatusLabel(status)}
              onClick={() => setStatusFilter(status)}
              color={statusFilter === status ? 'primary' : 'default'}
              variant={statusFilter === status ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}

          {/* Divider */}
          <Box sx={{ width: 1, height: 24, bgcolor: 'var(--border)', mx: 0.5, borderRadius: 1 }} />

          {/* Source filters */}
          {sourceOptions.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              onClick={() => setSourceFilter(opt.value)}
              color={sourceFilter === opt.value ? 'secondary' : 'default'}
              variant={sourceFilter === opt.value ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>

        <ToggleButtonGroup
          value={viewMode}
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

      {filteredTasks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'var(--accent-bg)', borderRadius: 4, border: '2px dashed var(--border)' }}>
          <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary">No tasks found.</Typography>
          <Typography variant="body2" color="text.secondary">Adjust your filters or create a new request.</Typography>
        </Box>
      ) : viewMode === 'GRID' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {filteredTasks.map((task: any) => (
            <Card
              key={task.id}
              onClick={() => navigate(`/request/${task.id}`)}
              sx={{
                borderRadius: 3,
                boxShadow: 'var(--shadow)',
                border: task.isImportant ? '2px solid var(--warning)' : '1px solid var(--border)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 'var(--shadow-lg)' }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ pr: 8 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--text-h)' }}>
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
                        onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(task.id); }}
                        sx={{ color: task.isMyDay ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {task.isMyDay ? <SunIcon sx={{ fontSize: 20 }} /> : <SunOutlinedIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={task.isImportant ? "Remove Important" : "Mark as Important"}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(task.id); }}
                        sx={{ color: task.isImportant ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {task.isImportant ? <StarIcon sx={{ fontSize: 20 }} /> : <StarOutlineIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3em' }}
                >
                  {task.explanation}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                    {getSourceChip(task._sources)}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{task._personInitial}</Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{task._personLabel}</Typography>
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
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="right">Focus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task: any) => (
                  <TableRow key={task.id} onClick={() => navigate(`/request/${task.id}`)} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'var(--accent-bg)' }, '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5 }}><Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.875rem' }}>{task.subject}</Typography></TableCell>
                    <TableCell sx={{ py: 1.5 }}>{getSourceChip(task._sources)}</TableCell>
                    <TableCell sx={{ py: 1.5 }}><Chip label={getStatusLabel(task.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5, bgcolor: task.status === 'COMPLETED' ? 'var(--success)' : task.status === 'REJECTED' ? 'var(--error)' : 'var(--accent-bg)', color: task.status === 'COMPLETED' || task.status === 'REJECTED' ? '#fff' : 'var(--text-h)', border: 'none' }} /></TableCell>
                    <TableCell sx={{ py: 1.5 }}><DueDateBadge dueDate={task.requestedByDate} /></TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}><Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}><IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(task.id); }} sx={{ color: task.isMyDay ? 'var(--warning)' : 'text.disabled' }}>{task.isMyDay ? <SunIcon sx={{ fontSize: 18 }} /> : <SunOutlinedIcon sx={{ fontSize: 18 }} />}</IconButton><IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(task.id); }} sx={{ color: task.isImportant ? 'var(--warning)' : 'text.disabled' }}>{task.isImportant ? <StarIcon sx={{ fontSize: 18 }} /> : <StarOutlineIcon sx={{ fontSize: 18 }} />}</IconButton></Box></TableCell>
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

export default AllTasksTab;
