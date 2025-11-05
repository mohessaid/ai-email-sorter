import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabaseClient";

/**
 * POST /api/gmail/sync
 *
 * Fetches emails from Gmail, classifies them with AI, and imports into database.
 * Limited to 5 emails per sync due to serverless function constraints.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 },
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get the Google account with tokens
    const { data: account, error: accountError } = await supabase
      .from("google_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (accountError || !account) {
      console.error("Account not found:", accountError);
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 },
      );
    }

    // Check if token is expired
    const tokenExpiry = new Date(account.token_expiry);
    const now = new Date();
    if (tokenExpiry <= now) {
      // TODO: Implement token refresh
      return NextResponse.json(
        { error: "Access token expired. Please reconnect your account." },
        { status: 401 },
      );
    }

    // Get user's categories for AI classification
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, description")
      .eq("user_id", userId);

    if (categoriesError) {
      console.error("Failed to fetch categories:", categoriesError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }

    // Find or create Inbox category
    let inboxCategory = categories?.find(
      (c) => c.name.toLowerCase() === "inbox",
    );

    if (!inboxCategory) {
      // Create Inbox category
      const { data: newInbox, error: inboxError } = await supabase
        .from("categories")
        .insert({
          name: "Inbox",
          description: "Uncategorized emails and new imports",
          user_id: userId,
        })
        .select()
        .single();

      if (inboxError) {
        console.error("Failed to create Inbox:", inboxError);
        return NextResponse.json(
          { error: "Failed to create Inbox category" },
          { status: 500 },
        );
      }

      inboxCategory = newInbox;
      console.log("Created Inbox category:", inboxCategory.id);
    }

    // Get all categories including Inbox for AI classification
    const allCategories = categories || [];
    if (
      inboxCategory &&
      !allCategories.find((c) => c.id === inboxCategory!.id)
    ) {
      allCategories.push(inboxCategory);
    }

    // Filter out Inbox for AI classification (we'll use it as fallback)
    const classificationCategories = allCategories.filter(
      (c) => c.name.toLowerCase() !== "inbox",
    );

    // Fetch emails from Gmail API
    console.log(`[Sync] Fetching emails for account ${account.email}`);

    const gmailResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=in:inbox",
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      },
    );

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      console.error("Gmail API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch emails from Gmail" },
        { status: 500 },
      );
    }

    const gmailData = await gmailResponse.json();
    const messages = gmailData.messages || [];
    const totalInInbox = gmailData.resultSizeEstimate || 0;

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: "No new emails found in inbox",
      });
    }

    console.log(`[Sync] Found ${messages.length} emails to process`);

    // Process each email
    let imported = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        // Check if email already imported
        const { data: existing } = await supabase
          .from("emails")
          .select("id")
          .eq("gmail_message_id", msg.id)
          .single();

        if (existing) {
          console.log(`[Sync] Email ${msg.id} already imported, skipping`);
          continue;
        }

        // Fetch full email details
        const emailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          },
        );

        if (!emailResponse.ok) {
          console.error(`Failed to fetch email ${msg.id}`);
          errors.push(`Failed to fetch email ${msg.id}`);
          continue;
        }

        const emailData = await emailResponse.json();

        // Extract email details
        const headers = emailData.payload?.headers || [];
        const subject =
          headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
        const from =
          headers.find((h: any) => h.name === "From")?.value || "Unknown";
        const date =
          headers.find((h: any) => h.name === "Date")?.value ||
          new Date().toISOString();

        // Extract body (simplified - handles plain text)
        let body = "";
        if (emailData.payload?.body?.data) {
          body = Buffer.from(emailData.payload.body.data, "base64").toString();
        } else if (emailData.payload?.parts) {
          const textPart = emailData.payload.parts.find(
            (p: any) => p.mimeType === "text/plain",
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString();
          }
        }

        // Use AI to classify email
        // If no classification categories exist, use Inbox
        let categoryId: string;
        let summary: string;

        if (classificationCategories.length > 0) {
          const result = await classifyEmail(
            subject,
            body,
            from,
            classificationCategories,
          );
          categoryId = result.categoryId;
          summary = result.summary;
        } else {
          // No categories other than Inbox - put everything in Inbox
          categoryId = inboxCategory!.id;
          summary = `Email from ${from}: ${subject}`;
        }

        // Import email to database
        const emailRecord = {
          google_account_id: accountId,
          gmail_message_id: msg.id,
          category_id: categoryId,
          subject: subject,
          from_email: from,
          date: new Date(date).toISOString(),
          raw_text: body.substring(0, 10000), // Limit body size
          summarized_text: summary,
          processing_status: "processed",
          imported_at: new Date().toISOString(),
        };

        console.log(`[Sync] Attempting to insert email:`, {
          subject,
          categoryId,
          gmailId: msg.id,
        });

        const { error: insertError } = await supabase
          .from("emails")
          .insert(emailRecord);

        if (insertError) {
          console.error("Failed to insert email:", {
            subject,
            error: insertError,
            errorMessage: insertError.message,
            errorCode: insertError.code,
            errorDetails: insertError.details,
            emailRecord,
          });
          errors.push(
            `Failed to import email: ${subject} - ${insertError.message}`,
          );
          continue;
        }

        // Archive email in Gmail
        try {
          await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${account.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                removeLabelIds: ["INBOX"],
              }),
            },
          );
        } catch (archiveError) {
          console.error("Failed to archive email:", archiveError);
          // Don't fail the whole sync if archiving fails
        }

        imported++;
        console.log(`[Sync] Imported email: ${subject}`);
      } catch (err) {
        console.error("Error processing email:", err);
        errors.push(`Error processing email: ${err}`);
      }
    }

    // Update last_sync_at
    await supabase
      .from("google_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", accountId);

    console.log(`[Sync] Completed. Imported ${imported} emails`);

    let message = `Imported ${imported} emails`;
    if (totalInInbox > imported) {
      message += `. Due to processing limits, only 5 emails can be synced at once. There are ${
        totalInInbox - imported
      } emails remaining in your inbox. Please sync again to process more.`;
    }

    return NextResponse.json({
      success: true,
      imported,
      total: messages.length,
      remainingInInbox: totalInInbox - imported,
      message,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync emails", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Classify email using AI and generate summary
 */
async function classifyEmail(
  subject: string,
  body: string,
  from: string,
  categories: Array<{ id: string; name: string; description: string }>,
): Promise<{ categoryId: string; summary: string }> {
  try {
    // Prepare AI prompt
    const categoriesText = categories
      .map((c) => `- ${c.name}: ${c.description}`)
      .join("\n");

    const prompt = `You are an email classification assistant. Classify this email into one of the categories and provide a brief summary.

Categories:
${categoriesText}

Email Details:
From: ${from}
Subject: ${subject}
Body: ${body.substring(0, 1000)}

Respond in JSON format:
{
  "category": "category_name",
  "summary": "Brief 1-2 sentence summary of the email"
}`;

    // Try OpenRouter first, fallback to OpenAI
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let response;

    if (openrouterKey) {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
          "X-Title": "AI Email Sorter",
        },
        body: JSON.stringify({
          model: "tngtech/deepseek-r1t2-chimera:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } else if (openaiKey) {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } else {
      // No AI key - use simple classification
      console.warn("No AI key found, using fallback classification");
      return {
        categoryId: categories[0].id,
        summary: `Email from ${from}: ${subject}`,
      };
    }

    if (!response || !response.ok) {
      console.error("AI API failed, using fallback");
      return {
        categoryId: categories[0].id,
        summary: `Email from ${from}: ${subject}`,
      };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return {
        categoryId: categories[0].id,
        summary: `Email from ${from}: ${subject}`,
      };
    }

    // Parse AI response
    const parsed = JSON.parse(content);
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === parsed.category.toLowerCase(),
    );

    return {
      categoryId: matchedCategory?.id || categories[0]?.id,
      summary: parsed.summary || `Email from ${from}: ${subject}`,
    };
  } catch (error) {
    console.error("AI classification error:", error);
    // Fallback to first category if available
    return {
      categoryId: categories[0]?.id,
      summary: `Email from ${from}: ${subject}`,
    };
  }
}
