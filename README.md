# NCDEX Scheduler Utility

A Node.js task scheduler utility for NCDEX operations that allows you to run specific tasks manually or schedule them using Windows Task Scheduler.

## 🚀 Features

- **Modular Task System**: Each task is a separate module in the `/tasks` folder
- **Command Line Interface**: Easy execution with `node index.js <taskName>`
- **Error Handling**: Comprehensive error handling and logging
- **ES Modules**: Modern JavaScript with ES module support
- **Development Support**: Nodemon integration for easier development

## 📁 Project Structure

```
ncdex-scheduler-utility/
├── index.js              # Main entry point
├── package.json          # Project configuration
├── README.md            # This file
└── tasks/               # Task modules
    └── SugarCRMAccountToPortalMember.js # SugarCRM to Portal Member sync
```

## 🛠️ Installation

1. **Install Node.js** (version 14 or higher)
2. **Install dependencies**:
   ```bash
   npm install
   ```

## 🎯 Available Tasks

### SugarCRMAccountToPortalMember
Syncs SugarCRM Accounts data to Portal Members with comprehensive field transformation and relationship data processing.

**Features:**
- Fetches SugarCRM Accounts with date-based filtering
- Transforms data using configurable field mappings
- Fetches compliance officer relationship data
- Syncs to Portal Members via bulk API
- Database logging with detailed integration logs
- Configurable sync tracking

### SugarAuditorToPortalAuditor
Syncs SugarCRM Auditors data to Portal Auditors with field transformation and database logging.

**Features:**
- Fetches SugarCRM Auditors with date-based filtering
- Transforms auditor data (sugarcrm_id, name, auditor_user_id_c, email_id_c, registration_no_c)
- Syncs to Portal Auditors via bulk API
- Database logging with detailed integration logs
- Configurable sync tracking

### manageSync
Utility for managing sync records and tracking last sync dates for different modules.

**Features:**
- List all sync records with statistics
- Show detailed sync information
- Reset sync dates for re-processing
- Create new sync records
- Delete sync records

## 🚀 Usage

### Manual Execution

#### Run a specific task:
```bash
node index.js <taskName>
```

#### Examples:
```bash
# Sync SugarCRM Accounts to Portal Members
node index.js SugarCRMAccountToPortalMember

# Sync SugarCRM Auditors to Portal Auditors
node index.js SugarAuditorToPortalAuditor

# Manage sync records
node index.js manageSync

# Show available tasks
node index.js
```

#### Using npm scripts:
```bash
# Using npm start
npm start SugarCRMAccountToPortalMember
npm start SugarAuditorToPortalAuditor
npm start manageSync

# Using nodemon for development
npm run dev SugarCRMAccountToPortalMember
npm run dev SugarAuditorToPortalAuditor
npm run dev manageSync
```

### Development Mode

For development with auto-restart on file changes:
```bash
npm run dev <taskName>
```

## 📅 Windows Task Scheduler Setup

### Method 1: Using Task Scheduler GUI

1. **Open Task Scheduler**:
   - Press `Win + R`, type `taskschd.msc`, and press Enter
   - Or search "Task Scheduler" in the Start menu

2. **Create Basic Task**:
   - Click "Create Basic Task..." in the Actions panel
   - Enter a name (e.g., "NCDEX Fetch Data")
   - Add description (optional)

3. **Set Trigger**:
   - Choose when to run (Daily, Weekly, etc.)
   - Set specific time and frequency

4. **Set Action**:
   - Select "Start a program"
   - **Program/script**: `node`
   - **Add arguments**: `index.js SugarCRMAccountToPortalMember`
   - **Start in**: `D:\Work\Projects\NCDEX\ncdex-scheduler-utility`

5. **Configure Settings**:
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges" (if needed)
   - Configure for your Windows version

6. **Test the Task**:
   - Right-click the task and select "Run"

### Method 2: Using Command Line (schtasks)

#### Create a daily task at 9:00 AM:
```cmd
schtasks /create /tn "NCDEX SugarCRM Sync" /tr "node index.js SugarCRMAccountToPortalMember" /sc daily /st 09:00 /sd 2024/01/01 /f
```

#### Create a weekly cleanup task (every Sunday at 2:00 AM):
```cmd
schtasks /create /tn "NCDEX Clean Temp Files" /tr "node index.js cleanTempFiles" /sc weekly /d SUN /st 02:00 /sd 2024/01/01 /f
```

#### Create a task that runs every 30 minutes:
```cmd
schtasks /create /tn "NCDEX Data Sync" /tr "node index.js SugarCRMAccountToPortalMember" /sc minute /mo 30 /sd 2024/01/01 /f
```

#### List all NCDEX tasks:
```cmd
schtasks /query /tn "NCDEX*"
```

#### Delete a task:
```cmd
schtasks /delete /tn "NCDEX Fetch Data" /f
```

### Method 3: Using PowerShell

#### Create a task with more advanced options:
```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "index.js SugarCRMAccountToPortalMember" -WorkingDirectory "D:\Work\Projects\NCDEX\ncdex-scheduler-utility"
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "NCDEX Fetch Data" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Fetches data from NCDEX APIs"
```

## 🔧 Configuration

### Environment Variables

You can set environment variables for task configuration:

```bash
# Set in your system environment or .env file
NCDEX_API_TIMEOUT=5000
NCDEX_CLEANUP_AGE_DAYS=7
NCDEX_LOG_LEVEL=info
```

### Customizing Tasks

To add a new task:

1. Create a new file in the `/tasks` folder (e.g., `myTask.js`)
2. Export a default function that performs your task:

```javascript
export default async function myTask() {
    console.log('Running my custom task...');
    // Your task logic here
}
```

3. Run it with: `node index.js myTask`

## 📊 Logging and Monitoring

The application provides detailed logging:

- **Start/End Times**: Each task execution is timestamped
- **Duration Tracking**: Shows how long each task took to complete
- **Error Handling**: Comprehensive error messages and stack traces
- **Progress Updates**: Real-time progress for long-running tasks

### Example Output:
```
🔄 Starting task: SugarCRMAccountToPortalMember
⏰ Start time: 2024-01-15T09:00:00.000Z
──────────────────────────────────────────────────
📊 SugarCRM Account to Portal Member Sync
  🔄 Fetching SugarCRM Accounts...
  ✅ Found 25 accounts to process
  🔄 Syncing to Portal Members...
  ✅ Portal sync completed successfully
──────────────────────────────────────────────────
✅ Task 'SugarCRMAccountToPortalMember' completed successfully
⏰ End time: 2024-01-15T09:00:05.123Z
⏱️  Duration: 5123ms
```

## 🐛 Troubleshooting

### Common Issues

1. **Task not found**:
   - Ensure the task file exists in `/tasks/` folder
   - Check the filename matches exactly (case-sensitive)
   - Verify the file exports a default function

2. **Permission errors**:
   - Run Task Scheduler tasks with appropriate privileges
   - Ensure Node.js is in the system PATH
   - Check file permissions for the project directory

3. **Path issues**:
   - Use absolute paths in Task Scheduler
   - Ensure the "Start in" directory is set correctly
   - Verify Node.js installation path

### Debug Mode

Run with debug logging:
```bash
DEBUG=* node index.js SugarCRMAccountToPortalMember
```

## 📝 License

ISC License - see package.json for details.

## 🤝 Contributing

1. Add new tasks to the `/tasks` folder
2. Follow the existing code structure
3. Include proper error handling
4. Update this README with new task documentation

---

**Note**: This utility is designed for NCDEX operations and includes simulated API calls and file operations for demonstration purposes. Modify the task implementations according to your actual requirements.
