/**
 * TypeScript script to deploy Edge Functions to Supabase
 * Run with: npx ts-node deploy-edge-functions.ts
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Configuration
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'your-project-ref';
const FUNCTIONS = [
  'get-family-tree',
  'update-family-relationships',
  'create-family-member',
  'delete-family-member'
];

/**
 * Execute a shell command and log output
 */
async function executeCommand(command: string, cwd?: string): Promise<void> {
  try {
    console.log(`Executing: ${command}`);
    const { stdout, stderr } = await execPromise(command, { cwd });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

/**
 * Deploy an Edge Function
 */
async function deployFunction(functionName: string): Promise<void> {
  console.log(`Deploying ${functionName}...`);
  await executeCommand(
    `supabase functions deploy ${functionName} --project-ref ${PROJECT_REF}`,
    '../supabase'
  );
  console.log(`✅ Successfully deployed ${functionName}`);
}

/**
 * Main deployment process
 */
async function deploy(): Promise<void> {
  console.log(`Deploying Edge Functions to Supabase project: ${PROJECT_REF}`);
  console.log('====================================================');

  // Check if Supabase CLI is installed
  try {
    await executeCommand('supabase --version');
  } catch (error) {
    console.error('Supabase CLI is not installed. Please install it first:');
    console.error('npm install -g supabase');
    process.exit(1);
  }

  // Check if logged in
  try {
    await executeCommand('supabase projects list');
  } catch (error) {
    console.error('Not logged in to Supabase. Please run "supabase login" first.');
    process.exit(1);
  }

  // Deploy shared resources
  console.log('Copying shared resources...');
  await executeCommand(
    `supabase functions deploy --project-ref ${PROJECT_REF} --no-verify-jwt`,
    '../supabase'
  );

  // Deploy each function
  for (const functionName of FUNCTIONS) {
    await deployFunction(functionName);
  }

  console.log('====================================================');
  console.log('All Edge Functions deployed successfully!');
  console.log('You can test them with:');
  console.log('supabase functions serve --no-verify-jwt');
}

// Run the deployment process
deploy().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});