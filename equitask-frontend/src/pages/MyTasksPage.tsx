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
      case 0: // Active
        return filterTasks(['assigned', 'in_progress']);
      case 1: // Completed
        return filterTasks(['completed']);
      case 2: // Overdue
        return filterTasks(['overdue']);
      default:
        return tasks;
    }
  };

  const displayTasks = getTasksByTab();

  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          My Tasks
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Tasks assigned to you
        </Typography>

        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab
            label={`Active (${filterTasks(['assigned', 'in_progress']).length})`}
          />
          <Tab label={`Completed (${filterTasks(['completed']).length})`} />
          <Tab label={`Overdue (${filterTasks(['overdue']).length})`} />
        </Tabs>

        <TaskList
          tasks={displayTasks}
          onView={handleView}
          showFilters={false}
        />

        <TaskDetails task={selectedTask} open={detailsOpen} onClose={handleDetailsClose} />
      </Box>
    </Layout>
  );
};

export default MyTasksPage;