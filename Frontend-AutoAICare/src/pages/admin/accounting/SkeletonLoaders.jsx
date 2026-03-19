// Reusable skeleton components for Accounting module

export const StatCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="p-3 rounded-lg bg-gray-100">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
        </div>
    </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className={`h-10 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50'} rounded`}></div>
            ))}
        </div>
    </div>
);

export const FormSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
        <div className="space-y-4">
            <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                </div>
                <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
                <div className="h-10 bg-gray-200 rounded w-24"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
        </div>
    </div>
);

export const ChartSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-80 bg-gray-100 rounded flex items-end justify-around p-4 gap-2">
            <div className="bg-gray-200 rounded w-full" style={{ height: '60%' }}></div>
            <div className="bg-gray-200 rounded w-full" style={{ height: '80%' }}></div>
            <div className="bg-gray-200 rounded w-full" style={{ height: '45%' }}></div>
            <div className="bg-gray-200 rounded w-full" style={{ height: '70%' }}></div>
            <div className="bg-gray-200 rounded w-full" style={{ height: '55%' }}></div>
            <div className="bg-gray-200 rounded w-full" style={{ height: '90%' }}></div>
        </div>
    </div>
);

export const FilterBarSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-pulse">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div className="w-full md:w-48">
                <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div className="w-full md:w-48">
                <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    </div>
);

export const ListSkeleton = ({ items = 5 }) => (
    <div className="space-y-3">
        {[...Array(items)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-32"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const CardSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded w-4/6"></div>
        </div>
    </div>
);

export const FullPageSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
        <FilterBarSkeleton />
        <TableSkeleton rows={8} />
    </div>
);
