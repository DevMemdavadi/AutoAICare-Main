import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    Send,
    Paperclip,
    Pin,
    Unlock,
    Lock,
    AlertCircle,
    CheckCircle,
    Clock,
    Filter,
    Wifi,
    WifiOff
} from 'lucide-react';
import { format } from 'date-fns';
import { useJobCardSocket } from '../hooks/useJobCardSocket';
import { WS_STATES } from '../utils/websocket';

const NotesPanel = ({ jobCardId, notes: initialNotes, onAddNote, currentUserRole, onNoteReceived }) => {
    const [notes, setNotes] = useState(initialNotes || []);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('internal');
    const [isPinned, setIsPinned] = useState(false);
    const [visibleToCustomer, setVisibleToCustomer] = useState(false);
    const [filter, setFilter] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newNoteHighlight, setNewNoteHighlight] = useState(null);
    const notesEndRef = useRef(null);

    // Update local notes when props change
    useEffect(() => {
        setNotes(initialNotes || []);
    }, [initialNotes]);

    // Handle real-time note addition via WebSocket
    const handleNoteAdded = (noteData) => {
        console.log('📝 Real-time note received:', noteData);

        // Add new note to local state if it doesn't already exist
        setNotes(prev => {
            if (prev.find(n => n.id === noteData.id)) {
                return prev;
            }
            return [...prev, noteData];
        });

        // Highlight the new note
        setNewNoteHighlight(noteData.id);
        setTimeout(() => setNewNoteHighlight(null), 3000);

        // Scroll to the new note
        setTimeout(() => {
            notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Callback for parent component
        if (onNoteReceived) {
            onNoteReceived(noteData);
        }
    };

    // Connect to job card WebSocket
    const { connectionState } = useJobCardSocket(jobCardId, {
        onNoteAdded: handleNoteAdded,
    });

    // Check if the current user is a customer
    const isCustomer = currentUserRole === 'customer';

    // Filter notes based on selection
    const filteredNotes = notes.filter(note => {
        if (filter === 'all') return true;
        return note.note_type === filter;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        try {
            await onAddNote({
                content: newNote,
                note_type: noteType,
                is_pinned: isPinned,
                visible_to_customer: visibleToCustomer
            });

            // Reset form
            setNewNote('');
            setNoteType('internal');
            setIsPinned(false);
            setVisibleToCustomer(false);
        } catch (error) {
            console.error("Error adding note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getNoteIcon = (type) => {
        switch (type) {
            case 'internal': return <Lock className="w-4 h-4 text-gray-500" />;
            case 'customer': return <Unlock className="w-4 h-4 text-green-500" />;
            case 'task': return <CheckCircle className="w-4 h-4 text-blue-500" />;
            case 'issue': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'reminder': return <Clock className="w-4 h-4 text-yellow-500" />;
            default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
        }
    };

    const getNoteColor = (type) => {
        switch (type) {
            case 'internal': return 'bg-gray-50 border-gray-200';
            case 'customer': return 'bg-green-50 border-green-200';
            case 'task': return 'bg-blue-50 border-blue-200';
            case 'issue': return 'bg-red-50 border-red-200';
            case 'reminder': return 'bg-yellow-50 border-yellow-200';
            default: return 'bg-white border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Notes & Communications
                    </h3>
                    {/* Real-time connection indicator */}
                    {connectionState === WS_STATES.CONNECTED ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <Wifi className="w-3 h-3" />
                            Live
                        </span>
                    ) : connectionState === WS_STATES.CONNECTING ? (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full animate-pulse">
                            Connecting...
                        </span>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Notes</option>
                        <option value="internal">Internal Only</option>
                        <option value="customer">Customer Visible</option>
                        <option value="issue">Issues</option>
                        <option value="task">Tasks</option>
                    </select>
                </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No notes found. Start a conversation!</p>
                    </div>
                ) : (
                    filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            className={`p-3 rounded-lg border transition-all duration-500 ${getNoteColor(note.note_type)} ${note.is_pinned ? 'ring-2 ring-blue-100' : ''} ${newNoteHighlight === note.id ? 'ring-2 ring-green-400 bg-green-50' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {getNoteIcon(note.note_type)}
                                    <span className="font-medium text-sm text-gray-800">
                                        {note.created_by_details?.name || 'Unknown User'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {format(new Date(note.created_at), 'MMM d, h:mm a')}
                                    </span>
                                    {newNoteHighlight === note.id && (
                                        <span className="text-xs text-green-600 font-medium animate-pulse">New!</span>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {note.is_pinned && <Pin className="w-3 h-3 text-blue-500 fill-current" />}
                                    {note.visible_to_customer && <Unlock className="w-3 h-3 text-green-500" />}
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        </div>
                    ))
                )}
                <div ref={notesEndRef} />
            </div>

            {/* Add Note Form */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 text-sm"
                            placeholder="Type your note here..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Controls - Hide for customers */}
                        {!isCustomer ? (
                            <div className="flex flex-wrap gap-2">
                                <select
                                    className="text-xs border-gray-300 rounded focus:ring-blue-500"
                                    value={noteType}
                                    onChange={(e) => setNoteType(e.target.value)}
                                >
                                    <option value="internal">Internal Note</option>
                                    <option value="customer">Customer Note</option>
                                    <option value="issue">Issue/Problem</option>
                                    <option value="reminder">Reminder</option>
                                </select>

                                <button
                                    type="button"
                                    onClick={() => setIsPinned(!isPinned)}
                                    className={`p-1.5 rounded border ${isPinned ? 'bg-blue-100 border-blue-300 text-blue-600' : 'bg-white border-gray-300 text-gray-500'}`}
                                    title="Pin Note"
                                >
                                    <Pin className="w-3.5 h-3.5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVisibleToCustomer(!visibleToCustomer)}
                                    className={`p-1.5 rounded border ${visibleToCustomer ? 'bg-green-100 border-green-300 text-green-600' : 'bg-white border-gray-300 text-gray-500'}`}
                                    title="Visible to Customer"
                                >
                                    {visibleToCustomer ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        ) : (
                            <div></div> /* Spacer for justified layout */
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || !newNote.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Send Note
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default NotesPanel;