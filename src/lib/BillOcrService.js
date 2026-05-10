import { runAI } from './ai/engine.js';

/**
 * Parses a supplier bill image/PDF using Gemini AI.
 * @param {string} base64Image - Base64 encoded image data.
 * @returns {Promise<Object>} - The structured bill data.
 */
export async function parseSupplierBillWithAi(base64Image) {
    try {
        console.log('[Bill AI] Sending image for OCR...');
        const result = await runAI('bill_ocr', { image: base64Image });
        
        if (!result || result.error) {
            throw new Error(result?.error || 'AI failed to parse the bill.');
        }

        return {
            supplier_name: result.supplier_name || '',
            uen: result.uen || '',
            invoice_no: result.invoice_no || '',
            invoice_date: result.invoice_date || '',
            currency: result.currency || 'SGD',
            subtotal: result.subtotal || 0,
            gst_amount: result.gst_amount || 0,
            total_amount: result.total_amount || 0,
            items: result.items || [],
            confidence: 90 // Default high confidence for visual OCR
        };
    } catch (err) {
        console.error('[Bill AI] Parsing failed:', err);
        throw err;
    }
}
