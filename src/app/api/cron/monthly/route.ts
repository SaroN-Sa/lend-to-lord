import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getEthiopianDateParts,
  getNextEthiopianMonthKey,
  formatEthiopianMonth,
} from '@/lib/ethiopian-calendar';

export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  // 1. Verify secret header (or allow admin trigger from same-origin if key matches)
  const headerKey = req.headers.get('x-keepalive-key');
  const body = await req.json().catch(() => ({}));
  const forceRun = Boolean(body.force);
  const targetMonthParam = body.target_month as string | undefined;

  if (!forceRun && headerKey !== process.env.KEEPALIVE_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 }
    );
  }

  // 2. Check Ethiopian day against app_settings.reminder_day
  const { day: ethDay, monthKey: currentEthMonth } = getEthiopianDateParts();
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('reminder_day')
    .eq('id', 1)
    .maybeSingle();

  const reminderDay = settings?.reminder_day ?? 25;

  if (!forceRun && ethDay !== reminderDay) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Today is Ethiopian day ${ethDay}, reminder_day is ${reminderDay}`,
    });
  }

  // Target month is either explicitly passed by admin or the upcoming Ethiopian month
  const targetMonth = targetMonthParam || getNextEthiopianMonthKey(currentEthMonth);

  // 3. Verify that the monthly update for targetMonth is published
  const { data: updateRow } = await supabaseAdmin
    .from('monthly_updates')
    .select('id, published')
    .eq('ethiopian_month', targetMonth)
    .maybeSingle();

  if (!updateRow || !updateRow.published) {
    // Warn connected admins via Telegram and hold off on messaging members
    const { data: admins } = await supabaseAdmin
      .from('members')
      .select('id, telegram_chat_id, language')
      .eq('role', 'admin')
      .eq('active', true)
      .eq('telegram_blocked', false)
      .not('telegram_chat_id', 'is', null);

    for (const admin of admins || []) {
      const warnText =
        admin.language === 'en'
          ? `⚠️ Admin Notice: The monthly update for ${formatEthiopianMonth(targetMonth, 'en')} is not published yet. Monthly member reminders are paused until you publish it at /en/admin/updates.`
          : `⚠️ የአስተዳዳሪ ማሳሰቢያ፦ የ${formatEthiopianMonth(targetMonth, 'am')} ወርሃዊ መልእክት ገና አልተለጠፈም። ለአባላት የሚላከው ወርሃዊ ማስታወሻ መልእክቱ እስኪለጠፍ ድረስ ቆሟል።`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: admin.telegram_chat_id, text: warnText }),
      });
    }

    return NextResponse.json({
      ok: false,
      warned_admins: true,
      error: `Monthly update for ${targetMonth} is not published yet.`,
    });
  }

  // 4. Get last/current month's collected total to quote in the greeting
  const { data: monthlyTotalRow } = await supabaseAdmin
    .from('public_monthly_totals')
    .select('total_birr')
    .eq('ethiopian_month', currentEthMonth)
    .maybeSingle();

  const lastMonthTotal = Number(monthlyTotalRow?.total_birr ?? 0).toLocaleString('en-US');

  // 5. Find members who already received a reminder in the last 20 days (prevent duplicates)
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabaseAdmin
    .from('messages_log')
    .select('member_id')
    .eq('kind', 'reminder')
    .eq('success', true)
    .gte('sent_at', twentyDaysAgo);

  const alreadyMessagedIds = new Set((recentLogs || []).map((r) => r.member_id));

  // 6. Fetch all active, connected, unblocked members
  const { data: members } = await supabaseAdmin
    .from('members')
    .select('id, full_name, telegram_chat_id, language')
    .eq('active', true)
    .eq('telegram_blocked', false)
    .not('telegram_chat_id', 'is', null);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const eligibleMembers = (members || []).filter((m) => {
    if (!forceRun && alreadyMessagedIds.has(m.id)) {
      skippedCount++;
      return false;
    }
    return true;
  });

  // 7. Send in batches of 20 with a 1-second pause
  const BATCH_SIZE = 20;
  for (let i = 0; i < eligibleMembers.length; i += BATCH_SIZE) {
    const batch = eligibleMembers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (member) => {
        const mLang = member.language === 'en' ? 'en' : 'am';
        const currentLabel = formatEthiopianMonth(currentEthMonth, mLang);
        const targetLabel = formatEthiopianMonth(targetMonth, mLang);
        const updateLink = `${siteUrl}/${mLang}/update/${targetMonth}`;

        const reminderText =
          mLang === 'am'
            ? `ሰላም ${member.full_name} 🙏\n\nበ${currentLabel} ወር በአጋሮች ትብብር ${lastMonthTotal} ብር ተሰብስቧል።\n\nየ${targetLabel} ወርሃዊ መልእክትን እና ራዕይን ለማንበብ ይህንን ሊንክ ይጫኑ፦\n${updateLink}\n\nበዚህ ወር የቻሉትን አስተዋጽኦ ለማድረግ የደረሰኝ ፎቶ (Screenshot) እዚህ ቦት ላይ መላክ ወይም በድረ-ገጹ ማስገባት ይችላሉ። እግዚአብሔር ይባርክዎት!`
            : `Hello ${member.full_name} 🙏\n\nIn ${currentLabel}, ${lastMonthTotal} ETB was collected through our partners.\n\nRead the ${targetLabel} monthly update here:\n${updateLink}\n\nIf you are able, please contribute this month by sending your transfer screenshot right here in the bot or via the website.`;

        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: member.telegram_chat_id,
              text: reminderText,
            }),
          });

          if (res.status === 403) {
            // Member blocked the bot -> mark unreachable
            await supabaseAdmin
              .from('members')
              .update({ telegram_blocked: true })
              .eq('id', member.id);
          }

          if (res.ok) {
            sentCount++;
          } else {
            failedCount++;
          }

          await supabaseAdmin.from('messages_log').insert({
            member_id: member.id,
            kind: 'reminder',
            language: mLang,
            success: res.ok,
            error: res.ok ? null : `HTTP ${res.status}`,
          });
        } catch (err) {
          failedCount++;
          await supabaseAdmin.from('messages_log').insert({
            member_id: member.id,
            kind: 'reminder',
            language: mLang,
            success: false,
            error: err instanceof Error ? err.message : 'Network error',
          });
        }
      })
    );

    if (i + BATCH_SIZE < eligibleMembers.length) {
      await sleep(1000);
    }
  }

  return NextResponse.json({
    ok: true,
    target_month: targetMonth,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
  });
}