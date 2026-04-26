# 🚀 CelronHub AI Configuration — Production Blueprint

**Version:** CELRON_AI_v1.0_FLASH_AGENTIC
**Date:** 27-Apr-2026
**Status:** Production Proven ✅

---

## 🧠 Overview

This document defines the **standard AI configuration** used in CelronHub for intelligent company research and data extraction.

The system is designed as an **Agentic AI Flow**, leveraging **Google Gemini** with integrated web search to produce accurate, structured, and verifiable business data.

---

## ⚙️ Core Model Configuration

| Parameter          | Value                 | Purpose                                              |
| ------------------ | --------------------- | ---------------------------------------------------- |
| **Primary Model**  | `gemini-flash-latest` | Ultra-fast extraction with high accuracy             |
| **Fallback Model** | `gemini-pro-latest`   | Handles complex reasoning when Flash is insufficient |
| **API Version**    | `v1beta`              | Required for Google Search tool support              |
| **Temperature**    | `0.4`                 | Balanced inference with reduced hallucination        |
| **TopP**           | `0.9`                 | Ensures diverse but relevant outputs                 |
| **Tools**          | `google_search: {}`   | Enables real-time web data access                    |
| **Context Mode**   | `Multi-Stage`         | Structured feedback loop using search results        |
| **Key Recovery**   | `Hardcoded Fallback`  | Prevents system failure due to env misconfiguration  |

---

## 🔄 Agentic Execution Flow

### Step 1: Query Initialization

* User submits company name or keyword
* System prepares structured prompt

### Step 2: Live Web Search

* AI triggers `google_search`
* Retrieves:

  * Official websites
  * Business directories
  * Government registries

### Step 3: Context Injection

* Search results converted into structured **Web Data**
* Injected back into AI context

### Step 4: AI Processing

* Extracts:

  * Company Name
  * Website URL
  * Contact Info
  * Business Description

### Step 5: Cross Verification

* Matches:

  * Website domain vs company identity
* Prioritizes:

  * Official sources over aggregators

### Step 6: UI Output

* Displays verified data in:

  * AI Research Card (Green Card)
* Includes:

  * Website URL (pre-apply visibility)

---

## 🧠 System Instructions (Core Intelligence Layer)

### 1. Identification Strategy

* Prioritize official registries:

  * Singapore ACRA (for UEN validation)
* Use high-trust domains first

---

### 2. Deep Extraction Logic

Focus extraction on:

* “About Us” sections
* “Contact” pages
* Metadata snippets from search results

---

### 3. Cross-Verification Rule

* If:

  * Website domain matches company name
* Then:

  * Prioritize it over all other candidates

---

### 4. Confidence-Based Output (No-Dash Policy)

* NEVER return empty (`-`)
* Instead:

  * Provide best अनुमान (estimate)
  * Attach confidence level:

| Confidence | Meaning                        |
| ---------- | ------------------------------ |
| High       | Verified from official sources |
| Medium     | Strong match, inferred         |
| Low        | Weak signals, partial data     |

---

## 🛡️ Reliability Mechanisms

### Fallback Model Handling

* Automatically switches to `gemini-pro-latest` when:

  * Complex reasoning required
  * Ambiguous search results detected

---

### API Key Recovery System

* If environment variables fail:

  * System falls back to hardcoded safe key
* Prevents downtime in production

---

### Hallucination Control

* Controlled via:

  * Low temperature (0.4)
  * Structured context injection
  * Verification rules

---

## 🧩 Developer Integration Reference

### Example Configuration Object

```ts
export const CELRON_AI_CONFIG = {
  primaryModel: "gemini-flash-latest",
  fallbackModel: "gemini-pro-latest",
  apiVersion: "v1beta",
  temperature: 0.4,
  topP: 0.9,
  tools: ["google_search"],
  contextMode: "multi-stage",
  recovery: "hardcoded-fallback",
  strategy: {
    identification: "ACRA-first",
    extraction: ["About Us", "Contact"],
    verification: "domain-match-priority",
    fallback: "confidence-based-output"
  }
};
```

---

## 📊 UI Behavior (CelronHub)

### AI Research Card Enhancements

* Displays:

  * Website URL BEFORE user clicks "Apply"
* Improves:

  * Transparency
  * Decision-making speed

---

## 🔮 Future Enhancements (Planned)

* Multi-country registry validation
* Email & phone auto-verification
* Confidence scoring visualization
* AI memory layer for repeated companies

---

## 📌 Notes

* This configuration is optimized for:

  * Speed ⚡
  * Accuracy 🎯
  * Business usability 💼

* Designed specifically for:

  * Marine / Industrial / B2B research workflows (Celron domain)

---

## ✅ Summary

This blueprint represents a **production-tested AI system** combining:

* Fast inference (Flash model)
* Deep reasoning fallback (Pro model)
* Live web intelligence (Google Search)
* Structured agentic flow

**Result:** Reliable, explainable, and scalable AI research inside CelronHub.
