import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui';

const WorkflowDiagram = ({ template, onStatusClick, onTransitionClick }) => {
    // Status type colors matching existing system
    const statusTypeColors = {
        initial: { bg: '#64748b', border: '#475569' },
        qc: { bg: '#06b6d4', border: '#0891b2' },
        approval: { bg: '#10b981', border: '#059669' },
        work: { bg: '#3b82f6', border: '#2563eb' },
        final_qc: { bg: '#a855f7', border: '#9333ea' },
        customer: { bg: '#ec4899', border: '#db2777' },
        billing: { bg: '#f59e0b', border: '#d97706' },
        delivery: { bg: '#14b8a6', border: '#0d9488' },
        terminal: { bg: '#6b7280', border: '#4b5563' },
    };

    // Calculate node positions using a hierarchical layout
    const calculateNodePositions = useCallback((statuses) => {
        if (!statuses || statuses.length === 0) return [];

        const nodeSpacing = 250;
        const verticalSpacing = 120;
        const sorted = [...statuses].sort((a, b) => a.order - b.order);

        return sorted.map((status, index) => {
            // Calculate position in a flowing left-to-right layout
            const row = Math.floor(index / 4); // 4 nodes per row
            const col = index % 4;

            return {
                id: status.id.toString(),
                type: 'status',
                data: {
                    label: status.display_name,
                    statusCode: status.status_code,
                    statusType: status.status_type,
                    isTerminal: status.is_terminal,
                    order: status.order,
                    color: statusTypeColors[status.status_type] || statusTypeColors.initial,
                    onClick: () => onStatusClick?.(status),
                },
                position: { x: col * nodeSpacing, y: row * verticalSpacing },
            };
        });
    }, [onStatusClick]);

    // Create edges from transitions
    const createEdges = useCallback((transitions, statuses) => {
        if (!transitions || !statuses) return [];

        return transitions
            .filter(t => t.is_active)
            .map((transition) => {
                const fromStatus = statuses.find(s => s.display_name === transition.from_status);
                const toStatus = statuses.find(s => s.display_name === transition.to_status);

                if (!fromStatus || !toStatus) return null;

                // Determine edge color based on allowed roles
                const edgeColor = transition.allowed_roles?.includes('super_admin') ||
                    transition.allowed_roles?.includes('company_admin')
                    ? '#8b5cf6' // Purple for admin roles
                    : transition.allowed_roles?.includes('floor_manager')
                        ? '#10b981' // Green for floor manager
                        : transition.allowed_roles?.includes('supervisor')
                            ? '#f59e0b' // Amber for supervisor
                            : '#3b82f6'; // Blue default

                return {
                    id: transition.id.toString(),
                    source: fromStatus.id.toString(),
                    target: toStatus.id.toString(),
                    type: 'smoothstep',
                    animated: true,
                    label: transition.action_name,
                    style: { stroke: edgeColor, strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: edgeColor,
                    },
                    data: {
                        transition,
                        onClick: () => onTransitionClick?.(transition),
                    },
                };
            })
            .filter(Boolean);
    }, [onTransitionClick]);

    // Custom node component
    const StatusNode = ({ data }) => {
        const { label, statusCode, statusType, isTerminal, color, onClick } = data;

        return (
            <div
                onClick={onClick}
                className="relative px-6 py-4 rounded-lg shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105"
                style={{
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: '2px',
                    minWidth: '180px',
                }}
            >
                <div className="text-white">
                    <div className="font-bold text-sm mb-1">{label}</div>
                    <div className="text-xs opacity-90">
                        {statusCode}
                        {isTerminal && ' • Terminal'}
                    </div>
                </div>
                {isTerminal && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                        ✓
                    </div>
                )}
            </div>
        );
    };

    const nodeTypes = useMemo(() => ({ status: StatusNode }), []);

    // Build nodes and edges
    const initialNodes = useMemo(
        () => calculateNodePositions(template?.statuses || []),
        [template?.statuses, calculateNodePositions]
    );

    const initialEdges = useMemo(
        () => createEdges(template?.transitions || [], template?.statuses || []),
        [template?.transitions, template?.statuses, createEdges]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Handle edge click
    const onEdgeClick = useCallback((event, edge) => {
        edge.data?.onClick?.();
    }, []);

    // Export diagram as image
    const handleExport = useCallback(() => {
        // This would require additional setup with html-to-image library
        // For now, we'll just show an alert
        alert('Export feature coming soon! You can take a screenshot for now.');
    }, []);

    // Fit view
    const handleFitView = useCallback(() => {
        // This requires accessing the ReactFlow instance
        // Will be implemented with useReactFlow hook
        alert('Use the "Fit View" button in the bottom-left controls');
    }, []);

    if (!template) {
        return (
            <div className="flex items-center justify-center h-96 text-gray-400">
                <div className="text-center">
                    <Maximize2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a workflow template to view diagram</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[600px] w-full border-2 border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onEdgeClick={onEdgeClick}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
                minZoom={0.2}
                maxZoom={2}
            >
                <Background color="#cbd5e1" gap={16} />
                <Controls className="bg-white border-gray-300" />
                <MiniMap
                    nodeColor={(node) => node.data.color.bg}
                    className="bg-white border-2 border-gray-300"
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
                <Panel position="top-right" className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="bg-white shadow-md"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                    </Button>
                </Panel>
                <Panel position="bottom-center" className="bg-white/90 backdrop-blur-sm px-3 md:px-4 py-2 rounded-lg shadow-lg border border-gray-200 mx-4">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] md:text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500"></div>
                            <span>Work</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                            <span>Approval</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-purple-500"></div>
                            <span>QC</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-500"></div>
                            <span>Billing</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gray-500"></div>
                            <span>Terminal</span>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};

export default WorkflowDiagram;
