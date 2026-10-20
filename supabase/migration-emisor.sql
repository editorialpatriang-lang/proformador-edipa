-- Emisor (local) de la proforma. ADD COLUMN es aditivo y seguro.
-- Ejecutar vía SUPABASE_BETA_RUN_SQL_QUERY (proyecto xrvbnofxbqrzsgvcryle)
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS emisor TEXT NOT NULL DEFAULT 'mariscal';

-- Valores válidos: 'mariscal' (RUC 1708753056001) | 'santaclara' (RUC 1722300132001)
-- Proformas existentes quedan como 'mariscal' por el DEFAULT.
