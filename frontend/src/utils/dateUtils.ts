import dayjs from 'dayjs';

export const formatDate = (date: string): string => {
  return dayjs(date).format('MMM D, YYYY');
};

export const getDueDateColorStyle = (date: string) => {
  if (!date) return {};
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const diff = d.diff(today, 'day');

  if (diff < 0) return { bgcolor: '#ffebee', color: '#c62828' };
  if (diff === 0) return { bgcolor: '#f44336', color: '#fff' };
  if (diff === 1) return { bgcolor: '#ff9800', color: '#fff' };
  if (diff <= 3) return { bgcolor: '#fff3e0', color: '#ef6c00' };
  return { bgcolor: '#e8f5e9', color: '#2e7d32' };
};

export const getDueDateHeaderStyle = (date: string) => {
  if (!date) return { bgcolor: 'rgba(255,255,255,0.15)' };
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const diff = d.diff(today, 'day');

  if (diff < 0) return { bgcolor: 'rgba(220,38,38,0.2)' };
  if (diff === 0) return { bgcolor: 'rgba(244,67,54,0.25)' };
  if (diff === 1) return { bgcolor: 'rgba(255,152,0,0.2)' };
  if (diff <= 3) return { bgcolor: 'rgba(255,152,0,0.12)' };
  return { bgcolor: 'rgba(255,255,255,0.15)' };
};

export const getDueDateSidebarStyle = (date: string) => {
  if (!date) return {};
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const diff = d.diff(today, 'day');

  if (diff < 0) return { bgcolor: '#ffebee', '& .MuiOutlinedInput-root': { color: '#c62828' }, '& .MuiSvgIcon-root': { color: '#c62828' } };
  if (diff === 0) return { bgcolor: '#ffcdd2', '& .MuiOutlinedInput-root': { color: '#c62828' }, '& .MuiSvgIcon-root': { color: '#c62828' } };
  if (diff === 1) return { bgcolor: '#ffcc80', '& .MuiOutlinedInput-root': { color: '#e65100' }, '& .MuiSvgIcon-root': { color: '#e65100' } };
  if (diff <= 3) return { bgcolor: '#fff3e0', '& .MuiOutlinedInput-root': { color: '#ef6c00' }, '& .MuiSvgIcon-root': { color: '#ef6c00' } };
  return { '& .MuiOutlinedInput-root': { color: '#2e7d32' }, '& .MuiSvgIcon-root': { color: '#2e7d32' } };
};