import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import { Card, Button } from '@/components/ui';
import {
    Workflow,
    Plus,
    Edit,
    GitBranch,
    Shield,
    Activity,
    CheckCircle2,
    TrendingUp,
    AlertCircle,
    BarChart3
} from 'lucide-react';

const WorkflowManagement = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [healthScores, setHealthScores] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/workflow/templates/');
            // Handle both paginated response {results: []} and plain array []
            const templatesList = response.data.results || response.data;
            setTemplates(Array.isArray(templatesList) ? templatesList : []);

            // Fetch health scores for each template
            if (Array.isArray(templatesList)) {
                templatesList.forEach(template => {
                    fetchHealthScore(template.id);
                });
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setLoading(false);
        }
    };

    const fetchHealthScore = async (templateId) => {
        try {
            const response = await api.get(`/workflow/templates/${templateId}/comprehensive-analysis/`);
            setHealthScores(prev => ({
                ...prev,
                [templateId]: response.data.overall_health_score
            }));
        } catch (error) {
            console.error(`Error fetching health score for template ${templateId}:`, error);
        }
    };

    const getHealthColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        if (score >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    const getHealthBg = (score) => {
        if (score >= 80) return 'bg-green-50 border-green-200';
        if (score >= 60) return 'bg-yellow-50 border-yellow-200';
        if (score >= 40) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    const getHealthLabel = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    };

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                    <Icon className={color} size={24} />
                </div>
            </div>
        </div>
    );

    const TemplateSkeleton = () => (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                </div>
                <div className="h-16 w-16 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
            <div className="h-2 bg-gray-100 rounded mb-4"></div>
            <div className="flex gap-2">
                <div className="h-8 bg-gray-100 rounded flex-1"></div>
                <div className="h-8 bg-gray-100 rounded flex-1"></div>
                <div className="h-8 bg-gray-100 rounded flex-1"></div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-96"></div>
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
                            <div className="flex justify-between">
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Templates Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <TemplateSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Workflow Management</h1>
                    <p className="text-sm md:text-base text-gray-600 mt-1">Manage and optimize your workflow templates</p>
                </div>
                <Button onClick={() => navigate('/admin/workflow')} className="flex items-center gap-2">
                    <Plus size={16} />
                    Create Template
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Templates"
                    value={templates.length}
                    icon={Workflow}
                    color="text-blue-600"
                />
                <StatCard
                    title="Active Templates"
                    value={templates.filter(t => t.is_active).length}
                    icon={CheckCircle2}
                    color="text-green-600"
                />
                <StatCard
                    title="Total Transitions"
                    value={templates.reduce((sum, t) => sum + (t.transition_count || 0), 0)}
                    icon={GitBranch}
                    color="text-purple-600"
                />
                <StatCard
                    title="Avg Health Score"
                    value={
                        Object.keys(healthScores).length > 0
                            ? Math.round(Object.values(healthScores).reduce((a, b) => a + b, 0) / Object.values(healthScores).length)
                            : '...'
                    }
                    icon={Activity}
                    color="text-indigo-600"
                />
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => {
                    const healthScore = healthScores[template.id];
                    const healthColor = healthScore ? getHealthColor(healthScore) : 'text-gray-600';
                    const healthBg = healthScore ? getHealthBg(healthScore) : 'bg-gray-50 border-gray-200';
                    const healthLabel = healthScore ? getHealthLabel(healthScore) : 'Calculating...';

                    return (
                        <Card
                            key={template.id}
                            className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                                        {template.is_active && (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    {template.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                                    )}
                                </div>
                                {healthScore !== undefined && (
                                    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 ${healthBg}`}>
                                        <div className={`text-2xl font-bold ${healthColor}`}>{healthScore}</div>
                                        <div className={`text-xs font-semibold ${healthColor}`}>{healthLabel}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-1">
                                    <Activity size={14} className="text-blue-500" />
                                    <span>{template.status_count || 0} Statuses</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <GitBranch size={14} className="text-purple-500" />
                                    <span>{template.transition_count || 0} Transitions</span>
                                </div>
                            </div>

                            {healthScore !== undefined && (
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                                    <div
                                        className={`h-full transition-all duration-500 ${healthColor.replace('text-', 'bg-')}`}
                                        style={{ width: `${healthScore}%` }}
                                    ></div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/admin/workflow', { state: { templateId: template.id } });
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/admin/workflow', { state: { templateId: template.id, tab: 'diagram' } });
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <BarChart3 size={14} />
                                    Diagram
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/admin/workflow', { state: { templateId: template.id, tab: 'matrix' } });
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Shield size={14} />
                                    Roles
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {templates.length === 0 && !loading && (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                    <Workflow className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workflow Templates</h3>
                    <p className="text-gray-600 mb-6">Create your first workflow template to get started</p>
                    <Button onClick={() => navigate('/admin/workflow')} className="inline-flex items-center gap-2">
                        <Plus size={16} />
                        Create Template
                    </Button>
                </div>
            )}
        </div>
    );
};

export default WorkflowManagement;
