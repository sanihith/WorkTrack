import { useState, useEffect, type ChangeEvent } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField, Button,
  IconButton, Tooltip, Divider, Chip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  Person as PersonIcon,
  DateRange as DateRangeIcon,
  Subject as SubjectIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

interface NewRequestPopupProps {
  open: boolean;
  onClose: () => void;
  initialAssignedToEmail?: string;
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const INITIAL_STATE = {
  subject: '',
  explanation: '',
  assignedToEmail: '',
  additionalCcEmails: '',
  requestedByDate: '',
  status: 'OPEN'
};

const NewRequestPopup = ({ open, onClose, initialAssignedToEmail }: NewRequestPopupProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(INITIAL_STATE);

  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        assignedToEmail: initialAssignedToEmail || '',
        additionalCcEmails: ''
      }));
    }
  }, [open, user, initialAssignedToEmail]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.assignedToEmail) {
      alert('Please fill in Subject and To (recipient)');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/requests', {
        subject: formData.subject,
        explanation: formData.explanation,
        assignedToEmail: formData.assignedToEmail,
        requestedByDate: formData.requestedByDate,
        status: formData.status,
        createdById: user?.id,
        ccEmails: formData.additionalCcEmails ? formData.additionalCcEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e) : []
      });

      const requestId = response.data.id;

      if (files.length > 0) {
        for (const file of files) {
          const uploadData = new FormData();
          uploadData.append('file', file);
          uploadData.append('requestId', requestId.toString());
          await apiClient.post('/attachments/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      onClose();
      setFormData(INITIAL_STATE);
      setFiles([]);
    } catch (error) {
      console.error('Failed to create request:', error);
      alert('Failed to create request. Please check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }
      } as any}
    >
      <Box sx={{
        bgcolor: '#f8f9fa',
        px: 3,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: '600' }} color="#444">New Message</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#666' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '70vh' }}>
        <Box sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', py: 1, alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 60 }}>From:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: '500' }}>{user?.email}</Typography>
            </Box>
          </Box>
          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'row', py: 1, alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 60 }}>To:</Typography>
            <TextField
              variant="standard"
              fullWidth
              placeholder="Recipient email address"
              value={formData.assignedToEmail}
              onChange={(e) => setFormData({ ...formData, assignedToEmail: e.target.value })}
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: { fontSize: '0.875rem' }
                }
              } as any}
            />
          </Box>
          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'row', py: 1, alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 60 }}>Cc:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1 }}>
              <TextField
                variant="standard"
                fullWidth
                placeholder={user?.managerEmail ? "Add others..." : "Recipient emails..."}
                value={formData.additionalCcEmails}
                onChange={(e) => setFormData({ ...formData, additionalCcEmails: e.target.value })}
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: { fontSize: '0.875rem', minWidth: 200 }
                  }
                } as any}
              />
            </Box>
          </Box>
          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'row', py: 1, alignItems: 'center', gap: 2 }}>
            <SubjectIcon sx={{ fontSize: 18, color: 'text.secondary', width: 60, opacity: 0.7 }} />
            <TextField
              variant="standard"
              fullWidth
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: { fontSize: '1rem', fontWeight: '500' }
                }
              } as any}
            />
          </Box>
          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'row', py: 1, alignItems: 'center', gap: 2 }}>
            <Box sx={{
              flex: 1,
              p: 1,
              borderRadius: 2,
              border: '1px solid var(--border)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'var(--accent-bg)',
              color: 'var(--text-h)'
            }}>
              <DateRangeIcon sx={{ fontSize: 20, opacity: 0.8 }} />
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'inherit', opacity: 0.7, mb: -0.5 }}>
                  Due Date
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={formData.requestedByDate ? dayjs(formData.requestedByDate) : null}
                    onChange={(newValue) => setFormData({ ...formData, requestedByDate: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                    slotProps={{
                      textField: {
                        variant: 'standard',
                        fullWidth: true,
                        sx: {
                          '& .MuiInput-root': { fontSize: '0.85rem', fontWeight: 600, color: 'inherit', mt: 0 },
                          '& .MuiInput-input': { p: 0 },
                          '& .MuiSvgIcon-root': { color: 'inherit' }
                        }
                      }
                    } as any}
                  />
                </LocalizationProvider>
              </Box>
            </Box>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />
        </Box>

        <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
          <TextField
            multiline
            fullWidth
            placeholder="Explain the request here..."
            rows={10}
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            variant="standard"
            slotProps={{
              input: {
                disableUnderline: true,
                sx: { fontSize: '0.95rem', lineHeight: 1.6, alignItems: 'flex-start' }
              }
            } as any}
          />
        </Box>

        {files.length > 0 && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
              {files.map((file, index) => (
                <Chip
                  key={index}
                  label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                  onDelete={() => removeFile(index)}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 1 }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider />

        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={isSubmitting}
              sx={{
                borderRadius: 5,
                px: 3,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
              }}
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>

            <Tooltip title="Attach files">
              <IconButton component="label">
                <input type="file" hidden multiple onChange={handleFileChange} />
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Press Send to submit your request
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NewRequestPopup;