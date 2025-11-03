import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getGoogleClient } from "@/lib/google";
import { VERSION } from "@/version";

const BATCH_SIZE = VERSION.FLAGS.MAX_BATCH_SIZE;
const MAX_RETRIES = VERSION.FLAGS.RETRY_ATTEMPTS;

type UnsubscribeResult = {
  emailId: string;
  success: boolean;
  message: string;
  retries?: number;
};

async function unsubscribeEmail(
  gmail: any,
  email: any,
  supabase: any,
): Promise<UnsubscribeResult> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // First check if message still exists and has List-Unsubscribe
      const message = await gmail.users.messages.get({
        userId: "me",
        id: email.gmail_message_id,
        format: "metadata",
        metadataHeaders: ["List-Unsubscribe"],
      });

      const listUnsubscribe = message.data.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === "list-unsubscribe",
      );

      // Log attempt in database
      const { data: attempt, error: logError } = await supabase
        .from("unsubscribe_attempts")
        .insert({
          email_id: email.id,
          method: listUnsubscribe ? "list_unsubscribe" : "mark_spam",
          status: "pending",
          link: listUnsubscribe?.value || null,
          details: {
            hasListUnsubscribe: !!listUnsubscribe,
            messageExists: true,
            attempt: retries + 1,
          },
        })
        .select()
        .single();

      if (logError) {
        console.error("Error logging attempt:", logError);
      }

      if (!message.data) {
        throw new Error("Email no longer exists in Gmail");
      }

      // If message has List-Unsubscribe header, use Gmail's native unsubscribe
      if (listUnsubscribe) {
        await gmail.users.messages.modify({
          userId: "me",
          id: email.gmail_message_id,
          requestBody: {
            removeLabelIds: ["UNSUBSCRIBE"],
          },
        });
      } else {
        // If no List-Unsubscribe, try to mark as spam to reduce future emails
        await gmail.users.messages.modify({
          userId: "me",
          id: email.gmail_message_id,
          requestBody: {
            addLabelIds: ["SPAM"],
          },
        });
      }

      // Update attempt status
      if (attempt) {
        await supabase
          .from("unsubscribe_attempts")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
            details: {
              ...attempt.details,
              action: listUnsubscribe ? "unsubscribe" : "mark_spam",
              completedAt: new Date().toISOString(),
            },
          })
          .eq("id", attempt.id);
      }

      return {
        emailId: email.id,
        success: true,
        message: listUnsubscribe
          ? "Unsubscribed via Gmail API"
          : "Marked as spam (no unsubscribe header)",
        retries,
      };
    } catch (error) {
      retries++;

      if (retries === MAX_RETRIES) {
        // Log final failure
        await supabase.from("unsubscribe_attempts").insert({
          email_id: email.id,
          method: "failed",
          status: "failed",
          error_message: error.message,
          details: {
            errorCode: error.code,
            retries,
            finalError: true,
            failedAt: new Date().toISOString(),
          },
          completed_at: new Date().toISOString(),
        });

        return {
          emailId: email.id,
          success: false,
          message: `Failed after ${retries} attempts: ${error.message}`,
          retries,
        };
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retries) * 1000),
      );
    }
  }

  return {
    emailId: email.id,
    success: false,
    message: "Maximum retries exceeded",
    retries,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { emailIds } = await request.json();

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty emailIds array" },
        { status: 400 },
      );
    }

    const cookieStore = cookies();
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get: cookieStore.get.bind(cookieStore) } },
    );

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      total: emailIds.length,
      details: [] as UnsubscribeResult[],
      version: VERSION.FEATURES.UNSUBSCRIBE.version,
    };

    // Process emails in batches to stay within serverless time limits
    for (let i = 0; i < emailIds.length; i += BATCH_SIZE) {
      const batch = emailIds.slice(i, i + BATCH_SIZE);

      // Get emails and account details
      const { data: emails, error: emailsError } = await supabase
        .from("emails")
        .select(
          `
          id,
          gmail_message_id,
          subject,
          google_accounts (
            id,
            email,
            access_token,
            refresh_token
          )
        `,
        )
        .in("id", batch);

      if (emailsError) {
        throw new Error(`Failed to fetch emails: ${emailsError.message}`);
      }

      if (!emails || emails.length === 0) {
        results.skipped += batch.length;
        batch.forEach((emailId) => {
          results.details.push({
            emailId,
            success: false,
            message: "Email not found",
          });
        });
        continue;
      }

      // Group emails by google account for efficiency
      const emailsByAccount = emails.reduce((acc, email) => {
        if (!email.google_accounts) {
          results.skipped++;
          results.details.push({
            emailId: email.id,
            success: false,
            message: "No associated Google account",
          });
          return acc;
        }

        const accountId = email.google_accounts.id;
        if (!acc[accountId]) {
          acc[accountId] = {
            account: email.google_accounts,
            emails: [],
          };
        }
        acc[accountId].emails.push(email);
        return acc;
      }, {});

      // Process each account's emails
      for (const { account, emails } of Object.values(emailsByAccount)) {
        try {
          const auth = await getGoogleClient(account);
          const gmail = google.gmail({ version: "v1", auth });

          // Process emails for this account in parallel
          const accountResults = await Promise.all(
            emails.map((email) => unsubscribeEmail(gmail, email, supabase)),
          );

          // Update results
          accountResults.forEach((result) => {
            if (result.success) {
              results.successful++;
            } else {
              results.failed++;
            }
            results.details.push(result);
          });
        } catch (error) {
          console.error(`Error processing account ${account.email}:`, error);
          // Mark all emails for this account as failed
          emails.forEach((email) => {
            results.failed++;
            results.details.push({
              emailId: email.id,
              success: false,
              message: `Account error: ${error.message}`,
            });
          });
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      {
        error: "Failed to process unsubscribe requests",
        details: error.message,
        version: VERSION.FEATURES.UNSUBSCRIBE.version,
      },
      { status: 500 },
    );
  }
}
