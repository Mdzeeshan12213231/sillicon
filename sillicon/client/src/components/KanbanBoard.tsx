import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ticketsAPI } from '../lib/api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  TicketIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: {
    _id: string;
    name: string;
  };
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  sla?: {
    dueDate: string;
  };
}

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketUpdate?: (ticketId: string, updates: Partial<Ticket>) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tickets, onTicketUpdate }) => {
  const queryClient = useQueryClient();
  const [ticketGroups, setTicketGroups] = useState<{ [key: string]: Ticket[] }>({});

  const statusConfig = {
    open: {
      title: 'Open',
      color: 'bg-yellow-100 border-yellow-200',
      icon: ExclamationTriangleIcon,
      textColor: 'text-yellow-800'
    },
    in_progress: {
      title: 'In Progress',
      color: 'bg-blue-100 border-blue-200',
      icon: ClockIcon,
      textColor: 'text-blue-800'
    },
    resolved: {
      title: 'Resolved',
      color: 'bg-green-100 border-green-200',
      icon: CheckCircleIcon,
      textColor: 'text-green-800'
    },
    closed: {
      title: 'Closed',
      color: 'bg-gray-100 border-gray-200',
      icon: XCircleIcon,
      textColor: 'text-gray-800'
    }
  };

  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  // Group tickets by status
  useEffect(() => {
    const groups = tickets.reduce((acc, ticket) => {
      if (!acc[ticket.status]) {
        acc[ticket.status] = [];
      }
      acc[ticket.status].push(ticket);
      return acc;
    }, {} as { [key: string]: Ticket[] });

    setTicketGroups(groups);
  }, [tickets]);

  const updateTicketMutation = useMutation(
    ({ ticketId, updates }: { ticketId: string; updates: Partial<Ticket> }) =>
      ticketsAPI.updateTicket(ticketId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tickets');
      },
    }
  );

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId;
    const destinationStatus = destination.droppableId;

    // Update ticket status
    if (sourceStatus !== destinationStatus) {
      try {
        await updateTicketMutation.mutateAsync({
          ticketId: draggableId,
          updates: { status: destinationStatus }
        });

        if (onTicketUpdate) {
          onTicketUpdate(draggableId, { status: destinationStatus });
        }
      } catch (error) {
        console.error('Error updating ticket status:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    return priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (ticket: Ticket) => {
    if (!ticket.sla?.dueDate) return false;
    return new Date(ticket.sla.dueDate) < new Date() && ticket.status !== 'resolved' && ticket.status !== 'closed';
  };

  const TicketCard = ({ ticket, index }: { ticket: Ticket; index: number }) => {
    const overdue = isOverdue(ticket);
    
    return (
      <Draggable draggableId={ticket._id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white rounded-lg shadow-sm border p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${
              snapshot.isDragging ? 'shadow-lg' : ''
            } ${overdue ? 'border-red-300 bg-red-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                {ticket.title}
              </h4>
              <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)} ml-2 flex-shrink-0`}></div>
            </div>
            
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {ticket.description}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <span>#{ticket._id.slice(-6)}</span>
                {overdue && (
                  <span className="text-red-600 font-medium">Overdue</span>
                )}
              </div>
              <span>{formatDate(ticket.updatedAt)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">By:</span>
                <span className="text-xs font-medium text-gray-700">
                  {ticket.createdBy.name}
                </span>
              </div>
              {ticket.assignedTo && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">To:</span>
                  <span className="text-xs font-medium text-gray-700">
                    {ticket.assignedTo.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const StatusColumn = ({ status, tickets }: { status: string; tickets: Ticket[] }) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <div className="flex-1 min-w-0">
        <div className={`rounded-lg border-2 border-dashed ${config.color} p-4`}>
          <div className="flex items-center mb-4">
            <Icon className={`h-5 w-5 ${config.textColor} mr-2`} />
            <h3 className={`font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${config.textColor} bg-white`}>
              {tickets.length}
            </span>
          </div>

          <Droppable droppableId={status}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-32 space-y-2 ${
                  snapshot.isDraggingOver ? 'bg-white bg-opacity-50 rounded' : ''
                }`}
              >
                {tickets.map((ticket, index) => (
                  <TicketCard key={ticket._id} ticket={ticket} index={index} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    );
  };

  if (Object.keys(ticketGroups).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tickets to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ticket Board</h2>
        <p className="text-sm text-gray-600">
          Drag and drop tickets between columns to update their status
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Object.entries(statusConfig).map(([status, config]) => (
            <StatusColumn
              key={status}
              status={status}
              tickets={ticketGroups[status] || []}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;

