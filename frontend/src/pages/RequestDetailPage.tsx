import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Avatar,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
} from "@mui/material";
import {
  AttachFile,
  Send,
  Download,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  AssignmentInd as AssignmentIcon,
  Delete as DeleteIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckBox as CheckBoxIcon
} from "@mui/icons-material";
import DashboardLayout from '../components/DashboardLayout';
import DueDateBadge from '../components/DueDateBadge';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { getStatusLabel } from '../utils/statusUtils';

const RequestDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager, user } = useAuth();

  const { data: requestData, isLoading, error } = useQuery({
    queryKey: ['request', id],
    queryFn: () => apiClient.get(`/requests/${id}`).then(res => res.data),
    enabled: !!id
  });

  const request = requestData ?? null;
  const canManageRequest = !!request && !!user && (isManager || request.assignedTo?.id === user.id || request.createdBy?.id === user.id);
  const canChangeDueDate = !!request && !!user && (isManager || request.createdBy?.id === user.id);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['request-comments', id],
    queryFn: () => apiClient.get(`/requests/${id}/comments`).then(res => res.data),
    enabled: !!id,
    refetchInterval: 3000
  });

  const [selectedStatus, setSelectedStatus] = useState('');
  const [commentText, setCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);

  const canDeleteComment = (msg: any) => {
    if (msg.type === 'SYSTEM') return false;
    if (!user) return false;
    if (isManager) return true;
    return msg.createdBy?.id === user.id;
  };

  const toggleSelection = (msgId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then(res => res.data),
    enabled: isManager
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const updateMutation = useMutation({
    mutationFn: (newStatus: string) =>
      apiClient.put(`/requests/${id}`, { status: newStatus }),
    onSuccess: async (response) => {
      const updatedRequest = response.data;
      queryClient.setQueryData(['request', id], updatedRequest);
      await queryClient.invalidateQueries({ queryKey: ['request', id], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ['request', id] });
    }
  });

  const reassignMutation = useMutation({
    mutationFn: (userId: number) =>
      apiClient.put(`/requests/${id}`, { assignedTo: { id: userId } }),
    onSuccess: (response) => {
      const updatedRequest = response.data;
      if (updatedRequest) {
        queryClient.setQueryData(['request', id], updatedRequest);
      }
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    }
  });

  const dueDateMutation = useMutation({
    mutationFn: (requestedByDate: string) =>
      apiClient.put(`/requests/${id}`, { requestedByDate }),
    onSuccess: (response) => {
      const updatedRequest = response.data;
      if (updatedRequest) {
        queryClient.setQueryData(['request', id], updatedRequest);
      }
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/requests/${id}/comments`, { content }),
    onSuccess: () => {
      setCommentText('');
      refetchComments();
    }
  });

  const deleteCommentsMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.delete(`/requests/${id}/comments`, { data: { ids } }),
    onSuccess: () => {
      refetchComments();
      exitSelectionMode();
    }
  });

  const handleStatusChange = async (newStatus: string) => {
    setSelectedStatus(newStatus);
    try {
      await updateMutation.mutateAsync(newStatus);
      setSelectedStatus('');
    } catch (err) {
      setSelectedStatus('');
    }
  };

  const handleSendMessage = async () => {
    if (!commentText.trim() && !selectedFile) return;
    try {
      setIsUploading(true);
      const content = commentText.trim() || (selectedFile ? `Shared an attachment: ${selectedFile.name}` : "");
      const commentRes = await commentMutation.mutateAsync(content);
      if (selectedFile && commentRes.data?.id) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('requestId', id!);
        formData.append('commentId', commentRes.data.id.toString());
        await apiClient.post('/attachments/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setCommentText('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const downloadAttachment = (attachmentId: number, fileName: string) => {
    apiClient.get(`/attachments/${attachmentId}`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress sx={{ color: 'var(--accent)' }} />
        </Box>
      </DashboardLayout>
    );
  }

  if (error || !request) {
    return (
      <DashboardLayout>
        <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
          <Alert severity="error" sx={{ borderRadius: 3 }}>Request not found.</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mt: 2, textTransform: 'none' }}>
            Back to Dashboard
          </Button>
        </Box>
      </DashboardLayout>
    );
  }

  const getStatusChipStyle = (status: string) => {
    if (status === 'COMPLETED') return { bgcolor: 'var(--success)', color: '#fff', border: 'none' };
    if (status === 'REJECTED') return { bgcolor: 'var(--error)', color: '#fff', border: 'none' };
    if (status === 'IN_PROGRESS') return { bgcolor: 'rgba(245,158,11,0.12)', color: '#b45309', border: 'none' };
    return { bgcolor: 'var(--accent-bg)', color: 'var(--accent)', border: 'none' };
  };

  const getDueDateHeaderSx = (status: string) => {
    const base = {
      borderRadius: 2,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
      '& .MuiInputBase-input': { color: '#fff', fontSize: '0.8rem' },
      '& .MuiSvgIcon-root': { color: '#fff' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
    };

    switch (status) {
      case 'COMPLETED':
        return { ...base, bgcolor: 'rgba(37,211,102,0.2)' };
      case 'REJECTED':
        return { ...base, bgcolor: 'rgba(220,38,38,0.2)' };
      case 'IN_PROGRESS':
        return { ...base, bgcolor: 'rgba(255,152,0,0.2)' };
      default:
        return { ...base, bgcolor: 'rgba(255,255,255,0.15)' };
    }
  };

  const getDueDateSidebarSx = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { mt: 0.5, borderRadius: 2, bgcolor: '#e8f5e9', '& .MuiOutlinedInput-root': { fontSize: '0.85rem', color: '#2e7d32' }, '& .MuiSvgIcon-root': { color: '#2e7d32' } };
      case 'REJECTED':
        return { mt: 0.5, borderRadius: 2, bgcolor: '#ffebee', '& .MuiOutlinedInput-root': { fontSize: '0.85rem', color: '#c62828' }, '& .MuiSvgIcon-root': { color: '#c62828' } };
      case 'IN_PROGRESS':
        return { mt: 0.5, borderRadius: 2, bgcolor: '#fff3e0', '& .MuiOutlinedInput-root': { fontSize: '0.85rem', color: '#ef6c00' }, '& .MuiSvgIcon-root': { color: '#ef6c00' } };
      default:
        return { mt: 0.5, borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: '0.85rem' } };
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1300, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
        {/* Back button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{
            mb: 2.5,
            color: 'var(--text-muted)',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            '&:hover': { color: 'var(--accent)', bgcolor: 'var(--accent-bg)' }
          }}
        >
          Back to Dashboard
        </Button>

        {/* Header Card */}
        <Card sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          position: 'relative',
          '&::before': request.status === 'OPEN' ? {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 4,
            background: 'var(--accent)'
          } : request.status === 'IN_PROGRESS' ? {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
          } : request.status === 'COMPLETED' ? {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 4,
            background: 'var(--success)'
          } : {}
        }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            px: 3,
            py: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', mb: 1 }}>
                {request.subject}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Chip
                  label={getStatusLabel(request.status)}
                  size="small"
                  sx={{ ...getStatusChipStyle(request.status), fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5, '& .MuiChip-label': { px: 1.5 } }}
                />
                {canChangeDueDate ? (
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={request.requestedByDate ? dayjs(request.requestedByDate) : null}
                      onChange={(newValue) => {
                        if (newValue) dueDateMutation.mutate(newValue.format('YYYY-MM-DD'));
                      }}
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: getDueDateHeaderSx(request.status)
                        }
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <DueDateBadge dueDate={request.requestedByDate} status={request.status} />
                )}
              </Stack>
            </Box>

            {canManageRequest && (
              <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
                {isManager && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                      value={request.assignedTo?.id ?? ''}
                      onChange={(e) => reassignMutation.mutate(Number(e.target.value))}
                      displayEmpty
                      sx={{
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        '& .MuiSvgIcon-root': { color: '#fff' },
                        '& .MuiSelect-select': { py: 1 },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }
                      }}
                      renderValue={(val) => {
                        const u = allUsers.find((a: any) => a.id === val);
                        return u ? u.name : <em style={{ opacity: 0.7 }}>Unassigned</em>;
                      }}
                    >
                      <MenuItem value=""><em>Unassigned</em></MenuItem>
                      {allUsers.map((u: any) => (
                        <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.85rem' }}>{u.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={selectedStatus || request.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    displayEmpty
                    sx={{
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '& .MuiSvgIcon-root': { color: '#fff' },
                      '& .MuiSelect-select': { py: 1 },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }
                    }}
                    renderValue={(val) => <span>{getStatusLabel(val)}</span>}
                  >
                    <MenuItem value="OPEN" sx={{ fontSize: '0.85rem' }}>Todo</MenuItem>
                    <MenuItem value="IN_PROGRESS" sx={{ fontSize: '0.85rem' }}>In Progress</MenuItem>
                    <MenuItem value="COMPLETED" sx={{ fontSize: '0.85rem' }}>Completed</MenuItem>
                    <MenuItem value="REJECTED" sx={{ fontSize: '0.85rem' }}>Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            )}
          </Box>
        </Card>

        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 3,
          alignItems: 'start'
        }}>
          {/* LEFT - WhatsApp-style Chat */}
          <Card sx={{
            borderRadius: 3,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            border: '1px solid var(--border)'
          }}>
            {/* Chat Header / Selection Toolbar */}
            <Box sx={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              {isSelecting ? (
                <>
                  <IconButton size="small" onClick={exitSelectionMode} sx={{ color: '#fff' }}>
                    <CloseIcon />
                  </IconButton>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>
                    {selectedIds.size} selected
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (selectedIds.size > 0) {
                        deleteCommentsMutation.mutate(Array.from(selectedIds));
                      }
                    }}
                    disabled={selectedIds.size === 0 || deleteCommentsMutation.isPending}
                    sx={{ color: '#fff' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              ) : (
                <>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 42, height: 42, border: '2px solid rgba(255,255,255,0.3)' }}>
                    {request.createdBy?.name?.charAt(0) || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {request.subject}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                      {request.createdBy?.name}
                      {request.assignedTo ? ` → ${request.assignedTo.name}` : ' → Unassigned'}
                    </Typography>
                  </Box>
                  <Chip
                    label={getStatusLabel(request.status)}
                    size="small"
                    sx={{
                      ...getStatusChipStyle(request.status),
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      borderRadius: 1.5,
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                  <Button
                    size="small"
                    onClick={() => setIsSelecting(true)}
                    sx={{ color: '#fff', textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Select
                  </Button>
                </>
              )}
            </Box>

            {/* Messages Area */}
            <Box
              ref={scrollRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                px: 2,
                py: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                bgcolor: '#ECE5DD',
                backgroundImage: 'radial-gradient(circle, #c8c0b8 1px, transparent 1px)',
                backgroundSize: '18px 18px'
              }}
            >
              {/* Initial Request */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'var(--accent)', width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}>
                  {request.createdBy?.name?.charAt(0)}
                </Avatar>
                <Box sx={{ maxWidth: '72%' }}>
                  <Box
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: '0 16px 16px 16px',
                      p: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent)', display: 'block', mb: 0.5 }}>
                      {request.createdBy?.name}
                    </Typography>
                    <Typography sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-h)' }}>
                      {request.explanation || 'No description provided.'}
                    </Typography>
                    {request.attachments?.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {request.attachments.map((att: any) => (
                          <Button
                            key={att.id}
                            size="small"
                            variant="outlined"
                            startIcon={<AttachFile sx={{ fontSize: 14 }} />}
                            onClick={() => downloadAttachment(att.id, att.fileName)}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              justifyContent: 'flex-start',
                              borderColor: 'var(--border)',
                              color: 'var(--accent)',
                              '&:hover': { borderColor: 'var(--accent)', bgcolor: 'var(--accent-bg)' }
                            }}
                          >
                            {att.fileName}
                          </Button>
                        ))}
                      </Box>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.75, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {dayjs(request.createdAt).format('h:mm A')}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Comments */}
              {comments.map((msg: any) => {
                if (msg.type === 'SYSTEM') {
                  return (
                    <Box key={msg.id} sx={{ py: 1.5, textAlign: 'center', position: 'relative' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          bgcolor: '#ECE5DD',
                          px: 1.5,
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        {msg.content} • {dayjs(msg.createdAt).format('h:mm A')}
                      </Typography>
                    </Box>
                  );
                }
                const isSelf = msg.createdBy?.id === user?.id;
                const deletable = canDeleteComment(msg);
                return (
                  <Box key={msg.id} sx={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 1 }}>
                    {isSelecting && deletable && (
                      <Checkbox
                        checked={selectedIds.has(msg.id)}
                        onChange={() => toggleSelection(msg.id)}
                        sx={{ color: isSelf ? 'rgba(255,255,255,0.9)' : 'var(--accent)', p: 0.5 }}
                        size="small"
                      />
                    )}
                    {!isSelf && (
                      <Avatar sx={{ bgcolor: 'var(--accent)', width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}>
                        {msg.createdBy?.name?.charAt(0)}
                      </Avatar>
                    )}
                    <Box sx={{ maxWidth: '72%' }}>
                      <Box
                        sx={{
                          bgcolor: isSelf ? 'var(--accent)' : '#fff',
                          color: isSelf ? '#fff' : 'inherit',
                          borderRadius: isSelf ? '16px 0 16px 16px' : '0 16px 16px 16px',
                          p: 2,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: isSelf ? 'none' : '1px solid rgba(0,0,0,0.05)'
                        }}
                      >
                        {!isSelf && (
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent)', display: 'block', mb: 0.25, fontSize: '0.75rem' }}>
                            {msg.createdBy?.name}
                          </Typography>
                        )}
                        <Typography sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                          {msg.content}
                        </Typography>
                        {msg.attachments?.length > 0 && (
                          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {msg.attachments.map((att: any) => (
                              <Button
                                key={att.id}
                                size="small"
                                variant="outlined"
                                startIcon={<Download sx={{ fontSize: 14 }} />}
                                onClick={() => downloadAttachment(att.id, att.fileName)}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  color: isSelf ? '#fff' : 'var(--accent)',
                                  borderColor: isSelf ? 'rgba(255,255,255,0.4)' : 'var(--border)',
                                  '&:hover': { borderColor: isSelf ? '#fff' : 'var(--accent)', bgcolor: isSelf ? 'rgba(255,255,255,0.1)' : 'var(--accent-bg)' }
                                }}
                              >
                                {att.fileName}
                              </Button>
                            ))}
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: isSelf ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', fontSize: '0.68rem' }}>
                          {dayjs(msg.createdAt).format('h:mm A')}
                        </Typography>
                      </Box>
                    </Box>
                    {isSelf && (
                      <Avatar sx={{ bgcolor: 'rgba(37,99,235,0.15)', width: 32, height: 32, fontSize: '0.8rem', color: 'var(--accent)', flexShrink: 0, border: '1px solid var(--accent)' }}>
                        {msg.createdBy?.name?.charAt(0)}
                      </Avatar>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Input Bar */}
            <Box sx={{
              px: 2,
              py: 1.5,
              borderTop: '1px solid var(--border)',
              bgcolor: '#fff',
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-end'
            }}>
              <IconButton
                size="small"
                component="label"
                disabled={isUploading}
                sx={{
                  color: 'var(--text-muted)',
                  bgcolor: 'var(--accent-bg)',
                  '&:hover': { bgcolor: 'var(--accent)', color: '#fff' },
                  flexShrink: 0
                }}
              >
                <AttachFile fontSize="small" />
                <input hidden type="file" onChange={handleFileChange} />
              </IconButton>

              {selectedFile && (
                <Chip
                  label={selectedFile.name.length > 25 ? selectedFile.name.slice(0, 25) + '...' : selectedFile.name}
                  onDelete={() => setSelectedFile(null)}
                  size="small"
                  color="success"
                  variant="outlined"
                  deleteIcon={<CloseIcon />}
                  sx={{ borderRadius: 2, flexShrink: 0 }}
                />
              )}

              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                multiline
                maxRows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'var(--bg)',
                    fontSize: '0.9rem',
                    '& fieldset': { borderColor: 'var(--border)' },
                    '&:hover fieldset': { borderColor: 'var(--accent)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--accent)' }
                  }
                }}
              />

              <IconButton
                onClick={handleSendMessage}
                disabled={commentMutation.isPending || isUploading || (!commentText.trim() && !selectedFile)}
                sx={{
                  bgcolor: 'var(--accent)',
                  color: '#fff',
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'var(--accent)', transform: 'scale(1.05)' },
                  '&.Mui-disabled': { bgcolor: 'var(--border)', color: 'var(--text-muted)' },
                  transition: 'all 0.2s'
                }}
              >
                <Send fontSize="small" />
              </IconButton>
            </Box>
          </Card>

          {/* RIGHT Sidebar */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Details Card */}
            <Card sx={{
              borderRadius: 3,
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <Box sx={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                px: 2.5,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}>
                <AssignmentIcon sx={{ color: '#fff', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                  Details
                </Typography>
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2.5}>
                  {[
                    { icon: <PersonIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />, label: 'Requested By', value: request.createdBy?.name, avatar: request.createdBy?.name?.[0] },
                    { icon: <AssignmentIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />, label: 'Assigned To', value: request.assignedTo?.name || 'Unassigned', avatar: request.assignedTo?.name?.[0] || '?' },
                    { icon: <CheckCircleIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />, label: 'Status', value: getStatusLabel(request.status), chip: request.status },
                    { icon: <CalendarIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />, label: 'Due Date', value: request.requestedByDate ? dayjs(request.requestedByDate).format('MMM D, YYYY') : 'Not set', date: true }
                  ].map((item, idx) => (
                    <Box key={idx}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        {item.icon}
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                          {item.label}
                        </Typography>
                      </Box>
                      {item.chip ? (
                        <Chip
                          label={item.value}
                          size="small"
                          sx={{ ...getStatusChipStyle(item.chip), fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5, '& .MuiChip-label': { px: 1.5 } }}
                        />
                      ) : item.date && canChangeDueDate ? (
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DatePicker
                            value={request.requestedByDate ? dayjs(request.requestedByDate) : null}
                            onChange={(newValue) => {
                              if (newValue) dueDateMutation.mutate(newValue.format('YYYY-MM-DD'));
                            }}
                            slotProps={{
                              textField: {
                                size: 'small',
                                sx: getDueDateSidebarSx(request.status)
                              }
                            }}
                          />
                        </LocalizationProvider>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', bgcolor: 'var(--accent-bg)', color: 'var(--accent)' }}>
                            {item.avatar}
                          </Avatar>
                          <Typography sx={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.875rem' }}>
                            {item.value}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Attachments Card */}
            {request.attachments?.length > 0 && (
              <Card sx={{
                borderRadius: 3,
                boxShadow: 'var(--shadow)',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                  px: 2.5,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}>
                  <AttachFile sx={{ color: '#fff', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                    Attachments ({request.attachments.length})
                  </Typography>
                </Box>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    {request.attachments.map((att: any) => (
                      <Box
                        key={att.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.5,
                          border: "1px solid var(--border)",
                          borderRadius: 2,
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'var(--accent)', bgcolor: 'var(--accent-bg)' }
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.8rem'
                            }}
                          >
                            {att.fileName}
                          </Typography>
                          {att.createdAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {dayjs(att.createdAt).format('MMM D, YYYY')}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => downloadAttachment(att.id, att.fileName)}
                          sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'var(--accent-bg)' }, flexShrink: 0 }}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default RequestDetailPage;