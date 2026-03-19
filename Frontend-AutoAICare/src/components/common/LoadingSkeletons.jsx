import React from 'react';

export const CardSkeleton = ({ count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
            ))}
        </>
    );
};

export const TableSkeleton = ({ rows = 5 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            </div>
            <div className="divide-y divide-slate-200">
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            </div>
                            <div className="h-8 bg-slate-200 rounded w-20"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ChartSkeleton = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-slate-100 rounded"></div>
        </div>
    );
};

export const StatCardSkeleton = ({ count = 4 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-6 w-6 bg-slate-200 rounded"></div>
                    </div>
                    <div className="h-10 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-slate-200 rounded w-full mb-1"></div>
                    <div className="h-2 bg-slate-200 rounded w-2/3"></div>
                </div>
            ))}
        </>
    );
};

export const FormSkeleton = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index}>
                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                    </div>
                ))}
                <div className="flex gap-3 pt-4">
                    <div className="h-12 bg-slate-200 rounded flex-1"></div>
                    <div className="h-12 bg-slate-200 rounded w-24"></div>
                </div>
            </div>
        </div>
    );
};

export const LeaderboardSkeleton = () => {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl shadow-lg p-6 animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-white bg-opacity-30 rounded-full"></div>
                    <div className="flex-1">
                        <div className="h-8 bg-white bg-opacity-30 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-white bg-opacity-30 rounded w-1/2"></div>
                    </div>
                </div>
            </div>

            {/* Podium Skeleton */}
            <div className="grid grid-cols-3 gap-4">
                {[12, 0, 16].map((pt, index) => (
                    <div key={index} className={`pt-${pt} animate-pulse`}>
                        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-6">
                            <div className="h-12 w-12 mx-auto bg-slate-200 rounded-full mb-3"></div>
                            <div className="h-16 w-16 mx-auto bg-slate-200 rounded-full mb-3"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto mb-4"></div>
                            <div className="space-y-2">
                                <div className="h-3 bg-slate-200 rounded"></div>
                                <div className="h-3 bg-slate-200 rounded"></div>
                                <div className="h-3 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <TableSkeleton rows={7} />
        </div>
    );
};

export const CalendarSkeleton = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-6">
                <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-slate-200 rounded"></div>
                    <div className="h-10 w-20 bg-slate-200 rounded"></div>
                    <div className="h-10 w-10 bg-slate-200 rounded"></div>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, index) => (
                    <div key={index} className="h-24 bg-slate-100 rounded"></div>
                ))}
            </div>
        </div>
    );
};

export default {
    CardSkeleton,
    TableSkeleton,
    ChartSkeleton,
    StatCardSkeleton,
    FormSkeleton,
    LeaderboardSkeleton,
    CalendarSkeleton
};
