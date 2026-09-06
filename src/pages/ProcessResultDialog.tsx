import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { fmtMoneyPrecise, fmtDate } from '@/lib/format';
import type { ProcessResult } from '@/types/api';

export function ProcessResultDialog({
  result,
  onClose,
  assetName,
}: {
  result: ProcessResult | null;
  onClose: () => void;
  assetName: (id: string) => string;
}) {
  const credited = result ? (result.bank_credited || result.source_delta) : 0;
  const toCumulative = !!result && result.source_delta > 0;

  return (
    <Modal
      open={!!result}
      onClose={onClose}
      variant="center"
      size="sm"
      title="Occurrence processed"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {result && (
        <div className="process-result">
          <motion.div
            className="process-result__badge"
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <CheckCircle2 size={40} />
          </motion.div>

          <motion.div
            className="process-result__amount mono"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            +{fmtMoneyPrecise(credited)}
          </motion.div>

          <motion.p
            className="process-result__flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <span className="chip mono">{result.id}</span>
            <ArrowRight size={14} />
            <span className="chip">
              {toCumulative
                ? 'compounded into source'
                : result.target_bank_id
                  ? `${result.target_bank_id} · ${assetName(result.target_bank_id)}`
                  : '—'}
            </span>
          </motion.p>

          <ul className="process-result__grid">
            <li>
              <span>Occurrences</span>
              <b>{result.processed_occurrences}</b>
            </li>
            <li>
              <span>Bank credited</span>
              <b className="mono">{fmtMoneyPrecise(result.bank_credited)}</b>
            </li>
            <li>
              <span>Source delta</span>
              <b className="mono">{fmtMoneyPrecise(result.source_delta)}</b>
            </li>
            <li>
              <span>Last run</span>
              <b>{fmtDate(result.last_run)}</b>
            </li>
            <li>
              <span>Next run</span>
              <b>{fmtDate(result.next_run)}</b>
            </li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
