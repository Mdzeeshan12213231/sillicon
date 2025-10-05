import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from 'react-query';
import { chatAPI } from '../lib/api';
import {
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  confidence?: number;
  suggestedActions?: string[];
  escalate?: boolean;
}

interface SupportBotProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId?: string;
}

const SupportBot: React.FC<SupportBotProps> = ({ isOpen, onClose, ticketId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const botMutation = useMutation(chatAPI.sendBotMessage, {
    onSuccess: (response) => {
      setIsTyping(false);
      const botMessage: Message = {
        role: 'bot',
        content: response.response.content,
        timestamp: new Date(),
        confidence: response.response.confidence,
        suggestedActions: response.response.suggestedActions,
        escalate: response.response.escalate
      };
      setMessages(prev => [...prev, botMessage]);
    },
    onError: () => {
      setIsTyping(false);
      const errorMessage: Message = {
        role: 'bot',
        content: "I'm sorry, I'm having trouble processing your request. Please try again or contact our support team.",
        timestamp: new Date(),
        confidence: 0.1,
        suggestedActions: ['Contact support'],
        escalate: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Send welcome message
      const welcomeMessage: Message = {
        role: 'bot',
        content: "Hello! I'm your AI support assistant. How can I help you today?",
        timestamp: new Date(),
        confidence: 1.0,
        suggestedActions: ['Ask a question', 'Report an issue', 'Check ticket status']
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || botMutation.isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      await botMutation.mutateAsync({
        message: inputMessage,
        ticketId
      });
    } catch (error) {
      console.error('Error sending message to bot:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedAction = (action: string) => {
    setInputMessage(action);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Support</h2>
                <p className="text-xs text-gray-500">Powered by AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'bot' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <SparklesIcon className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <UserIcon className="h-3 w-3 text-blue-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-75">
                          {formatTime(message.timestamp)}
                        </span>
                        {message.role === 'bot' && message.confidence !== undefined && (
                          <span className={`text-xs ${getConfidenceColor(message.confidence)}`}>
                            {Math.round(message.confidence * 100)}% confident
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <SparklesIcon className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Actions */}
          {messages.length > 0 && messages[messages.length - 1].suggestedActions && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
              <div className="flex flex-wrap gap-2">
                {messages[messages.length - 1].suggestedActions?.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedAction(action)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={botMutation.isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || botMutation.isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {botMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportBot;

