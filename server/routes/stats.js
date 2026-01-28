import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();
const STATS_FILE = path.join(os.homedir(), '.claude', 'stats-cache.json');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DB = path.join(process.cwd(), 'server', 'database', 'auth.db');

router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(STATS_FILE, 'utf8');
    const stats = JSON.parse(data);

    // Count projects
    const projectsDir = path.join(CLAUDE_DIR, 'projects');
    let totalProjects = 0;

    try {
      const entries = await fs.readdir(projectsDir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const projectPath = path.join(projectsDir, entry);
        const stat = await fs.stat(projectPath);
        if (stat.isDirectory()) {
          totalProjects++;
        }
      }
    } catch (e) {}

    // Count agents
    const agentsDir = path.join(CLAUDE_DIR, 'agents');
    let totalAgents = 0;
    try {
      const agents = await fs.readdir(agentsDir);
      totalAgents = agents.filter(f => f.endsWith('.md')).length;
    } catch (e) {}

    // Count skills
    const skillsDir = path.join(CLAUDE_DIR, 'skills');
    const pluginsDir = path.join(CLAUDE_DIR, 'plugins', 'marketplaces');
    let totalSkills = 0;

    const findSkills = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await findSkills(fullPath);
          } else if (entry.name === 'SKILL.md') {
            totalSkills++;
          }
        }
      } catch (e) {}
    };

    await findSkills(skillsDir);
    await findSkills(pluginsDir);

    res.json({
      success: true,
      data: {
        ...stats,
        totalProjects,
        totalAgents,
        totalSkills
      }
    });
  } catch (error) {
    console.error('[Stats] Error reading stats:', error);
    res.json({ success: false, error: error.message });
  }
});

export default router;
