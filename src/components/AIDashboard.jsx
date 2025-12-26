// src/components/AIDashboard.jsx
// AI-Enhanced Dashboard with Claude-powered training insights
// FIXED: Better JSON parsing and formatting

import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, TrendingUp, Activity, AlertCircle, Send, Loader } from 'lucide-react';

const AIDashboard = ({ trainingData, activities, fitnessMetrics, upcomingEvents }) => {
  const [insights, setInsights] = useState([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

  useEffect(() => {
    if (trainingData && fitnessMetrics) {
      generateAIInsights();
    }
  }, [trainingData, fitnessMetrics]);

  const generateAIInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const prompt = buildInsightsPrompt();
      const response = await callClaudeAPI(prompt);
      const parsedInsights = parseInsightsResponse(response);
      setInsights(parsedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
      setError(error.message || 'Failed to generate insights');
      setInsights([{
        type: 'error',
        title: 'Unable to generate insights',
        description: error.message || 'Check your backend server and API key',
        priority: 'low'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const buildInsightsPrompt = () => {
    const recentActivities = activities?.slice(0, 7) || [];
    const weeklyTSS = recentActivities.reduce((sum, a) => sum + (a.suffer_score || 0), 0);

    return `You are an expert triathlon coach. Provide 3-5 actionable insights as a JSON array.

CURRENT FITNESS:
- CTL: ${fitnessMetrics.ctl || 'N/A'}
- ATL: ${fitnessMetrics.atl || 'N/A'}  
- TSB: ${fitnessMetrics.tsb || 'N/A'}

RECENT TRAINING:
- Last 7 days TSS: ${weeklyTSS}
- Workouts: ${recentActivities.length}

UPCOMING EVENTS:
${upcomingEvents?.map(e => `- ${e.name} on ${new Date(e.date).toLocaleDateString()}`).join('\n') || 'None'}

Return ONLY a valid JSON array in this exact format (no markdown, no explanation):

[
  {
    "type": "fitness",
    "title": "Brief title",
    "description": "One sentence explanation",
    "action": "Specific action to take",
    "priority": "high"
  }
]

Types: fitness, recovery, nutrition, training
Priority: high, medium, low`;
  };

  const handleAskQuestion = async () => {
    if (!userQuestion.trim()) return;

    const newMessage = {
      role: 'user',
      content: userQuestion,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, newMessage]);
    setUserQuestion('');
    setLoading(true);
    setError(null);

    try {
      const prompt = buildChatPrompt(userQuestion, chatHistory);
      const response = await callClaudeAPI(prompt);

      const aiMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      setError(error.message || 'Failed to get response');
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check the backend server and try again.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const buildChatPrompt = (question, history) => {
    return `You are a triathlon coach. Keep responses concise and actionable.

ATHLETE FITNESS:
- CTL: ${fitnessMetrics.ctl || 'N/A'}
- ATL: ${fitnessMetrics.atl || 'N/A'}
- TSB: ${fitnessMetrics.tsb || 'N/A'}

RECENT WORKOUTS:
${activities?.slice(0, 3).map(a => 
  `- ${a.name}: ${a.type}, ${Math.round(a.moving_time / 60)}min, TSS: ${a.suffer_score || 'N/A'}`
).join('\n') || 'No recent activities'}

${history.length > 0 ? 'CONVERSATION:\n' + history.map(m => 
  `${m.role === 'user' ? 'Athlete' : 'Coach'}: ${m.content}`
).join('\n') : ''}

QUESTION: ${question}

Provide a helpful answer based on Nick Chase principles. Keep it under 100 words.`;
  };

  const callClaudeAPI = async (prompt) => {
    try {
      const response = await fetch(`${API_URL}/api/anthropic/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Backend API error:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Backend server not running. Start it with: node server/server.js');
      }
      throw error;
    }
  };

  const parseInsightsResponse = (response) => {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      cleaned = cleaned.replace(/```json\n?/g, '');
      cleaned = cleaned.replace(/```\n?/g, '');
      cleaned = cleaned.trim();

      console.log('Parsing response:', cleaned);

      // Try to parse as JSON
      const parsed = JSON.parse(cleaned);
      
      // If it's an object with insights array, extract it
      if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed.insights;
      }
      
      // If it's already an array, return it
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // If single object, wrap in array
      if (typeof parsed === 'object') {
        return [parsed];
      }

      // Fallback
      throw new Error('Unexpected response format');

    } catch (e) {
      console.error('Failed to parse insights:', e);
      console.log('Raw response:', response);
      
      // If parsing fails, create a single insight with the text
      return [{
        type: 'general',
        title: 'AI Insights',
        description: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
        action: 'Review your training data for more personalized insights',
        priority: 'medium'
      }];
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'fitness': return <TrendingUp className="w-5 h-5" />;
      case 'recovery': return <Activity className="w-5 h-5" />;
      case 'nutrition': return <Brain className="w-5 h-5" />;
      case 'training': return <MessageSquare className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-400 bg-red-50';
      case 'medium': return 'border-yellow-400 bg-yellow-50';
      case 'low': return 'border-blue-400 bg-blue-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          AI Training Coach
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ask Questions
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Analyzing your training data...</span>
            </div>
          ) : insights.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                AI-powered insights based on your recent training and Nick Chase principles
              </p>
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`border-l-4 rounded-lg p-4 ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-gray-700 mt-1">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-gray-700 mb-2">
                        {insight.description}
                      </p>
                      {insight.action && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="text-purple-600">Action: </span>
                            {insight.action}
                          </p>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {insight.priority}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={generateAIInsights}
                className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Refresh Insights
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No insights available yet</p>
              <button
                onClick={generateAIInsights}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Generate Insights
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Ask me anything about your training!</p>
                <div className="mt-4 space-y-2 text-sm text-gray-500">
                  <p>Example questions:</p>
                  <p>• "Should I take a rest day?"</p>
                  <p>• "How's my training load looking?"</p>
                  <p>• "What should I eat before tomorrow's long ride?"</p>
                </div>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="Ask about your training..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <button
              onClick={handleAskQuestion}
              disabled={loading || !userQuestion.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <p className="text-sm font-semibold text-purple-900 mb-2">
          Powered by Nick Chase Training Principles
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-purple-700">
          <div>🥤 Liquid nutrition</div>
          <div>📊 Data-driven</div>
          <div>💪 Protein timing</div>
          <div>🧠 Mental prep</div>
          <div>📈 Gradual adaptation</div>
        </div>
      </div>
    </div>
  );
};

export default AIDashboard;