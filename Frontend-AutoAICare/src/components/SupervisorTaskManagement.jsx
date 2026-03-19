import { useState } from 'react';
import { Button, Card, Input, Textarea, Select, Modal } from '@/components/ui';
import api from '@/utils/api';
import { Plus, X, CheckCircle, Clock, User, Play, Square } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SupervisorTaskManagement = ({ jobCard, onUpdate }) => {
  const { user } = useAuth();
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    applicator_id: '',
    task_description: ''
  });
  const [taskNote, setTaskNote] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [actionLoading, setActionLoading] = useState({});

  // Check if user is supervisor
  const isSupervisor = user && user.role === 'supervisor';

  // Handle assigning a new task
  const handleAssignTask = async () => {
    if (!newTask.applicator_id || !newTask.task_description) {
      setAlert({ show: true, type: 'error', message: 'Please fill all fields' });
      return;
    }

    try {
      await api.post(`/jobcards/${jobCard.id}/assign_applicator_task/`, newTask);
      setAlert({ show: true, type: 'success', message: 'Task assigned successfully' });
      setNewTask({ applicator_id: '', task_description: '' });
      setShowAssignTaskModal(false);
      onUpdate();
    } catch (error) {
      console.error('Error assigning task:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to assign task' });
    }
  };

  // Handle adding a note to a task
  const handleAddNote = async () => {
    if (!selectedTask || !taskNote) {
      setAlert({ show: true, type: 'error', message: 'Please select a task and enter a note' });
      return;
    }

    try {
      await api.post(`/jobcards/${jobCard.id}/add_task_note/`, {
        task_id: selectedTask.id,
        note: taskNote
      });
      setAlert({ show: true, type: 'success', message: 'Note added successfully' });
      setTaskNote('');
      setShowAddNoteModal(false);
      setSelectedTask(null);
      onUpdate();
    } catch (error) {
      console.error('Error adding note:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to add note' });
    }
  };

  // Handle starting a task (supervisor can start tasks on behalf of applicators)
  const handleStartTask = async (taskId) => {
    try {
      setActionLoading(prev => ({ ...prev, [taskId]: 'start' }));
      await api.post(`/jobcards/${jobCard.id}/start_applicator_task/`, {
        task_id: taskId
      });
      setAlert({ show: true, type: 'success', message: 'Task started successfully' });
      onUpdate();
    } catch (error) {
      console.error('Error starting task:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to start task' });
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[taskId];
        return newLoading;
      });
    }
  };

  // Handle completing a task (supervisor can complete tasks on behalf of applicators)
  const handleCompleteTask = async (taskId) => {
    try {
      setActionLoading(prev => ({ ...prev, [taskId]: 'complete' }));
      await api.post(`/jobcards/${jobCard.id}/complete_applicator_task/`, {
        task_id: taskId
      });
      setAlert({ show: true, type: 'success', message: 'Task completed successfully' });
      onUpdate();
    } catch (error) {
      console.error('Error completing task:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to complete task' });
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
        return { text: 'Completed', variant: 'success' };
      case 'in_progress':
        return { text: 'In Progress', variant: 'warning' };
      default:
        return { text: 'Assigned', variant: 'info' };
    }
  };

  if (!isSupervisor) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert.show && (
        <div className={`p-4 rounded-lg ${
          alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {alert.message}
          <button 
            onClick={() => setAlert({ show: false, type: '', message: '' })}
            className="float-right"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Task Management Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setShowAssignTaskModal(true)}
          variant="primary"
          size="sm"
        >
          <Plus size={16} className="mr-2" />
          Assign Task
        </Button>
        <Button
          onClick={() => setShowAddNoteModal(true)}
          variant="outline"
          size="sm"
        >
          Add Task Note
        </Button>
      </div>

      {/* Assigned Tasks */}
      {jobCard.applicator_tasks && jobCard.applicator_tasks.length > 0 && (
        <Card title="Assigned Tasks">
          <div className="p-6 space-y-4">
            {jobCard.applicator_tasks.map((task) => {
              const statusBadge = getTaskStatusBadge(task);
              return (
                <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusBadge.variant === 'success' ? 'bg-green-100 text-green-800' :
                          statusBadge.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {statusBadge.text}
                        </span>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <User size={14} />
                          {task.applicator_details?.name || 'Unknown Applicator'}
                        </div>
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
                  
                  {/* Supervisor actions for each task */}
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
        </Card>
      )}

      {/* Assign Task Modal */}
      <Modal
        isOpen={showAssignTaskModal}
        onClose={() => {
          setShowAssignTaskModal(false);
          setNewTask({ applicator_id: '', task_description: '' });
        }}
        title="Assign Task to Applicator"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAssignTaskModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTask}>
              Assign Task
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Select Applicator"
            value={newTask.applicator_id}
            onChange={(e) => setNewTask({ ...newTask, applicator_id: e.target.value })}
            options={[
              { value: '', label: 'Select an Applicator' },
              ...(jobCard.applicator_team_details || []).map(applicator => ({
                value: applicator.id,
                label: applicator.name
              }))
            ]}
            required
          />
          <Textarea
            label="Task Description"
            value={newTask.task_description}
            onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
            placeholder="Describe the task to be assigned..."
            rows={4}
            required
          />
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={showAddNoteModal}
        onClose={() => {
          setShowAddNoteModal(false);
          setTaskNote('');
          setSelectedTask(null);
        }}
        title="Add Note to Task"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddNoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              Add Note
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Select Task"
            value={selectedTask?.id || ''}
            onChange={(e) => {
              const task = jobCard.applicator_tasks.find(t => t.id === parseInt(e.target.value));
              setSelectedTask(task || null);
            }}
            options={[
              { value: '', label: 'Select a Task' },
              ...(jobCard.applicator_tasks || []).map(task => ({
                value: task.id,
                label: `${task.applicator_details?.name || 'Unknown'}: ${task.task_description.substring(0, 30)}${task.task_description.length > 30 ? '...' : ''}`
              }))
            ]}
            required
          />
          <Textarea
            label="Note"
            value={taskNote}
            onChange={(e) => setTaskNote(e.target.value)}
            placeholder="Add your note here..."
            rows={4}
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default SupervisorTaskManagement;