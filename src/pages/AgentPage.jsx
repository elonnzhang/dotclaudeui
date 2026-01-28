import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../utils/api';
import { Plus, Search, Edit, Trash2, Eye, FileText } from 'lucide-react';

function AgentPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // 颜色映射
  const colorClasses = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch('/api/agents-manager');

      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      } else {
        throw new Error('Failed to fetch agents');
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!confirm(t('agents.deleteConfirm', 'Are you sure you want to delete this agent?'))) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/agents-manager/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAgents(agents.filter(a => a.id !== id));
      } else {
        throw new Error('Failed to delete agent');
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
      alert(t('agents.deleteError', 'Failed to delete agent'));
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('status.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-lg font-semibold mb-2">{t('status.error')}</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t('agents.title', 'Agents')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('agents.subtitle', 'Manage your custom AI agents')}
              </p>
            </div>
            <button
              onClick={() => navigate('/agent/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('agents.createNew', 'New Agent')}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('agents.searchPlaceholder', 'Search agents...')}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('agents.noAgents', 'No agents found')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? t('agents.noSearchResults', 'Try adjusting your search')
                : t('agents.createFirstAgent', 'Create your first agent to get started')}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/agent/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('agents.createNew', 'New Agent')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="border border-border rounded-lg p-4 bg-card hover:shadow-lg transition-shadow"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {agent.name}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClasses[agent.color] || colorClasses.blue}`}>
                      {agent.model || 'inherit'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {agent.description || t('agents.noDescription', 'No description')}
                </p>

                {/* Tools */}
                {agent.tools && (Array.isArray(agent.tools) ? agent.tools.length : agent.tools.split(',').length) > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t('agent.tools', 'Tools')}:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(agent.tools) ? agent.tools : agent.tools.split(',').map(t => t.trim())).slice(0, 3).map((tool, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                      {(Array.isArray(agent.tools) ? agent.tools.length : agent.tools.split(',').length) > 3 && (
                        <span className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
                          +{(Array.isArray(agent.tools) ? agent.tools.length : agent.tools.split(',').length) - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => navigate(`/agent/${agent.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {t('buttons.view', 'View')}
                  </button>
                  <button
                    onClick={() => navigate(`/agent/${agent.id}?mode=edit`)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentPage;
