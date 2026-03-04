export const logger = {
  logIpc: (channel: string, type: 'Request' | 'Response' | 'Error', data: any) => {
    const timestamp = new Date().toISOString();
    const color = type === 'Error' ? '\x1b[31m' : type === 'Response' ? '\x1b[32m' : '\x1b[34m';
    const reset = '\x1b[0m';

    let displayData = '';
    try {
      displayData = JSON.stringify(data);
      if (displayData.length > 200) displayData = displayData.substring(0, 200) + '...';
    } catch (e) {
      displayData = '[Circular or Non-serializable]';
    }

    console.log(`[${timestamp}] ${color}${type}${reset} [${channel}] ${displayData}`);
  },
};
