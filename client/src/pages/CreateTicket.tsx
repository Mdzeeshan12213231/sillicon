import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { ticketsAPI } from '../lib/api';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface CreateTicketFormData {
  title: string;
  description: string;
  category: string;
  priority: string;
  tags: string;
}

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTicketFormData>({
    defaultValues: {
      priority: 'medium',
    },
  });

  const createTicketMutation = useMutation(ticketsAPI.createTicket, {
    onSuccess: (data) => {
      toast.success('Ticket created successfully!');
      navigate(`/tickets/${data.ticket._id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    },
  });

  const categoryOptions = [
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'general', label: 'General Inquiry' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const onSubmit = async (data: CreateTicketFormData) => {
    try {
      setIsSubmitting(true);
      
      const ticketData = {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      };

      await createTicketMutation.mutateAsync(ticketData);
    } catch (error) {
      // Error is handled in the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = watch('category');
  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'technical':
        return 'Issues related to technical problems, bugs, or system functionality';
      case 'billing':
        return 'Questions about billing, payments, invoices, or account charges';
      case 'general':
        return 'General questions, feedback, or non-technical inquiries';
      case 'bug_report':
        return 'Report a bug or unexpected behavior in the system';
      case 'feature_request':
        return 'Suggest a new feature or improvement to the system';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link to="/tickets" className="text-gray-400 hover:text-gray-500">
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <Link to="/tickets" className="text-sm font-medium text-gray-500 hover:text-gray-700">
                    Tickets
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400">/</span>
                  <span className="ml-4 text-sm font-medium text-gray-500">New Ticket</span>
                </div>
              </li>
            </ol>
          </nav>
          <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Create New Ticket
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Submit a new support request and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                {...register('title', {
                  required: 'Title is required',
                  minLength: {
                    value: 5,
                    message: 'Title must be at least 5 characters',
                  },
                  maxLength: {
                    value: 200,
                    message: 'Title must be less than 200 characters',
                  },
                })}
                label="Ticket Title"
                placeholder="Brief description of your issue"
                error={errors.title?.message}
                helperText="Be specific and concise"
              />
            </div>

            <div>
              <Select
                {...register('category', {
                  required: 'Category is required',
                })}
                label="Category"
                options={[
                  { value: '', label: 'Select a category' },
                  ...categoryOptions,
                ]}
                error={errors.category?.message}
              />
              {selectedCategory && (
                <p className="mt-1 text-sm text-gray-500">
                  {getCategoryDescription(selectedCategory)}
                </p>
              )}
            </div>

            <div>
              <Select
                {...register('priority')}
                label="Priority"
                options={priorityOptions}
                error={errors.priority?.message}
                helperText="How urgent is this issue?"
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                {...register('description', {
                  required: 'Description is required',
                  minLength: {
                    value: 10,
                    message: 'Description must be at least 10 characters',
                  },
                  maxLength: {
                    value: 5000,
                    message: 'Description must be less than 5000 characters',
                  },
                })}
                label="Description"
                placeholder="Please provide detailed information about your issue..."
                rows={6}
                error={errors.description?.message}
                helperText="Include steps to reproduce, error messages, and any relevant details"
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                {...register('tags')}
                label="Tags (Optional)"
                placeholder="Enter tags separated by commas (e.g., bug, mobile, login)"
                helperText="Tags help categorize and find your ticket"
              />
            </div>
          </div>

          {/* SLA Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Response Time</h3>
            <div className="text-sm text-blue-700">
              <p>We aim to respond to your ticket within:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li><strong>Urgent:</strong> 2 hours</li>
                <li><strong>High:</strong> 4 hours</li>
                <li><strong>Medium:</strong> 24 hours</li>
                <li><strong>Low:</strong> 48 hours</li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link to="/tickets">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Ticket
            </Button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Before submitting:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check our knowledge base for solutions</li>
              <li>• Include relevant error messages</li>
              <li>• Provide steps to reproduce the issue</li>
              <li>• Attach screenshots if helpful</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• You'll receive a confirmation email</li>
              <li>• Your ticket will be assigned to an agent</li>
              <li>• We'll respond within the SLA timeframe</li>
              <li>• You can track progress in your dashboard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;
