import express from 'express';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

const router = express.Router();

/**
 * Check if a PID is running
 */
async function checkPIDRunning(pid) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;

    if (platform === 'darwin' || platform === 'linux') {
      command = `ps -p ${pid} -o pid=`;
    } else if (platform === 'win32') {
      command = `tasklist /FI "PID eq ${pid}" /FO CSV /NH`;
    } else {
      resolve(false);
      return;
    }

    exec(command, (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        const output = stdout.trim();
        resolve(output.length > 0);
      }
    });
  });
}

/**
 * GET /api/system/ide-connections
 * Get all IDE connections from ~/.claude/ide/*.lock files
 */
router.get('/ide-connections', async (_req, res) => {
  try {
    const connections = [];
    const homeDir = os.homedir();
    const ideDir = path.join(homeDir, '.claude', 'ide');

    // Check if directory exists
    try {
      await fs.access(ideDir);
    } catch (error) {
      return res.json({
        success: true,
        connections: []
      });
    }

    // Read all files
    const files = await fs.readdir(ideDir);
    const lockFiles = files.filter(file => file.endsWith('.lock') && !file.endsWith('.lock.removed'));

    // Process each lock file
    for (const lockFile of lockFiles) {
      const lockFilePath = path.join(ideDir, lockFile);

      try {
        const content = await fs.readFile(lockFilePath, 'utf8');
        const data = JSON.parse(content);

        const { pid, ideName, workspaceFolders, transport } = data;

        // Check if process is running
        const isRunning = await checkPIDRunning(pid);

        connections.push({
          id: lockFile.replace('.lock', ''),
          name: ideName || 'Unknown IDE',
          status: isRunning ? 'active' : 'inactive',
          pid: pid,
          lockFile: lockFile,
          workspaceFolders: workspaceFolders || [],
          transport: transport || 'unknown',
          lastModified: (await fs.stat(lockFilePath)).mtime
        });
      } catch (error) {
        console.error(`Error parsing lock file ${lockFile}:`, error);
      }
    }

    res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Error fetching IDE connections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/system/cleanup
 * Soft delete a specific IDE connection by PID
 * Body: { pid: number }
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { pid } = req.body;

    if (!pid) {
      return res.status(400).json({
        success: false,
        error: 'PID is required'
      });
    }

    const homeDir = os.homedir();
    const ideDir = path.join(homeDir, '.claude', 'ide');

    // Check if directory exists
    try {
      await fs.access(ideDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'IDE directory not found'
      });
    }

    // Find the lock file with matching PID
    const files = await fs.readdir(ideDir);
    const lockFiles = files.filter(file => file.endsWith('.lock'));

    for (const lockFile of lockFiles) {
      const lockFilePath = path.join(ideDir, lockFile);

      try {
        const content = await fs.readFile(lockFilePath, 'utf8');
        const data = JSON.parse(content);

        if (data.pid === parseInt(pid, 10)) {
          // Soft delete: rename to .lock.removed
          const removedPath = `${lockFilePath}.removed`;
          await fs.rename(lockFilePath, removedPath);

          return res.json({
            success: true,
            removed: {
              originalFile: lockFile,
              removedFile: `${lockFile}.removed`,
              pid: data.pid,
              ideName: data.ideName
            },
            message: `Successfully removed IDE connection for PID ${pid}`
          });
        }
      } catch (error) {
        console.error(`Error processing lock file ${lockFile}:`, error);
      }
    }

    // Not found
    res.status(404).json({
      success: false,
      error: `No IDE connection found for PID ${pid}`
    });
  } catch (error) {
    console.error('Error cleaning up IDE connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
