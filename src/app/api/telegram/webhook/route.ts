import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getEthiopianDateParts } from '@/lib/ethiopian-calendar';

async function sendTelegramMessage(
  chatId: number,
  text: string,
  memberId: string | null = null,
  kind: 'welcome' | 'thanks' | 'prompt' = 'prompt',
  language: string = 'am'
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (kind !== 'prompt') {
      await supabaseAdmin.from('messages_log').insert({
        member_id: memberId,
        kind,
        language,
        success: res.ok,
        error: res.ok ? null : `HTTP ${res.status}`,
      });
    }
  } catch (err) {
    if (kind !== 'prompt') {
      await supabaseAdmin.from('messages_log').insert({
        member_id: memberId,
        kind,
        language,
        success: false,
        error: err instanceof Error ? err.message : 'Telegram send failed',
      });
    }
  }
}

export async function POST(req: Request) {
  // 1. Verify Telegram secret token header
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await req.json();

    // Handle user blocking/unblocking the bot
    if (update.my_chat_member) {
      const chatId = update.my_chat_member.chat?.id;
      const newStatus = update.my_chat_member.new_chat_member?.status;
      if (chatId && (newStatus === 'kicked' || newStatus === 'member')) {
        await supabaseAdmin
          .from('members')
          .update({ telegram_blocked: newStatus === 'kicked' })
          .eq('telegram_chat_id', chatId);
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = (message.text || '').trim();

    // Look up member by telegram_chat_id
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('id, full_name, role, language')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    const lang = member?.language || 'am';

    // 2. Handle "/start <code>" connection flow
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const code = parts[1]?.trim().toUpperCase();

      if (code) {
        const { data: linkedMember } = await supabaseAdmin
          .from('members')
          .select('id, full_name, language')
          .eq('telegram_link_code', code)
          .maybeSingle();

        if (linkedMember) {
          await supabaseAdmin
            .from('members')
            .update({
              telegram_chat_id: chatId,
              telegram_blocked: false,
              telegram_link_code: null, // One-time use
            })
            .eq('id', linkedMember.id);

          const mLang = linkedMember.language || 'am';
          const welcomeMsg =
            mLang === 'am'
              ? `እንኳን ደህና መጡ ${linkedMember.full_name}! 🙏\n\nየቴሌግራም አካውንትዎ ከ"ለጌታ ማበደር" ጋር ተገናኝቷል።\n• በየወሩ የማስታወሻ መልእክት ይደርስዎታል።\n• አስተዋጽኦ ሲያደርጉ የደረሰኝ ፎቶ (Screenshot) እዚህ በመላክ በቀላሉ መመዝገብ ይችላሉ።`
              : `Welcome ${linkedMember.full_name}! 🙏\n\nYour Telegram is now connected to Lend To Lord.\n• You will receive gentle monthly reminders here.\n• Whenever you make a transfer, simply send the screenshot photo right here to record your contribution.`;

          await sendTelegramMessage(chatId, welcomeMsg, linkedMember.id, 'welcome', mLang);
          return NextResponse.json({ ok: true });
        }
      }

      // Generic /start without a valid code
      const genericMsg =
        lang === 'am'
          ? 'እንኳን ወደ "ለጌታ ማበደር" ቦት በደህና መጡ። የደረሰኝ ፎቶ (Screenshot) በመላክ አስተዋጽኦዎን መመዝገብ ይችላሉ።'
          : 'Welcome to the Lend To Lord bot! Send a transfer screenshot photo anytime to record a contribution.';
      await sendTelegramMessage(chatId, genericMsg, member?.id ?? null, 'prompt', lang);
      return NextResponse.json({ ok: true });
    }

    // 3. Handle incoming Photo (Start contribution session)
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      const fileId: string = largestPhoto.file_id;

      await supabaseAdmin.from('bot_sessions').upsert({
        telegram_chat_id: chatId,
        step: 'waiting_for_amount',
        telegram_file_id: fileId,
        amount_birr: null,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      const askAmount =
        lang === 'am'
          ? 'ፎቶው ደርሶናል! 🧾 እባክዎ የከፈሉትን የብር መጠን በቁጥር ብቻ ይጻፉልን (ለምሳሌ፦ 500)፦'
          : 'Screenshot received! 🧾 Please reply with the amount in ETB (numbers only, e.g. 500):';

      await sendTelegramMessage(chatId, askAmount, member?.id ?? null, 'prompt', lang);
      return NextResponse.json({ ok: true });
    }

    // 4. Check if user has an active bot_session
    const { data: session } = await supabaseAdmin
      .from('bot_sessions')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!session) {
      const helpMsg =
        lang === 'am'
          ? 'አስተዋጽኦ ለመመዝገብ እባክዎ መጀመሪያ የደረሰኝ ፎቶውን (Screenshot) ይላኩ።'
          : 'To record a contribution, please send the transfer screenshot photo first.';
      await sendTelegramMessage(chatId, helpMsg, member?.id ?? null, 'prompt', lang);
      return NextResponse.json({ ok: true });
    }

    // Step A: Waiting for Amount
    if (session.step === 'waiting_for_amount') {
      const cleanedAmount = Number(text.replace(/,/g, ''));
      if (!cleanedAmount || isNaN(cleanedAmount) || cleanedAmount <= 0) {
        const retryAmt =
          lang === 'am'
            ? 'እባክዎ ትክክለኛ የብር መጠን በቁጥር ብቻ ይጻፉ (ለምሳሌ፦ 500)፦'
            : 'Please enter a valid positive number for the amount (e.g. 500):';
        await sendTelegramMessage(chatId, retryAmt, member?.id ?? null, 'prompt', lang);
        return NextResponse.json({ ok: true });
      }

      await supabaseAdmin
        .from('bot_sessions')
        .update({
          amount_birr: cleanedAmount,
          step: 'waiting_for_reference',
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_chat_id', chatId);

      const askRef =
        lang === 'am'
          ? `መጠን፦ ${cleanedAmount.toLocaleString()} ብር።\nአሁን ደግሞ የግብይት ቁጥሩን (Transaction Reference Number) ይጻፉልን፦`
          : `Amount: ${cleanedAmount.toLocaleString()} ETB.\nNow please reply with the Transaction Reference Number:`;
      await sendTelegramMessage(chatId, askRef, member?.id ?? null, 'prompt', lang);
      return NextResponse.json({ ok: true });
    }

    // Step B: Waiting for Reference Number -> Complete Submission
    if (session.step === 'waiting_for_reference') {
      const referenceNorm = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (referenceNorm.length < 4) {
        const retryRef =
          lang === 'am'
            ? 'እባክዎ ትክክለኛ የግብይት ቁጥር (Reference Number) ያስገቡ፦'
            : 'Please enter a valid transaction reference number:';
        await sendTelegramMessage(chatId, retryRef, member?.id ?? null, 'prompt', lang);
        return NextResponse.json({ ok: true });
      }

      // Auto-detect CBE ('FT...') vs Telebirr
      const method: 'bank' | 'telebirr' = referenceNorm.startsWith('FT') ? 'bank' : 'telebirr';

      // Check duplicate reference number on 'counted' rows
      const { data: dupRef } = await supabaseAdmin
        .from('contributions')
        .select('id')
        .eq('method', method)
        .eq('reference_norm', referenceNorm)
        .eq('status', 'counted')
        .maybeSingle();

      if (dupRef) {
        await supabaseAdmin.from('bot_sessions').delete().eq('telegram_chat_id', chatId);
        const dupMsg =
          lang === 'am'
            ? '⚠️ ይህ የግብይት ቁጥር ቀደም ብሎ ተመዝግቧል።'
            : '⚠️ This transaction reference number has already been recorded.';
        await sendTelegramMessage(chatId, dupMsg, member?.id ?? null, 'prompt', lang);
        return NextResponse.json({ ok: true });
      }

      // Download image from Telegram servers using telegram_file_id
      const botToken = process.env.TELEGRAM_BOT_TOKEN!;
      const fileInfoRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${session.telegram_file_id}`
      );
      const fileInfo = await fileInfoRes.json();
      const tgFilePath = fileInfo?.result?.file_path;

      if (!tgFilePath) {
        throw new Error('Could not retrieve photo path from Telegram');
      }

      const imgRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${tgFilePath}`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const screenshotHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check duplicate screenshot hash
      const { data: dupHash } = await supabaseAdmin
        .from('contributions')
        .select('id')
        .eq('screenshot_hash', screenshotHash)
        .eq('status', 'counted')
        .maybeSingle();

      if (dupHash) {
        await supabaseAdmin.from('bot_sessions').delete().eq('telegram_chat_id', chatId);
        const dupImgMsg =
          lang === 'am'
            ? '⚠️ ይህ የደረሰኝ ፎቶ ቀደም ብሎ ተመዝግቧል።'
            : '⚠️ This exact screenshot image has already been recorded.';
        await sendTelegramMessage(chatId, dupImgMsg, member?.id ?? null, 'prompt', lang);
        return NextResponse.json({ ok: true });
      }

      // Upload to private Supabase Storage bucket
      const { monthKey: ethiopianMonth } = getEthiopianDateParts();
      const storagePath = `${ethiopianMonth}/${crypto.randomUUID()}.jpg`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('screenshots')
        .upload(storagePath, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const amountBirr = Number(session.amount_birr);
      const kind = member?.role === 'sponsor' ? 'sponsor' : 'partner';

      const { error: insertErr } = await supabaseAdmin.from('contributions').insert({
        member_id: member?.id ?? null,
        source: 'telegram',
        kind,
        amount_birr: amountBirr,
        method,
        reference_no: text,
        screenshot_path: storagePath,
        screenshot_hash: screenshotHash,
        ethiopian_month: ethiopianMonth,
        status: 'counted',
      });

      if (insertErr) {
        await supabaseAdmin.storage.from('screenshots').remove([storagePath]);
        throw new Error(insertErr.message);
      }

      // Clear session & send thank-you message
      await supabaseAdmin.from('bot_sessions').delete().eq('telegram_chat_id', chatId);

      const thanksMsg =
        lang === 'am'
          ? `🙏 እናመሰግናለን! የ${amountBirr.toLocaleString()} ብር አስተዋጽኦዎ በተሳካ ሁኔታ ተመዝግቧል። እግዚአብሔር ይባርክዎት!`
          : `🙏 Thank you! Your contribution of ${amountBirr.toLocaleString()} ETB has been recorded.`;

      await sendTelegramMessage(chatId, thanksMsg, member?.id ?? null, 'thanks', lang);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true }); // Return 200 so Telegram doesn't infinitely retry
  }
}