import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { ticketsAPI } from '../lib/api';
import { BookOpenIcon, ArrowTopRightOnSquareIcon as ExternalLinkIcon, HandThumbUpIcon as ThumbUpIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

interface Suggestion {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  relevanceScore: number;
  views: number;
  helpful: number;
  url: string;
}

interface KnowledgeBaseSuggestionsProps {
  ticketId: string;
  onClose?: () => void;
}

const KnowledgeBaseSuggestions: React.FC<KnowledgeBaseSuggestionsProps> = ({ 
  ticketId, 
  onClose 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: suggestionsData, isLoading } = useQuery(
    ['ticket-suggestions', ticketId],
    () => ticketsAPI.getSuggestions(ticketId),
    {
      enabled: !!ticketId,
    }
  );

  const suggestions = suggestionsData?.suggestions || [];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-blue-100 text-blue-800';
      case 'billing':
        return 'bg-green-100 text-green-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      case 'faq':
        return 'bg-purple-100 text-purple-800';
      case 'troubleshooting':
        return 'bg-red-100 text-red-800';
      case 'how-to':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-blue-700">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BookOpenIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium text-blue-900">
            Knowledge Base Suggestions
          </h3>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            {suggestions.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-400 hover:text-blue-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.slice(0, isExpanded ? suggestions.length : 2).map((suggestion: Suggestion) => (
          <div
            key={suggestion.id}
            className="bg-white rounded-lg border border-blue-100 p-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.title}
                  </h4>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor(suggestion.category)}`}>
                    {suggestion.category}
                  </span>
                </div>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {suggestion.excerpt}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <EyeIcon className="h-3 w-3" />
                    <span>{suggestion.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ThumbUpIcon className="h-3 w-3" />
                    <span>{suggestion.helpful}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`font-medium ${getRelevanceColor(suggestion.relevanceScore)}`}>
                      {Math.round(suggestion.relevanceScore * 10)}% match
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="ml-2 flex-shrink-0">
                <a
                  href={suggestion.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-500 text-xs"
                >
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 2 && !isExpanded && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View {suggestions.length - 2} more suggestions
          </button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseSuggestions;
