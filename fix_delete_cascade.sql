-- Fix foreign key constraint to ensure cascade delete works
ALTER TABLE public.workflow_line_items
DROP CONSTRAINT IF EXISTS workflow_line_items_document_id_fkey;

ALTER TABLE public.workflow_line_items
ADD CONSTRAINT workflow_line_items_document_id_fkey
FOREIGN KEY (document_id) REFERENCES public.workflow_documents(id) ON DELETE CASCADE;
