-- Schema para Proformas Edipa
-- Ejecutar vía SUPABASE_BETA_RUN_SQL_QUERY (proyecto xrvbnofxbqrzsgvcryle)

-- 1. CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ruc TEXT,
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PRODUCTOS (catálogo)
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PROFORMAS
CREATE TABLE IF NOT EXISTS public.proformas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre TEXT,
  cliente_ruc TEXT,
  cliente_telefono TEXT,
  cliente_correo TEXT,
  cliente_direccion TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  forma_pago TEXT,
  plazo_entrega TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  iva NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'creada' CHECK (estado IN ('creada','enviada')),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ITEMS DE PROFORMA
CREATE TABLE IF NOT EXISTS public.proforma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id UUID NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 5. SECUENCIA (para control de número autoincremental)
-- El número se calcula como: COALESCE(MAX(numero), 4842) + 1
-- Primer número: 004843

-- RLS: todas las tablas, autenticados pueden hacer CRUD completo
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_items ENABLE ROW LEVEL SECURITY;

-- Políticas: autenticados pueden leer, insertar, actualizar, eliminar todo
CREATE POLICY "Autenticados pueden leer clientes" ON public.clientes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden insertar clientes" ON public.clientes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden actualizar clientes" ON public.clientes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden eliminar clientes" ON public.clientes FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados pueden leer productos" ON public.productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden insertar productos" ON public.productos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden actualizar productos" ON public.productos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden eliminar productos" ON public.productos FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados pueden leer proformas" ON public.proformas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden insertar proformas" ON public.proformas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden actualizar proformas" ON public.proformas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden eliminar proformas" ON public.proformas FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados pueden leer items" ON public.proforma_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden insertar items" ON public.proforma_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden actualizar items" ON public.proforma_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados pueden eliminar items" ON public.proforma_items FOR DELETE USING (auth.role() = 'authenticated');