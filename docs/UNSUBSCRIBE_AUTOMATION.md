# Unsubscribe Automation

Complete guide to the automated email unsubscribe feature using AI-powered browser automation.

## Overview

The unsubscribe automation feature allows users to automatically unsubscribe from multiple emails with a single click. It uses Playwright browser automation to:

1. Extract unsubscribe links from email content
2. Navigate to unsubscribe pages
3. Interact with forms, buttons, and checkboxes
4. Verify successful unsubscription
5. Report results for each email

## Features

### Smart Link Extraction

The system intelligently extracts unsubscribe links from multiple sources:

**Priority Order:**
1. **List-Unsubscribe Header** (RFC 2369) - Most reliable
2. **HTML Anchor Tags** - "Unsubscribe" text
3. **Opt-out Links** - "Opt out" or "Opt-out" text
4. **Preferences Links** - "Manage preferences" text
5. **URL Patterns** - Links containing "unsubscribe" in the URL
6. **Plain Text URLs** - Fallback to text parsing

**Supported Patterns:**
- `<a href="...">Unsubscribe</a>`
- `<a href="...">Opt out</a>`
- `<a href="...">Manage preferences</a>`
- Links with "unsubscribe" in the URL path
- List-Unsubscribe header: `<https://example.com/unsub>`
- Plain text URLs with "unsubscribe"

### Browser Automation Strategies

The automation uses multiple strategies to handle different unsubscribe page types:

#### Strategy 1: Button/Link Clicking
Looks for explicit unsubscribe buttons or links:
- `button:has-text("Unsubscribe")`
- `button:has-text("Opt out")`
- `a:has-text("Unsubscribe")`
- Buttons/links with "unsubscribe" in class or id
- Generic submit buttons (lower priority)

#### Strategy 2: Checkbox Forms
Handles preference centers with checkboxes:
- Unchecks subscription checkboxes
- Submits the form after unchecking
- Identifies subscription-related checkboxes by context

#### Strategy 3: Preference Centers
Manages radio button preference centers:
- Selects "Unsubscribe from all" option
- Handles "none" or "unsubscribe" radio values
- Submits preferences

### Success Detection

The system detects successful unsubscription using multiple methods:

**Success Patterns:**
- "unsubscribed successfully"
- "successfully unsubscribed"
- "successfully removed"
- "you have been unsubscribed"
- "you have been removed"
- "preferences updated"
- "subscription cancelled"
- "no longer receive"
- "will not receive"
- "removed from mailing list"

**Already Unsubscribed Detection:**
- "already unsubscribed"
- "already removed"
- "not subscribed"
- "no longer subscribed"

## API Endpoint

### POST `/api/emails/unsubscribe`

Bulk unsubscribe from multiple emails.

**Request Body:**
```json
{
  "emailIds": ["email-id-1", "email-id-2", "email-id-3"]
}
```

**Response:**
```json
{
  "success": true,
  "successful": 2,
  "failed": 0,
  "noLink": 1,
  "total": 3,
  "details": [
    {
      "emailId": "email-id-1",
      "subject": "Newsletter",
      "status": "success",
      "message": "Successfully unsubscribed (Clicked: button:has-text(\"Unsubscribe\"))"
    },
    {
      "emailId": "email-id-2",
      "subject": "Marketing Email",
      "status": "success",
      "message": "Already unsubscribed"
    },
    {
      "emailId": "email-id-3",
      "subject": "Product Updates",
      "status": "no_link",
      "message": "No unsubscribe link found"
    }
  ]
}
```

**Status Codes:**
- `200`: Success (even if some emails failed)
- `400`: Bad request (missing or invalid emailIds)
- `401`: Unauthorized (no user session)
- `500`: Server error

## Security Features

### URL Sanitization

All extracted URLs are sanitized and validated:

✅ **Allowed:**
- HTTP and HTTPS protocols only
- Valid URL format with hostname

❌ **Blocked:**
- `javascript:` protocol
- `data:` protocol
- `file:` protocol
- `vbscript:` protocol
- Malformed URLs
- URLs without hostnames

### Access Control

- **Email Ownership Verification**: Users can only unsubscribe from their own emails
- **Category-Based Access**: Emails are verified through category ownership
- **Session Validation**: User session required for all operations

### Browser Security

- Runs in headless mode (no UI)
- Sandboxed browser environment
- No user data persistence
- Timeout protection (30 seconds default)
- Network isolation

## Usage

### From the UI

1. Navigate to a category page
2. Select emails using checkboxes
3. Click the "Unsubscribe" button
4. Confirm the action in the dialog
5. Wait for results (shown as toast notification)

**Example Toast:**
```
Unsubscribe completed
5 successful, 1 failed
```

### Programmatically

```typescript
const response = await fetch('/api/emails/unsubscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    emailIds: ['email-1', 'email-2', 'email-3']
  })
});

const result = await response.json();

console.log(`Success: ${result.successful}`);
console.log(`Failed: ${result.failed}`);
console.log(`No Link: ${result.noLink}`);

result.details.forEach(detail => {
  console.log(`${detail.subject}: ${detail.status} - ${detail.message}`);
});
```

## Error Handling

### Common Errors

| Error | Description | Solution |
|-------|-------------|----------|
| `Email not found` | Email ID doesn't exist | Verify email exists |
| `Access denied` | User doesn't own the email | Check ownership |
| `No unsubscribe link found` | Email has no unsubscribe mechanism | Manual intervention needed |
| `Failed to load page` | HTTP 4xx/5xx error | Retry or skip |
| `Timeout` | Page load/interaction timeout | Increase timeout or skip |
| `Network error` | Connection failed | Check network/URL |
| `Could not find button` | No matching elements | Page structure unsupported |

### Timeout Configuration

- **Page Load**: 30 seconds
- **Element Interaction**: 5 seconds per action
- **Navigation**: 10 seconds
- **Success Detection**: 2 seconds

### Retry Strategy

Currently, the system processes emails sequentially without retries. Failed emails are reported in the results.

**Future Enhancements:**
- Automatic retry for network errors
- Exponential backoff for rate limits
- CAPTCHA detection and reporting

## Performance

### Expected Processing Time

| Scenario | Time per Email | Notes |
|----------|----------------|-------|
| Simple button click | 3-5 seconds | Fast |
| Form submission | 5-8 seconds | Medium |
| Multi-step confirmation | 8-15 seconds | Slow |
| Already unsubscribed | 2-3 seconds | Very fast |
| No link found | <1 second | Instant |
| Network timeout | 30 seconds | Max timeout |

### Recommendations

- Process emails in batches of 10-20
- Allow 5-10 minutes for large batches
- Monitor for rate limiting from email services
- Consider running during off-peak hours

## Testing

### Integration Tests

Comprehensive test suite with mock unsubscribe servers:

```bash
npm test -- tests/integration/unsubscribe.test.ts
```

**Test Coverage:**
- ✅ Link extraction (10 tests)
- ✅ Browser automation - Simple button (3 tests)
- ✅ Browser automation - Form with checkboxes (1 test)
- ✅ Browser automation - Confirmation page (1 test)
- ✅ Browser automation - Preference center (1 test)
- ✅ Error handling (3 tests)
- ✅ Bulk processing (3 tests)
- ✅ Response format (2 tests)
- ✅ Security (4 tests)
- ✅ Edge cases (2 tests)

**Total: 30 tests, all passing**

### Manual Testing

1. **Create test emails** with different unsubscribe patterns
2. **Import to categories**
3. **Run bulk unsubscribe**
4. **Verify results** in the UI and logs

## Limitations

### Current Limitations

❌ **CAPTCHA Pages**: Cannot solve CAPTCHAs automatically
❌ **Login-Required Pages**: Cannot authenticate with email services
❌ **JavaScript-Heavy SPAs**: May have timing issues
❌ **Rate Limiting**: No built-in rate limit handling
❌ **Email Confirmation**: Cannot confirm via email links

### Unsupported Patterns

- Unsubscribe via email reply
- Unsubscribe via phone/fax
- Multi-step email confirmation required
- Login/password required pages
- CAPTCHA-protected forms
- Pages requiring JavaScript execution delays

## Troubleshooting

### Issue: "No unsubscribe link found"

**Possible Causes:**
- Email legitimately has no unsubscribe link
- Link is in an image (not extractable)
- Link requires authentication
- Link is obfuscated or encoded

**Solutions:**
- Check email HTML manually
- Use "View in Gmail" to find link
- Contact sender directly
- Report as spam if no unsubscribe option

### Issue: "Could not find unsubscribe button"

**Possible Causes:**
- Page structure not recognized
- Button text in different language
- Dynamic loading not complete
- Custom/unusual page structure

**Solutions:**
- Increase wait time in code
- Add new selector patterns
- Open link manually and inspect page
- Report issue with page URL

### Issue: "Browser automation failed: timeout"

**Possible Causes:**
- Slow page load
- Large page assets
- Network latency
- Server response time

**Solutions:**
- Retry the operation
- Check network connection
- Increase timeout value
- Skip and process manually

### Issue: "Network error: Could not connect"

**Possible Causes:**
- Invalid or expired URL
- Server is down
- Firewall blocking
- DNS resolution failure

**Solutions:**
- Verify URL is accessible
- Check server status
- Try from different network
- Skip email

## Future Enhancements

### Planned Features

🔮 **Short-term:**
- [ ] Retry mechanism for failed attempts
- [ ] Better CAPTCHA detection and reporting
- [ ] Support for more languages
- [ ] Parallel processing with concurrency limits
- [ ] Progress indicators for long-running operations

🔮 **Long-term:**
- [ ] Machine learning for button detection
- [ ] Support for email-based confirmation
- [ ] Unsubscribe history tracking
- [ ] Sender reputation scoring
- [ ] Automatic pattern learning
- [ ] Integration with anti-spam services

## Best Practices

### For Users

1. **Review before unsubscribing**: Make sure you want to unsubscribe
2. **Start small**: Test with a few emails first
3. **Monitor results**: Check the detailed results
4. **Handle failures manually**: Some emails need manual intervention
5. **Be patient**: Large batches take time

### For Developers

1. **Add logging**: Track automation steps for debugging
2. **Handle errors gracefully**: Don't crash on individual failures
3. **Test thoroughly**: Use integration tests before deploying
4. **Monitor performance**: Track success rates and timing
5. **Update selectors**: Keep selector patterns up to date

## Architecture

```
User Request
    ↓
POST /api/emails/unsubscribe
    ↓
Validate Request & Auth
    ↓
For each email:
    ↓
    Fetch email from DB
    ↓
    Verify ownership
    ↓
    Extract unsubscribe link
    ↓
    Launch browser
    ↓
    Navigate to page
    ↓
    Execute strategies:
    - Click button
    - Submit form
    - Change preferences
    ↓
    Detect success
    ↓
    Close browser
    ↓
    Record result
    ↓
Return aggregate results
```

## Dependencies

- **Playwright**: Browser automation
- **Next.js**: API endpoint framework
- **Supabase**: Database for email storage
- **TypeScript**: Type safety

## Logging

The system logs key events for debugging:

```
[Unsubscribe] Navigating to: https://example.com/unsubscribe
[Unsubscribe] Found element: button:has-text("Unsubscribe")
[Unsubscribe] Clicked: button:has-text("Unsubscribe")
[Unsubscribe] Success pattern matched: /successfully\s+unsubscribed/i
```

## Monitoring

### Key Metrics to Track

- **Success Rate**: % of successful unsubscribes
- **Processing Time**: Average time per email
- **Error Rate**: % of failures by type
- **Link Detection Rate**: % of emails with extractable links
- **Page Type Distribution**: Button vs form vs preference

### Recommended Alerts

- Success rate drops below 70%
- Average processing time exceeds 15 seconds
- Error rate exceeds 20%
- Browser crashes or timeouts

## Support

For issues or questions:
1. Check this documentation
2. Review integration test examples
3. Check logs for error details
4. Open an issue with reproduction steps

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready ✅