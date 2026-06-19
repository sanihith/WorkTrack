import { useState, useMemo } from 'react';
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
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import apiClient from '../api/apiClient';
import DueDateBadge from './DueDateBadge';
import { useAuth } from '../context/AuthContext';
import { getStatusLabel } from '../utils/statusUtils';

const RequestedByMeTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');

  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['requestedByMe', user?.id],
    queryFn: () => apiClient.get('/requests/my-requests', { params: { userId: user?.id } }).then(res => res.data),
    enabled: !!user?.id
  });

  const toggleMyDayMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-my-day`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['requestedByMe', user?.id] });
      const previous = queryClient.getQueryData(['requestedByMe', user?.id]);
      queryClient.setQueryData(['requestedByMe', user?.id], (old: any) => 
        old?.map((t: any) => t.id === id ? { ...t, isMyDay: !t.isMyDay } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['requestedByMe', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['requestedByMe', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
    }
  });

  const toggleImportantMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/requests/${id}/toggle-important`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['requestedByMe', user?.id] });
      const previous = queryClient.getQueryData(['requestedByMe', user?.id]);
      queryClient.setQueryData(['requestedByMe', user?.id], (old: any) => 
        old?.map((t: any) => t.id === id ? { ...t, isImportant: !t.isImportant } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['requestedByMe', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['requestedByMe', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myDay', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['important', user?.id] });
    }
  });

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (statusFilter === 'ALL') return requests;
    return requests.filter((req: any) => req.status === statusFilter);
  }, [requests, statusFilter]);

  const statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];

  if (isLoading) return <Typography sx={{ p: 4 }}>Loading tasks...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {statusOptions.map((status) => (
            <Chip
              key={status}
              label={status === 'ALL' ? 'ALL' : getStatusLabel(status)}
              onClick={() => setStatusFilter(status)}
              color={statusFilter === status ? 'primary' : 'default'}
              variant={statusFilter === status ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          unique-id="view-toggle-requested"
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

      {filteredRequests?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'var(--accent-bg)', borderRadius: 4, border: '2px dashed var(--border)' }}>
          <Typography variant="h6" color="text.secondary">
            {statusFilter === 'ALL' ? 'No requests found.' : `No requests with status ${statusFilter} found.`}
          </Typography>
          <Typography variant="body2" color="text.secondary">Create a new request to get started.</Typography>
        </Box>
      )}
      {viewMode === 'GRID' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {filteredRequests?.map((req: any) => (
            <Card
              key={req.id}
              onClick={() => navigate(`/request/${req.id}`)}
              sx={{
                borderRadius: 3,
                boxShadow: 'var(--shadow)',
                border: req.isImportant ? '2px solid var(--warning)' : '1px solid var(--border)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 'var(--shadow-lg)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ pr: 8 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--text-h)' }}>
                      {req.subject}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <DueDateBadge dueDate={req.requestedByDate} />
                    </Box>
                  </Box>
                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5 }}>
                    <Tooltip title={req.isMyDay ? "Remove from My Day" : "Add to My Day"}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMyDayMutation.mutate(req.id);
                        }}
                        sx={{ color: req.isMyDay ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {req.isMyDay ? <SunIcon sx={{ fontSize: 20 }} /> : <SunOutlinedIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={req.isImportant ? "Remove Important" : "Mark as Important"}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImportantMutation.mutate(req.id);
                        }}
                        sx={{ color: req.isImportant ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {req.isImportant ? <StarIcon sx={{ fontSize: 20 }} /> : <StarOutlineIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '3em'
                  }}
                >
                  {req.explanation}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={getStatusLabel(req.status)}
                      size="small"
                      sx={{ 
                        fontWeight: 'bold',
                        bgcolor: req.status === 'COMPLETED' ? 'var(--success)' : 
                                 req.status === 'REJECTED' ? 'var(--error)' : 
                                 'var(--accent-bg)',
                        color: req.status === 'COMPLETED' || req.status === 'REJECTED' ? '#fff' : 'var(--text-h)',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                      {req.assignedTo?.name?.[0] || '?'}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {req.assignedTo?.name || 'Unassigned'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'var(--shadow)', border: '1px solid var(--border)', bgcolor: 'background.paper', overflow: 'hidden' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'var(--accent-bg)' }}>
                <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Assigned To</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Focus</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests?.map((req: any) => (
                <TableRow 
                  key={req.id}
                  hover
                  onClick={() => navigate(`/request/${req.id}`)}
                  sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-h)' }}>{req.subject}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(req.status)}
                      size="small"
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                        bgcolor: req.status === 'COMPLETED' ? 'var(--success)' : 
                                 req.status === 'REJECTED' ? 'var(--error)' : 
                                 'var(--accent-bg)',
                        color: req.status === 'COMPLETED' || req.status === 'REJECTED' ? '#fff' : 'var(--text-h)'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <DueDateBadge dueDate={req.requestedByDate} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                        {req.assignedTo?.name?.[0] || '?'}
                      </Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {req.assignedTo?.name || 'Unassigned'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMyDayMutation.mutate(req.id);
                        }}
                        sx={{ color: req.isMyDay ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {req.isMyDay ? <SunIcon sx={{ fontSize: 18 }} /> : <SunOutlinedIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImportantMutation.mutate(req.id);
                        }}
                        sx={{ color: req.isImportant ? 'var(--warning)' : 'text.disabled' }}
                      >
                        {req.isImportant ? <StarIcon sx={{ fontSize: 18 }} /> : <StarOutlineIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default RequestedByMeTab;