'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClipboardIcon, CheckIcon } from 'lucide-react';

export default function CorsTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST'>('GET');
  const [inputMessage, setInputMessage] = useState('');
  const [inputEcho, setInputEcho] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [includeCredentials, setIncludeCredentials] = useState(true);
  const [corsStatus, setCorsStatus] = useState<'unknown' | 'success' | 'failed'>('unknown');
  const logsRef = useRef<HTMLDivElement>(null);
  
  // On component mount, auto-detect the Supabase URL for convenience
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const functionUrl = `${supabaseUrl}/functions/v1/cors-test`;
      setCustomUrl(functionUrl);
      addLog(`Detected Supabase URL: ${functionUrl}`);
    } else {
      addLog('Warning: NEXT_PUBLIC_SUPABASE_URL environment variable not found.');
    }
  }, []);

  // Helper to add log messages
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    
    // Auto-scroll to bottom of logs
    setTimeout(() => {
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
    }, 10);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setCorsStatus('unknown');
  };

  // Copy logs to clipboard
  const copyLogs = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    });
  };

  // Get status indicator classes
  const getStatusIndicatorClasses = () => {
    switch (corsStatus) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Function to test CORS
  const testCors = async () => {
    setIsLoading(true);
    setCorsStatus('unknown');
    addLog(`Starting CORS test with ${requestMethod} request...`);

    try {
      // Determine URL to use
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const url = useCustomUrl && customUrl ? customUrl : `${baseUrl}/functions/v1/cors-test`;
      let response;

      addLog(`Using endpoint: ${url}`);
      addLog(`Include credentials: ${includeCredentials ? 'Yes' : 'No'}`);

      const fetchOptions: RequestInit = {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: includeCredentials ? 'include' : 'omit'
      };

      if (requestMethod === 'GET') {
        // Add query parameters for GET request
        const params = new URLSearchParams();
        if (inputMessage) params.append('message', inputMessage);
        if (inputEcho) params.append('echo', inputEcho);
        
        const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
        addLog(`Sending GET request to: ${fullUrl}`);
        
        response = await fetch(fullUrl, fetchOptions);
      } else {
        // POST request with JSON body
        const payload: Record<string, string> = {};
        if (inputMessage) payload.message = inputMessage;
        if (inputEcho) payload.echo = inputEcho;
        
        addLog(`Sending POST request to: ${url}`);
        addLog(`Payload: ${JSON.stringify(payload)}`);
        
        fetchOptions.body = JSON.stringify(payload);
        response = await fetch(url, fetchOptions);
      }

      addLog(`Response status: ${response.status}`);
      
      // Log response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      addLog(`Response headers: ${JSON.stringify(headers, null, 2)}`);
      
      // Handle response
      const responseData = await response.json();
      addLog(`Response data: ${JSON.stringify(responseData, null, 2)}`);
      
      if (response.ok) {
        addLog('CORS test completed successfully! ✅');
        setCorsStatus('success');
      } else {
        addLog(`CORS test failed with status ${response.status}! ❌`);
        setCorsStatus('failed');
      }
    } catch (error: unknown) {
      addLog(`Error during CORS test: ${error instanceof Error ? error.message : String(error)} ❌`);
      console.error('CORS test error:', error);
      setCorsStatus('failed');
      
      // Special handling for CORS errors
      if (error instanceof TypeError && error.message.includes('CORS')) {
        addLog(`CORS ERROR DETECTED: This is likely due to one of the following:`);
        addLog(`1. The server's CORS headers are not configured correctly`);
        addLog(`2. The server is not responding on the expected URL`);
        addLog(`3. The 'credentials' mode is enabled but 'Access-Control-Allow-Origin' is not set correctly`);
        addLog(`Try disabling 'Include credentials' option if you're seeing this error`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">CORS Test Page</h1>
      
      <div className={`px-4 py-2 mb-6 border rounded-md ${getStatusIndicatorClasses()}`}>
        {corsStatus === 'unknown' && (
          <span>Run the test to check CORS functionality.</span>
        )}
        {corsStatus === 'success' && (
          <span>✅ CORS Test Successful! The server is correctly configured.</span>
        )}
        {corsStatus === 'failed' && (
          <span>❌ CORS Test Failed! See logs for details.</span>
        )}
      </div>
      
      <p className="text-gray-600 mb-8">
        This page tests CORS functionality with the Supabase Edge Function.
        No authentication is required.
      </p>

      <div className="space-y-6">
        {/* Options Panel */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test Options</h2>
          
          <div className="space-y-4">
            {/* URL Options */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useCustomUrl"
                  className="mr-2"
                  checked={useCustomUrl}
                  onChange={(e) => setUseCustomUrl(e.target.checked)}
                />
                <label htmlFor="useCustomUrl" className="text-sm font-medium text-gray-700">
                  Use Custom URL
                </label>
              </div>
              
              {useCustomUrl && (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/functions/v1/cors-test"
                />
              )}
            </div>
          
            {/* Credentials Option */}
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="includeCredentials"
                className="mr-2"
                checked={includeCredentials}
                onChange={(e) => setIncludeCredentials(e.target.checked)}
              />
              <label htmlFor="includeCredentials" className="text-sm font-medium text-gray-700">
                Include Credentials (Cookies)
              </label>
            </div>
          
            {/* Request Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Method
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="requestMethod"
                    checked={requestMethod === 'GET'}
                    onChange={() => setRequestMethod('GET')}
                  />
                  <span className="ml-2">GET</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="requestMethod"
                    checked={requestMethod === 'POST'}
                    onChange={() => setRequestMethod('POST')}
                  />
                  <span className="ml-2">POST</span>
                </label>
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <input
                  type="text"
                  id="message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Optional message to send"
                />
              </div>
              <div>
                <label htmlFor="echo" className="block text-sm font-medium text-gray-700 mb-1">
                  Echo Text
                </label>
                <input
                  type="text"
                  id="echo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={inputEcho}
                  onChange={(e) => setInputEcho(e.target.value)}
                  placeholder="Text to echo back"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="flex justify-center">
          <button
            className={`px-6 py-3 rounded-md shadow-sm text-white font-medium 
              ${isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            onClick={testCors}
            disabled={isLoading}
          >
            {isLoading ? 'Testing...' : 'Test CORS Function'}
          </button>
        </div>

        {/* Logs Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Test Logs</h2>
            <div className="flex space-x-2">
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Clear
              </button>
              <button
                onClick={copyLogs}
                className="px-3 py-1 text-sm rounded inline-flex items-center 
                  bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {hasCopied ? (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardIcon className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div 
            ref={logsRef}
            className="bg-gray-900 text-gray-100 rounded-md p-4 h-[400px] overflow-y-auto font-mono text-sm"
          >
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">
                Logs will appear here after running the test...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 