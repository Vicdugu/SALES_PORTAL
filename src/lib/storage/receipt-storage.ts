import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not configured. Receipt storage will not work.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Upload a receipt PDF to Supabase Storage and return the public URL
 */
export async function uploadReceiptPDF(
  pdfBuffer: Buffer,
  orderId: string,
  orderNumber: string
): Promise<string | null> {
  if (!supabase) {
    console.warn('Supabase not configured, cannot upload receipt');
    return null;
  }

  try {
    const fileName = `receipts/${Date.now()}_${orderId}_${orderNumber}.pdf`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('sales-till-receipts')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600', // Cache for 1 hour
        upsert: false,
      });

    if (error) {
      console.error('Error uploading receipt to Supabase:', error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('sales-till-receipts')
      .getPublicUrl(fileName);

    console.log(`[Receipt] Uploaded to Supabase: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadReceiptPDF:', error);
    return null;
  }
}

/**
 * Delete a receipt PDF from Supabase Storage
 */
export async function deleteReceiptPDF(fileName: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from('sales-till-receipts')
      .remove([fileName]);

    if (error) {
      console.error('Error deleting receipt:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteReceiptPDF:', error);
    return false;
  }
}
