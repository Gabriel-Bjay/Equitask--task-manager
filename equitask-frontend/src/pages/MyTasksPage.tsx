import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Typography, Box, Tabs, Tab } from '@mui/material';
import Layout from '../components/layout/Layout';
import TaskList from '../components/tasks/TaskList';
import TaskDetails from '../components/tasks/TaskDetails';
import { fetchMyTasks } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { Task, TaskStatus } from '../types/task.types';

const MyTasksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks } = useSelector((state: RootState) => state.tasks);
  const [selectedTab, setSelectedTab] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    dispatch(fetchMyTasks());
  }, [dispatch]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleView = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedTask(null);
  };

  const filterTasks = (status?: TaskStatus[]) => {
    if (!status) return tasks;
    return tasks.filter((task) => status.includes(task.status));
  };

  const getTasksByTab = () => {
    switch (selectedTab) {
      case 0: return filterTasks(['assigned', 'in_progress']);
      case 1: return filterTasks(['completed']);
      case 2: return filterTasks(['overdue']);
      default: return tasks;
    }
  };

  return (
    <Layout>
      <Box>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
          My Tasks
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5, mb: 3 }}>
          Tasks assigned to you
        </Typography>

        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{
            mb: 3,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
            '& .Mui-selected': { color: '#028090', fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: '#028090' },
          }}
        >
          <Tab label={`Active (${filterTasks(['assigned', 'in_progress']).length})`} />
          <Tab label={`Completed (${filterTasks(['completed']).length})`} />
          <Tab label={`Overdue (${filterTasks(['overdue']).length})`} />
        </Tabs>

        <TaskList
          tasks={getTasksByTab()}
          onView={handleView}
          onStatusChange={() => dispatch(fetchMyTasks())}
          showFilters={false}
        />

        <TaskDetails
          task={selectedTask}
          open={detailsOpen}
          onClose={handleDetailsClose}
        />
      </Box>
    </Layout>
  );
};

export default MyTasksPage;