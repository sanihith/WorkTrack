import { useState } from 'react';
import {
  Box
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import AllTasksTab from '../components/AllTasksTab';
import RequestedByMeTab from '../components/RequestedByMeTab';
import TodosTab from '../components/TodosTab';
import MyDayTab from '../components/MyDayTab';
import ImportantTab from '../components/ImportantTab';
import ReporteesTab from '../components/ReporteesTab';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { isManager } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  const tabs = [
    { label: 'Todos', component: <TodosTab /> },
    { label: 'Requested By Me', component: <RequestedByMeTab /> },
    { label: 'All Tasks', component: <AllTasksTab /> },
    { label: 'My Day', component: <MyDayTab /> },
    { label: 'Important', component: <ImportantTab /> },
    ...(isManager ? [{ label: 'Reportee', component: <ReporteesTab /> }] : []),
  ];

  const handleTabChange = (_: React.SyntheticEvent, v: number) => setTabIndex(v);

  return (
    <DashboardLayout activeTab={tabIndex} onTabChange={handleTabChange} tabs={tabs}>
      <Box sx={{ py: 2 }}>
        {tabs[tabIndex]?.component}
      </Box>
    </DashboardLayout>
  );
};

export default DashboardPage;