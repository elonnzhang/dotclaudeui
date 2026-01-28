import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';

const router = express.Router();

// Skill 配置目录
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins', 'marketplaces');

/**
 * 确保目录存在
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
  }
}

/**
 * 解析 SKILL.md 文件内容
 */
function parseSkillFile(content) {
  try {
    const parsed = matter(content);
    return {
      metadata: parsed.data,
      content: parsed.content.trim(),
    };
  } catch (error) {
    console.error('Error parsing skill file:', error);
    return null;
  }
}

/**
 * 递归遍历目录查找 SKILL.md 文件
 * @param {string} dir - 要搜索的目录
 * @param {string} basePath - 基础路径（用于计算相对路径）
 * @returns {Array} - 找到的 skill 文件信息数组
 */
async function findSkillFiles(dir, basePath = dir) {
  const skills = [];

  try {
    await fs.access(dir);
  } catch {
    return skills; // 目录不存在，返回空数组
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 递归搜索子目录
        const subSkills = await findSkillFiles(fullPath, basePath);
        skills.push(...subSkills);
      } else if (entry.name === 'SKILL.md') {
        // 找到 SKILL.md 文件
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const parsed = parseSkillFile(content);

          if (parsed) {
            const stats = await fs.stat(fullPath);
            const relativePath = path.relative(basePath, path.dirname(fullPath));
            const pathParts = relativePath ? relativePath.split(path.sep) : [];

            skills.push({
              id: path.relative(CLAUDE_DIR, fullPath).replace(/\\/g, '/').replace('/SKILL.md', ''),
              name: parsed.metadata.name || pathParts[pathParts.length - 1] || 'Unnamed Skill',
              description: parsed.metadata.description || '',
              path: relativePath,
              pathParts: pathParts,
              fullPath: fullPath,
              category: parsed.metadata.category || 'general',
              tags: parsed.metadata.tags || [],
              author: parsed.metadata.author || '',
              version: parsed.metadata.version || '',
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
            });
          }
        } catch (error) {
          console.error(`Error reading skill file ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return skills;
}

/**
 * 构建树形结构
 * @param {Array} skills - 扁平的 skills 数组
 * @returns {Object} - 树形结构
 */
function buildSkillTree(skills) {
  const tree = {
    skills: [], // .claude/skills 下的技能
    plugins: {}, // .claude/plugins/marketplace 下的技能，按 repo 分组
  };

  for (const skill of skills) {
    if (skill.id.startsWith('skills/')) {
      // 直接在 .claude/skills 目录下
      tree.skills.push(skill);
    } else if (skill.id.startsWith('plugins/marketplaces/')) {
      // 在 marketplaces 下，按 repo 分组
      const parts = skill.pathParts;
      if (parts.length >= 3) {
        const repo = parts[2]; // marketplaces/{repo}
        if (!tree.plugins[repo]) {
          tree.plugins[repo] = [];
        }
        tree.plugins[repo].push(skill);
      }
    }
  }

  return tree;
}

/**
 * GET /api/skills-manager
 * 获取所有 skills 列表（树形结构）
 */
router.get('/', async (req, res) => {
  try {
    await ensureDir(SKILLS_DIR);
    await ensureDir(PLUGINS_DIR);

    console.log('[Skills] Searching for SKILL.md files...');

    // 搜索 .claude/skills 目录
    const skillsFromSkillsDir = await findSkillFiles(SKILLS_DIR, SKILLS_DIR);
    console.log(`[Skills] Found ${skillsFromSkillsDir.length} skills in .claude/skills`);

    // 搜索 .claude/plugins/marketplaces 目录
    const skillsFromPlugins = await findSkillFiles(PLUGINS_DIR, CLAUDE_DIR);
    console.log(`[Skills] Found ${skillsFromPlugins.length} skills in .claude/plugins/marketplaces`);

    // 合并所有 skills
    const allSkills = [...skillsFromSkillsDir, ...skillsFromPlugins];

    // 构建树形结构
    const tree = buildSkillTree(allSkills);

    res.json({
      success: true,
      skills: allSkills,
      tree: tree,
      total: allSkills.length,
    });
  } catch (error) {
    console.error('[Skills] Error listing skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list skills',
    });
  }
});

/**
 * GET /api/skills-manager/:id/files/:filename
 * 获取 skill 目录下的资源文件内容
 */
router.get('/:id(*)/files/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params;
    const skillDir = path.join(CLAUDE_DIR, id);
    const filePath = path.join(skillDir, filename);

    console.log(`[Skills] Getting file: ${filePath}`);

    // Security check: ensure the file is within the skill directory
    const resolvedFilePath = path.resolve(filePath);
    const resolvedSkillDir = path.resolve(skillDir);
    if (!resolvedFilePath.startsWith(resolvedSkillDir)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    const stats = await fs.stat(filePath);

    // If it's a directory, return directory listing
    if (stats.isDirectory()) {
      const entries = await fs.readdir(filePath, { withFileTypes: true });
      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(filePath, entry.name);
          const itemStats = await fs.stat(fullPath);
          return {
            name: entry.name,
            size: itemStats.size,
            isDirectory: entry.isDirectory(),
            modifiedAt: itemStats.mtime,
          };
        })
      );

      // Sort: directories first, then files, both alphabetically
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      return res.json({
        success: true,
        isDirectory: true,
        items,
      });
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf8');

    res.json({
      success: true,
      isDirectory: false,
      file: {
        name: filename,
        content,
        size: stats.size,
        modifiedAt: stats.mtime,
      },
    });
  } catch (error) {
    console.error('[Skills] Error getting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file',
    });
  }
});

/**
 * GET /api/skills-manager/:id
 * 获取单个 skill 的详细信息
 * id 格式: skills/skill-name 或 plugins/marketplace/repo/skill-name
 */
router.get('/:id(*)', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(CLAUDE_DIR, id, 'SKILL.md');

    console.log(`[Skills] Getting skill: ${id}`);
    console.log(`[Skills] File path: ${filePath}`);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Skill not found',
      });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseSkillFile(content);

    if (!parsed) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse skill file',
      });
    }

    const stats = await fs.stat(filePath);

    // Read directory contents to list other resource files
    const skillDir = path.dirname(filePath);
    const dirEntries = await fs.readdir(skillDir, { withFileTypes: true });

    const resourceFiles = await Promise.all(
      dirEntries
        .filter(entry => entry.name !== 'SKILL.md')
        .map(async (entry) => {
          const fullPath = path.join(skillDir, entry.name);
          const fileStats = await fs.stat(fullPath);
          return {
            name: entry.name,
            size: fileStats.size,
            isDirectory: entry.isDirectory(),
            path: `${id}/${entry.name}`,
            modifiedAt: fileStats.mtime,
          };
        })
    );

    // Sort: directories first, then files, both alphabetically
    resourceFiles.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    res.json({
      success: true,
      skill: {
        id,
        metadata: parsed.metadata,
        content: parsed.content,
        rawContent: content,
        fullPath: filePath,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        resourceFiles,
      },
    });
  } catch (error) {
    console.error('[Skills] Error getting skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get skill',
    });
  }
});

export default router;
