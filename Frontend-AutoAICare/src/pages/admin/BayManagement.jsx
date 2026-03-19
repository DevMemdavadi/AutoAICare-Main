import React, { useState, useEffect } from 'react';
import {
    Layout, Grid, CheckCircle2, AlertCircle, Clock,
    Car, User, Settings, Plus, RefreshCcw, MapPin,
    Search, Filter, MoreHorizontal, ArrowRightCircle
} from 'lucide-react';
import api from '@/utils/api';
import { Button, Card, Badge, Input } from '@/components/ui';

const BayManagement = () => {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [bays, setBays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, occupied: 0, idle: 0 });

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchBays();
        }
    }, [selectedBranch]);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches/');
            const activeBranches = response.data.results || response.data;
            setBranches(activeBranches);
            if (activeBranches.length > 0) {
                setSelectedBranch(activeBranches[0]);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchBays = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/branches/bays/?branch=${selectedBranch.id}`);
            const bayList = response.data.results || response.data;
            setBays(bayList);

            // Calculate stats
            const occupied = bayList.filter(b => b.current_occupancy).length;
            setStats({
                total: bayList.length,
                occupied: occupied,
                idle: bayList.length - occupied
            });
        } catch (error) {
            console.error('Error fetching bays:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBayTypeIcon = (type) => {
        switch (type) {
            case 'washing': return <RefreshCcw className="w-5 h-5" />;
            case 'detailing': return <Settings className="w-5 h-5" />;
            case 'drying': return <Clock className="w-5 h-5" />;
            default: return <Grid className="w-5 h-5" />;
        }
    };

    const StatusBadge = ({ occupied }) => (
        <Badge variant={occupied ? 'warning' : 'success'} className="flex items-center gap-1">
            {occupied ? (
                <>
                    <AlertCircle size={12} />
                    <span>Occupied</span>
                </>
            ) : (
                <>
                    <CheckCircle2 size={12} />
                    <span>Idle</span>
                </>
            )}
        </Badge>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bay Management</h1>
                    <p className="text-slate-500 mt-1">Real-time workshop occupancy and bay utilization</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        value={selectedBranch?.id || ''}
                        onChange={(e) => {
                            const branch = branches.find(b => b.id === parseInt(e.target.value));
                            setSelectedBranch(branch);
                        }}
                    >
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>

                    <Button onClick={fetchBays} variant="outline" className="rounded-xl">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>

                    <Button className="rounded-xl flex items-center gap-2">
                        <Plus size={18} />
                        <span>Add Bay</span>
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <Layout size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-blue-600">Total Bays</p>
                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 p-6 flex items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-200">
                        <Car size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-600">Occupied</p>
                        <p className="text-3xl font-bold text-slate-900">{stats.occupied}</p>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-200">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-600">Idle / Ready</p>
                        <p className="text-3xl font-bold text-slate-900">{stats.idle}</p>
                    </div>
                </Card>
            </div>

            {/* Bays Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {bays.map(bay => (
                        <Card key={bay.id} className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${bay.current_occupancy ? 'border-amber-100' : 'border-transparent'}`}>
                            {/* Visual Indicator Top */}
                            <div className={`h-1 w-full ${bay.current_occupancy ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${bay.current_occupancy ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {getBayTypeIcon(bay.bay_type)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{bay.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bay.bay_type_display}</p>
                                        </div>
                                    </div>
                                    <StatusBadge occupied={!!bay.current_occupancy} />
                                </div>

                                {bay.current_occupancy ? (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Car size={14} className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-700">{bay.current_occupancy.vehicle_number}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-xs text-slate-500 font-medium">{bay.current_occupancy.customer_name}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-xs font-bold text-blue-600">{bay.current_occupancy.status}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 rounded-lg">
                                                View Booking
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl group-hover:border-blue-100 transition-colors">
                                        <ArrowRightCircle className="text-slate-100 group-hover:text-blue-100 mb-2 transition-colors" size={32} />
                                        <p className="text-sm font-bold text-slate-300 group-hover:text-blue-300 transition-colors">Available</p>
                                        <Button variant="ghost" className="mt-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl px-4 py-1 h-auto">
                                            Assign Now
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Options Button */}
                            <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-lg transition-all">
                                <MoreHorizontal size={16} className="text-slate-400" />
                            </button>
                        </Card>
                    ))}

                    {/* Empty State / Add New Bay Mock */}
                    <button className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group">
                        <div className="p-4 bg-slate-50 group-hover:bg-white rounded-full transition-colors">
                            <Plus className="text-slate-300 group-hover:text-blue-500" size={32} />
                        </div>
                        <p className="mt-4 font-bold text-slate-400 group-hover:text-blue-600">New Service Bay</p>
                    </button>
                </div>
            )}
        </div>
    );
};

export default BayManagement;
