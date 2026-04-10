'use client';

import { useState } from 'react';
import { useEscrowBalance } from '@/hooks/useEscrowBalance';
import { useDeposit, DepositState } from '@/hooks/useDeposit';
import { useWithdraw, WithdrawState } from '@/hooks/useWithdraw';
import { formatUSDT } from '@/lib/utils';
import { MIN_POSITION_USDT, MAX_POSITION_USDT } from '@/lib/web3';

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

const DEPOSIT_LABELS: Record<DepositState, string> = {
  idle: 'Deposit',
  approving: 'Approving USDT...',
  'waiting-approval': 'Confirming approval...',
  depositing: 'Depositing...',
  'waiting-deposit': 'Confirming deposit...',
  success: 'Deposited!',
  error: 'Try again',
};

const WITHDRAW_LABELS: Record<WithdrawState, string> = {
  idle: 'Withdraw',
  withdrawing: 'Withdrawing...',
  confirming: 'Confirming...',
  success: 'Withdrawn!',
  error: 'Try again',
};

export function BalanceManager() {
  const { platformBalance, walletBalance, isLoading, refetch } = useEscrowBalance();
  const { deposit, state: depositState, error: depositError, reset: resetDeposit } = useDeposit();
  const { withdraw, state: withdrawState, error: withdrawError, reset: resetWithdraw } = useWithdraw();

  const [depositAmount, setDepositAmount] = useState(10);
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const depositBusy = !['idle', 'success', 'error'].includes(depositState);
  const withdrawBusy = !['idle', 'success', 'error'].includes(withdrawState);

  async function handleDeposit() {
    if (depositState === 'success' || depositState === 'error') resetDeposit();
    else {
      await deposit(depositAmount);
      refetch();
    }
  }

  async function handleWithdraw() {
    if (withdrawState === 'success' || withdrawState === 'error') resetWithdraw();
    else {
      await withdraw(withdrawAmount);
      refetch();
    }
  }

  return (
    <div className="bg-[--surface] border border-[--border] rounded-2xl p-5 flex flex-col gap-5">
      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[--surface-2] rounded-xl p-4 text-center">
          <div className="text-xs font-mono text-[--text-muted] uppercase tracking-wider mb-1">Wallet USDT</div>
          <div className="text-xl font-bold font-mono text-[--text]">
            {isLoading ? '...' : formatUSDT(walletBalance)}
          </div>
        </div>
        <div className="bg-[--surface-2] rounded-xl p-4 text-center">
          <div className="text-xs font-mono text-[--text-muted] uppercase tracking-wider mb-1">Platform Balance</div>
          <div className="text-xl font-bold font-mono text-[--accent]">
            {isLoading ? '...' : formatUSDT(platformBalance)}
          </div>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-[--surface-2] rounded-xl p-1">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
            activeTab === 'deposit' ? 'bg-[--accent] text-[--bg]' : 'text-[--text-dim] hover:text-[--text]'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
            activeTab === 'withdraw' ? 'bg-[--accent] text-[--bg]' : 'text-[--text-dim] hover:text-[--text]'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Deposit */}
      {activeTab === 'deposit' && (
        <div className="flex flex-col gap-3">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
            min={MIN_POSITION_USDT}
            max={MAX_POSITION_USDT}
            className="w-full bg-[--surface-2] border border-[--border] rounded-xl px-4 py-3 text-lg font-mono font-bold text-center focus:outline-none focus:border-[--accent] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => setDepositAmount(q)}
                className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                  depositAmount === q
                    ? 'bg-[--accent]/15 border-[--accent]/30 text-[--accent]'
                    : 'border-[--border] text-[--text-muted] hover:border-[--text-muted]'
                }`}
              >
                ${q}
              </button>
            ))}
          </div>
          <button
            onClick={handleDeposit}
            disabled={depositBusy || depositAmount <= 0}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[--accent] text-[--bg] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {DEPOSIT_LABELS[depositState]}
          </button>
          {depositError && <p className="text-xs text-[--hot] text-center">{depositError}</p>}
        </div>
      )}

      {/* Withdraw */}
      {activeTab === 'withdraw' && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
              min={MIN_POSITION_USDT}
              className="w-full bg-[--surface-2] border border-[--border] rounded-xl px-4 py-3 text-lg font-mono font-bold text-center focus:outline-none focus:border-[--accent] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => setWithdrawAmount(platformBalance)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[--accent] hover:underline"
            >
              MAX
            </button>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawBusy || withdrawAmount <= 0 || withdrawAmount > platformBalance}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[--hot] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {WITHDRAW_LABELS[withdrawState]}
          </button>
          {withdrawError && <p className="text-xs text-[--hot] text-center">{withdrawError}</p>}
        </div>
      )}

      <p className="text-[10px] text-[--text-muted] text-center">
        Deposit USDT to your platform balance to take positions. Withdraw anytime.
      </p>
    </div>
  );
}
