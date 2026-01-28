import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';

const router = express.Router();

// Agent 配置目录
const AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents');

/**
 * 确保 agents 目录存在
 */
async function ensureAgentsDir() {
  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating agents directory:', error);
    throw error;
  }
}

/**
 * 解析 agent 文件内容
 * @param {string} content - Agent 文件内容
 * @returns {Object} - 解析后的 frontmatter 和 content
 */
function parseAgentFile(content) {
  try {
    const parsed = matter(content);
    return {
      metadata: parsed.data,
      content: parsed.content.trim()
    };
  } catch (error) {
    console.error('Error parsing agent file:', error);
    return null;
  }
}

/**
 * 将 metadata 和 content 序列化为 agent 文件格式
 */
function serializeAgentFile(metadata, content) {
  const frontmatter = Object.entries(metadata)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(', ')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  return `---\n${frontmatter}\n---\n\n${content}`;
}

/**
 * GET /api/agents-manager
 * 获取所有 agents 列表
 */
router.get('/', async (req, res) => {
  try {
    await ensureAgentsDir();

    const files = await fs.readdir(AGENTS_DIR);
    const agentFiles = files.filter(f => f.endsWith('.md'));

    const agents = await Promise.all(
      agentFiles.map(async (filename) => {
        try {
          const filePath = path.join(AGENTS_DIR, filename);
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = parseAgentFile(content);

          if (!parsed) {
            return null;
          }

          const stats = await fs.stat(filePath);

          return {
            id: filename.replace('.md', ''),
            filename,
            name: parsed.metadata.name || filename.replace('.md', ''),
            description: parsed.metadata.description || '',
            tools: parsed.metadata.tools || [],
            model: parsed.metadata.model || 'inherit',
            color: parsed.metadata.color || 'blue',
            createdAt: stats.birthtime,
            updatedAt: stats.mtime
          };
        } catch (error) {
          console.error(`Error reading agent file ${filename}:`, error);
          return null;
        }
      })
    );

    // 过滤掉解析失败的
    const validAgents = agents.filter(a => a !== null);

    res.json({
      success: true,
      agents: validAgents
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list agents'
    });
  }
});

/**
 * GET /api/agents-manager/:id
 * 获取单个 agent 的详细信息
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.md`;
    const filePath = path.join(AGENTS_DIR, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseAgentFile(content);

    if (!parsed) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse agent file'
      });
    }

    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      agent: {
        id,
        filename,
        metadata: parsed.metadata,
        content: parsed.content,
        rawContent: content,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      }
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent'
    });
  }
});

/**
 * POST /api/agents-manager
 * 创建新的 agent
 */
router.post('/', async (req, res) => {
  try {
    await ensureAgentsDir();

    const { name, description, tools, model, color, content } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Agent name is required'
      });
    }

    // 生成文件名（将 name 转换为 kebab-case）
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const filename = `${id}.md`;
    const filePath = path.join(AGENTS_DIR, filename);

    // 检查是否已存在
    try {
      await fs.access(filePath);
      return res.status(409).json({
        success: false,
        error: 'Agent already exists'
      });
    } catch {
      // 文件不存在，可以继续创建
    }

    // 构建 metadata
    const metadata = {
      name,
      description: description || '',
      tools: tools || [],
      model: model || 'inherit',
      color: color || 'blue'
    };

    // 序列化并写入文件
    const fileContent = serializeAgentFile(metadata, content || '');
    await fs.writeFile(filePath, fileContent, 'utf8');

    res.json({
      success: true,
      agent: {
        id,
        filename,
        name,
        description,
        tools,
        model,
        color
      }
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent'
    });
  }
});

/**
 * PUT /api/agents-manager/:id
 * 更新 agent
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tools, model, color, content } = req.body;

    const filename = `${id}.md`;
    const filePath = path.join(AGENTS_DIR, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // 构建 metadata
    const metadata = {
      name: name || id,
      description: description || '',
      tools: tools || [],
      model: model || 'inherit',
      color: color || 'blue'
    };

    // 序列化并写入文件
    const fileContent = serializeAgentFile(metadata, content || '');
    await fs.writeFile(filePath, fileContent, 'utf8');

    res.json({
      success: true,
      agent: {
        id,
        filename,
        name,
        description,
        tools,
        model,
        color
      }
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
});

/**
 * DELETE /api/agents-manager/:id
 * 删除 agent
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.md`;
    const filePath = path.join(AGENTS_DIR, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent'
    });
  }
});

export default router;
