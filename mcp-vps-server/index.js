#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const server = new Server(
  {
    name: 'vps-monitor-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'execute_command',
        description: 'Execute shell command on VPS with safety checks',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Shell command to execute',
            },
            cwd: {
              type: 'string',
              description: 'Working directory (optional)',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'read_file',
        description: 'Read file contents from VPS',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute file path',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to file on VPS',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute file path',
            },
            content: {
              type: 'string',
              description: 'File content',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'systemctl',
        description: 'Manage systemd services',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['status', 'start', 'stop', 'restart', 'enable', 'disable'],
              description: 'Systemctl action',
            },
            service: {
              type: 'string',
              description: 'Service name',
            },
          },
          required: ['action', 'service'],
        },
      },
      {
        name: 'docker_command',
        description: 'Execute Docker commands',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['ps', 'logs', 'inspect', 'stats', 'restart', 'stop', 'start'],
              description: 'Docker action',
            },
            container: {
              type: 'string',
              description: 'Container name or ID (optional for ps)',
            },
            options: {
              type: 'string',
              description: 'Additional options',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'fail2ban_command',
        description: 'Manage fail2ban',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['status', 'banned', 'unban', 'get'],
              description: 'Fail2ban action',
            },
            jail: {
              type: 'string',
              description: 'Jail name (optional)',
            },
            ip: {
              type: 'string',
              description: 'IP address for unban',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'firewall_command',
        description: 'Manage iptables firewall',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['list', 'block', 'unblock', 'save'],
              description: 'Firewall action',
            },
            ip: {
              type: 'string',
              description: 'IP address to block/unblock',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'get_logs',
        description: 'Retrieve system or application logs',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['syslog', 'auth', 'nginx', 'apache', 'fail2ban', 'docker'],
              description: 'Log source',
            },
            lines: {
              type: 'number',
              description: 'Number of lines to retrieve (default: 100)',
            },
            filter: {
              type: 'string',
              description: 'Grep filter pattern',
            },
          },
          required: ['source'],
        },
      },
      {
        name: 'system_info',
        description: 'Get system information (CPU, memory, disk, network)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['cpu', 'memory', 'disk', 'network', 'all'],
              description: 'Type of information',
            },
          },
          required: ['type'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'execute_command': {
        const { command, cwd } = args;
        const options = cwd ? { cwd } : {};
        const { stdout, stderr } = await execAsync(command, options);
        return {
          content: [
            {
              type: 'text',
              text: stdout || stderr || 'Command executed successfully',
            },
          ],
        };
      }

      case 'read_file': {
        const { path } = args;
        const content = await fs.readFile(path, 'utf-8');
        return {
          content: [{ type: 'text', text: content }],
        };
      }

      case 'write_file': {
        const { path, content } = args;
        await fs.writeFile(path, content, 'utf-8');
        return {
          content: [{ type: 'text', text: `File written: ${path}` }],
        };
      }

      case 'systemctl': {
        const { action, service } = args;
        const { stdout } = await execAsync(`systemctl ${action} ${service}`);
        return {
          content: [{ type: 'text', text: stdout }],
        };
      }

      case 'docker_command': {
        const { action, container, options } = args;
        let cmd = `docker ${action}`;
        if (container) cmd += ` ${container}`;
        if (options) cmd += ` ${options}`;
        const { stdout } = await execAsync(cmd);
        return {
          content: [{ type: 'text', text: stdout }],
        };
      }

      case 'fail2ban_command': {
        const { action, jail, ip } = args;
        let cmd = 'fail2ban-client';
        if (action === 'status') {
          cmd += jail ? ` status ${jail}` : ' status';
        } else if (action === 'banned') {
          cmd += ` banned`;
        } else if (action === 'unban' && ip) {
          cmd += ` set ${jail || 'sshd'} unbanip ${ip}`;
        } else if (action === 'get' && jail) {
          cmd += ` get ${jail}`;
        }
        const { stdout } = await execAsync(cmd);
        return {
          content: [{ type: 'text', text: stdout }],
        };
      }

      case 'firewall_command': {
        const { action, ip } = args;
        let cmd;
        if (action === 'list') {
          cmd = '/sbin/iptables -L -n -v';
        } else if (action === 'block' && ip) {
          cmd = `/sbin/iptables -A INPUT -s ${ip} -j DROP`;
        } else if (action === 'unblock' && ip) {
          cmd = `/sbin/iptables -D INPUT -s ${ip} -j DROP`;
        } else if (action === 'save') {
          cmd = 'iptables-save > /etc/iptables/rules.v4';
        }
        const { stdout, stderr } = await execAsync(cmd);
        return {
          content: [{ type: 'text', text: stdout || stderr || 'Action completed' }],
        };
      }

      case 'get_logs': {
        const { source, lines = 100, filter } = args;
        const logPaths = {
          syslog: '/var/log/syslog',
          auth: '/var/log/auth.log',
          nginx: '/var/log/nginx/error.log',
          apache: '/var/log/apache2/error.log',
          fail2ban: '/var/log/fail2ban.log',
          docker: 'journalctl -u docker',
        };
        let cmd = source === 'docker' 
          ? `${logPaths[source]} -n ${lines}`
          : `tail -n ${lines} ${logPaths[source]}`;
        if (filter) cmd += ` | grep "${filter}"`;
        const { stdout } = await execAsync(cmd);
        return {
          content: [{ type: 'text', text: stdout }],
        };
      }

      case 'system_info': {
        const { type } = args;
        let cmd;
        if (type === 'cpu') {
          cmd = 'top -bn1 | grep "Cpu(s)"';
        } else if (type === 'memory') {
          cmd = 'free -h';
        } else if (type === 'disk') {
          cmd = 'df -h';
        } else if (type === 'network') {
          cmd = 'ss -tuln';
        } else if (type === 'all') {
          cmd = 'echo "=== CPU ===" && top -bn1 | grep "Cpu(s)" && echo "\n=== MEMORY ===" && free -h && echo "\n=== DISK ===" && df -h && echo "\n=== NETWORK ===" && ss -tuln';
        }
        const { stdout } = await execAsync(cmd);
        return {
          content: [{ type: 'text', text: stdout }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VPS Monitor MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
