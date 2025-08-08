# Phase 1 Testing Guide

## Quick Test Setup

1. **Reload Extension**:

   - Go to `chrome://extensions/`
   - Find "Job Application Assistant"
   - Click the reload button 🔄

2. **Set OpenAI API Key** (optional but recommended):

   - Click extension icon in browser
   - Enter your OpenAI API key
   - Save settings

3. **Navigate to a job application page**:

   - Go to: https://apply.workable.com/lago-1/j/88ECCCE5E5/apply/
   - Or any other job application form

4. **Open Browser Console**:
   - Press `F12` or `Cmd+Option+I` (Mac)
   - Go to "Console" tab

## Test Commands

### Run Complete Phase 1 Test

```javascript
testPhase1();
```

This will test all three components:

- 📊 Page Analysis (extract form fields)
- 🤖 AI Service (generate field values)
- ⚙️ Response Processing (map AI response to fields)

### Test Individual Components

**Page Analysis Only**:

```javascript
testPageOnly();
```

**Analyze Current Page Forms**:

```javascript
testCurrentPage();
```

**Manual Component Testing**:

```javascript
// Test page analyzer
const pageAnalyzer = new PageAnalyzer();
const pageData = pageAnalyzer.extractPageData();
console.log(pageData);

// Test AI service (requires API key)
const aiService = new AIService();
await aiService.initialize();
// ... use with page data

// Test response processor
const processor = new ResponseProcessor();
const result = processor.processResponse(aiResponse, pageData);
console.log(result.getSummary());
```

## Expected Results

### ✅ Successful Test Output:

```
🚀 Starting Phase 1 Integration Test...
===============================

📊 Testing Page Analysis...
✅ Page Analysis Success:
   - URL: https://apply.workable.com/...
   - Total Fields: 15
   - Field Types: { "text": 8, "select": 3, "checkbox": 2, "textarea": 2 }

🤖 Testing AI Service...
✅ AI Service initialized successfully
✅ AI Service Success:
   - Generated values for 12 fields

⚙️ Testing Response Processing...
✅ Response Processing Success:
   - Total fields: 15
   - Mapped fields: 12
   - Success rate: 80.0%
   - Required fields OK: true

📋 PHASE 1 TEST RESULTS
========================
Overall Status: ✅ PASSED

Component Status:
  📊 Page Analyzer: ✅ Working
  🤖 AI Service: ✅ Working
  ⚙️ Response Processor: ✅ Working

Next Steps:
  ✅ Phase 1 is ready!
  🚀 You can now proceed to Phase 3 (Smart Form Filler)
```

### ⚠️ Common Issues:

**No API Key**:

```
⚠️ No API key found - skipping AI test
   To test AI: Set OpenAI API key in extension popup
```

**No Form Fields**:

```
⚠️ No form fields found on current page
   Navigate to a job application form and try again
```

**API Key Issues**:

```
❌ AI Service Failed: API Error 401: Incorrect API key
```

## Troubleshooting

1. **Extension not loading**: Reload extension in chrome://extensions/
2. **Console errors**: Check for JavaScript errors in console
3. **API issues**: Verify API key is correct and has credits
4. **No forms detected**: Make sure you're on a page with form fields

## Next Steps After Successful Test

Once Phase 1 tests pass:

1. You can proceed to Phase 3 (Smart Form Filler)
2. Or test the current workflow on real job application forms
3. The AI should be able to analyze forms and generate appropriate values based on your CV data

## Debug Information

If tests fail, the console will show detailed error information to help diagnose issues. The test suite includes mock data fallbacks so you can test components even without a real form or API key.
