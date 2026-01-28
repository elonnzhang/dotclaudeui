import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../utils/api';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';

function AgentDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const isNew = id === 'new';
  const isEditMode = searchParams.get('mode') === 'edit';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(isNew || isEditMode);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tools: [],
    model: 'inherit',
    color: 'blue',
    content: ''
  });

  useEffect(() => {
    if (!isNew) {
      fetchAgent();
    }
  }, [id]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`/api/agents-manager/${id}`);

      if (response.ok) {
        const data = await response.json();
        const agent = data.agent;
        setFormData({
          name: agent.metadata.name || '',
          description: agent.metadata.description || '',
          tools: Array.isArray(agent.metadata.tools)
            ? agent.metadata.tools
            : (typeof agent.metadata.tools === 'string'
              ? agent.metadata.tools.split(',').map(t => t.trim())
              : []),
          model: agent.metadata.model || 'inherit',
          color: agent.metadata.color || 'blue',
          content: agent.content || ''
        });
      } else {
        throw new Error('Failed to fetch agent');
      }
    } catch (err) {
      console.error('Error fetching agent:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert(t('agent.nameRequired', 'Agent name is required'));
      return;
    }

    if (!formData.content.trim()) {
      alert(t('agent.contentRequired', 'Agent content is required'));
      return;
    }

    try {
      setSaving(true);
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/agents-manager' : `/api/agents-manager/${id}`;

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (isNew) {
          navigate(`/agent/${data.agent.id}`);
        } else {
          setIsEditing(false);
          fetchAgent(); // Reload data
        }
      } else {
        throw new Error('Failed to save agent');
      }
    } catch (err) {
      console.error('Error saving agent:', err);
      alert(t('agent.saveError', 'Failed to save agent'));
    } finally {
      setSaving(false);
    }
  };

  const handleToolsChange = (value) => {
    const toolsArray = value.split(',').map(t => t.trim()).filter(t => t);
    setFormData({ ...formData, tools: toolsArray });
  };

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
          <button
            onClick={() => navigate('/agents')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('buttons.back', 'Back to Agents')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/agents')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNew ? t('agent.createNew', 'New Agent') : formData.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditing ? t('agent.editMode', 'Edit mode') : t('agent.viewMode', 'View mode')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                {t('buttons.edit', 'Edit')}
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? t('status.saving', 'Saving...') : t('buttons.save', 'Save')}
                </button>
                {!isNew && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchAgent();
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                    {t('buttons.cancel', 'Cancel')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('agent.basicInfo', 'Basic Information')}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('agent.name', 'Name')} *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., code-reviewer"
                  />
                ) : (
                  <p className="text-foreground">{formData.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('agent.description', 'Description')}
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of what this agent does..."
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.description || t('agent.noDescription', 'No description')}</p>
                )}
              </div>

              {/* Model & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('agent.model', 'Model')}
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="inherit">inherit</option>
                      <option value="sonnet">sonnet</option>
                      <option value="opus">opus</option>
                      <option value="haiku">haiku</option>
                    </select>
                  ) : (
                    <p className="text-foreground">{formData.model}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('agent.color', 'Color')}
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="red">red</option>
                      <option value="blue">blue</option>
                      <option value="green">green</option>
                      <option value="yellow">yellow</option>
                      <option value="purple">purple</option>
                      <option value="pink">pink</option>
                      <option value="gray">gray</option>
                    </select>
                  ) : (
                    <p className="text-foreground">{formData.color}</p>
                  )}
                </div>
              </div>

              {/* Tools */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('agent.tools', 'Tools')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.tools.join(', ')}
                    onChange={(e) => handleToolsChange(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Glob, Grep, Read, Write (comma separated)"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.tools.length > 0 ? (
                      formData.tools.map((tool, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                        >
                          {tool}
                        </span>
                      ))
                    ) : (
                      <p className="text-muted-foreground">{t('agent.noTools', 'No tools specified')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Content */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('agent.promptContent', 'Prompt Content')} *
            </h2>
            {isEditing ? (
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={20}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the agent's system prompt here..."
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-foreground font-mono bg-secondary p-4 rounded-lg overflow-x-auto">
                {formData.content || t('agent.noContent', 'No content')}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentDetailPage;
