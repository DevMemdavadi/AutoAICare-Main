import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const LeaveTypesManagement = () => {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        annual_quota: 0,
        is_paid: true,
        is_carry_forward: false,
        max_carry_forward_days: 0,
        is_encashable: false,
        encashment_rate: 100,
        requires_approval: true,
        requires_document: false,
        min_notice_days: 0,
        max_consecutive_days: 0,
        is_active: true
    });

    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const response = await api.get('/accounting/leave-types/');
            // Handle both paginated and non-paginated responses
            const data = response.data.results || response.data;
            setLeaveTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching leave types:', error);
            setLeaveTypes([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingType) {
                await api.put(`/accounting/leave-types/${editingType.id}/`, formData);
            } else {
                await api.post('/accounting/leave-types/', formData);
            }
            setShowModal(false);
            resetForm();
            fetchLeaveTypes();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save leave type');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (type) => {
        setEditingType(type);
        setFormData(type);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave type?')) {
            return;
        }

        try {
            await api.delete(`/accounting/leave-types/${id}/`);
            fetchLeaveTypes();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete leave type');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            annual_quota: 0,
            is_paid: true,
            is_carry_forward: false,
            max_carry_forward_days: 0,
            is_encashable: false,
            encashment_rate: 100,
            requires_approval: true,
            requires_document: false,
            min_notice_days: 0,
            max_consecutive_days: 0,
            is_active: true
        });
        setEditingType(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Leave Types Management</h2>
                    <p className="text-slate-600 mt-1">Configure leave types and policies</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                    <PlusIcon className="h-5 w-5" />
                    Add Leave Type
                </button>
            </div>

            {/* Leave Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaveTypes.map((type) => (
                    <div
                        key={type.id}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{type.name}</h3>
                                <p className="text-sm text-slate-500">{type.code}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${type.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-800'
                                }`}>
                                {type.is_active ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{type.description}</p>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Annual Quota:</span>
                                <span className="font-semibold text-slate-900">{type.annual_quota} days</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Type:</span>
                                <span className="font-semibold text-slate-900">
                                    {type.is_paid ? 'Paid' : 'Unpaid'}
                                </span>
                            </div>
                            {type.is_carry_forward && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Carry Forward:</span>
                                    <span className="font-semibold text-slate-900">
                                        {type.max_carry_forward_days} days
                                    </span>
                                </div>
                            )}
                            {type.is_encashable && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Encashment:</span>
                                    <span className="font-semibold text-green-600">
                                        {type.encashment_rate}%
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {type.is_paid && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Paid</span>
                            )}
                            {type.is_carry_forward && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Carry Forward</span>
                            )}
                            {type.is_encashable && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Encashable</span>
                            )}
                            {type.requires_approval && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Needs Approval</span>
                            )}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-200">
                            <button
                                onClick={() => handleEdit(type)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                                <PencilIcon className="h-4 w-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(type.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                                <TrashIcon className="h-4 w-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">
                            {editingType ? 'Edit Leave Type' : 'Add New Leave Type'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        maxLength={10}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Annual Quota (days) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.annual_quota}
                                        onChange={(e) => setFormData({ ...formData, annual_quota: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Min Notice (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.min_notice_days}
                                        onChange={(e) => setFormData({ ...formData, min_notice_days: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Max Consecutive Days
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.max_consecutive_days}
                                        onChange={(e) => setFormData({ ...formData, max_consecutive_days: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                                {formData.is_carry_forward && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Max Carry Forward Days
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.max_carry_forward_days}
                                            onChange={(e) => setFormData({ ...formData, max_carry_forward_days: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                        />
                                    </div>
                                )}
                                {formData.is_encashable && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Encashment Rate (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.encashment_rate}
                                            onChange={(e) => setFormData({ ...formData, encashment_rate: parseFloat(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_paid}
                                        onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Paid Leave</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_carry_forward}
                                        onChange={(e) => setFormData({ ...formData, is_carry_forward: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Allow Carry Forward</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_encashable}
                                        onChange={(e) => setFormData({ ...formData, is_encashable: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Encashable</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_approval}
                                        onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Requires Approval</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_document}
                                        onChange={(e) => setFormData({ ...formData, requires_document: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Requires Document</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Active</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : editingType ? 'Update Leave Type' : 'Create Leave Type'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveTypesManagement;
