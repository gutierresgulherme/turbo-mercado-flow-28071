-- Add source column to webhook_logs to distinguish between manual tests and real payments
ALTER TABLE public.webhook_logs 
ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown';

-- Add index for better query performance
CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source);

COMMENT ON COLUMN public.webhook_logs.source IS 'Source of the webhook: manual_test, mercado_pago, or unknown';