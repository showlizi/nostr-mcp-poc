import dotenv from 'dotenv';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';

// 初始化环境变量
dotenv.config();

/**
 * 获取配置的发送者私钥
 * @returns {Uint8Array} 发送者私钥的字节数组
 */
function getSenderSecretKey() {
  // 如果环境变量中有设置私钥，则使用它
  if (process.env.SENDER_SECRET_KEY) {
    return hexToBytes(process.env.SENDER_SECRET_KEY);
  }
  
  // 否则生成一个新的私钥（实际使用时应保存这个私钥）
  console.warn('未找到发送者私钥，正在生成新的私钥...');
  return hexToBytes(generateSecretKey());
}

/**
 * 获取配置的接收者公钥
 * @returns {string} 接收者公钥的十六进制字符串
 */
function getRecipientPublicKey() {
  return process.env.RECIPIENT_PUBLIC_KEY;
}

/**
 * 获取中继服务器URL
 * @returns {string} 中继服务器URL
 */
function getRelayUrl() {
  return process.env.RELAY_URL || 'https://dev-relay.dephy.dev/';
}

/**
 * 获取发送者的公钥
 * @param {Uint8Array} secretKey 私钥
 * @returns {string} 公钥的十六进制字符串
 */
function getSenderPublicKey(secretKey) {
  return getPublicKey(secretKey);
}

/**
 * Create a logger with standardized format
 * @param {string} componentName Name of the component for the logs
 * @returns {Object} Logger object with standard methods
 */
function createLogger(componentName) {
  return {
    info: (message, ...args) => console.log(`[${componentName}] [INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[${componentName}] [WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[${componentName}] [ERROR] ${message}`, ...args),
    debug: (message, ...args) => console.debug(`[${componentName}] [DEBUG] ${message}`, ...args),
  };
}

export {
  getSenderSecretKey,
  getRecipientPublicKey,
  getRelayUrl,
  getSenderPublicKey,
  hexToBytes,
  createLogger
};