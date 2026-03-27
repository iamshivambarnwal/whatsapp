import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { whatsappAPI } from '../services/api';

// Create context
const WhatsAppContext = createContext();

// Loading timeout in milliseconds
const LOADING_TIMEOUT = 10000;

export function WhatsAppProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  // Use useCallback to memoize fetchStatus - prevents re-renders
  const fetchStatus = useCallback(async () => {
    try {
      const response = await whatsappAPI.getStatus();
      setIsConnected(response.data?.connected || false);
    } catch (error) {
      console.error('Status error:', error);
      setIsConnected(false);
    }
  }, []); // Empty deps - function never changes

  // Initial fetch on mount
  useEffect(() => {
    const init = async () => {
      try {
        await fetchStatus();
      } catch (error) {
        console.error('Initial status fetch failed:', error);
      }
    };
    init();
  }, [fetchStatus]);

  // Polling for status updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  const fetchQR = useCallback(async () => {
    setIsLoading(true);
    
    // Create a promise that resolves after timeout OR when fetch completes
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        setIsLoading(false);
        console.warn('QR fetch timeout');
        resolve(null);
      }, LOADING_TIMEOUT);
    });

    try {
      const response = await Promise.race([
        whatsappAPI.getQR(),
        timeoutPromise
      ]);
      
      if (response && response.data) {
        setQrCode(response.data.qrCode || null);
        setIsLoading(false);
        return response.data;
      }
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('QR error:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    let pollInterval = null;

    try {
      await whatsappAPI.connect();
      
      // Poll for QR with proper cleanup
      let attempts = 0;
      pollInterval = setInterval(async () => {
        attempts++;
        try {
          const response = await whatsappAPI.getQR();
          if (response.data?.qrCode) {
            setQrCode(response.data.qrCode);
            clearInterval(pollInterval);
            pollInterval = null;
            setIsLoading(false);
          }
        } catch (e) {
          // Silently handle polling errors
        }
        if (attempts > 30) {
          clearInterval(pollInterval);
          pollInterval = null;
          setIsLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Connect error:', error);
      if (pollInterval) clearInterval(pollInterval);
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await whatsappAPI.disconnect();
      setQrCode(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reconnect = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  const value = {
    isConnected,
    isLoading,
    qrCode,
    fetchQR,
    connect,
    disconnect,
    reconnect
  };

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error('useWhatsApp must be used within WhatsAppProvider');
  }
  return context;
}
