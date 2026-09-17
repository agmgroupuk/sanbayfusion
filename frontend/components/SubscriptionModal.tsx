'use client';

import {
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSubscribeRedirect } from '../hooks/useSubscribeRedirect';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentId: string;
  agentDescription?: string;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  agentName,
  agentId,
  agentDescription,
}: SubscriptionModalProps) {
  // Subscription modal disabled per request; keep component for API compatibility
  // but render nothing so users are not interrupted.
  return null;
}
