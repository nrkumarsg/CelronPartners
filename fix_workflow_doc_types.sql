-- Fix Document Type Constraint for workflow_documents
-- This adds missing types: Job, Order Acknowledgment, Service Report, Certificate, Payment Received, Statement of Account
ALTER TABLE public.workflow_documents 
DROP CONSTRAINT IF EXISTS workflow_documents_document_type_check;

ALTER TABLE public.workflow_documents 
ADD CONSTRAINT workflow_documents_document_type_check 
CHECK (document_type IN (
    'Enquiry', 
    'Quotation', 
    'Job',
    'Purchase Order', 
    'Order Acknowledgment',
    'Delivery Order', 
    'Service Report',
    'Proforma Invoice', 
    'Packing List', 
    'Tax Invoice',
    'Certificate',
    'Payment Received',
    'Statement of Account'
));
