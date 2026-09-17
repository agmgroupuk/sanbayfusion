/**
 * InvoiceHistory — Past invoices & receipts
 * Invoice list with download, status, and amount display
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Download,
  ExternalLink,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  Filter,
  CreditCard,
} from 'lucide-react';

type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string;
  pdfUrl?: string;
  paymentMethod?: string;
}

interface InvoiceHistoryProps {
  invoices: Invoice[];
  onDownload: (id: string) => void;
  onViewDetails: (id: string) => void;
  className?: string;
}

const statusConfig: Record<
  InvoiceStatus,
  { icon: React.FC<any>; color: string; bg: string; label: string }
> = {
  paid: {
    icon: Check,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Paid',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    label: 'Pending',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    label: 'Failed',
  },
  refunded: {
    icon: DollarSign,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Refunded',
  },
};

const formatAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
};

const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  invoices,
  onDownload,
  onViewDetails,
  className = '',
}) => {
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');

  const filtered =
    filterStatus === 'all' ? invoices : invoices.filter((inv) => inv.status === filterStatus);

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600/20 to-primary-500/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm text-gray-200 font-medium">Invoice History</h3>
            <span className="text-[10px] text-canvas-muted-deep">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} ·{' '}
              {formatAmount(totalPaid, 'USD')} total
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-1.5 border-b border-canvas-border flex items-center gap-0.5">
        {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-all ${
              filterStatus === status
                ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="px-4 py-1.5 bg-canvas-card/50 border-b border-canvas-border flex items-center text-[10px] text-canvas-muted-deep font-medium">
        <span className="w-20">Date</span>
        <span className="flex-1">Description</span>
        <span className="w-20 text-right">Amount</span>
        <span className="w-16 text-right">Status</span>
        <span className="w-12" />
      </div>

      {/* Invoice list */}
      <div className="flex-1 overflow-y-auto max-h-80">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
            <Receipt className="w-8 h-8 opacity-20" />
            <span className="text-xs">No invoices found</span>
          </div>
        ) : (
          filtered.map((invoice, i) => {
            const config = statusConfig[invoice.status];
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="px-4 py-2.5 border-b border-canvas-border hover:bg-white/[0.02] group cursor-pointer"
                onClick={() => onViewDetails(invoice.id)}
              >
                <div className="flex items-center">
                  <span className="w-20 text-xs text-canvas-muted-deep font-mono shrink-0">
                    {invoice.date}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-canvas-text truncate block">
                      {invoice.description}
                    </span>
                    {invoice.paymentMethod && (
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5 mt-0.5">
                        <CreditCard className="w-2.5 h-2.5" />
                        {invoice.paymentMethod}
                      </span>
                    )}
                  </div>

                  <span
                    className={`w-20 text-right text-xs font-medium ${
                      invoice.status === 'refunded' ? 'text-blue-400' : 'text-gray-200'
                    }`}
                  >
                    {invoice.status === 'refunded' && '-'}
                    {formatAmount(invoice.amount, invoice.currency)}
                  </span>

                  <div className="w-16 flex justify-end">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${config.bg} ${config.color}`}
                    >
                      <StatusIcon className="w-2.5 h-2.5" />
                      {config.label}
                    </span>
                  </div>

                  <div className="w-12 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {invoice.pdfUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(invoice.id);
                        }}
                        className="p-1 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InvoiceHistory;
