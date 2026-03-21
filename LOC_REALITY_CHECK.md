# LOC Reality Check: QuickJS DOM Shim Estimates

## Executive Summary

The DOM API spec's implementation estimates are **5-50x too low**. This document explains why and provides realistic estimates based on actual evidence from the test harness.

---

## What Is LOC?

**LOC = Lines of Code**

A standard measure of codebase size. But raw LOC doesn't tell the whole story:

| Type of Code | Example | Hidden Complexity |
|--------------|---------|-------------------|
| Business logic | `fn cookie() []const u8` | Actual behavior implementation |
| FFI bindings | JS↔Zig type conversion | 2-3x the business logic |
| Error handling | Try/catch, null checks | 30-50% of total code |
| Tests | Unit tests, integration tests | 50-100% of implementation code |
| Documentation | Comments, README | 10-20% of code |

---

## The Spec's Claims vs Reality

| Phase | Spec Estimate | Realistic Estimate | Actual Evidence |
|-------|---------------|-------------------|-----------------|
| **Phase 1 (MVP)** | ~200 LOC | **500-1,000 LOC** | Test harness proxy: 470 lines (logging only) |
| **Phase 2** | ~800 LOC | **2,000-3,000 LOC** | Full harness: 1,512 lines |
| **Phase 3** | ~2,000 LOC | **5,000-8,000 LOC** | Not implemented |
| **Phase 4** | ~5,000 LOC | **15,000-25,000 LOC** | Not implemented |

---

## Evidence from the Test Harness

### What the Harness Actually Does

The test harness (`spec-analysis.js`, `batch-test.js`) is **1,512 lines** of JavaScript.

**What it does:**
- ✅ Logs property accesses via Proxy traps
- ✅ Returns dummy objects for undefined properties
- ✅ Fetches HTML and extracts scripts
- ✅ Runs scripts in QuickJS WASM

**What it does NOT do:**
- ❌ Implement actual DOM behavior
- ❌ Handle FFI bindings (runs in Node.js, not Zig)
- ❌ Provide production error handling
- ❌ Include tests for itself

### The Gap: Logging vs Implementing

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION COMPLEXITY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Logging Mock (what we have)     ████████████  1,512 LOC        │
│                                                                 │
│  Real Implementation (what we need)                             │
│  ├─ FFI Bindings                 ████████████████████  ~500 LOC │
│  ├─ Actual DOM Logic             ████████████████████████ ~800 LOC │
│  ├─ Error Handling               ████████████  ~300 LOC            │
│  ├─ Memory Management            ████████  ~200 LOC                │
│  └─ Tests                        ████████████████  ~400 LOC         │
│                                                                 │
│  TOTAL REAL IMPLEMENTATION:     ~2,200-3,000 LOC                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Multiplier: 1.5-2x for logging mock → real implementation**

---

## Why FFI Bindings Are Expensive

For a Zig-native implementation, every DOM API crossing the JS↔Zig boundary needs:

### Example: `document.getElementsByClassName`

**Naive (5 lines):**
```zig
fn getElementsByClassName(name: []const u8) HTMLCollection {
    return self.elements.filter(|e| e.hasClass(name));
}
```

**Reality (50-80 lines):**
```zig
fn getElementsByClassName(
    ctx: *JSContext,
    this_val: JSValue,
    argc: c_int,
    argv: [*]JSValue
) callconv(.C) JSValue {
    // 1. Validate argument count (5 lines)
    if (argc < 1) {
        return JS_ThrowTypeError(ctx, "expected 1 argument");
    }
    
    // 2. Convert JS string to Zig string (15 lines)
    const name_val = argv[0];
    if (!JS_IsString(name_val)) {
        return JS_ThrowTypeError(ctx, "expected string");
    }
    const name_ptr = JS_ToCString(ctx, name_val);
    defer JS_FreeCString(ctx, name_ptr);
    const name = std.mem.span(name_ptr);
    
    // 3. Get document from this_val (10 lines)
    const doc = JS_GetOpaque(this_val, document_class_id);
    if (doc == null) {
        return JS_ThrowTypeError(ctx, "invalid this");
    }
    
    // 4. Actually perform the query (20 lines)
    var results = ArrayList.init(allocator);
    for (elem in doc.elements) {
        if (elem.hasClass(name)) {
            results.append(elem);
        }
    }
    
    // 5. Create HTMLCollection JS object (15 lines)
    const collection = HTMLCollection.create(results);
    const js_collection = JS_NewObjectClass(ctx, htmlcollection_class_id);
    JS_SetOpaque(js_collection, collection);
    
    // 6. Register finalizer for memory cleanup (10 lines)
    JS_NewGlobalRef(ctx, js_collection);
    
    return js_collection;
}
```

**FFI overhead: 3-5x the "business logic" LOC**

---

## Hidden Complexity Per API

### Case Study: `document.cookie`

**Seems simple, right? 5 lines?**

**Reality: 50-100 lines**

```
┌─────────────────────────────────────────────────────────────────┐
│                    document.cookie COMPLEXITY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What you think:                                                │
│  fn cookie() []const u8 { return self.cookie; }  // 1 line      │
│                                                                 │
│  What you actually need:                                        │
│  ├─ Parse Set-Cookie headers from HTTP response      ~15 LOC    │
│  ├─ Store in cookie jar with domain/path/secure      ~10 LOC    │
│  ├─ Handle cookie expiration (max-age, expires)      ~10 LOC    │
│  ├─ Match cookies to current URL (domain/path)       ~15 LOC    │
│  ├─ Handle HttpOnly, SameSite, Secure attributes     ~10 LOC    │
│  ├─ Serialize back to cookie string format           ~10 LOC    │
│  ├─ Handle cookie size limits (4KB per cookie)       ~5 LOC     │
│  ├─ Handle cookie count limits (50 per domain)       ~5 LOC     │
│  └─ FFI bindings to expose to JS                     ~10 LOC    │
│                                                                 │
│  TOTAL: ~90 LOC                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Realistic Per-API Estimates

| API | Naive Estimate | Realistic Estimate | Hidden Complexity |
|-----|----------------|-------------------|-------------------|
| `document.getElementById` | 5 LOC | 40-60 LOC | Query + null handling + FFI |
| `document.getElementsByClassName` | 10 LOC | 60-80 LOC | Live collection + FFI |
| `document.querySelector` | 10 LOC | 100-150 LOC | CSS selector parser |
| `element.appendChild` | 5 LOC | 40-60 LOC | Tree mutation + events |
| `element.style` | 5 LOC | 80-120 LOC | CSS parsing + cascade |
| `localStorage.getItem` | 5 LOC | 30-50 LOC | Persistence + serialization |
| `fetch()` | 10 LOC | 200-300 LOC | HTTP client + streaming + CORS |

---

## Component Breakdown: Realistic Phase 1

```
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1 MVP: REALISTIC IMPLEMENTATION                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Core Infrastructure                                             │
│  ├─ QuickJS context management                        ~50 LOC    │
│  ├─ FFI type conversion utilities                     ~100 LOC   │
│  ├─ Memory management (handles, finalizers)           ~80 LOC   │
│  └─ Error handling framework                          ~50 LOC    │
│  Subtotal:                                           ~280 LOC    │
│                                                                 │
│  Document Object                                                 │
│  ├─ document.addEventListener                         ~40 LOC    │
│  ├─ document.getElementsByClassName                    ~60 LOC   │
│  ├─ document.documentElement                          ~30 LOC   │
│  ├─ document.cookie (stub)                            ~20 LOC   │
│  ├─ document.readyState, URL, etc.                    ~30 LOC   │
│  └─ FFI bindings for document                         ~80 LOC   │
│  Subtotal:                                           ~260 LOC    │
│                                                                 │
│  Window Object                                                    │
│  ├─ window.location                                  ~40 LOC    │
│  ├─ window.localStorage (stub)                       ~30 LOC    │
│  ├─ window.navigator                                 ~20 LOC    │
│  ├─ window.setTimeout/stubs                          ~20 LOC    │
│  └─ FFI bindings for window                          ~60 LOC    │
│  Subtotal:                                           ~170 LOC    │
│                                                                 │
│  Supporting Types                                                 │
│  ├─ HTMLCollection (minimal)                         ~40 LOC    │
│  ├─ Element (stub)                                   ~30 LOC    │
│  └─ Event (stub)                                     ~20 LOC    │
│  Subtotal:                                           ~90 LOC     │
│                                                                 │
│  Tests                                                            │
│  ├─ Unit tests for FFI                              ~100 LOC    │
│  ├─ Integration tests (HN)                           ~100 LOC    │
│  └─ Error case tests                                 ~50 LOC    │
│  Subtotal:                                           ~250 LOC    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│  TOTAL PHASE 1:                                    ~1,050 LOC    │
│  Spec claimed:                                        ~200 LOC    │
│  MULTIPLIER:                                          5.25x       │
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Revised Phase Estimates

| Phase | Spec Estimate | Revised Estimate | Rationale |
|-------|---------------|------------------|-----------|
| **Phase 1** | 200 LOC | **1,000-1,500 LOC** | Core FFI + 5 APIs + tests |
| **Phase 2** | 800 LOC | **3,000-4,000 LOC** | Full document API + storage |
| **Phase 3** | 2,000 LOC | **8,000-12,000 LOC** | Observers + events + layout |
| **Phase 4** | 5,000 LOC | **20,000-30,000 LOC** | Full browser minus rendering |

---

## Lessons Learned

### 1. Test Harness ≠ Implementation

The 1,512-line test harness proves:
- ✅ Scripts CAN run without crashing
- ❌ Scripts work correctly
- ❌ The implementation is simple

**A logging mock is 10-50x simpler than a real implementation.**

### 2. FFI is the Hidden Multiplier

Every API crossing JS↔Zig needs:
- Type validation (10-15 lines)
- Type conversion (10-20 lines)
- Memory management (10-15 lines)
- Error handling (5-10 lines)

**Budget 2-3x for FFI overhead.**

### 3. "Simple" APIs Are Rarely Simple

| API | Why It's Complex |
|-----|------------------|
| `cookie` | RFC 6265 compliance, expiration, domain matching |
| `querySelector` | Full CSS selector parser |
| `style` | CSS parsing, cascade, specificity |
| `localStorage` | Persistence, quotas, serialization |
| `fetch` | HTTP client, streaming, CORS, authentication |

### 4. Tests Are Not Optional

For production quality:
- Unit tests: 50% of implementation LOC
- Integration tests: 30% of implementation LOC
- **Total tests: ~80% of implementation LOC**

---

## Recommendation

### Before Implementation

1. **Build a proof-of-concept for ONE API** (e.g., `getElementsByClassName`)
   - Include full FFI bindings
   - Include error handling
   - Include tests
   - Measure actual LOC
   - Use as baseline for estimates

2. **Multiply by API count**
   - If 1 API = 80 LOC
   - Then 10 APIs ≈ 800 LOC (not linear due to shared infrastructure)

3. **Add 50% for integration and tests**

### Realistic Planning

| Component | Conservative Estimate | Optimistic Estimate |
|-----------|----------------------|-------------------|
| Core infrastructure | 300 LOC | 200 LOC |
| 10 DOM APIs (average 50 LOC each) | 500 LOC | 400 LOC |
| FFI bindings | 200 LOC | 150 LOC |
| Error handling | 100 LOC | 50 LOC |
| Tests | 400 LOC | 300 LOC |
| **Phase 1 Total** | **1,500 LOC** | **1,100 LOC** |

---

## Conclusion

The spec's estimates are **dangerously optimistic**:

- Phase 1: Off by **5x**
- Phase 2: Off by **4x**
- Phase 3: Off by **4x**
- Phase 4: Off by **4-6x**

**Recommendation:** Before committing to timelines, build a **single-API proof-of-concept** with full FFI, error handling, and tests. Use that as the baseline for all estimates.

---

*Document generated: 2026-03-18*
*Based on: Test harness analysis (spec-analysis.js, batch-test.js)*
