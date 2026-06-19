import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Avatar, IconButton, Tooltip, Select, MenuItem } from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  WbSunny as SunIcon,
  WbSunnyOutlined as SunOutlinedIcon,
  Star as StarIcon,
  StarOutlined as StarOutlineIcon,
  Sort as SortIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Assignment as AssignmentIcon
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

const TodosTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');

  const queryClient = useQueryClient();
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos', user?.id],
    queryFn: () => apiClient.get('/requests/todos', { params: { userId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  const toggleMyDayMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-my-day`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos', user?.id] });
      const previousTodos = queryClient.getQueryData(['todos', user?.id]);
      queryClient.setQueryData(['todos', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isMyDay: !t.isMyDay } : t)
      );
      return { previousTodos };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['todos', user?.id], context.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
    }
  });

  const toggleImportantMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-important`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos', user?.id] });
      const previousTodos = queryClient.getQueryData(['todos', user?.id]);
      queryClient.setQueryData(['todos', user?.id], (old: any) =>
        old?.map((t: any) => t.id === id ? { ...t, isImportant: !t.isImportant } : t)
      );
      return { previousTodos };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['todos', user?.id], context.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
    }
  });

  const sortedTodos = useMemo(() => {
    if (!todos) return [];
    let list = [...todos];
    if (sortBy === 'MY_DAY') {
      return list.sort((a, b) => (b.isMyDay ? 1 : 0) - (a.isMyDay ? 1 : 0));
    }
    if (sortBy === 'IMPORTANT') {
      return list.sort((a, b) => (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0));
    }
    return list;
  }, [todos, sortBy]);

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading tasks...</Typography>;

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
        p: 2,
        bgcolor: '#fff',
        borderRadius: 3,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SortIcon sx={{ color: 'var(--accent)', fontSize: 20 }} />
          <Select
            value={sortBy}
            size="small"
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              borderRadius: 2,
              minWidth: 150,
              fontWeight: 600,
              fontSize: '0.85rem',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent)' }
            }}
            variant="outlined"
          >
            <MenuItem value="DEFAULT">Sort By</MenuItem>
            <MenuItem value="MY_DAY">My Day First</MenuItem>
            <MenuItem value="IMPORTANT">Important First</MenuItem>
          </Select>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            {sortedTodos?.length || 0} tasks
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{
              bgcolor: 'var(--accent-bg)',
              borderRadius: 2,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}
          >
            <ToggleButton
              value="GRID"
              sx={{
                border: 'none',
                borderRadius: '8px !important',
                color: viewMode === 'GRID' ? 'var(--accent)' : 'var(--text-muted)',
                bgcolor: viewMode === 'GRID' ? 'rgba(37,99,235,0.12)' : 'transparent',
                '&:hover': { bgcolor: 'var(--accent-bg)' }
              }}
            >
              <GridIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton
              value="LIST"
              sx={{
                border: 'none',
                borderRadius: '8px !important',
                color: viewMode === 'LIST' ? 'var(--accent)' : 'var(--text-muted)',
                bgcolor: viewMode === 'LIST' ? 'rgba(37,99,235,0.12)' : 'transparent',
                '&:hover': { bgcolor: 'var(--accent-bg)' }
              }}
            >
              <ListIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {(!todos || todos.length === 0) ? (
        <Box sx={{
          textAlign: 'center',
          py: 10,
          px: 4,
          bgcolor: '#fff',
          borderRadius: 4,
          border: '2px dashed var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'var(--accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            <AssignmentIcon sx={{ fontSize: 40, color: 'var(--accent)', opacity: 0.6 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)', mb: 1 }}>
            No tasks assigned to you.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add your own task to get started.
          </Typography>
        </Box>
      ) : viewMode === 'GRID' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {sortedTodos?.map((todo: any) => (
            <Card
              key={todo.id}
              onClick={() => navigate(`/request/${todo.id}`)}
              sx={{
                borderRadius: 3,
                boxShadow: 'var(--shadow)',
                border: todo.isImportant ? '2px solid var(--warning)' : '1px solid var(--border)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: 'var(--shadow-lg)',
                  borderColor: 'var(--accent)'
                },
                '&::before': todo.status === 'OPEN' ? {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 4,
                  background: 'var(--accent)'
                } : todo.status === 'IN_PROGRESS' ? {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 4,
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                } : todo.status === 'COMPLETED' ? {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 4,
                  background: 'var(--success)'
                } : {}
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ pr: 8, flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)', mb: 0.5, lineHeight: 1.3 }}>
                      {todo.subject}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <CalendarIcon sx={{ fontSize: 13, color: 'var(--text-muted)' }} />
                      <DueDateBadge dueDate={todo.requestedByDate} />
                    </Box>
                  </Box>
                  <Box sx={{ position: 'absolute', top: 16, right: 12, display: 'flex', gap: 0.5 }}>
                    <Tooltip title={todo.isMyDay ? "Remove from My Day" : "Add to My Day"}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(todo.id); }}
                        sx={{ color: todo.isMyDay ? '#f59e0b' : 'text.disabled', bgcolor: todo.isMyDay ? 'rgba(245,158,11,0.12)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.18)' } }}
                      >
                        {todo.isMyDay ? <SunIcon sx={{ fontSize: 18 }} /> : <SunOutlinedIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={todo.isImportant ? "Remove Important" : "Mark as Important"}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(todo.id); }}
                        sx={{ color: todo.isImportant ? '#ef4444' : 'text.disabled', bgcolor: todo.isImportant ? 'rgba(239,68,68,0.1)' : 'transparent', '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' } }}
                      >
                        {todo.isImportant ? <StarIcon sx={{ fontSize: 18 }} /> : <StarOutlineIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: '2.5em', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {todo.explanation}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid var(--border)' }}>
                  <Chip
                    label={getStatusLabel(todo.status)}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      borderRadius: 1.5,
                      bgcolor: todo.status === 'COMPLETED' ? 'var(--success)' :
                        todo.status === 'REJECTED' ? 'var(--error)' :
                        todo.status === 'IN_PROGRESS' ? 'rgba(245,158,11,0.12)' :
                        'var(--accent-bg)',
                      color: todo.status === 'COMPLETED' || todo.status === 'REJECTED' ? '#fff' :
                        todo.status === 'IN_PROGRESS' ? '#b45309' : 'var(--accent)',
                      border: 'none',
                      '& .MuiChip-label': { px: 1.5 }
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'var(--accent)' }}>
                      {todo.assignedTo?.name?.[0] || todo.createdBy?.name?.[0] || '?'}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {todo.assignedTo?.name || todo.createdBy?.name || 'Unassigned'}
                    </Typography>
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
                <TableRow sx={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                  '& th': { color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase', border: 'none', py: 1.5 }
                }}>
                  <TableCell>Task</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell align="right">Focus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTodos?.map((todo: any) => (
                  <TableRow
                    key={todo.id}
                    onClick={() => navigate(`/request/${todo.id}`)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: 'var(--accent-bg)' },
                      '&:last-child td': { border: 0 }
                    }}
                  >
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.875rem' }}>{todo.subject}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={getStatusLabel(todo.status)}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: 1.5,
                          bgcolor: todo.status === 'COMPLETED' ? 'var(--success)' :
                            todo.status === 'REJECTED' ? 'var(--error)' :
                            todo.status === 'IN_PROGRESS' ? 'rgba(245,158,11,0.12)' :
                            'var(--accent-bg)',
                          color: todo.status === 'COMPLETED' || todo.status === 'REJECTED' ? '#fff' :
                            todo.status === 'IN_PROGRESS' ? '#b45309' : 'var(--accent)',
                          border: 'none'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}><DueDateBadge dueDate={todo.requestedByDate} /></TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'var(--accent)' }}>{todo.createdBy?.name?.[0]}</Avatar>
                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{todo.createdBy?.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); toggleMyDayMutation.mutate(todo.id); }}
                          sx={{ color: todo.isMyDay ? '#f59e0b' : 'text.disabled' }}
                        >
                          {todo.isMyDay ? <SunIcon sx={{ fontSize: 18 }} /> : <SunOutlinedIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); toggleImportantMutation.mutate(todo.id); }}
                          sx={{ color: todo.isImportant ? '#ef4444' : 'text.disabled' }}
                        >
                          {todo.isImportant ? <StarIcon sx={{ fontSize: 18 }} /> : <StarOutlineIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Box>
                    </TableCell>
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


export default TodosTab;