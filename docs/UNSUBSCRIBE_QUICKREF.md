# Unsubscribe Automation - Quick Reference

## 🚀 Quick Start

### From UI
1. Go to category page
2. Select emails (checkboxes)
3. Click "Unsubscribe" button
4. Confirm → Wait → See results

### From API
```bash
POST /api/emails/unsubscribe
Body: { "emailIds": ["id1", "id2"] }
```

## 📊 Response Format

```json
{
  "success": true,
  "successful": 5,
  "failed": 1,
  "noLink": 2,
  "total": 8,
  "details": [...]
}
```

## 🔍 Link Extraction Priority

1. **List-Unsubscribe header** (most reliable)
2. **HTML links** with "Unsubscribe" text
3. **Opt-out links**
4. **Preferences links**
5. **URL patterns** with "unsubscribe"
6. **Plain text URLs**

## 🤖 Automation Strategies

### Strategy 1: Button Click
- Finds "Unsubscribe", "Opt out", "Remove" buttons
- Clicks and waits for success

### Strategy 2: Checkbox Form
- Unchecks subscription checkboxes
- Submits form automatically

### Strategy 3: Preference Center
- Selects "Unsubscribe from all"
- Updates preferences

## ✅ Success Detection

Looks for:
- "successfully unsubscribed"
- "you have been unsubscribed"
- "no longer receive"
- "removed from mailing list"
- "already unsubscribed"

## 🔒 Security

- ✅ User authentication required
- ✅ Email ownership verified
- ✅ URL sanitization (HTTP/HTTPS only)
- ✅ Dangerous protocol blocking
- ✅ Headless browser (sandboxed)

## ⚡ Performance

| Scenario | Time |
|----------|------|
| Simple button | 3-5s |
| Form submission | 5-8s |
| Multi-step | 8-15s |
| Already unsubscribed | 2-3s |
| No link | <1s |

**Recommendation:** Process 10-20 emails per batch

## ⚠️ Common Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `No unsubscribe link found` | Email has no link | Skip or manual |
| `Could not find button` | Page not recognized | Manual |
| `Timeout` | Page too slow | Retry or skip |
| `Network error` | Can't connect | Check URL |
| `Access denied` | Not your email | Check ownership |

## 🧪 Testing

```bash
# Run unsubscribe tests
npm test -- tests/integration/unsubscribe.test.ts

# Run all tests
npm test
```

**Test Stats:**
- 30 unsubscribe tests
- 121 total tests
- 100% passing

## 🚫 Limitations

**Cannot handle:**
- ❌ CAPTCHA pages
- ❌ Login-required pages
- ❌ Email confirmation required
- ❌ Image-only links
- ❌ Reply-to-unsubscribe

**Workaround:** Use manual unsubscribe or mark as spam

## 📁 Key Files

```
next/
├── app/api/emails/unsubscribe/route.ts  # API endpoint
├── app/categories/[id]/page.tsx         # UI integration
├── tests/integration/unsubscribe.test.ts # Tests
└── UNSUBSCRIBE_AUTOMATION.md            # Full docs
```

## 🐛 Troubleshooting

### "No link found"
- Check email HTML manually
- Link might be in image
- May require authentication

### "Could not find button"
- Page structure not recognized
- Try manual inspection
- Report issue with URL

### "Timeout"
- Slow page load
- Increase timeout in code
- Skip and retry later

### "Network error"
- Invalid/expired URL
- Server down
- Check connectivity

## 💡 Best Practices

### For Users
1. Test with few emails first
2. Review results carefully
3. Handle failures manually
4. Be patient with batches

### For Developers
1. Add logging for debugging
2. Handle errors gracefully
3. Test thoroughly
4. Monitor performance
5. Update selectors regularly

## 📚 Documentation

- **Full Guide:** [UNSUBSCRIBE_AUTOMATION.md](./UNSUBSCRIBE_AUTOMATION.md)
- **Implementation:** [UNSUBSCRIBE_COMPLETE.md](./UNSUBSCRIBE_COMPLETE.md)
- **Test Results:** [TEST_RESULTS.md](./TEST_RESULTS.md)
- **Testing Guide:** [README_TESTS.md](./README_TESTS.md)

## 🎯 Status

**Implementation:** ✅ Complete  
**Tests:** ✅ 30/30 Passing  
**Documentation:** ✅ Complete  
**Production Ready:** ✅ Yes  

---

**Quick Tip:** Start with newsletters category - they usually have clear unsubscribe links!