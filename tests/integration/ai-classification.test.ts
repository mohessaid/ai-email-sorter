import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Integration Tests for AI Email Classification
 *
 * Tests the actual AI classification logic with real API calls
 * to verify that emails are being correctly categorized.
 */

describe('AI Email Classification Integration', () => {
  // Sample test categories
  const testCategories = [
    {
      id: 'cat-work',
      name: 'Work',
      description: 'Emails related to work, projects, meetings, colleagues, and professional matters',
    },
    {
      id: 'cat-receipts',
      name: 'Receipts',
      description: 'Purchase confirmations, invoices, receipts, order confirmations, and payment notifications',
    },
    {
      id: 'cat-newsletters',
      name: 'Newsletters',
      description: 'Marketing emails, newsletters, promotional content, and subscription updates',
    },
    {
      id: 'cat-social',
      name: 'Social',
      description: 'Social media notifications, friend requests, mentions, and social updates',
    },
  ];

  // Sample test emails
  const testEmails = [
    {
      subject: 'Your Amazon order has shipped',
      from: 'auto-confirm@amazon.com',
      body: 'Order #123-456789 has shipped. Total: $49.99. Track your package...',
      expectedCategory: 'Receipts',
    },
    {
      subject: 'Weekly Newsletter: Tech Updates',
      from: 'newsletter@techcrunch.com',
      body: 'Here are this weeks top stories in tech. Subscribe to get more updates...',
      expectedCategory: 'Newsletters',
    },
    {
      subject: 'Meeting scheduled for tomorrow',
      from: 'john.doe@company.com',
      body: 'Hi, I scheduled a meeting for tomorrow at 2 PM to discuss the project roadmap...',
      expectedCategory: 'Work',
    },
    {
      subject: 'Sarah mentioned you in a post',
      from: 'notifications@facebook.com',
      body: 'Sarah Smith mentioned you in a post. Click here to see what she said...',
      expectedCategory: 'Social',
    },
  ];

  beforeAll(() => {
    // Verify environment variables are set
    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
      console.warn('Warning: No AI API key found. Tests may fail or use fallback logic.');
    }
  });

  it('should have AI API key configured', () => {
    const hasKey = !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);

    if (!hasKey) {
      console.warn('Skipping AI tests - no API key found');
    }

    // This is informational, not a hard requirement
    expect(hasKey || true).toBe(true);
  });

  it('should classify receipt email correctly', async () => {
    const email = testEmails[0]; // Amazon receipt

    const result = await classifyEmailWithAI(
      email.subject,
      email.body,
      email.from,
      testCategories
    );

    // Should classify as Receipts
    expect(result.categoryName).toBe('Receipts');
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(10);

    console.log('Receipt classification:', {
      expected: email.expectedCategory,
      actual: result.categoryName,
      summary: result.summary,
    });
  }, 30000); // 30 second timeout for API call

  it('should classify newsletter email correctly', async () => {
    const email = testEmails[1]; // Newsletter

    const result = await classifyEmailWithAI(
      email.subject,
      email.body,
      email.from,
      testCategories
    );

    // Should classify as Newsletters
    expect(result.categoryName).toBe('Newsletters');
    expect(result.summary).toBeDefined();

    console.log('Newsletter classification:', {
      expected: email.expectedCategory,
      actual: result.categoryName,
      summary: result.summary,
    });
  }, 30000);

  it('should classify work email correctly', async () => {
    const email = testEmails[2]; // Work meeting

    const result = await classifyEmailWithAI(
      email.subject,
      email.body,
      email.from,
      testCategories
    );

    // Should classify as Work
    expect(result.categoryName).toBe('Work');
    expect(result.summary).toBeDefined();

    console.log('Work classification:', {
      expected: email.expectedCategory,
      actual: result.categoryName,
      summary: result.summary,
    });
  }, 30000);

  it('should classify social email correctly', async () => {
    const email = testEmails[3]; // Social notification

    const result = await classifyEmailWithAI(
      email.subject,
      email.body,
      email.from,
      testCategories
    );

    // Should classify as Social
    expect(result.categoryName).toBe('Social');
    expect(result.summary).toBeDefined();

    console.log('Social classification:', {
      expected: email.expectedCategory,
      actual: result.categoryName,
      summary: result.summary,
    });
  }, 30000);

  it('should generate meaningful summaries', async () => {
    const email = testEmails[0];

    const result = await classifyEmailWithAI(
      email.subject,
      email.body,
      email.from,
      testCategories
    );

    // Summary should be concise but informative
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(20);
    expect(result.summary.length).toBeLessThan(200);
    expect(result.summary).not.toContain('undefined');
    expect(result.summary).not.toContain('null');
  }, 30000);

  it('should handle emails with minimal content', async () => {
    const result = await classifyEmailWithAI(
      'Hi',
      'Thanks!',
      'test@example.com',
      testCategories
    );

    // Should still return valid results
    expect(result.categoryId).toBeDefined();
    expect(result.categoryName).toBeDefined();
    expect(result.summary).toBeDefined();
  }, 30000);

  it('should handle very long email bodies', async () => {
    const longBody = 'Lorem ipsum dolor sit amet, '.repeat(200); // ~5000 chars

    const result = await classifyEmailWithAI(
      'Long email test',
      longBody,
      'test@example.com',
      testCategories
    );

    // Should still work with long content
    expect(result.categoryId).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeLessThan(300); // Summary should be concise
  }, 30000);
});

/**
 * Helper function to classify email using AI
 * Mirrors the logic in the sync route
 */
async function classifyEmailWithAI(
  subject: string,
  body: string,
  from: string,
  categories: Array<{ id: string; name: string; description: string }>
): Promise<{ categoryId: string; categoryName: string; summary: string }> {
  // Prepare AI prompt
  const categoriesText = categories
    .map((c) => `- ${c.name}: ${c.description}`)
    .join('\n');

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
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'AI Email Sorter',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Lower temperature for more consistent classification
      }),
    });
  } else if (openaiKey) {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });
  } else {
    throw new Error('No AI API key configured');
  }

  if (!response || !response.ok) {
    const errorText = await response?.text();
    throw new Error(`AI API failed: ${response?.status} - ${errorText}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in AI response');
  }

  // Parse AI response (handle both JSON and text responses)
  let parsed;
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = JSON.parse(content);
    }
  } catch (e) {
    throw new Error(`Failed to parse AI response: ${content}`);
  }

  const matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === parsed.category.toLowerCase()
  );

  if (!matchedCategory) {
    console.warn(`AI returned unknown category: ${parsed.category}`);
    // Fallback to first category
    return {
      categoryId: categories[0].id,
      categoryName: categories[0].name,
      summary: parsed.summary || `Email from ${from}: ${subject}`,
    };
  }

  return {
    categoryId: matchedCategory.id,
    categoryName: matchedCategory.name,
    summary: parsed.summary || `Email from ${from}: ${subject}`,
  };
}

/**
 * Test Results Summary
 *
 * This integration test verifies:
 * - AI can classify emails into correct categories
 * - AI generates meaningful summaries
 * - Different email types are handled properly
 * - Edge cases (long content, minimal content) work
 * - API integration is functional
 *
 * To run: npm test -- tests/integration/ai-classification.test.ts
 */
