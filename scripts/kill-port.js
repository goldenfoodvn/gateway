import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PORT = process.env.PORT || 3000;

async function killPort() {
  try {
    console.log(`🔍 Checking for processes on port ${PORT}...`);
    
    if (process.platform === 'win32') {
      await execAsync(
        `powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`
      );
      console.log('✅ Port freed!');
    } else {
      await execAsync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`);
      console.log('✅ Port freed!');
    }
  } catch (error) {
    console.log('ℹ️  Port is already free');
  }
}

killPort();