'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DrawEngine } from '@/lib/draw/engine';
import { DrawMode, DrawSimulationResult } from '@/lib/draw/types';
import { getEligibleDrawParticipants } from '@/lib/services/eligibility';
import { getLastPublishedDraw } from '@/lib/services/draws';
import { revalidatePath } from 'next/cache';

/**
 * Ensures the authenticated user has the 'admin' role.
 */
async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: You must be logged in.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden: Only administrators can execute draw operations.');
  }

  return user;
}

/**
 * Server Action: Run a draw simulation.
 * Admin-only. Gathers eligible participants, calculates prize pool and rollover,
 * runs the selected draw strategy, and returns the result without publishing.
 */
export async function simulateDrawAction(formData: FormData): Promise<{
  data: DrawSimulationResult | null;
  error: string | null;
}> {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();

    const drawPeriod = (formData.get('draw_period') as string) || new Date().toISOString().substring(0, 7);
    const drawMode = (formData.get('draw_mode') as DrawMode) || 'random';
    const customSeed = formData.get('seed') as string;
    const seed = customSeed && customSeed.trim().length > 0 ? customSeed.trim() : undefined;

    // 1. Gather eligible participants
    const { participants, activeSubscriberCount, error: partErr } = await getEligibleDrawParticipants(adminSupabase);
    if (partErr) {
      return { data: null, error: `Failed to retrieve participants: ${partErr.message}` };
    }

    // 2. Fetch rollover from the last published draw
    const { data: lastDraw } = await getLastPublishedDraw(adminSupabase);
    let previousRolloverCents = 0;

    if (lastDraw) {
      // Check if tier 5 was claimed in the last draw
      const { data: lastTiers } = await adminSupabase
        .from('prize_tiers')
        .select('*')
        .eq('draw_id', lastDraw.id)
        .eq('match_tier', 5)
        .single();

      if (lastTiers && !lastTiers.is_claimed) {
        previousRolloverCents = lastTiers.total_amount_cents;
      }
    }

    // 3. Execute pure simulation via DrawEngine
    const result = DrawEngine.execute({
      drawPeriod,
      drawMode,
      seed,
      participants,
      activeSubscriberCount,
      previousRolloverCents,
    });

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action: Publish a draw.
 * Admin-only. Persists the draw, results, eligible entry snapshots, prize tiers,
 * and winners to the database with status = 'published'.
 */
export async function publishDrawAction(simulationDataJson: string): Promise<{
  success: boolean;
  drawId?: string;
  error?: string;
}> {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();

    const clientSim: DrawSimulationResult = JSON.parse(simulationDataJson);

    // 1. Gather fresh eligible participants directly on the server
    // Ensures we do not trust client-supplied winner lists and catches scores updated before publish
    const { participants, activeSubscriberCount, error: partErr } = await getEligibleDrawParticipants(adminSupabase);
    if (partErr) {
      return { success: false, error: `Failed to retrieve participants: ${partErr.message}` };
    }

    // 2. Fetch rollover from the last published draw
    const { data: lastDraw } = await getLastPublishedDraw(adminSupabase);
    let previousRolloverCents = 0;
    if (lastDraw) {
      const { data: lastTiers } = await adminSupabase
        .from('prize_tiers')
        .select('*')
        .eq('draw_id', lastDraw.id)
        .eq('match_tier', 5)
        .single();

      if (lastTiers && !lastTiers.is_claimed) {
        previousRolloverCents = lastTiers.total_amount_cents;
      }
    }

    // 3. Re-execute DrawEngine deterministically using the exact seed from the simulation
    // Winning numbers are 100% identical to simulation preview, while evaluating live participants securely
    const sim = DrawEngine.execute({
      drawPeriod: clientSim.drawPeriod,
      drawMode: clientSim.drawMode || 'random',
      seed: clientSim.seed,
      participants,
      activeSubscriberCount,
      previousRolloverCents,
      algorithmVersion: clientSim.algorithmVersion,
    });

    // 4. Insert into draws table
    const { data: draw, error: drawErr } = await adminSupabase
      .from('draws')
      .insert({
        draw_period: sim.drawPeriod,
        draw_mode: sim.drawMode,
        status: 'published',
        execution_timestamp: new Date().toISOString(),
        jackpot_amount_cents: sim.tiers.tier5.totalAmountCents,
        total_pool_cents: sim.totalPoolCents,
        algorithm_version: sim.algorithmVersion,
        seed: sim.seed,
        audit_notes: `Published with ${sim.eligibleParticipantCount} eligible participants of ${sim.totalSubscribers} subscribers. Mode: ${sim.drawMode}.`,
      })
      .select('id')
      .single();

    if (drawErr || !draw) {
      return { success: false, error: `Failed to create draw: ${drawErr?.message}` };
    }

    const drawId = draw.id;

    // 2. Insert draw_results
    const { error: resultsErr } = await adminSupabase.from('draw_results').insert({
      draw_id: drawId,
      winning_numbers: sim.winningNumbers,
      algorithm_version: sim.algorithmVersion,
      metadata: sim.metadata,
    });

    if (resultsErr) {
      return { success: false, error: `Failed to insert draw results: ${resultsErr.message}` };
    }

    // 3. Insert draw_entries snapshot
    if (sim.evaluations.length > 0) {
      const entriesToInsert = sim.evaluations.map((ev) => ({
        draw_id: drawId,
        user_id: ev.userId,
        is_eligible: ev.isEligible,
        scores_snapshot: ev.scores,
        consistency_metric: ev.consistencyMetric ?? null,
        draw_weight: ev.drawWeight ?? null,
      }));

      const { error: entriesErr } = await adminSupabase.from('draw_entries').insert(entriesToInsert);
      if (entriesErr) {
        return { success: false, error: `Failed to snapshot draw entries: ${entriesErr.message}` };
      }
    }

    // 4. Insert prize_tiers
    const tiersToInsert = [
      {
        draw_id: drawId,
        match_tier: 5,
        percentage_allocation: sim.tiers.tier5.percentageAllocation,
        total_amount_cents: sim.tiers.tier5.totalAmountCents,
        rollover_amount_cents: sim.tiers.tier5.rolloverAmountCents,
        is_claimed: sim.tiers.tier5.isClaimed,
      },
      {
        draw_id: drawId,
        match_tier: 4,
        percentage_allocation: sim.tiers.tier4.percentageAllocation,
        total_amount_cents: sim.tiers.tier4.totalAmountCents,
        rollover_amount_cents: sim.tiers.tier4.rolloverAmountCents,
        is_claimed: sim.tiers.tier4.isClaimed,
      },
      {
        draw_id: drawId,
        match_tier: 3,
        percentage_allocation: sim.tiers.tier3.percentageAllocation,
        total_amount_cents: sim.tiers.tier3.totalAmountCents,
        rollover_amount_cents: sim.tiers.tier3.rolloverAmountCents,
        is_claimed: sim.tiers.tier3.isClaimed,
      },
    ];

    const { error: tiersErr } = await adminSupabase.from('prize_tiers').insert(tiersToInsert);
    if (tiersErr) {
      return { success: false, error: `Failed to insert prize tiers: ${tiersErr.message}` };
    }

    // 5. Insert winners
    const allWinners = [
      ...sim.tiers.tier5.winners.map((userId) => {
        const ev = sim.evaluations.find((e) => e.userId === userId);
        return {
          draw_id: drawId,
          user_id: userId,
          match_count: ev?.matchCount ?? 5,
          match_tier: 5,
          prize_amount_cents: sim.tiers.tier5.prizePerWinnerCents,
          scores_snapshot: ev?.scores ?? [],
          winning_numbers_snapshot: sim.winningNumbers,
          verification_status: 'pending',
          status: 'pending_proof',
        };
      }),
      ...sim.tiers.tier4.winners.map((userId) => {
        const ev = sim.evaluations.find((e) => e.userId === userId);
        return {
          draw_id: drawId,
          user_id: userId,
          match_count: ev?.matchCount ?? 4,
          match_tier: 4,
          prize_amount_cents: sim.tiers.tier4.prizePerWinnerCents,
          scores_snapshot: ev?.scores ?? [],
          winning_numbers_snapshot: sim.winningNumbers,
          verification_status: 'pending',
          status: 'pending_proof',
        };
      }),
      ...sim.tiers.tier3.winners.map((userId) => {
        const ev = sim.evaluations.find((e) => e.userId === userId);
        return {
          draw_id: drawId,
          user_id: userId,
          match_count: ev?.matchCount ?? 3,
          match_tier: 3,
          prize_amount_cents: sim.tiers.tier3.prizePerWinnerCents,
          scores_snapshot: ev?.scores ?? [],
          winning_numbers_snapshot: sim.winningNumbers,
          verification_status: 'pending',
          status: 'pending_proof',
        };
      }),
    ];

    if (allWinners.length > 0) {
      const { error: winnersErr } = await adminSupabase.from('winners').insert(allWinners);
      if (winnersErr) {
        return { success: false, error: `Failed to insert winners: ${winnersErr.message}` };
      }
    }

    revalidatePath('/admin');
    revalidatePath('/admin/winners');
    revalidatePath('/draws');
    revalidatePath('/winnings');
    return { success: true, drawId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
