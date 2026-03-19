import { Button, Card, Input, Modal, Textarea } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { Camera, CheckSquare, Package, Plus, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const WorkExecution = ({ jobCard, onUpdate }) => {
  const { user } = useAuth();
  const [checklistItems, setChecklistItems] = useState([]);
  const [partsUsed, setPartsUsed] = useState([]);
  const [newPart, setNewPart] = useState({ part_name: '', quantity: 1, price: 0 });
  const [notes, setNotes] = useState('');
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inProgressPhotos, setInProgressPhotos] = useState([]);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });



  // Check if user is supervisor
  const isSupervisor = user && user.role === 'supervisor';

  // Initialize data from jobCard
  useEffect(() => {
    if (jobCard) {
      // Parse checklist items from technician_notes if they exist
      try {
        const parsedChecklist = JSON.parse(jobCard.technician_notes || '[]');
        if (Array.isArray(parsedChecklist)) {
          setChecklistItems(parsedChecklist);
        }
      } catch (e) {
        // If parsing fails, initialize with empty array
        setChecklistItems([]);
      }

      setPartsUsed(jobCard.parts_used || []);
      setNotes(jobCard.technician_notes || '');

      // Get in-progress photos
      const inProgressPhotos = jobCard.photos?.filter(photo => photo.photo_type === 'in_progress') || [];
      setInProgressPhotos(inProgressPhotos);
    }
  }, [jobCard]);

  // Toggle checklist item completion
  const toggleChecklistItem = (index) => {
    const updatedChecklist = [...checklistItems];
    updatedChecklist[index] = {
      ...updatedChecklist[index],
      completed: !updatedChecklist[index].completed
    };
    setChecklistItems(updatedChecklist);
    saveChecklist(updatedChecklist);
  };

  // Add a new checklist item
  const addChecklistItem = (itemText) => {
    if (!itemText.trim()) return;

    const newItem = {
      id: Date.now(),
      item: itemText,
      completed: false
    };

    const updatedChecklist = [...checklistItems, newItem];
    setChecklistItems(updatedChecklist);
    saveChecklist(updatedChecklist);
  };

  // Save checklist to backend
  const saveChecklist = async (checklist) => {
    try {
      await api.post(`/jobcards/${jobCard.id}/update_work_checklist/`, {
        checklist_items: checklist
      });
    } catch (error) {
      console.error('Error saving checklist:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to save checklist' });
    }
  };

  // Add a new part
  const handleAddPart = async () => {
    if (!newPart.part_name || newPart.quantity <= 0 || newPart.price <= 0) {
      setAlert({ show: true, type: 'error', message: 'Please fill all part details correctly' });
      return;
    }

    try {
      const response = await api.post(`/jobcards/${jobCard.id}/add_work_part/`, newPart);
      setPartsUsed([...partsUsed, response.data]);
      setNewPart({ part_name: '', quantity: 1, price: 0 });
      setShowAddPartModal(false);
      setAlert({ show: true, type: 'success', message: 'Part added successfully' });
    } catch (error) {
      console.error('Error adding part:', error);
      if (error.response?.data?.error) {
        setAlert({ show: true, type: 'error', message: error.response.data.error });
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to add part' });
      }
    }
  };

  // Remove a part
  const handleRemovePart = async (partId) => {
    try {
      await api.delete(`/jobcards/${jobCard.id}/remove_work_part/${partId}/`);
      setPartsUsed(partsUsed.filter(part => part.id !== partId));
      setAlert({ show: true, type: 'success', message: 'Part removed successfully' });
    } catch (error) {
      console.error('Error removing part:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to remove part' });
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadedPhotos = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('photo_type', 'in_progress');

        const response = await api.post(`/jobcards/${jobCard.id}/add_photo/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        uploadedPhotos.push(response.data);
      }

      setInProgressPhotos(prev => [...prev, ...uploadedPhotos]);
      setAlert({ show: true, type: 'success', message: `${files.length} photo(s) uploaded successfully` });

      // Refresh job card data to ensure photos are visible
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to upload photos' });
    } finally {
      setUploading(false);
    }
  };

  // Handle delete photo
  const handleDeletePhoto = async (photoId) => {
    try {
      await api.delete(`/jobcards/${jobCard.id}/photos/${photoId}/`);
      setInProgressPhotos(inProgressPhotos.filter(photo => photo.id !== photoId));
      setAlert({ show: true, type: 'success', message: 'Photo deleted successfully' });

      // Refresh job card data to ensure photos are visible
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to delete photo' });
    }
  };



  // Save notes
  const handleSaveNotes = async () => {
    try {
      await api.patch(`/jobcards/${jobCard.id}/`, {
        technician_notes: notes
      });
      setAlert({ show: true, type: 'success', message: 'Notes saved successfully!' });
    } catch (error) {
      console.error('Error saving notes:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to save notes' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert.show && (
        <div className={`p-4 rounded-lg ${alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist Section */}
        <Card title="Work Checklist">
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => isSupervisor && toggleChecklistItem(index)}
                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    disabled={!isSupervisor}
                  />
                  <div className="flex-1">
                    <p
                      className={`font-medium ${item.completed
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                        }`}
                    >
                      {item.item}
                    </p>
                  </div>
                  {item.completed && (
                    <CheckSquare size={20} className="text-green-600" />
                  )}
                </label>
              ))}
            </div>

            {/* Add new checklist item - only for supervisors */}
            {isSupervisor && (
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="Add new checklist item..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addChecklistItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const input = e.target.previousElementSibling;
                    addChecklistItem(input.value);
                    input.value = '';
                  }}
                >
                  <Plus size={16} />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Parts Used Section */}
        <Card title="Parts Used">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Parts
              </h3>
              {isSupervisor && (
                <Button
                  onClick={() => setShowAddPartModal(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Add Part
                </Button>
              )}
            </div>

            {partsUsed.length > 0 ? (
              <div className="space-y-3">
                {partsUsed.map((part) => (
                  <div
                    key={part.id}
                    className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {part.part_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Quantity: {part.quantity}</span>
                        <span>•</span>
                        <span>Price: ₹{part.price}</span>
                        <span>•</span>
                        <span className="font-semibold text-gray-900">
                          Total: ₹{(part.quantity * part.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {isSupervisor && (
                      <button
                        onClick={() => handleRemovePart(part.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove part"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total Parts Cost:</span>
                    <span className="text-green-600">
                      ₹
                      {partsUsed
                        .reduce(
                          (sum, part) => sum + part.quantity * part.price,
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No parts used yet</p>
                <p className="text-sm mt-2">
                  Add parts used during the service
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* In-Progress Photos Section */}
      <Card title="In-Progress Photos">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {inProgressPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.image}
                  alt="In Progress"
                  className="w-full h-32 object-cover rounded-lg"
                />
                {isSupervisor && (
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                )}
                {photo.description && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {photo.description}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Camera and Upload Options */}
          {isSupervisor && (
            <div className="flex flex-wrap gap-2 mb-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors cursor-pointer">
                <Camera size={16} />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors cursor-pointer">
                <Upload size={16} />
                Upload Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}



          {uploading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Uploading photos...</span>
            </div>
          )}
        </div>
      </Card>

      {/* Notes Section */}
      <Card title="Work Notes">
        <div className="p-6 space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about the work in progress..."
            rows={6}
          />
          {isSupervisor && (
            <Button
              onClick={handleSaveNotes}
              className="w-full"
            >
              Save Notes
            </Button>
          )}
        </div>
      </Card>

      {/* Add Part Modal */}
      <Modal
        isOpen={showAddPartModal}
        onClose={() => setShowAddPartModal(false)}
        title="Add Part Used"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddPartModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPart}>
              <Plus size={18} className="mr-2" />
              Add Part
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Part Name"
            value={newPart.part_name}
            onChange={(e) =>
              setNewPart({ ...newPart, part_name: e.target.value })
            }
            placeholder="Enter part name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={newPart.quantity}
              onChange={(e) =>
                setNewPart({
                  ...newPart,
                  quantity: parseInt(e.target.value) || 1,
                })
              }
              required
            />
            <Input
              label="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={newPart.price}
              onChange={(e) =>
                setNewPart({
                  ...newPart,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              required
            />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-bold text-lg text-gray-900">
                ₹{(newPart.quantity * newPart.price).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkExecution;