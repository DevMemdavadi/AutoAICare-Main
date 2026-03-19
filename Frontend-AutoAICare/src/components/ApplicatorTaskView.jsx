import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import api from '@/utils/api';
import { CheckCircle, Clock, AlertCircle, Play, Square } from 'lucide-react';

const ApplicatorTaskView = ({ jobCard }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchApplicatorTasks();
  }, [jobCard.id]);

  const fetchApplicatorTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobcards/${jobCard.id}/`);
      setTasks(response.data.applicator_tasks || []);
    } catch (error) {
      console.error('Error fetching applicator tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle starting a task
  const handleStartTask = async (taskId) => {
    try {
      setActionLoading(prev => ({ ...prev, [taskId]: 'start' }));
      await api.post(`/jobcards/${jobCard.id}/start_applicator_task/`, {
        task_id: taskId
      });
      // Refresh tasks after starting
      await fetchApplicatorTasks();
    } catch (error) {
      console.error('Error starting task:', error);
      alert(error.response?.data?.error || 'Failed to start task');
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[taskId];
        return newLoading;
      });
    }
  };

  // Handle completing a task
  const handleCompleteTask = async (taskId) => {
    try {
      setActionLoading(prev => ({ ...prev, [taskId]: 'complete' }));
      await api.post(`/jobcards/${jobCard.id}/complete_applicator_task/`, {
        task_id: taskId
      });
      // Refresh tasks after completing
      await fetchApplicatorTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      alert(error.response?.data?.error || 'Failed to complete task');
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[taskId];
        return newLoading;
      });
    }
  };

  // Get task status badge
  const getTaskStatusBadge = (task) => {
    switch (task.status) {
      case 'completed':
        return { text: 'Completed', variant: 'success', icon: CheckCircle };
      case 'in_progress':
        return { text: 'In Progress', variant: 'warning', icon: Clock };
      default:
        return { text: 'Assigned', variant: 'info', icon: AlertCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No tasks assigned to you for this job.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const statusBadge = getTaskStatusBadge(task);
        const Icon = statusBadge.icon;
        
        return (
          <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    statusBadge.variant === 'success' ? 'bg-green-100 text-green-800' :
                    statusBadge.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    <Icon size={12} />
                    {statusBadge.text}
                  </span>
                </div>
                <p className="text-gray-900 mb-2">{task.task_description}</p>
                {task.supervisor_notes && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600 mb-1">Supervisor Notes:</p>
                    <p className="text-sm text-gray-900">{task.supervisor_notes}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-gray-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
                {task.started_at && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    Started: {new Date(task.started_at).toLocaleTimeString()}
                  </div>
                )}
                {task.completed_at && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle size={12} />
                    Completed: {new Date(task.completed_at).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Action buttons based on task status */}
            <div className="mt-4 flex gap-2">
              {task.status === 'assigned' && (
                <Button
                  size="sm"
                  onClick={() => handleStartTask(task.id)}
                  disabled={actionLoading[task.id] === 'start'}
                >
                  {actionLoading[task.id] === 'start' ? (
                    'Starting...'
                  ) : (
                    <>
                      <Play size={14} className="mr-1" />
                      Start Task
                    </>
                  )}
                </Button>
              )}
              
              {task.status === 'in_progress' && (
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleCompleteTask(task.id)}
                  disabled={actionLoading[task.id] === 'complete'}
                >
                  {actionLoading[task.id] === 'complete' ? (
                    'Completing...'
                  ) : (
                    <>
                      <Square size={14} className="mr-1" />
                      Complete Task
                    </>
                  )}
                </Button>
              )}
              
              {task.status === 'completed' && (
                <Button size="sm" variant="outline" disabled>
                  <CheckCircle size={14} className="mr-1" />
                  Completed
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApplicatorTaskView;