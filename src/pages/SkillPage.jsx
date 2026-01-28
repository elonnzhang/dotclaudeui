import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Code, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Tag, User, Package, File, X } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SkillPage = () => {
  const { t } = useTranslation('common');
  const [skillsData, setSkillsData] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillDetail, setSkillDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedRepos, setExpandedRepos] = useState({});
  const [error, setError] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState({});
  const [dirContents, setDirContents] = useState({});

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[SkillPage] Fetching skills...');
      const response = await authenticatedFetch('/api/skills-manager');

      if (response.ok) {
        const data = await response.json();
        console.log('[SkillPage] Received data:', data);
        setSkillsData(data);

        // 默认展开所有 repos
        if (data.tree?.plugins) {
          const expanded = {};
          Object.keys(data.tree.plugins).forEach((repo) => {
            expanded[repo] = true;
          });
          setExpandedRepos(expanded);
        }
      } else {
        throw new Error('Failed to fetch skills');
      }
    } catch (err) {
      console.error('[SkillPage] Error fetching skills:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkillDetail = async (skillId) => {
    try {
      setLoadingDetail(true);
      console.log('[SkillPage] Fetching skill detail:', skillId);
      const response = await authenticatedFetch(`/api/skills-manager/${skillId}`);

      if (response.ok) {
        const data = await response.json();
        console.log('[SkillPage] Received skill detail:', data);
        setSkillDetail(data.skill);
      } else {
        throw new Error('Failed to fetch skill detail');
      }
    } catch (err) {
      console.error('[SkillPage] Error fetching skill detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSkillClick = (skill) => {
    setSelectedSkill(skill);
    fetchSkillDetail(skill.id);
  };

  const toggleRepo = (repo) => {
    setExpandedRepos((prev) => ({
      ...prev,
      [repo]: !prev[repo],
    }));
  };

  const handleFileClick = async (skillId, fileName, isDirectory = false) => {
    if (isDirectory) {
      // Toggle directory expansion
      const dirKey = `${skillId}/${fileName}`;
      if (expandedDirs[dirKey]) {
        // Collapse directory
        setExpandedDirs((prev) => ({
          ...prev,
          [dirKey]: false,
        }));
      } else {
        // Expand directory - fetch contents if not already loaded
        if (!dirContents[dirKey]) {
          try {
            console.log('[SkillPage] Fetching directory:', skillId, fileName);
            const response = await authenticatedFetch(`/api/skills-manager/${skillId}/files/${fileName}`);
            if (response.ok) {
              const data = await response.json();
              console.log('[SkillPage] Received directory data:', data);
              if (data.isDirectory) {
                // Sort: directories first, then files, both alphabetically
                const sortedItems = (data.items || []).sort((a, b) => {
                  if (a.isDirectory && !b.isDirectory) return -1;
                  if (!a.isDirectory && b.isDirectory) return 1;
                  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                });
                setDirContents((prev) => ({
                  ...prev,
                  [dirKey]: sortedItems,
                }));
              }
            }
          } catch (err) {
            console.error('[SkillPage] Error fetching directory:', err);
          }
        }
        setExpandedDirs((prev) => ({
          ...prev,
          [dirKey]: true,
        }));
      }
    } else {
      // Open file in modal viewer
      try {
        setLoadingFile(true);
        setViewingFile(fileName);
        console.log('[SkillPage] Fetching file:', skillId, fileName);
        const response = await authenticatedFetch(`/api/skills-manager/${skillId}/files/${fileName}`);

        if (response.ok) {
          const data = await response.json();
          console.log('[SkillPage] Received file data:', data);
          setFileContent(data);
        } else {
          throw new Error('Failed to fetch file');
        }
      } catch (err) {
        console.error('[SkillPage] Error fetching file:', err);
        setFileContent(null);
      } finally {
        setLoadingFile(false);
      }
    }
  };

  const closeFileViewer = () => {
    setViewingFile(null);
    setFileContent(null);
  };

  // Render file tree recursively
  const renderFileTree = (files, skillId, level = 0) => {
    return files.map((file, idx) => {
      const dirKey = `${skillId}/${file.name}`;
      const isExpanded = expandedDirs[dirKey];
      const contents = dirContents[dirKey];

      return (
        <div key={idx}>
          <div
            onClick={() => handleFileClick(skillId, file.name, file.isDirectory)}
            className='flex items-center gap-2 p-2 rounded text-foreground hover:bg-accent/50 cursor-pointer'
            style={{ paddingLeft: `${8 + level * 12}px` }}
          >
            {file.isDirectory && (
              isExpanded ? (
                <ChevronDown className='w-3 h-3 flex-shrink-0 text-muted-foreground' />
              ) : (
                <ChevronRight className='w-3 h-3 flex-shrink-0 text-muted-foreground' />
              )
            )}
            {file.isDirectory ? (
              isExpanded ? (
                <FolderOpen className='w-4 h-4 flex-shrink-0 text-blue-500' />
              ) : (
                <Folder className='w-4 h-4 flex-shrink-0 text-blue-500' />
              )
            ) : (
              <File className='w-4 h-4 flex-shrink-0 text-gray-500' />
            )}
            <div className='flex-1 min-w-0'>
              <div className='text-xs truncate'>{file.name}</div>
              {!file.isDirectory && (
                <div className='text-xs text-muted-foreground'>
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              )}
            </div>
          </div>
          {file.isDirectory && isExpanded && contents && (
            <div>
              {contents.length > 0 ? (
                renderFileTree(contents, `${skillId}/${file.name}`, level + 1)
              ) : (
                <div
                  className='text-xs text-muted-foreground italic p-2'
                  style={{ paddingLeft: `${20 + (level + 1) * 12}px` }}
                >
                  Empty directory
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-muted-foreground'>{t('status.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center text-red-600 dark:text-red-400'>
          <p className='text-lg font-semibold mb-2'>{t('status.error')}</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const tree = skillsData?.tree || { skills: [], plugins: {} };
  const totalSkills = skillsData?.total || 0;

  return (
    <div className='h-full flex flex-col bg-background'>
      {/* Header */}
      {/* <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t('skill.title', 'Skills')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('skill.subtitle', 'Browse and manage your skills')} • {totalSkills} {t('skill.totalSkills', 'skills')}
              </p>
            </div>
          </div>
        </div>
      </div> */}

      <div className='flex-1 flex min-h-0'>
        {/* Left Sidebar - Tree View */}
        <div className='w-80 border-r border-border overflow-y-auto'>
          <div className='p-4 space-y-2'>
            {/* Local Skills */}
            {tree.skills && tree.skills.length > 0 && (
              <div className='mb-4'>
                <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2'>
                  <Folder className='w-4 h-4' />
                  <span>Local Skills</span>
                  <span className='ml-auto bg-secondary px-2 py-0.5 rounded-full'>{tree.skills.length}</span>
                </div>
                {tree.skills.map((skill) => (
                  <div
                    key={skill.id}
                    onClick={() => handleSkillClick(skill)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedSkill?.id === skill.id ? 'bg-accent text-foreground' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className='flex items-start gap-2'>
                      <Code className='w-4 h-4 flex-shrink-0 mt-0.5' />
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium text-sm truncate'>{skill.name}</div>
                        {skill.description && <div className='text-xs text-muted-foreground line-clamp-2 mt-1'>{skill.description}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Plugin Skills */}
            {tree.plugins && Object.keys(tree.plugins).length > 0 && (
              <div>
                <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2'>
                  <Package className='w-4 h-4' />
                  <span>Plugin Skills</span>
                </div>
                {Object.entries(tree.plugins).map(([repo, skills]) => (
                  <div key={repo} className='mb-2'>
                    {/* Repo Header */}
                    <div
                      onClick={() => toggleRepo(repo)}
                      className='flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/30 transition-colors'
                    >
                      {expandedRepos[repo] ? (
                        <ChevronDown className='w-4 h-4 text-muted-foreground' />
                      ) : (
                        <ChevronRight className='w-4 h-4 text-muted-foreground' />
                      )}
                      {expandedRepos[repo] ? <FolderOpen className='w-4 h-4 text-blue-500' /> : <Folder className='w-4 h-4 text-blue-500' />}
                      <span className='text-sm font-medium text-foreground flex-1'>{repo}</span>
                      <span className='text-xs bg-secondary px-2 py-0.5 rounded-full'>{skills.length}</span>
                    </div>

                    {/* Repo Skills */}
                    {expandedRepos[repo] && (
                      <div className='ml-6 mt-1 space-y-1'>
                        {skills.map((skill) => (
                          <div
                            key={skill.id}
                            onClick={() => handleSkillClick(skill)}
                            className={`p-2 rounded-md cursor-pointer transition-colors ${
                              selectedSkill?.id === skill.id ? 'bg-accent text-foreground' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className='flex items-start gap-2'>
                              <Code className='w-4 h-4 flex-shrink-0 mt-0.5' />
                              <div className='flex-1 min-w-0'>
                                <div className='font-medium text-sm truncate'>{skill.name}</div>
                                {skill.description && <div className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>{skill.description}</div>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalSkills === 0 && (
              <div className='text-center py-12'>
                <Code className='w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50' />
                <p className='text-muted-foreground'>{t('skill.noSkills', 'No skills found')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className='flex-1 flex min-h-0'>
          {selectedSkill ? (
            <>
              {/* Skill Content */}
              <div className='flex-1 overflow-y-auto p-6'>
                {loadingDetail ? (
                  <div className='flex items-center justify-center h-full'>
                    <div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                  </div>
                ) : skillDetail ? (
                  <div className='max-w-4xl mx-auto'>
                    {/* Skill Header with Name and Description */}
                    <div className='mb-6 pb-6 border-b border-border'>
                      <div className='flex items-center gap-3 mb-3'>
                        <FileText className='w-8 h-8 text-blue-500' />
                        <h1 className='text-3xl font-bold text-foreground'>{skillDetail.metadata.name || selectedSkill.name}</h1>
                      </div>
                      {skillDetail.metadata.description && (
                        <p className='text-lg text-muted-foreground ml-11'>{skillDetail.metadata.description}</p>
                      )}
                    </div>

                    {/* Markdown Content with Table Support */}
                    <div className='prose prose-sm dark:prose-invert max-w-none prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-border prose-th:bg-accent/50 prose-th:p-2 prose-th:text-left prose-td:border prose-td:border-border prose-td:p-2'>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{skillDetail.content}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right Sidebar - Metadata */}
              <div className='w-80 border-l border-border overflow-y-auto bg-accent/5 p-6'>
                <h3 className='text-lg font-semibold text-foreground mb-4'>{t('skill.metadata', 'Metadata')}</h3>
                <div className='space-y-3'>
                  {skillDetail?.metadata.category && (
                    <div className='p-3 bg-card border border-border rounded-md'>
                      <div className='text-xs font-medium text-muted-foreground mb-1'>Category</div>
                      <div className='text-sm text-foreground'>{skillDetail.metadata.category}</div>
                    </div>
                  )}

                  {skillDetail?.metadata.tags && skillDetail.metadata.tags.length > 0 && (
                    <div className='p-3 bg-card border border-border rounded-md'>
                      <div className='text-xs font-medium text-muted-foreground mb-2'>Tags</div>
                      <div className='flex flex-wrap gap-1'>
                        {skillDetail.metadata.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className='inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs'
                          >
                            <Tag className='w-3 h-3' />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {skillDetail?.metadata.author && (
                    <div className='p-3 bg-card border border-border rounded-md'>
                      <div className='text-xs font-medium text-muted-foreground mb-1'>Author</div>
                      <div className='flex items-center gap-2 text-sm text-foreground'>
                        <User className='w-4 h-4' />
                        {skillDetail.metadata.author}
                      </div>
                    </div>
                  )}

                  {skillDetail?.metadata.version && (
                    <div className='p-3 bg-card border border-border rounded-md'>
                      <div className='text-xs font-medium text-muted-foreground mb-1'>Version</div>
                      <div className='text-sm text-foreground font-mono'>{skillDetail.metadata.version}</div>
                    </div>
                  )}

                  <div className='p-3 bg-card border border-border rounded-md'>
                    <div className='text-xs font-medium text-muted-foreground mb-1'>Path</div>
                    <div className='text-xs text-muted-foreground font-mono break-all'>{selectedSkill.path || selectedSkill.id}</div>
                  </div>

                  {skillDetail?.updatedAt && (
                    <div className='p-3 bg-card border border-border rounded-md'>
                      <div className='text-xs font-medium text-muted-foreground mb-1'>Last Updated</div>
                      <div className='text-xs text-muted-foreground'>{new Date(skillDetail.updatedAt).toLocaleString()}</div>
                    </div>
                  )}

                  {/* Resource Files Section */}
                  {skillDetail?.resourceFiles && skillDetail.resourceFiles.length > 0 && (
                    <div className='p-3 bg-card border border-border rounded-md'>
                      <div className='text-xs font-medium text-muted-foreground mb-2'>
                        {t('skill.resourceFiles', 'Resource Files')} ({skillDetail.resourceFiles.length})
                      </div>
                      <div className='space-y-1'>
                        {renderFileTree(skillDetail.resourceFiles, selectedSkill.id)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className='flex-1 flex items-center justify-center text-muted-foreground'>
              <div className='text-center'>
                <Code className='w-16 h-16 mx-auto mb-4 opacity-30' />
                <p>{t('skill.selectSkill', 'Select a skill to view details')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50' onClick={closeFileViewer}>
          <div className='bg-card border border-border rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between p-4 border-b border-border'>
              <div className='flex items-center gap-2'>
                <FileText className='w-5 h-5 text-blue-500' />
                <h3 className='text-lg font-semibold text-foreground'>{viewingFile}</h3>
              </div>
              <button onClick={closeFileViewer} className='p-1 hover:bg-accent rounded'>
                <X className='w-5 h-5 text-muted-foreground' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-6'>
              {loadingFile ? (
                <div className='flex items-center justify-center h-full'>
                  <div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                </div>
              ) : fileContent ? (
                fileContent.isDirectory ? (
                  <div className='text-center text-muted-foreground'>
                    <p>{t('skill.directoryNotViewable', 'Directory content is shown in the tree view')}</p>
                  </div>
                ) : (
                  // File content
                  <pre className='text-sm text-foreground bg-accent/20 p-4 rounded overflow-x-auto'>
                    <code>{fileContent.file.content}</code>
                  </pre>
                )
              ) : (
                <div className='text-center text-muted-foreground'>
                  <p>{t('skill.failedToLoadFile', 'Failed to load file')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillPage;
