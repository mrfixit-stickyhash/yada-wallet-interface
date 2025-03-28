import React, { useState, useEffect } from 'react';
import './App.css';

export default function YadaWalletInterface() {
  const [pubKey, setPubKey] = useState('');
  const [preRotatedHash, setPreRotatedHash] = useState('');
  const [kdpPin, setKdpPin] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [walletData, setWalletData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);
  const [broadcastResult, setBroadcastResult] = useState(null);

  const fetchBalance = async (address) => {
    try {
      const response = await fetch(`https://yadacoin.io/wallet?address=${address}`);
      const data = await response.json();
      setBalance(data.balance);
    } catch (err) {
      setError('Failed to fetch balance');
    }
  };

  const handleImport = () => {
    setError(null);
    if (!pubKey.trim() || !preRotatedHash.trim() || !kdpPin.trim()) {
      setError('Public Key, Pre-Rotated Hash, and KDP (PIN) are all required.');
      return;
    }
    const walletInfo = { pub: pubKey.trim(), prehash: preRotatedHash.trim(), kdp: kdpPin.trim() };
    setWalletData(walletInfo);
    fetchBalance(walletInfo.pub);
  };

  const handleBroadcast = async () => {
    try {
      const unlockResponse = await fetch('https://yadacoin.io/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_or_wif: walletData.kdp }),
      });

      const unlockData = await unlockResponse.json();
      if (!unlockData.token) throw new Error(unlockData.message || 'Unlocking wallet failed');

      const sendTxResponse = await fetch('https://yadacoin.io/send-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${unlockData.token}`
        },
        body: JSON.stringify({
          address: recipient,
          value: parseFloat(amount),
          from: walletData.pub
        }),
      });

      const result = await sendTxResponse.json();
      if (result.status === false) throw new Error(result.message || 'Transaction failed');
      setBroadcastResult({ success: true, data: result });
    } catch (err) {
      setBroadcastResult({ error: err.message });
    }
  };

  return (
    <div className="wallet-interface">
      <h1>Yada Wallet Interface</h1>

      <div className="card">
        <h2>Enter Wallet Details</h2>
        <input
          placeholder='Public Key (from your wallet)'
          value={pubKey}
          onChange={(e) => setPubKey(e.target.value)}
        />
        <input
          placeholder='Pre-Rotated Hash (from your wallet)'
          value={preRotatedHash}
          onChange={(e) => setPreRotatedHash(e.target.value)}
        />
        <input
          placeholder='KDP (Pin/password)'
          type='password'
          value={kdpPin}
          onChange={(e) => setKdpPin(e.target.value)}
        />
        {error && <div className="alert error">{error}</div>}
        <button onClick={handleImport}>Import Wallet Data</button>
      </div>

      {walletData && (
        <div className="card">
          <h2>Imported Wallet Information</h2>
          <div className="wallet-info">
            <strong>Public Key:</strong>
            <code>{walletData.pub}</code>
          </div>
          <div className="wallet-info">
            <strong>Pre-Rotated Hash:</strong>
            <code>{walletData.prehash}</code>
          </div>
          {balance !== null && (
            <div className="wallet-info">
              <strong>Balance:</strong>
              <code>{balance} YDA</code>
            </div>
          )}

          <div className="transaction-section">
            <input
              placeholder='Recipient Address'
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              placeholder='Amount to Send'
              type='number'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={handleBroadcast}>Broadcast Transaction</button>

            {broadcastResult && (
              <div className={`alert ${broadcastResult.error ? 'error' : 'success'}`}>
                {broadcastResult.error || "Transaction broadcast successfully! TXID: " + broadcastResult.data.hash}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
