import { useEffect, useState } from "react";
import { toast } from "./use-toast";

interface WebSocketMessage {
  type: 'log' | 'status' | 'progress' | 'result' | 'error';
  message?: string;
  progress?: number;
  data?: any;
  level?: 'info' | 'warning' | 'error' | 'success';
  timestamp?: string;
}

export interface LogEntry {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export const useAnalysisWebSocket = (analysisId: string | null) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Replace your current useEffect in useAnalysisWebSocket.tsx with this:
useEffect(() => {
  if (!analysisId) {
    // Reset state when analysisId becomes null
    setLogs([]);
    setProgress(0);
    setResult(null);
    setError(null);
    setIsConnected(false);
    console.log('🔄 Analysis ID cleared, resetting state');
    return;
  }

  console.log(`🔄 Connecting WebSocket for analysis: ${analysisId}`);
  
  const ws = new WebSocket(`ws://localhost:8000/ws/analysis/${analysisId}`);
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected successfully');
    setSocket(ws);
    setIsConnected(true);
    // Add initial connection log
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      message: '✅ Connected to analysis server',
      level: 'info',
      timestamp: new Date().toISOString()
    }]);
  };

  ws.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('📨 WebSocket message received:', message);
      
      switch (message.type) {
        case 'log':
          const newLog: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            message: message.message || '',
            level: message.level || 'info',
            timestamp: message.timestamp || new Date().toISOString()
          };
          
          setLogs(prev => [...prev, newLog]);
          break;
          
        case 'progress':
          if (message.progress !== undefined) {
            console.log(`📊 Progress update: ${message.progress}%`);
            setProgress(message.progress);
          }
          break;
          
        case 'result':
          console.log('🎉 Analysis result received:', message.data);
          setResult(message.data || message);
          setProgress(100);
          setLogs(prev => [...prev, {
            id: Date.now().toString(),
            message: '🎉 Analysis completed successfully!',
            level: 'success',
            timestamp: new Date().toISOString()
          }]);
          toast({
            title: 'Analysis complete',
            description: 'Your loan analysis has been processed successfully.',
          });
          break;
          
        case 'error':
          const errorMessage = message.message || 'An error occurred during processing.';
          console.error('❌ Analysis error:', errorMessage);
          setError(errorMessage);
          setLogs(prev => [...prev, {
            id: Date.now().toString(),
            message: `❌ ${errorMessage}`,
            level: 'error',
            timestamp: new Date().toISOString()
          }]);
          toast({
            title: 'Analysis failed',
            description: errorMessage,
            variant: 'destructive',
          });
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    setError('Connection error - cannot connect to analysis server');
    setIsConnected(false);
  };

  ws.onclose = (event) => {
    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
    setSocket(null);
    setIsConnected(false);
    
    if (event.code !== 1000 && progress < 100) {
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        message: '⚠️ Connection to analysis server lost',
        level: 'warning',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return () => {
    console.log('🧹 Cleaning up WebSocket connection');
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Component unmounted');
    }
  };
}, [analysisId]);

  return { 
    socket, 
    logs, 
    progress, 
    result, 
    error,
    isConnected
  };
};