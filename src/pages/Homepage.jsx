import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Activity, Database, RefreshCw, Circle, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const Homepage = () => {
  const { t } = useTranslation('common');
  const { user, isLoading: authLoading } = useAuth();
  const [ideConnections, setIdeConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingPid, setDeletingPid] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Only fetch when auth is complete
    if (!authLoading && user) {
      fetchIdeConnections();
      fetchStats();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchIdeConnections, 30000);
      return () => clearInterval(interval);
    }
  }, [authLoading, user]);

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/stats');
      if (response.ok) {
        const result = await response.json();
        if (result.success) setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchIdeConnections = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!ideConnections.length) {
        setLoading(true);
      }

      console.log('[Homepage] Fetching IDE connections...');
      const response = await authenticatedFetch('/api/system/ide-connections');

      console.log('[Homepage] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Homepage] Received data:', data);

      if (data.success) {
        setIdeConnections(data.connections || []);
        console.log('[Homepage] Updated connections:', data.connections?.length || 0);
      } else {
        console.error('[Homepage] API returned success=false:', data);
      }
    } catch (error) {
      console.error('[Homepage] Error fetching IDE connections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchIdeConnections(true);
  };

  const handleRemoveIde = async (pid) => {
    if (!confirm(t('homepage.confirmRemove', 'Are you sure you want to remove this IDE connection?'))) {
      return;
    }

    try {
      setDeletingPid(pid);

      const response = await authenticatedFetch('/api/system/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pid }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the list
        await fetchIdeConnections();
      } else {
        alert(t('homepage.removeFailed', 'Failed to remove IDE connection: ') + data.error);
      }
    } catch (error) {
      console.error('Error removing IDE connection:', error);
      alert(t('homepage.removeFailed', 'Failed to remove IDE connection: ') + error.message);
    } finally {
      setDeletingPid(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
        return 'text-yellow-500';
      case 'not_found':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return t('homepage.statusActive', 'Active');
      case 'inactive':
        return t('homepage.statusInactive', 'Inactive');
      case 'not_found':
        return t('homepage.statusNotFound', 'Not Found');
      default:
        return t('homepage.statusUnknown', 'Unknown');
    }
  };

  return (
    <div className='flex-1 overflow-auto p-6'>
      <div className='max-w-6xl mx-auto space-y-6'>
        {/* Header */}
        {/* <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-foreground'>{t('homepage.title', 'Homepage')}</h1>
            <p className='text-muted-foreground mt-1'>{t('homepage.subtitle', 'User configuration, statistics, and usage')}</p>
          </div>
        </div> */}

        {/* Statistics Section */}
        <div className='bg-card border border-border rounded-lg p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Activity className='w-5 h-5 text-muted-foreground' />
            <h2 className='text-xl font-semibold text-foreground'>{t('homepage.statistics', 'Statistics')}</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='p-4 bg-accent/50 rounded-md'>
              <div className='text-2xl font-bold text-foreground'>{stats?.totalSessions || 0}</div>
              <div className='text-sm text-muted-foreground'>{t('homepage.totalSessions', 'Total Sessions')}</div>
            </div>
            <div className='p-4 bg-accent/50 rounded-md'>
              <div className='text-2xl font-bold text-foreground'>{stats?.totalProjects || 0}</div>
              <div className='text-sm text-muted-foreground'>{t('homepage.totalProjects', 'Total Projects')}</div>
            </div>
            <div className='p-4 bg-accent/50 rounded-md'>
              <div className='text-2xl font-bold text-foreground'>{stats?.totalAgents || 0}</div>
              <div className='text-sm text-muted-foreground'>{t('homepage.totalAgents', 'Total Agents')}</div>
            </div>
            <div className='p-4 bg-accent/50 rounded-md'>
              <div className='text-2xl font-bold text-foreground'>{stats?.totalSkills || 0}</div>
              <div className='text-sm text-muted-foreground'>{t('homepage.totalSkills', 'Total Skills')}</div>
            </div>
          </div>
        </div>

        {/* Usage Section */}
        <div className='bg-card border border-border rounded-lg p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Database className='w-5 h-5 text-muted-foreground' />
            <h2 className='text-xl font-semibold text-foreground'>{t('homepage.usage', 'Usage')}</h2>
          </div>
          {stats ? (
            <div className='space-y-6'>
              {/* Overview Cards */}
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                  <div className='text-sm text-blue-600 dark:text-blue-400 mb-1'>{t('homepage.totalSessions', 'Total Sessions')}</div>
                  <div className='text-3xl font-bold text-blue-700 dark:text-blue-300'>{stats.totalSessions?.toLocaleString() || 0}</div>
                </div>
                <div className='p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                  <div className='text-sm text-green-600 dark:text-green-400 mb-1'>{t('homepage.totalMessages', 'Total Messages')}</div>
                  <div className='text-3xl font-bold text-green-700 dark:text-green-300'>{stats.totalMessages?.toLocaleString() || 0}</div>
                </div>
                <div className='p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg'>
                  <div className='text-sm text-purple-600 dark:text-purple-400 mb-1'>{t('homepage.totalTokens', 'Total Tokens')}</div>
                  <div className='text-3xl font-bold text-purple-700 dark:text-purple-300'>
                    {Object.values(stats.modelUsage || {}).reduce((sum, m) => sum + (m.inputTokens || 0) + (m.outputTokens || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className='p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg'>
                  <div className='text-sm text-orange-600 dark:text-orange-400 mb-1'>{t('homepage.longestSession', 'Longest Session')}</div>
                  <div className='text-2xl font-bold text-orange-700 dark:text-orange-300'>
                    {stats.longestSession ? `${Math.floor(stats.longestSession.duration / 1000 / 60)} min` : '-'}
                  </div>
                  <div className='text-xs text-orange-600 dark:text-orange-500 mt-1'>
                    {stats.longestSession ? `${stats.longestSession.messageCount} msgs` : ''}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className='p-4 bg-accent/10 rounded-lg'>
                <div className='flex items-center justify-between text-sm'>
                  <div>
                    <span className='text-muted-foreground'>{t('homepage.firstSession', 'First Session')}:</span>
                    <span className='ml-2 font-semibold text-foreground'>
                      {stats.firstSessionDate ? new Date(stats.firstSessionDate).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>{t('homepage.lastComputed', 'Last Updated')}:</span>
                    <span className='ml-2 font-semibold text-foreground'>
                      {stats.lastComputedDate || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className='text-sm font-semibold text-foreground mb-3'>{t('homepage.recentActivity', 'Recent Activity (Last 7 Days)')}</h3>
                <div className='space-y-2'>
                  {stats.dailyActivity?.slice(-7).reverse().map((day, idx) => (
                    <div key={idx} className='flex items-center gap-3 p-3 bg-accent/20 rounded-lg hover:bg-accent/30 transition-colors'>
                      <div className='min-w-[85px] text-sm font-medium text-muted-foreground whitespace-nowrap'>{day.date}</div>
                      <div className='flex-1 flex flex-wrap gap-x-4 gap-y-1 text-xs'>
                        <div className='flex items-center gap-1 whitespace-nowrap'>
                          <span className='text-muted-foreground'>Sessions:</span>
                          <span className='font-semibold text-blue-600 dark:text-blue-400'>{day.sessionCount}</span>
                        </div>
                        <div className='flex items-center gap-1 whitespace-nowrap'>
                          <span className='text-muted-foreground'>Messages:</span>
                          <span className='font-semibold text-green-600 dark:text-green-400'>{day.messageCount}</span>
                        </div>
                        <div className='flex items-center gap-1 whitespace-nowrap'>
                          <span className='text-muted-foreground'>Tools:</span>
                          <span className='font-semibold text-orange-600 dark:text-orange-400'>{day.toolCallCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Usage */}
              <div>
                <h3 className='text-sm font-semibold text-foreground mb-3'>{t('homepage.modelUsage', 'Model Usage')}</h3>
                <div className='space-y-2'>
                  {Object.entries(stats.modelUsage || {}).map(([model, usage]) => (
                    <div key={model} className='p-3 bg-accent/20 rounded-lg'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='font-medium text-sm text-foreground'>{model}</span>
                        <span className='text-xs text-muted-foreground'>
                          {((usage.inputTokens || 0) + (usage.outputTokens || 0)).toLocaleString()} tokens
                        </span>
                      </div>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-2 text-xs'>
                        <div>
                          <span className='text-muted-foreground'>Input:</span>
                          <span className='ml-1 font-mono text-foreground'>{(usage.inputTokens || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className='text-muted-foreground'>Output:</span>
                          <span className='ml-1 font-mono text-foreground'>{(usage.outputTokens || 0).toLocaleString()}</span>
                        </div>
                        {usage.cacheReadInputTokens > 0 && (
                          <div>
                            <span className='text-muted-foreground'>Cache Read:</span>
                            <span className='ml-1 font-mono text-green-600 dark:text-green-400'>{usage.cacheReadInputTokens.toLocaleString()}</span>
                          </div>
                        )}
                        {usage.cacheCreationInputTokens > 0 && (
                          <div>
                            <span className='text-muted-foreground'>Cache Write:</span>
                            <span className='ml-1 font-mono text-blue-600 dark:text-blue-400'>{usage.cacheCreationInputTokens.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className='text-sm text-muted-foreground'>{t('homepage.loadingStats', 'Loading statistics...')}</div>
          )}
        </div>

        {/* Configuration Section */}
        <div className='bg-card border border-border rounded-lg p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <Settings className='w-5 h-5 text-muted-foreground' />
              <h2 className='text-xl font-semibold text-foreground'>{t('homepage.configuration', 'Configuration')}</h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className='p-2 hover:bg-accent rounded-md transition-colors disabled:opacity-50'
              title={t('homepage.refresh', 'Refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className='space-y-4'>
            {/* IDE Connections */}
            <div>
              <h3 className='text-sm font-medium text-foreground mb-2'>{t('homepage.ideConnections', 'IDE Connections')}</h3>
              {loading ? (
                <div className='text-sm text-muted-foreground'>{t('homepage.loading', 'Loading...')}</div>
              ) : ideConnections.length === 0 ? (
                <div className='text-sm text-muted-foreground'>{t('homepage.noConnections', 'No IDE connections found')}</div>
              ) : (
                <div className='space-y-3'>
                  {ideConnections.map((ide) => (
                    <div key={ide.id} className='p-4 bg-accent/50 rounded-md border border-border'>
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          {/* Name and Status */}
                          <div className='flex items-center gap-3 mb-2'>
                            <Circle className={`w-3 h-3 fill-current ${getStatusColor(ide.status)}`} />
                            <div className='text-sm font-medium text-foreground'>{ide.name}</div>
                            <div
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                ide.status === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : ide.status === 'inactive'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {getStatusText(ide.status)}
                            </div>
                          </div>

                          {/* PID and Lock File */}
                          <div className='flex items-center gap-4 mb-2'>
                            <div className='flex items-center gap-2 text-xs'>
                              <span className='text-muted-foreground'>PID:</span>
                              <span className='font-mono font-semibold text-foreground'>{ide.pid}</span>
                            </div>
                            {ide.lockFile && (
                              <>
                                <span className='text-muted-foreground text-xs'>•</span>
                                <div className='flex items-center gap-2 text-xs'>
                                  <span className='text-muted-foreground'>{t('homepage.lockFile', 'Lock File')}:</span>
                                  <span className='font-mono text-muted-foreground'>{ide.lockFile}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Workspace Folders */}
                          {ide.workspaceFolders && ide.workspaceFolders.length > 0 && (
                            <div className='mb-2'>
                              <div className='text-xs font-medium text-foreground mb-1'>{t('homepage.workspaceFolders', 'Workspace Folders')}:</div>
                              <div className='space-y-1'>
                                {ide.workspaceFolders.map((folder, index) => (
                                  <div key={index} className='text-xs font-mono text-muted-foreground pl-2'>
                                    📁 {folder}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Process Details */}
                          {ide.processDetails && (
                            <div className='mt-3 pt-3 border-t border-border/50'>
                              <div className='text-xs font-medium text-foreground mb-2'>{t('homepage.processDetails', 'Process Details')}:</div>
                              <div className='grid grid-cols-2 gap-2 text-xs'>
                                {ide.processDetails.processName && (
                                  <div>
                                    <span className='text-muted-foreground'>{t('homepage.processName', 'Process')}:</span>
                                    <span className='ml-1 font-mono text-foreground'>{ide.processDetails.processName}</span>
                                  </div>
                                )}
                                {ide.processDetails.cpuUsage !== undefined && (
                                  <div>
                                    <span className='text-muted-foreground'>CPU:</span>
                                    <span className='ml-1 font-mono text-foreground'>{ide.processDetails.cpuUsage.toFixed(1)}%</span>
                                  </div>
                                )}
                                {ide.processDetails.memoryUsage !== undefined && (
                                  <div>
                                    <span className='text-muted-foreground'>{t('homepage.memory', 'Memory')}:</span>
                                    <span className='ml-1 font-mono text-foreground'>{ide.processDetails.memoryUsage.toFixed(1)}%</span>
                                  </div>
                                )}
                                {ide.processDetails.uptime && (
                                  <div>
                                    <span className='text-muted-foreground'>{t('homepage.uptime', 'Uptime')}:</span>
                                    <span className='ml-1 font-mono text-foreground'>{ide.processDetails.uptime}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Transport and Other Info */}
                          {(ide.transport || ide.lastModified) && (
                            <div className='mt-2 flex items-center gap-4 text-xs text-muted-foreground'>
                              {ide.transport && (
                                <div>
                                  {t('homepage.transport', 'Transport')}: {ide.transport}
                                </div>
                              )}
                              {ide.lastModified && (
                                <div>
                                  {t('homepage.lastModified', 'Last Modified')}: {new Date(ide.lastModified).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error Info */}
                          {ide.error && <div className='mt-2 text-xs text-red-500'>{ide.error}</div>}
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveIde(ide.pid)}
                          disabled={deletingPid === ide.pid}
                          className='ml-4 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50'
                          title={t('homepage.remove', 'Remove')}
                        >
                          {deletingPid === ide.pid ? <RefreshCw className='w-4 h-4 animate-spin' /> : <Trash2 className='w-4 h-4' />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
