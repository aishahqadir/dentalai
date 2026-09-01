import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * GET /api/decline-reasons
 * Fetch all decline reasons (active and inactive)
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('decline_reasons')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching decline reasons:', err);
    return NextResponse.json(
      { error: 'Failed to fetch decline reasons' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/decline-reasons
 * Update a decline reason (toggle is_active or edit label/description)
 * Requires service_role key (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, description, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing decline reason ID' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('decline_reasons')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error('Error updating decline reason:', err);
    return NextResponse.json(
      { error: 'Failed to update decline reason' },
      { status: 500 }
    );
  }
}
